#!/usr/bin/env node
/**
 * fetch-content.mjs — 构建期素材采集器
 *
 * ═════════════════════════════════════════════════════════════
 * 这不是运行时依赖。这是开发工具。
 * ═════════════════════════════════════════════════════════════
 *
 * 为什么应用不在运行时调用这些 API
 * ─────────────────────────────────────────────────────────────
 *   1. 离线   应用定位是 PWA/APK，孩子在车上、飞机上都要能玩。
 *             运行时依赖网络 = 直接违背核心定位。
 *   2. 隐私   儿童应用向第三方发请求，等于把孩子设备的 IP、
 *             使用时间、停留内容送出去。3-8 岁这个年龄段不可接受。
 *   3. 内容安全 API 返回的文本**未经审核**。「Cat Facts」这类
 *             随机事实 API 完全可能吐出成人内容或不当表述。
 *             儿童应用不能显示未经人工审核的文本。
 *   4. 可靠性 免费公共 API 随时下线、限流、改结构。
 *             今天能跑，明天白屏。
 *
 * 所以正确链路是：**构建期抓取 → 蒸馏 → 落成本地数据文件**。
 * 抓下来的原始数据放 tools/raw/（已 gitignore），不进产物；
 * 人工蒸馏后的内容写进 src/data/*.js，由 npm run validate 把关。
 *
 * 用法：
 *   npm run fetch                 抓全部
 *   npm run fetch -- gbif launch  只抓指定源
 *
 * 退出码 0 = 全部成功；1 = 有源失败（会逐条列出）
 *
 * ═════════════════════════════════════════════════════════════
 * 关于代理（本机踩过的坑）
 * ═════════════════════════════════════════════════════════════
 *   本机环境变量里有 HTTP_PROXY=http://127.0.0.1:3606。
 *   Node 原生 fetch **不读**这个变量，走直连。
 *
 *   实测结论：
 *     - 走代理失败、直连成功：ll.thespacedevs.com（Launch Library 2）
 *     - 两个方向都不通（网络层封锁，非本工具能解决）：
 *       wikipedia.org / wikidata.org / commons.wikimedia.org / api.openverse.org
 *   所以本项目**不把维基系 API 纳入素材源**，避免写出跑不通的工具。
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'tools', 'raw');

const UA = 'kids-encyclopedia/2.0 (build-time content sourcing; contact: local project)';
const TIMEOUT_MS = 25000;

/**
 * 统一请求：带 UA、带超时、**带重试退避**。
 *
 * 为什么要重试：这些是免费公共 API，连续请求容易撞限流或瞬断。
 * 实测过一次 GBIF 连发 8 个请求，中途直接 `fetch failed`。
 * 构建工具宁可慢一点也不能随机失败——否则会让人怀疑是代码问题。
 */
async function getJSON(url, { retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // 429 / 5xx 值得重试；4xx 其它是请求本身写错了，重试没意义
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}（重试无意义）`);

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`返回的不是 JSON（前 60 字：${text.slice(0, 60).replace(/\s+/g, ' ')}）`);
      }
    } catch (err) {
      lastErr = err;
      if (err.message.includes('重试无意义')) throw err;
      if (attempt < retries) {
        const wait = 600 * attempt; // 0.6s / 1.2s 递增
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw new Error(`${lastErr.message}（已重试 ${retries} 次）`);
}

/* ═════════════════════════════════════════════════════════════
   素材源定义
   每个源导出 { desc, run() }，run() 返回可序列化的数据。
   ═════════════════════════════════════════════════════════════ */

const SOURCES = {
  /* ---------- 生活科普 ---------- */

  gbif: {
    desc: 'GBIF 分类学骨架 —— 用学名核对界门纲目科属种与命名状态。生活科普领域的权威校验',
    async run() {
      /*
       * ═══════════════════════════════════════════════════════════
       * 为什么用「学名 → 核对」而不是「中文名 → 搜索」
       * ═══════════════════════════════════════════════════════════
       * 一开始我用 /species/search?q=<中文名> 想「让 GBIF 告诉我这是什么」，
       * 连踩三次坑，全部实测：
       *
       *   查「蜜蜂」→ 首条 Melissa yunnanensis（云南蜜蜂花，唇形科**植物**）
       *   查「蜜蜂」→ 加界过滤后 → Monoplex vespaceus（蜜蜂法螺，一种**海螺**）
       *   查「雪松」→ Plantago helleri（雪松車前，**车前草**）
       *   查「向日葵」→ Aspilia mossambicensis（野向日葵，属是 Aspilia 不是 Helianthus）
       *
       * 根因：`q=` 是**全文子串匹配**，且对中文名的相关性排序很差。
       * 换句话说——GBIF 是**分类学骨架**，不是中文名词典。
       * 拿中文俗名当查询键，是在用错的接口。
       *
       * 正确的用法反过来：**我方声明学名，GBIF 核对分类**。
       * 实测 8 个学名全部 matchType=EXACT / status=ACCEPTED，
       * 返回完整的 界门纲目科属种。这才是分类学骨架该干的事，
       * 而且能抓出学名拼写错误和过时异名。
       *
       * ⚠️ 学名由内容作者负责给出（这也是内容质量的一部分），
       *    本工具不负责猜。猜出来的分类学数据宁可不要。
       */
      const targets = [
        { zh: '大熊猫',   sci: 'Ailuropoda melanoleuca' },
        { zh: '亚洲象',   sci: 'Elephas maximus' },
        { zh: '帝企鹅',   sci: 'Aptenodytes forsteri' },
        { zh: '长颈鹿',   sci: 'Giraffa camelopardalis' },
        { zh: '蜜蜂',     sci: 'Apis cerana' },
        { zh: '向日葵',   sci: 'Helianthus annuus' },
        { zh: '蒲公英',   sci: 'Taraxacum officinale' },
        { zh: '雪松',     sci: 'Cedrus deodara' },
      ];
      const out = [];

      for (const { zh, sci } of targets) {
        if (out.length) await new Promise((r) => setTimeout(r, 300));

        const d = await getJSON(
          `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(sci)}`
        );

        const ok = d.matchType === 'EXACT' && d.status === 'ACCEPTED';
        out.push({
          zh,
          queryScientific: sci,
          verified: ok,
          matchType: d.matchType,        // EXACT / FUZZY / HIGHERRANK / NONE
          status: d.status,              // ACCEPTED / SYNONYM / DOUBTFUL
          scientificName: d.scientificName,
          rank: d.rank,
          kingdom: d.kingdom,
          phylum: d.phylum,
          class: d.class,
          order: d.order,
          family: d.family,
          genus: d.genus,
          species: d.species,
          // 非 EXACT 说明学名可能拼错或已过时，内容里不要直接引用
          warning: ok ? null : `matchType=${d.matchType} status=${d.status}，学名需人工复核`,
        });
      }
      return out;
    },
  },

  weather: {
    desc: 'Open-Meteo 天气 —— 江门（LO 所在地）近 7 天实际气温，用于「天气 / 季节」主题',
    async run() {
      const d = await getJSON(
        'https://api.open-meteo.com/v1/forecast' +
          '?latitude=22.5789&longitude=113.0815' +
          '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum' +
          '&timezone=Asia%2FShanghai&forecast_days=7'
      );
      return {
        place: '广东省江门市',
        latitude: d.latitude,
        longitude: d.longitude,
        timezone: d.timezone,
        daily: d.daily,
        units: d.daily_units,
      };
    },
  },

  quake: {
    desc: 'USGS 地震目录 —— 近 30 天 M4.5 以上地震。用于「地球 / 自然灾害」主题',
    async run() {
      const d = await getJSON(
        'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
          '&starttime=' + new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) +
          '&minmagnitude=4.5&orderby=magnitude&limit=20'
      );
      /*
       * ⚠️ USGS 的 metadata 里**没有 count**（只有 generated / url / title /
       * status / api / limit / offset），读 metadata.count 会得到 undefined。
       * 这个接口也不返回总数，所以只用 features.length 表示「本次取回条数」，
       * 字段名改成 returned 以免被误读成「全球总数」。
       */
      return {
        returned: (d.features || []).length,
        windowDays: 30,
        minMagnitude: 4.5,
        generated: d.metadata?.generated,
        events: (d.features || []).map((f) => ({
          magnitude: f.properties.mag,
          place: f.properties.place,
          depthKm: f.geometry?.coordinates?.[2],
          time: new Date(f.properties.time).toISOString(),
        })),
      };
    },
  },

  /* ---------- 人文科技 ---------- */

  launch: {
    desc: 'Launch Library 2 航天发射记录 —— 真实火箭型号与发射结果。用于「火箭」主题',
    async run() {
      /*
       * ⚠️ 不要加 mode=list。list 模式返回的是**扁平**字段
       * （lsp_name / launcher / location），没有嵌套的 rocket.configuration，
       * 结果 rocket / provider / country 全是 undefined。
       * 默认的 detailed 模式才有完整嵌套结构。
       */
      const d = await getJSON('https://ll.thespacedevs.com/2.2.0/launch/previous/?limit=15');
      return (d.results || []).map((l) => ({
        name: l.name,
        rocket: l.rocket?.configuration?.full_name,
        provider: l.launch_service_provider?.name,
        status: l.status?.abbrev,
        net: l.net,
        pad: l.pad?.name,
        country: l.pad?.location?.country_code,
      }));
    },
  },

  nasa: {
    desc: 'NASA 天文图（APOD）—— 每日天文图标题与说明。用于「太空」主题',
    async run() {
      const key = process.env.NASA_API_KEY || 'DEMO_KEY';
      // DEMO_KEY 有 30 次/小时、50 次/天限制，够开发期用
      const d = await getJSON(`https://api.nasa.gov/planetary/apod?count=5&api_key=${key}`);
      return (Array.isArray(d) ? d : [d]).map((x) => ({
        date: x.date,
        title: x.title,
        mediaType: x.media_type,
        explanation: x.explanation,
      }));
    },
  },

  /* ---------- 英语 ---------- */

  datamuse: {
    desc: 'Datamuse 词义联想 —— 为听音选词题生成**同主题干扰项**候选，替代手拍脑袋想干扰词',
    async run() {
      const words = ['apple', 'blue', 'cat', 'milk', 'run', 'hand', 'sunny', 'mom'];
      const out = [];
      for (const w of words) {
        // ml = means like；md=d 带词频，可用来过滤过难的词
        const d = await getJSON(
          `https://api.datamuse.com/words?ml=${encodeURIComponent(w)}&md=f&max=12`
        );
        out.push({
          word: w,
          related: d.map((x) => ({ w: x.word, tags: x.tags || [] })),
        });
      }
      return out;
    },
  },
};

/* ═════════════════════════════════════════════════════════════
   执行
   ═════════════════════════════════════════════════════════════ */

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const names = wanted.length ? wanted : Object.keys(SOURCES);

const unknown = names.filter((n) => !SOURCES[n]);
if (unknown.length) {
  console.error(`✗ 未知的素材源：${unknown.join(', ')}`);
  console.error(`  可用：${Object.keys(SOURCES).join(' / ')}`);
  process.exit(1);
}

mkdirSync(RAW, { recursive: true });

const results = [];

for (const name of names) {
  const src = SOURCES[name];
  const t0 = Date.now();
  process.stdout.write(`→ ${name.padEnd(10)} ${src.desc.slice(0, 40)}… `);
  try {
    const data = await src.run();
    const file = join(RAW, `${name}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        { source: name, desc: src.desc, fetchedAt: new Date().toISOString(), data },
        null,
        1
      ),
      'utf8'
    );
    const size = JSON.stringify(data).length;
    results.push({ name, ok: true, ms: Date.now() - t0, size, file });
    console.log(`✓ ${(Date.now() - t0) / 1000}s  ${(size / 1024).toFixed(1)} KB`);
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - t0, error: err.message });
    console.log(`✗ ${err.message}`);
  }
}

/* ─────────────── 报告 ─────────────── */

const line = '─'.repeat(62);
console.log(`\n${line}`);
console.log(`素材采集 · tools/raw/`);
console.log(line);

const okList = results.filter((r) => r.ok);
const failList = results.filter((r) => !r.ok);

for (const r of okList) {
  console.log(`  ✓ ${r.name.padEnd(10)} ${(r.size / 1024).toFixed(1).padStart(7)} KB   ${r.ms}ms`);
}
for (const r of failList) {
  console.log(`  ✗ ${r.name.padEnd(10)} 失败：${r.error}`);
}

console.log(line);
console.log(`成功 ${okList.length} / ${results.length}`);
console.log(`
下一步：tools/raw/ 里是**原始素材**，不是成品内容。
      蒸馏后写进 src/data/*.js，再跑 npm run check 验证。
      原始数据不进产物（已在 .gitignore 中排除）。
`);

process.exit(failList.length ? 1 : 0);
