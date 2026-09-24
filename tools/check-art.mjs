#!/usr/bin/env node
/**
 * check-art.mjs — 插画质量校验（第五条闸）
 *
 * 用法：node tools/check-art.mjs   （退出码 0 = 通过；1 = 有问题）
 *
 * ═══════════════════════════════════════════════════════════════
 * 为什么还需要第五条闸
 * ═══════════════════════════════════════════════════════════════
 * 现有四条各管一段，但都不管"图长什么样"：
 *
 *   validate-content   字段、id、art key 有没有登记        —— 全在内存
 *   test               行为契约（167 条）                   —— 全在内存
 *   check-reach        js 文件可达性 + sw.js 双向核对       —— 只认 .js
 *   check-media        文件在不在（旁白/题目音/绘本/封面）  —— 只查"存在"
 *
 * 于是下面这类问题**四条全绿也照样漏**（2026-09-23 实测）：
 *
 *   ① 三页绘本用同一张图
 *      art-blue-1/2/3.webp 的 md5 完全相同。孩子翻三页，看到同一朵蓝花，
 *      而三页台词分别在讲"天空""大海""蓝莓"。check-media 只数文件个数
 *      （480/480 ✓），不问三张是不是一张。
 *
 *   ② 封面直接复用绘本内页
 *      18 张封面与 book/ 里对应的 -1/-2/-3 逐字节相同。首页卡片和翻开第一页
 *      是同一张图，视觉上"没换过画面"。
 *
 *   ③ 分辨率断崖
 *      新三板块 18 个知识点的图是 512×512，老板块是 2048×2048。
 *      面积差 16 倍。体积指标（1.7 KB vs 170 KB）只是这个的下游表现，
 *      真正该卡的是分辨率 —— 平板高 DPI 屏上 512 会明显发虚。
 *
 *   ④ 代码里硬编码的图片路径没人查
 *      src/ui/lesson.js 的 coverSrc() 返回 `src/images/book/${id}-0.webp`，
 *      但 book/ 里的编号是 -1/-2/-3，**一个 -0 都没有**。
 *      探究课堂"引入"页的封面因此是破图，且没有 onerror 兜底。
 *      check-media 是拿 item.art 去查的，查不到这条硬编码路径。
 *
 *   ⑤ 写入中断留下的 0 字节文件
 *      批量换图时被抓到过 art-lines-2.webp = 0 B。
 *      0 字节的 webp 浏览器会当加载失败，但 existsSync 返回 true。
 *
 * ═══════════════════════════════════════════════════════════════
 * 判定口径
 * ═══════════════════════════════════════════════════════════════
 *   分辨率下限   短边 ≥ 1024px
 *                （现状：老板块 2048 / mascot 1024 / 旧新板块 512。
 *                  阈值取 1024 —— 刚好放过 mascot，卡住 512 那批。
 *                  **这是量出来的，不是拍的**：全量 1124 张的短边只有
 *                  512 / 1024 / 1536 / 2048 四个取值，没有中间态。）
 *   三页绘本     同一知识点的 -1/-2/-3 三张 md5 必须互不相同
 *   封面 vs 内页 封面图的 md5 不得出现在 book/ 里
 *   代码路径     src/**\/*.js 里出现的图片路径（含模板字符串）必须匹配到文件
 *
 * ⚠ 这个脚本只读不写。发现的问题按"改代码"和"补素材"分开列，
 *   因为两类修法不同、归属也不同（见每条的标签）。
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { listItems } from '../src/data/index.js';
import { getArt, listArtKeys } from '../src/art/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIN_EDGE = 1024;

const abs = (rel) => join(ROOT, rel);
const has = (rel) => existsSync(abs(rel));
const toRel = (p) => relative(ROOT, p).split(sep).join('/');

/* ─────────────── 图片元信息（尺寸 + md5） ─────────────── */

/** 解析 webp 尺寸。三种容器格式都要认，否则 VP8L/VP8X 会被漏判。 */
function webpSize(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('latin1', 0, 4) !== 'RIFF') return null;
  if (buf.toString('latin1', 8, 12) !== 'WEBP') return null;
  const tag = buf.toString('latin1', 12, 16);
  if (tag === 'VP8 ') {
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (tag === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (tag === 'VP8X') {
    return {
      w: buf.readUIntLE(24, 3) + 1,
      h: buf.readUIntLE(27, 3) + 1,
    };
  }
  return null;
}

function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** 按 magic 判断真实格式 —— 不能信扩展名（见过 .png 里装 JPEG） */
function sniff(buf) {
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  return null;
}

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const m = buf[i + 1];
    if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    if (m === 0xd8 || m === 0xd9 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

const metaCache = new Map();

/** 返回 { w, h, size, md5 } —— 读不到尺寸时 w/h 为 0（损坏或空文件） */
function metaOf(rel) {
  if (metaCache.has(rel)) return metaCache.get(rel);
  let out = { w: 0, h: 0, size: 0, md5: '', fmt: null };
  try {
    const buf = readFileSync(abs(rel));
    out.size = buf.length;
    if (buf.length > 0) {
      out.md5 = createHash('md5').update(buf).digest('hex');
      out.fmt = sniff(buf);
      const s = out.fmt === 'png' ? pngSize(buf)
        : out.fmt === 'jpeg' ? jpegSize(buf)
        : out.fmt === 'webp' ? webpSize(buf)
        : null;
      if (s) {
        out.w = s.w;
        out.h = s.h;
      }
    }
  } catch (e) {
    /* 读不到就当损坏，交给上层报 */
  }
  metaCache.set(rel, out);
  return out;
}

/* ─────────────── 遍历图片 ─────────────── */

const IMG_EXT = /\.(webp|png|jpe?g)$/i;

function walkImages(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(abs(dir));
  } catch (e) {
    return out;
  }
  for (const name of entries) {
    const rel = `${dir}/${name}`;
    if (statSync(abs(rel)).isDirectory()) out.push(...walkImages(rel));
    else if (IMG_EXT.test(name)) out.push(rel);
  }
  return out;
}

const allImages = walkImages('src/images');
const bookImages = allImages.filter((p) => p.startsWith('src/images/book/'));
const coverImages = allImages.filter((p) => !p.startsWith('src/images/book/'));

/** book/ 的 md5 → 文件名，用于查"封面复用内页" */
const bookMd5 = new Map();
for (const rel of bookImages) {
  const m = metaOf(rel);
  if (m.md5 && !bookMd5.has(m.md5)) bookMd5.set(m.md5, rel);
}

/* ─────────────── ① 空文件 / 损坏 ─────────────── */

const broken = [];
const extMismatch = [];
for (const rel of allImages) {
  const m = metaOf(rel);
  const ext = (rel.match(/\.(\w+)$/) || [])[1] || '';
  const want = ext === 'jpg' ? 'jpeg' : ext;
  if (m.size === 0) {
    broken.push(`${rel}  —— 0 字节（写入中断的残留，浏览器会当加载失败）`);
  } else if (!m.fmt) {
    broken.push(`${rel}  —— magic 既不是 webp / png 也不是 jpeg（文件损坏）`);
  } else if (!m.w || !m.h) {
    broken.push(`${rel}  —— 是 ${m.fmt} 但解析不出尺寸`);
  } else if (m.fmt !== want) {
    extMismatch.push(`${rel}  —— 扩展名写 .${ext}，内容实际是 ${m.fmt}`);
  }
}

/* ─────────────── ② 分辨率 ─────────────── */

const lowRes = [];
for (const rel of allImages) {
  const m = metaOf(rel);
  if (!m.w) continue; // 已归到 broken
  const edge = Math.min(m.w, m.h);
  if (edge < MIN_EDGE) {
    lowRes.push(`${rel}  ${m.w}×${m.h}  ${(m.size / 1024).toFixed(1)} KB`);
  }
}

/* ─────────────── ③ 同一知识点三页互不相同 ─────────────── */

const items = listItems();
const missingPages = [];
const samePages = [];
for (const { item } of items) {
  const rels = [1, 2, 3].map((i) => `src/images/book/${item.id}-${i}.webp`);
  const metas = rels.map(metaOf);

  // 缺页单独计。**不能直接 continue 跳过** —— 那样"三页互不相同"
  // 的分母会变小、指标虚高（曾把 476/480 的进行中状态显示成 160/160 全绿）。
  const miss = rels.filter((_, k) => !metas[k].md5);
  if (miss.length) {
    missingPages.push(
      `${item.id}（${item.name}）  缺 ${miss.length} 页：${miss.map((r) => r.split('/').pop()).join('、')}`
    );
    continue;
  }

  const uniq = new Set(metas.map((m) => m.md5));
  if (uniq.size < 3) {
    const desc = uniq.size === 1 ? '三页是同一张' : '有两页是同一张';
    samePages.push(`${item.id}（${item.name}）  ${desc}  md5 ${[...uniq][0].slice(0, 8)}`);
  }
}
const completeCount = items.length - missingPages.length;

/* ─────────────── ④ 封面不得复用绘本内页 ─────────────── */

const reusedCover = [];
for (const rel of coverImages) {
  const m = metaOf(rel);
  if (!m.md5) continue;
  const hit = bookMd5.get(m.md5);
  if (hit) reusedCover.push(`${rel}  ==  ${hit}`);
}

/* ─────────────── ⑤ 代码里硬编码的图片路径 ─────────────── */

/**
 * 把模板字符串里的 ${...} 换成 *，先展开同文件里 `const X = '字面量'` 的常量。
 * 例：`${BOOK_DIR}/${item.id}-0.webp`  →  src/images/book/*-0.webp
 */
function toGlob(raw, consts) {
  let s = raw;
  // 常量先替换（可能嵌在 ${} 里）
  for (const [name, val] of consts) {
    s = s.replaceAll('${' + name + '}', val);
  }
  // 剩下的 ${...} 一律当通配
  s = s.replace(/\$\{[^}]*\}/g, '*');
  return s;
}

function globToRe(g) {
  const esc = g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${esc}$`);
}

const allImageRel = new Set(allImages);
const globMatchers = [];

function walkJs(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(abs(dir));
  } catch (e) {
    return out;
  }
  for (const name of entries) {
    const rel = `${dir}/${name}`;
    if (statSync(abs(rel)).isDirectory()) out.push(...walkJs(rel));
    else if (name.endsWith('.js')) out.push(rel);
  }
  return out;
}

const jsFiles = walkJs('src');

for (const jsRel of jsFiles) {
  const src = readFileSync(abs(jsRel), 'utf8');
  const consts = [...src.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*'([^']*)'/g)].map((m) => [
    m[1],
    m[2],
  ]);
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    // 收集本行所有字符串 / 模板字面量，**展开常量之后**再筛。
    //
    // ⚠ 不能先按 "images/" 过滤。`${BOOK_DIR}/${item.id}-0.webp` 里没有
    //   字面量 images/，但展开后就是 src/images/book/*-0.webp。
    //   上一版正是这么写的，于是漏掉了 lesson.js 里那条 -0 引用
    //   （book/ 的编号是 -1/-2/-3，一个 -0 都没有 → 探究课堂封面破图）。
    for (const m of line.matchAll(/(['"`])((?:[^'"`\\]|\\.)*)\1/g)) {
      const raw = m[2];
      if (!raw) continue;
      const g = toGlob(raw, consts);
      if (process.env.ART_DEBUG && /images/.test(raw) ) {
        console.error(`  [debug] ${jsRel}:${i + 1}  ${raw}  →  ${g}`);
      }
      if (!/^src\/images\//.test(g)) continue;
      // 不是文件路径（例如 `const BOOK_DIR = 'src/images/book'` 这种目录常量）
      if (!g.includes('*') && !IMG_EXT.test(g)) continue;
      globMatchers.push({ file: jsRel, line: i + 1, glob: g, raw });
    }
  });
}

const brokenRefs = [];
const seenGlob = new Set();
for (const { file, line, glob, raw } of globMatchers) {
  const key = `${file}:${glob}`;
  if (seenGlob.has(key)) continue;
  seenGlob.add(key);

  if (!glob.includes('*')) {
    if (!has(glob)) brokenRefs.push(`${file}:${line}  →  ${glob}  （文件不存在）`);
    continue;
  }
  const re = globToRe(glob);
  const n = [...allImageRel].filter((p) => re.test(p)).length;
  if (n === 0) {
    brokenRefs.push(`${file}:${line}  →  ${raw}  （展开为 ${glob}，磁盘上匹配 0 个文件）`);
  }
}

/* ─────────────── ⑥ art 注册表里指向的文件必须存在 ─────────────── */

const brokenArt = [];
for (const key of listArtKeys()) {
  const html = getArt(key);
  const m = /src="([^"]+)"/.exec(html);
  if (!m) continue; // 内联 SVG，本来就没有文件
  if (!has(m[1])) brokenArt.push(`${key}  →  ${m[1]}`);
}

/* ─────────────── 报告 ─────────────── */

const line = '─'.repeat(58);

console.log(`\n插画质量 · 小小百科`);
console.log(line);
console.log(`图片总数          ${allImages.length}  （book/ ${bookImages.length} + 封面 ${coverImages.length}）`);
console.log(`知识点            ${items.length}`);
console.log(`格式与扩展名相符  ${allImages.length - extMismatch.length} / ${allImages.length}`);
console.log(`分辨率 ≥ ${MIN_EDGE}      ${allImages.length - lowRes.length - broken.length} / ${allImages.length}`);
console.log(`绘本三页齐全      ${completeCount} / ${items.length}`);
console.log(`三页互不相同      ${completeCount - samePages.length} / ${completeCount}`);
console.log(`封面不复用内页    ${coverImages.length - reusedCover.length} / ${coverImages.length}`);
console.log(`代码引用可达      ${globMatchers.length - brokenRefs.length} / ${globMatchers.length} 处`);
console.log(line);

const groups = [
  ['① 空文件 / 损坏', broken, '补素材'],
  ['② 格式与扩展名不符', extMismatch, '改代码'],
  ['③ 分辨率低于下限', lowRes, '补素材'],
  ['④ 绘本缺页', missingPages, '补素材'],
  ['⑤ 同一知识点三页相同', samePages, '补素材'],
  ['⑥ 封面直接复用绘本内页', reusedCover, '补素材'],
  ['⑦ 代码引用了不存在的图片', brokenRefs, '改代码'],
  ['⑧ art 注册表指向的文件不存在', brokenArt, '改代码'],
];

let total = 0;
for (const [label, list, fix] of groups) {
  if (!list.length) continue;
  total += list.length;
  console.log(`\n${label} ${list.length} 条   〔${fix}〕`);
  list.slice(0, 10).forEach((x) => console.log(`  · ${x}`));
  if (list.length > 10) console.log(`  …… 另有 ${list.length - 10} 条`);
}

if (total === 0) {
  console.log(`\n全部通过：${allImages.length} 张图的分辨率、唯一性与引用都合格。\n`);
  process.exit(0);
}

console.log(`\n合计问题 ${total} 条。`);
console.log(`提示：标〔补素材〕的要重画或补画；标〔改代码〕的改完立刻能绿。`);
console.log(`      两张不同的画不必两张都大 —— 但三页台词不同，就该有三张不同的画面。\n`);
process.exit(1);
