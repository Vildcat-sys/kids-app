#!/usr/bin/env node
/**
 * validate-content.mjs — 内容与工程一致性校验
 *
 * ─────────────────────────────────────────────────────────────
 * 为什么需要这个
 * ─────────────────────────────────────────────────────────────
 * 这个项目最大的风险不是代码写错，而是**内容写错**：
 *   - 答案下标越界 → 点了没反应，孩子以为坏了
 *   - 听音题的 opts[a] 和 word 不一致 → 永远答不对
 *   - art 引用了不存在的插画 key → 显示占位问号
 *   - 新增源文件忘了加进 sw.js → 离线状态下白屏
 * 这些问题在浏览器里都表现为「有点怪」，排查成本极高。
 * 所以把它们全部前置成一条命令，在提交前跑一遍。
 *
 * 用法：
 *   npm run validate
 * 退出码 0 = 全部通过；1 = 有错误，不允许提交。
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOPICS, GROUPS, listItems, AGE_BANDS, isRealAgeBand } from '../src/data/index.js';
import { getQuizType, listQuizTypeIds } from '../src/quiz-types/index.js';
import { listArtKeys } from '../src/art/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const errors = [];
const warnings = [];

const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/** 儿童内容里应当避免的空泛表达 */
const VAGUE_WORDS = ['很大', '很多', '非常大', '非常多', '各种各样', '许许多多', '好多好多'];

/* ─────────────── 1. 领域结构 ─────────────── */

const topicIds = new Set();

if (!Array.isArray(TOPICS) || TOPICS.length === 0) {
  err('data/index.js 的 TOPICS 为空，至少要有一个领域');
}

for (const topic of TOPICS) {
  const at = `领域「${topic.id || '(缺 id)'}」`;

  for (const field of ['id', 'name', 'tagline', 'accent']) {
    if (!topic[field] || typeof topic[field] !== 'string') {
      err(`${at} 缺少字段 ${field}`);
    }
  }

  if (topic.id) {
    if (topicIds.has(topic.id)) err(`${at} 的 id 重复`);
    topicIds.add(topic.id);
  }

  if (topic.accent && !/^#[0-9A-Fa-f]{6}$/.test(topic.accent)) {
    err(`${at} 的 accent「${topic.accent}」不是合法的 6 位 hex 颜色`);
  }

  // tagline 过长会在首页卡片里折行，断句位置不可控，很难看
  if (typeof topic.tagline === 'string' && topic.tagline.length > 12) {
    warn(`${at} 的 tagline 有 ${topic.tagline.length} 字，超过 12 字会在首页卡片里折行，建议精简`);
  }

  if (!Array.isArray(topic.items) || topic.items.length === 0) {
    err(`${at} 没有任何知识点`);
  }
}

/* ─────────────── 2. 知识点结构 ─────────────── */

const itemIds = new Set();
const artKeys = new Set(listArtKeys());
const typeIds = new Set(listQuizTypeIds());
const typeCount = {};

for (const topic of TOPICS) {
  for (const item of topic.items || []) {
    const at = `知识点「${item.id || '(缺 id)'}」`;

    for (const field of ['id', 'name', 'pinyin', 'art', 'lead']) {
      if (!item[field] || typeof item[field] !== 'string') {
        err(`${at} 缺少字段 ${field}`);
      }
    }

    if (item.id) {
      if (itemIds.has(item.id)) err(`${at} 的 id 在全项目内重复，知识点 id 必须全局唯一`);
      itemIds.add(item.id);

      // id 前缀应与所属领域一致，便于定位和排序
      if (topic.id && !item.id.startsWith(`${topic.id}-`)) {
        warn(`${at} 的 id 未以领域 id「${topic.id}-」开头，建议统一前缀`);
      }
    }

    // 插画引用必须存在
    if (item.art && !artKeys.has(item.art)) {
      err(`${at} 引用的插画 key「${item.art}」不存在于 src/art/index.js`);
    }

    // 一句话核心：太长孩子读不完
    if (typeof item.lead === 'string' && item.lead.length > 80) {
      warn(`${at} 的 lead 有 ${item.lead.length} 字，超过 80 字，建议压缩到一句话`);
    }

    // facts 必须是 3 条
    if (!Array.isArray(item.facts) || item.facts.length !== 3) {
      err(`${at} 的 facts 必须是恰好 3 条，当前 ${Array.isArray(item.facts) ? item.facts.length : 0} 条`);
    } else {
      item.facts.forEach((f, i) => {
        if (typeof f !== 'string' || !f.trim()) {
          err(`${at} 的 facts[${i}] 不是非空字符串`);
          return;
        }
        const hit = VAGUE_WORDS.find((w) => f.includes(w));
        if (hit) {
          warn(`${at} 的 facts[${i}] 含空泛表达「${hit}」，建议换成具体数字或具体事物`);
        }
      });
    }

    /* ─────── 3. 题目校验（交给题型自己判断） ─────── */

    const quiz = item.quiz;
    if (!quiz || typeof quiz !== 'object') {
      err(`${at} 缺少 quiz`);
      continue;
    }

    if (!typeIds.has(quiz.type)) {
      err(`${at} 的 quiz.type「${quiz.type}」不是已注册题型，可用：${[...typeIds].join(' / ')}`);
      continue;
    }

    typeCount[quiz.type] = (typeCount[quiz.type] || 0) + 1;

    const impl = getQuizType(quiz.type);
    const quizErrors = impl.validate(quiz) || [];
    for (const msg of quizErrors) {
      err(`${at} 的 ${quiz.type} 题：${msg}`);
    }
  }
}

/* ─────────────── 4. 年龄档位 ───────────────
 *
 * 为什么这节值得单列
 *   漏标一个 ageBands，后果不是报错，而是**内容静默消失**：
 *   孩子切到 3-5 档，那个知识点就不见了，没有任何提示。
 *   所以这里用 error 级别拦住，而不是当作可选字段放过。
 *
 *   另一个容易踩的坑是「某档某领域一个知识点都没有」——
 *   首页的领域卡会被整个过滤掉，孩子会以为「地理怎么没了」。
 */

const bandStats = new Map();
for (const band of AGE_BANDS) {
  bandStats.set(band.id, { count: 0, exclusive: 0, perTopic: new Map() });
}

for (const topic of TOPICS) {
  for (const item of topic.items || []) {
    const at = `知识点「${item.id || '(缺 id)'}」`;

    if (!Array.isArray(item.ageBands) || item.ageBands.length === 0) {
      err(`${at} 缺少 ageBands，必须至少归入一个年龄档位（否则切到任何档位都看不到它）`);
      continue;
    }

    const seen = new Set();
    for (const b of item.ageBands) {
      if (!isRealAgeBand(b)) {
        err(
          `${at} 的 ageBands 含非法档位「${b}」，可用：${AGE_BANDS.map((x) => x.id).join(' / ')}`
        );
        continue;
      }
      if (seen.has(b)) {
        err(`${at} 的 ageBands 里「${b}」重复出现`);
        continue;
      }
      seen.add(b);
    }

    for (const b of seen) {
      const s = bandStats.get(b);
      s.count += 1;
      s.perTopic.set(topic.id, (s.perTopic.get(topic.id) || 0) + 1);
    }

    // 只属于一个档位的知识点 = 该档的「独占内容」，是切档可见差异的来源
    if (seen.size === 1) bandStats.get([...seen][0]).exclusive += 1;
  }
}

for (const band of AGE_BANDS) {
  const s = bandStats.get(band.id);

  if (s.count === 0) {
    err(`年龄档位「${band.label}」下没有任何知识点，切到该档会白屏`);
    continue;
  }

  for (const topic of TOPICS) {
    if (!s.perTopic.get(topic.id)) {
      err(
        `年龄档位「${band.label}」下领域「${topic.name}」没有任何知识点，` +
          `切到该档后这张卡会从首页消失`
      );
    }
  }

  if (s.count < 8) {
    warn(`年龄档位「${band.label}」只有 ${s.count} 个知识点，内容偏少，孩子玩两下就没了`);
  }
}

/* ─────────────── 5. sw.js 是否覆盖全部源文件 ─────────────── */

function walk(dir, out = []) {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel.split(sep).join('/'));
  }
  return out;
}

let swSource = '';
try {
  swSource = readFileSync(join(ROOT, 'sw.js'), 'utf8');
} catch (e) {
  err('读不到 sw.js');
}

if (swSource) {
  const srcFiles = walk('src').filter((f) => /\.(js|css)$/.test(f));
  for (const file of srcFiles) {
    if (!swSource.includes(`./${file}`)) {
      err(`src/${file.replace(/^src\//, '')} 没有被 sw.js 的 ASSETS 列表覆盖，离线状态下会加载失败`);
    }
  }
}

/* ─────────────── 6. 主题分组与领域色 ─────────────── */

/* 分组漏登记不会抛错，只会让领域从「我的地图」页静默消失 —— 只能靠断言兜住。 */
const groupedIds = new Set(GROUPS.flatMap((g) => g.topics));

for (const topic of TOPICS) {
  if (!groupedIds.has(topic.id)) {
    err(`领域「${topic.name}」(${topic.id}) 没登记进 GROUPS，它会从「我的地图」页消失`);
  }
}

for (const id of groupedIds) {
  if (!TOPICS.some((t) => t.id === id)) {
    err(`GROUPS 里写了不存在的领域 id「${id}」`);
  }
}

/* 领域色撞车：首页两张卡长得一模一样，孩子分不清。
   2026-09-17 真抓到过一次 —— geo 与 logic 都写了 #3B6D11。 */
const accentOwner = new Map();
for (const topic of TOPICS) {
  const key = String(topic.accent || '').toLowerCase();
  if (!key) {
    err(`领域「${topic.name}」没写 accent`);
    continue;
  }
  if (accentOwner.has(key)) {
    err(
      `领域「${topic.name}」和「${accentOwner.get(key)}」撞色（${topic.accent}），` +
        `首页两张卡看起来会一样`
    );
  } else {
    accentOwner.set(key, topic.name);
  }
}

/* ─────────────── 7. 输出报告 ─────────────── */

const allItems = listItems();
const line = '─'.repeat(58);

console.log(`\n内容校验 · 小小百科`);
console.log(line);
console.log(`领域数量      ${TOPICS.length}`);
console.log(`知识点数量    ${allItems.length}`);
console.log(`题目总数      ${Object.values(typeCount).reduce((a, b) => a + b, 0)}`);
console.log(
  `题型分布      ${
    Object.entries(typeCount)
      .map(([k, v]) => `${k} ${v}`)
      .join(' / ') || '无'
  }`
);
console.log(`插画资源      ${artKeys.size} 个`);
console.log(line);
console.log('年龄档位分布');
for (const band of AGE_BANDS) {
  const s = bandStats.get(band.id);
  const pct = allItems.length === 0 ? 0 : Math.round((s.count / allItems.length) * 100);
  console.log(
    `  ${band.label.padEnd(5)}  ${String(s.count).padStart(2)} 个（${String(pct).padStart(2)}%）  独占 ${String(s.exclusive).padStart(2)}`
  );
}
console.log(`  ${'全部'.padEnd(5)}  ${String(allItems.length).padStart(2)} 个`);
console.log(line);

if (warnings.length) {
  console.log(`\n提醒 ${warnings.length} 条（不阻断提交，但建议处理）`);
  warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
}

if (errors.length) {
  console.log(`\n错误 ${errors.length} 条（必须修复后才能提交）`);
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  console.log('');
  process.exit(1);
}

console.log(`\n全部通过，可以提交。\n`);
process.exit(0);
