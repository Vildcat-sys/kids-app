#!/usr/bin/env node
/**
 * validate-content.mjs — 内容与工程一致性校验
 *
 * 用法：npm run validate   （退出码 0 = 通过；1 = 有错误）
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOPICS, listItems, findItem } from '../src/data/index.js';
import { LEVELS, LEVEL_IDS, levelOf } from '../src/data/levels.js';
import { SECTIONS } from '../src/data/sections.js';
import {
  CURRICULUM,
  mappedItemIds,
  locateItem,
  listStages,
  listModules,
} from '../src/data/curriculum.js';
import { getQuizType, listQuizTypeIds } from '../src/quiz-types/index.js';
import { listArtKeys } from '../src/art/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const VAGUE_WORDS = ['很大', '很多', '非常大', '非常多', '各种各样', '许许多多', '好多好多'];

/* ─────────────── 1. 领域结构 ─────────────── */

const topicIds = new Set();
if (!Array.isArray(TOPICS) || TOPICS.length === 0) err('data/index.js 的 TOPICS 为空');

for (const topic of TOPICS) {
  const at = `领域「${topic.id || '(缺 id)'}」`;
  for (const field of ['id', 'name', 'tagline', 'accent']) {
    if (!topic[field] || typeof topic[field] !== 'string') err(`${at} 缺少字段 ${field}`);
  }
  if (topic.id) {
    if (topicIds.has(topic.id)) err(`${at} 的 id 重复`);
    topicIds.add(topic.id);
  }
  if (topic.accent && !/^#[0-9A-Fa-f]{6}$/.test(topic.accent)) {
    err(`${at} 的 accent「${topic.accent}」不是合法 6 位 hex`);
  }
  if (typeof topic.tagline === 'string' && topic.tagline.length > 12) {
    warn(`${at} 的 tagline 有 ${topic.tagline.length} 字，超过 12 字建议精简`);
  }
  if (!Array.isArray(topic.items) || topic.items.length === 0) err(`${at} 没有任何知识点`);
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
      if (!item[field] || typeof item[field] !== 'string') err(`${at} 缺少字段 ${field}`);
    }
    if (item.id) {
      if (itemIds.has(item.id)) err(`${at} 的 id 全局重复`);
      itemIds.add(item.id);
      if (topic.id && !item.id.startsWith(`${topic.id}-`)) {
        warn(`${at} 的 id 未以领域 id「${topic.id}-」开头`);
      }
    }
    if (item.art && !artKeys.has(item.art)) {
      err(`${at} 引用的插画 key「${item.art}」不存在于 src/art/index.js`);
    }
    if (typeof item.lead === 'string' && item.lead.length > 80) {
      warn(`${at} 的 lead 有 ${item.lead.length} 字，建议压到一句话`);
    }
    if (!Array.isArray(item.facts) || item.facts.length !== 3) {
      err(`${at} 的 facts 必须恰好 3 条，当前 ${Array.isArray(item.facts) ? item.facts.length : 0} 条`);
    } else {
      item.facts.forEach((f, i) => {
        if (typeof f !== 'string' || !f.trim()) err(`${at} 的 facts[${i}] 不是非空字符串`);
        else {
          const hit = VAGUE_WORDS.find((w) => f.includes(w));
          if (hit) warn(`${at} 的 facts[${i}] 含空泛表达「${hit}」`);
        }
      });
    }
    const quiz = item.quiz;
    if (!quiz || typeof quiz !== 'object') { err(`${at} 缺少 quiz`); continue; }
    if (!typeIds.has(quiz.type)) {
      err(`${at} 的 quiz.type「${quiz.type}」不是已注册题型`); continue;
    }
    typeCount[quiz.type] = (typeCount[quiz.type] || 0) + 1;
    const impl = getQuizType(quiz.type);
    for (const msg of impl.validate(quiz) || []) err(`${at} 的 ${quiz.type} 题：${msg}`);
  }
}

/* ─────────────── 3. 年龄档 ageBands（已作废，2026-09-23 拍板 A） ───────────────
 * 年龄轴（3-5/6-8）已被认知轴（S1–S6）取代。item 上不再保留 ageBands 字段，
 * 也不再做任何档位校验。筛选统一走 levels.js 的级别，见第 4 段。
 * 这里保留空段号仅为了不打乱下方注释编号；不要再加回档位校验。
 */

/* ─────────────── 4. 级别（S1–S6）覆盖 ───────────────
 * 每个知识点必须在 ITEM_LEVELS 里有级别；每个级别都要有内容，否则该阶段白屏。
 */
const levelCount = {};
for (const lv of LEVEL_IDS) levelCount[lv] = 0;

for (const { item } of listItems()) {
  const lv = levelOf(item.id);
  if (!lv) {
    err(`知识点「${item.id}」没有在 levels.js 的 ITEM_LEVELS 里标级别`);
  } else if (!levelCount[lv] && levelCount[lv] !== 0) {
    /* noop */
  }
  if (lv) levelCount[lv] += 1;
}
for (const lv of LEVEL_IDS) {
  if (levelCount[lv] === 0) err(`级别「${lv}」下没有任何知识点，该阶段会白屏`);
}

/* ─────────────── 5. sw.js 覆盖全部源文件 ─────────────── */
function walk(dir, out = []) {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel.split(sep).join('/'));
  }
  return out;
}
let swSource = '';
try { swSource = readFileSync(join(ROOT, 'sw.js'), 'utf8'); } catch (e) { err('读不到 sw.js'); }
if (swSource) {
  for (const file of walk('src').filter((f) => /\.(js|css)$/.test(f))) {
    if (!swSource.includes(`./${file}`)) {
      err(`src/${file.replace(/^src\//, '')} 没有被 sw.js 的 ASSETS 覆盖`);
    }
  }
}

/* ─────────────── 6. 板块归属与撞色 ─────────────── */
const sectionTopicOwner = new Map();
for (const sec of SECTIONS) {
  for (const tid of sec.topics || []) {
    if (sectionTopicOwner.has(tid)) {
      err(`领域「${tid}」同时挂在板块「${sectionTopicOwner.get(tid)}」和「${sec.id}」下`);
    }
    sectionTopicOwner.set(tid, sec.id);
  }
}
for (const tid of topicIds) {
  if (!sectionTopicOwner.has(tid)) err(`领域「${tid}」没有挂在任何板块下`);
}
for (const tid of sectionTopicOwner.keys()) {
  if (!topicIds.has(tid)) err(`板块引用了不存在的领域「${tid}」`);
}
const accentOwner = new Map();
for (const sec of SECTIONS) {
  const key = String(sec.accent || '').toLowerCase();
  if (!key) { err(`板块「${sec.id}」缺 accent`); continue; }
  if (accentOwner.has(key)) err(`板块「${sec.id}」和「${accentOwner.get(key)}」撞色 ${sec.accent}`);
  accentOwner.set(key, sec.id);
}

/* ─────────────── 7. 课程矩阵（curriculum.js）断言，规格 §3.2 ─────────────── */
const mapped = mappedItemIds();

// 7.1 每个注册知识点都必须落位到课程矩阵
for (const { item } of listItems()) {
  if (!mapped.has(item.id)) err(`知识点「${item.id}」没有落到任何课程模块（mappedItemIds 缺失）`);
}
// 7.2 课程树里每个 itemId 都能 findItem，且能 locateItem
for (const id of mapped) {
  if (!findItem(id)) err(`课程表引用了不存在的知识点「${id}」（findItem 返回 null）`);
  if (!locateItem(id)) err(`课程表「${id}」无法 locateItem（不在任何阶段/模块里）`);
}
// 7.3 142 个现有知识点零丢失：现有 = 全部注册项减去新增 art-/writing-/music-
const NEW_PREFIX = /^(art-|writing-|music-)/;
const existingIds = listItems().map(({ item }) => item.id).filter((id) => !NEW_PREFIX.test(id));
const missingExisting = existingIds.filter((id) => !mapped.has(id));
if (missingExisting.length) {
  err(`现有知识点未落位 ${missingExisting.length} 个：${missingExisting.slice(0, 20).join(', ')}`);
}
// 7.4 每个板块六个阶段都要有 title + desc；每个模块要有 3 条 goal
for (const sec of SECTIONS) {
  const tree = CURRICULUM[sec.id];
  if (!tree) { err(`课程树缺少板块「${sec.id}」`); continue; }
  for (const stage of tree.stages) {
    if (!stage.title || !stage.desc) err(`板块「${sec.id}」阶段「${stage.id}」缺 title/desc`);
    for (const mod of stage.modules || []) {
      if (!Array.isArray(mod.goal) || mod.goal.length !== 3) {
        err(`板块「${sec.id}」模块「${mod.id}」必须有 3 条学习目标，当前 ${Array.isArray(mod.goal) ? mod.goal.length : 0} 条`);
      }
    }
  }
}

/* ─────────────── 8. 报告 ─────────────── */
const allItems = listItems();
const line = '─'.repeat(58);
console.log(`\n内容校验 · 小小百科`);
console.log(line);
console.log(`板块数量      ${SECTIONS.length}`);
console.log(`领域数量      ${TOPICS.length}`);
console.log(`知识点数量    ${allItems.length}（现有 ${existingIds.length} / 新增 ${allItems.length - existingIds.length}）`);
console.log(`课程矩阵落位  ${mapped.size}`);
console.log(`题目总数      ${Object.values(typeCount).reduce((a, b) => a + b, 0)}`);
console.log(`插画资源      ${artKeys.size} 个`);
console.log(line);
console.log('级别分布');
for (const lv of LEVEL_IDS) {
  console.log(`  ${lv}  ${String(levelCount[lv]).padStart(3)} 个`);
}
console.log(line);

if (warnings.length) {
  console.log(`\n提醒 ${warnings.length} 条`);
  warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
}
if (errors.length) {
  console.log(`\n错误 ${errors.length} 条（必须修复）`);
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  console.log('');
  process.exit(1);
}
console.log(`\n全部通过，可以提交。\n`);
process.exit(0);
