#!/usr/bin/env node
/**
 * check-media.mjs — 媒体完整性校验（文件到底在不在）
 *
 * 用法：node tools/check-media.mjs   （退出码 0 = 通过；1 = 有缺口）
 *
 * ═══════════════════════════════════════════════════════════════
 * 为什么单独一个脚本，而不是并进 validate-content.mjs
 * ═══════════════════════════════════════════════════════════════
 * 两者查的是**两类不同的失败**：
 *
 *   validate-content.mjs —— 内容结构。字段齐不齐、id 重不重、
 *     引用的 art key 有没有登记、课程矩阵落位全不全。
 *     全部在内存里比对，不碰磁盘。
 *
 *   check-media.mjs —— 文件在不在。内容结构可以完全合法，
 *     但点进去是空壳：没图、没音、绘本翻不了页。
 *
 * 两类失败的修法不同（一个改代码，一个补素材），混在一个退出码里
 * 会让人分不清"是代码写错了还是素材还没做"，所以分开放。
 *
 * ═══════════════════════════════════════════════════════════════
 * 它要堵的洞（2026-09-23 真实发生过）
 * ═══════════════════════════════════════════════════════════════
 * 美术/写字/音乐三个板块新增 18 个知识点。当时：
 *   · item 字段齐全          ✓
 *   · art key 已在 art/index.js 登记  ✓
 *   · 课程矩阵 160/160 落位   ✓
 *   · validate-content 全绿   ✓
 * 但磁盘上：
 *   · 绘本图   426 张，应到 480（160×3）→ 缺 54
 *   · 旁白     570 段，应到 640（160×4）→ 缺 72
 *   · 题目音   128 段，应到 146（160−14 listen）→ 缺 18
 *   · 封面图   src/images/ 下连 art/ writing/ music/ 三个目录都没有
 *
 * 570 = 142×4、426 = 142×3 —— 老内容一个不缺，新增的 18 个一个没有。
 * 首页照常显示「美术 0/6」，点进去是空壳，全程不报错。
 *
 * 根因：原来的校验只看 ART[key] **有没有登记**，
 * 不看 key 指向的那个文件**在不在**。所以整批空壳静默上线。
 *
 * ═══════════════════════════════════════════════════════════════
 * 判定口径（与内容契约一致）
 * ═══════════════════════════════════════════════════════════════
 *   旁白    src/audio/narr/<id>-0.mp3 … -3.mp3        4 段
 *   题目音  src/audio/quiz/<id>.mp3                    1 段（listen 型除外）
 *   绘本图  src/images/book/<id>-1.webp … -3.webp      3 张
 *   封面图  由 art/index.js 的 getArt(item.art) 决定路径
 *
 * 另外顺带查 sw.js：ASSETS 里列的每条路径都必须真实存在。
 * （原来那条"src 文件必须被 sw.js 覆盖"的断言只查单向 ——
 *  它拦得住"新增文件忘了登记"，拦不住"删了文件忘了从 ASSETS 摘掉"。
 *  2026-09-23 的实例：src/ui/age-bar.js 已被 git rm，
 *  sw.js 里还留着，Service Worker 预缓存时 404。）
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listItems } from '../src/data/index.js';
import { getArt, listArtKeys } from '../src/art/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 已登记的插画 key。登记了就算通过 —— 有的是外链 <img>，有的是内联 SVG。 */
const artKeys = new Set(listArtKeys());

/** 项目根的绝对路径 + 站内相对路径 → 是否存在 */
const has = (rel) => existsSync(join(ROOT, rel));

/* ─────────────── 收集缺口 ─────────────── */

const missingNarr = [];
const missingQuiz = [];
const missingBook = [];
const missingCover = [];
const brokenArtKey = [];

const items = listItems();

for (const { item } of items) {
  // 旁白：4 段
  for (let i = 0; i < 4; i += 1) {
    const rel = `src/audio/narr/${item.id}-${i}.mp3`;
    if (!has(rel)) missingNarr.push(rel);
  }

  // 题目音：listen 型是"听音选图"，题目本身就是音频，不再单独配一段
  const type = item.quiz && item.quiz.type;
  if (type !== 'listen') {
    const rel = `src/audio/quiz/${item.id}.mp3`;
    if (!has(rel)) missingQuiz.push(rel);
  }

  // 绘本图：3 张
  for (let i = 1; i <= 3; i += 1) {
    const rel = `src/images/book/${item.id}-${i}.webp`;
    if (!has(rel)) missingBook.push(rel);
  }

  // 封面图。分两步，别把两种情况混成一种：
  //   1. key 没登记 → 渲染成问号占位（这是内容层的错）
  //   2. key 登记了、值是外链 <img> → 再查那个文件在不在
  //      值是内联 SVG（没有 src）→ 本来就没有文件可查，直接过
  if (!artKeys.has(item.art)) {
    brokenArtKey.push(`${item.id} 的 art key「${item.art}」没登记，封面会渲染成问号占位`);
  } else {
    const m = /src="([^"]+)"/.exec(getArt(item.art));
    if (m && !has(m[1])) missingCover.push(`${m[1]}  (${item.id})`);
  }
}

/* ─────────────── sw.js：ASSETS 里的路径必须都存在 ─────────────── */

const brokenAssets = [];
let assetCount = 0;
try {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const seen = new Set();
  for (const m of sw.matchAll(/'(\.\/[^']+)'/g)) {
    const rel = m[1].slice(2); // 去掉开头的 './'
    if (seen.has(rel)) continue;
    seen.add(rel);
    assetCount += 1;
    if (!has(rel)) brokenAssets.push(m[1]);
  }
} catch (e) {
  console.log('读不到 sw.js，跳过 ASSETS 检查');
}

/* ─────────────── 报告 ─────────────── */

const line = '─'.repeat(58);
const narrExpected = items.length * 4;
const quizExpected = items.length - items.filter(({ item }) => item.quiz && item.quiz.type === 'listen').length;
const bookExpected = items.length * 3;

const narrActual = countFiles('src/audio/narr');
const quizActual = countFiles('src/audio/quiz');
const bookActual = countFiles('src/images/book');

function countFiles(dir) {
  try {
    return readdirSync(join(ROOT, dir)).length;
  } catch (e) {
    return 0;
  }
}

console.log(`\n媒体完整性 · 小小百科`);
console.log(line);
console.log(`知识点        ${items.length}`);
console.log(`旁白音频      ${narrActual} / ${narrExpected}`);
console.log(`题目音频      ${quizActual} / ${quizExpected}`);
console.log(`绘本图        ${bookActual} / ${bookExpected}`);
console.log(`sw.js 条目    ${assetCount}`);
console.log(line);

const groups = [
  ['旁白音频缺失', missingNarr],
  ['题目音频缺失', missingQuiz],
  ['绘本图缺失', missingBook],
  ['封面图缺失', missingCover],
  ['art key 未登记', brokenArtKey],
  ['sw.js 指向不存在的文件', brokenAssets],
];

let total = 0;
for (const [label, list] of groups) {
  if (!list.length) continue;
  total += list.length;
  console.log(`\n${label} ${list.length} 条`);
  list.slice(0, 8).forEach((x) => console.log(`  · ${x}`));
  if (list.length > 8) console.log(`  …… 另有 ${list.length - 8} 条`);
}

if (total === 0) {
  console.log(`\n全部通过：${items.length} 个知识点的媒体文件齐全。\n`);
  process.exit(0);
}

console.log(`\n合计缺口 ${total} 条。`);
console.log(`提示：缺媒体的知识点应当**先从课程矩阵摘掉**再交付，`);
console.log(`      而不是让它以空壳形态上线（点进去没图没音，界面不报错）。\n`);
process.exit(1);
