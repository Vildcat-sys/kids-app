/**
 * data/index.js — 内容注册表
 *
 * 唯一的内容入口。UI 层只从这里取数据，不直接 import 具体领域文件，
 * 这样新增领域时只需在下方数组里加一行，其余代码零改动。
 *
 * ═══════════════════════════════════════════════════════════════
 * 两套组织方式，各管一件事（2026-09-23 重构）
 * ═══════════════════════════════════════════════════════════════
 *
 *   板块（SECTIONS，7 个）—— 家长认得的分类：思维/英语/阅读/美术/写字/音乐/科学
 *                            决定首页长什么样，是**导航**用的。
 *   级别（LEVELS，S1–S6） —— 认知台阶，决定一个知识点多难，
 *                            是**筛选**用的（取代原来的 3-5/6-8 年龄档位）。
 *
 * 两者是正交的：思维板块里有 S1 也有 S6，S3 里既有科学也有英语。
 * 所以它们是两张独立的表，不要试图把其中一个塞进另一个。
 *
 * 领域（TOPICS，6 个）降级为**内容容器**，不再直接出现在首页。
 * 它仍然存在，因为内容文件按领域组织、插画按领域归档，
 * 而且「生活科普」和「地理军事」的区别对内容团队是有意义的。
 */

import science from './science.js';
import geo from './geo.js';
import culture from './culture.js';
import logic from './logic.js';
import space from './space.js';
import english from './english.js';
import art from './art.js';
import writing from './writing.js';
import music from './music.js';

import { SECTIONS, PLANNED_COPY, findSection, activeSections, plannedSections, isPlanned } from './sections.js';
import {
  LEVELS,
  LEVEL_IDS,
  levelOf,
  levelName,
  levelLabel,
  isValidLevel,
  levelIndex,
} from './levels.js';

export {
  SECTIONS,
  PLANNED_COPY,
  findSection,
  activeSections,
  plannedSections,
  isPlanned,
  LEVELS,
  LEVEL_IDS,
  levelOf,
  levelName,
  levelLabel,
  isValidLevel,
  levelIndex,
};

/** 领域顺序即内容文件里的顺序 */
export const TOPICS = [science, geo, culture, logic, space, english, art, writing, music];

/* ═══════════════════════════════════════════════════════════════
 * 级别筛选
 * ═══════════════════════════════════════════════════════════════
 *
 * 为什么用「当前级别」而不是「当前年龄段」
 *   原来按 3-5 / 6-8 筛，家长要先把「我孩子几岁」翻译成「哪些内容合适」，
 *   这个翻译由我们替他做，做错了还不容易发现。
 *   改成按级别筛，家长直接对着「他现在会不会比较大小」判断，判据离问题更近。
 *
 * 一个知识点只有一个级别
 *   不像年龄档位可以跨档（一个内容 3 岁 8 岁都能看），认知台阶是单值的：
 *   它要么要求孩子会推理，要么不要求。单值让筛选逻辑简单，也让「进度」
 *   有一个确定的分母。
 */

/** 特殊值：不过滤，看全部内容 */
export const LEVEL_ALL = 'all';

/**
 * 默认级别。首次进入用「全部」——
 * 家长还没选过之前，不该替他把内容砍掉一半。
 */
export const DEFAULT_LEVEL = LEVEL_ALL;

/**
 * 全部合法级别 id（含 'all'）。
 *
 * 存在的理由是**分层纪律**：core/prefs.js 属于基础设施层，不允许 import 内容数据
 * （见 docs/CODE-REVIEW.md 第二节「核心层变更」）。所以由 main.js 把这个白名单
 * 从数据层取出来、注入进 prefs，core 层不需要知道「级别」到底有哪几个取值。
 */
export const LEVEL_IDS_WITH_ALL = [LEVEL_ALL, ...LEVEL_IDS];

const ALL_LEVEL_IDS = new Set(LEVEL_IDS_WITH_ALL);

/** 是否是合法级别（含 'all'） */
export function isValidLevelFilter(level) {
  return ALL_LEVEL_IDS.has(level);
}

/** 级别的显示名，'all' 显示为「全部」 */
export function levelFilterLabel(level) {
  if (level === LEVEL_ALL) return '全部';
  return levelLabel(level);
}

/**
 * 单个知识点是否属于某个级别。
 * 没标级别的知识点一律视为「全级可见」——
 * 宁可多显示，也不要因为漏标让内容凭空消失（校验器会另外报错拦住漏标）。
 */
export function fitsLevel(item, level) {
  if (!level || level === LEVEL_ALL) return true;
  const lv = levelOf(item.id);
  if (!lv) return true;
  return lv === level;
}

/** 按级别过滤知识点数组。'all' 时原样返回，不产生新数组。 */
export function filterItemsByLevel(items, level) {
  if (!level || level === LEVEL_ALL) return items;
  return items.filter((item) => fitsLevel(item, level));
}

/** 按级别过滤领域列表。过滤后没有知识点的领域会整个消失（不留空卡）。 */
export function getTopicsForLevel(level) {
  if (!level || level === LEVEL_ALL) return TOPICS;
  return TOPICS.map((topic) => ({ ...topic, items: filterItemsByLevel(topic.items, level) })).filter(
    (topic) => topic.items.length > 0
  );
}

/** 按级别找领域，找不到或该级别下为空则返回 null */
export function findTopicForLevel(topicId, level) {
  const topic = findTopic(topicId);
  if (!topic) return null;
  if (!level || level === LEVEL_ALL) return topic;
  const items = filterItemsByLevel(topic.items, level);
  return items.length ? { ...topic, items } : null;
}

/** 按级别列出全部知识点（含所属领域），供顶栏统计与校验使用 */
export function listItemsForLevel(level) {
  return getTopicsForLevel(level).flatMap((topic) =>
    topic.items.map((item) => ({ item, topic }))
  );
}

/** 按级别统计知识点总数 —— 进度条的分母，必须跟着级别变 */
export function countItemsForLevel(level) {
  if (!level || level === LEVEL_ALL) return itemIndex.size;
  let n = 0;
  for (const topic of TOPICS) {
    for (const item of topic.items) if (fitsLevel(item, level)) n += 1;
  }
  return n;
}

/* ═══════════════════════════════════════════════════════════════
 * 板块查询
 * ═══════════════════════════════════════════════════════════════
 *
 * 板块把领域包了一层。首页展示 7 个板块，板块页再往下拆到领域。
 *
 * 空板块（planned）的处理：**照样返回，但要带上 planned 标记**。
 * UI 拿到 planned 就渲染成不可进入的「规划中」卡片。
 * 校验器保证 planned 板块 topics 为空、非 planned 板块 topics 非空 ——
 * 所以 UI 不需要再判「这个板块是不是其实没内容」。
 */

/**
 * 板块下全部知识点（跨领域合并，已按级别过滤）。
 * @param {string} sectionId
 * @param {string} [level] 级别过滤器，'all' 或省略表示不过滤
 */
export function itemsOfSection(sectionId, level) {
  const section = findSection(sectionId);
  if (!section || section.planned) return [];
  const out = [];
  for (const topicId of section.topics) {
    const topic = findTopic(topicId);
    if (!topic) continue;
    for (const item of topic.items) {
      if (fitsLevel(item, level)) out.push({ item, topic });
    }
  }
  return out;
}

/** 板块下的领域对象（已按级别过滤掉空领域） */
export function topicsOfSection(sectionId, level) {
  const section = findSection(sectionId);
  if (!section || section.planned) return [];
  return section.topics
    .map((id) => findTopicForLevel(id, level))
    .filter(Boolean);
}

/**
 * 全部板块 + 各自的进度统计，供首页渲染。
 *
 * 返回每一项都带 total / learned / review / pct，
 * 所以首页不需要自己遍历领域去算 —— 统计口径只在这一个地方定义。
 *
 * @param {object} store 进度存储
 * @param {string} [level] 级别过滤器
 */
export function sectionsWithProgress(store, level) {
  return SECTIONS.map((section) => {
    const entries = itemsOfSection(section.id, level);
    const total = entries.length;
    const learned = entries.filter(({ item }) => store.has(item.id)).length;
    const review = entries.filter(
      ({ item }) => store.has(item.id) && store.needsReview(item.id)
    ).length;
    return {
      ...section,
      total,
      learned,
      review,
      pct: total === 0 ? 0 : Math.round((learned / total) * 100),
      // 封面取板块内第一个知识点的插画，空板块没有封面
      coverKey: entries.length > 0 ? entries[0].item.art : '',
    };
  });
}

/** 知识点所属板块，找不到返回 null */
export function sectionOfTopic(topicId) {
  return SECTIONS.find((s) => s.topics.includes(topicId)) || null;
}

/** 知识点所属板块（按知识点 id 查） */
export function sectionOfItem(itemId) {
  const hit = itemIndex.get(itemId);
  return hit ? sectionOfTopic(hit.topic.id) : null;
}

/** 每个级别各有多少知识点，供级别选择条显示数字 */
export function levelCounts() {
  const counts = {};
  for (const id of LEVEL_IDS) counts[id] = 0;
  for (const { item } of itemIndex.values()) {
    const lv = levelOf(item.id);
    if (lv && counts[lv] !== undefined) counts[lv] += 1;
  }
  return counts;
}

/* ═══════════════════════════════════════════════════════════════
 * 索引与查找
 * ═══════════════════════════════════════════════════════════════
 */

/** 拍平成「知识点 id -> { item, topic }」的索引，避免每次查找都双层遍历 */
const itemIndex = new Map();
for (const topic of TOPICS) {
  for (const item of topic.items) {
    itemIndex.set(item.id, { item, topic });
  }
}

/** 按 id 找领域 */
export function findTopic(topicId) {
  return TOPICS.find((t) => t.id === topicId) || null;
}

/** 按 id 找知识点，返回 { item, topic } 或 null */
export function findItem(itemId) {
  return itemIndex.get(itemId) || null;
}

/** 知识点所属领域 */
export function topicOfItem(itemId) {
  const hit = itemIndex.get(itemId);
  return hit ? hit.topic : null;
}

/** 全部知识点（含所属领域），用于首页统计与校验 */
export function listItems() {
  return Array.from(itemIndex.values());
}

/** 知识点总数 */
export function totalItemCount() {
  return itemIndex.size;
}

/** 领域总数 */
export function totalTopicCount() {
  return TOPICS.length;
}

/** 板块总数 */
export function totalSectionCount() {
  return SECTIONS.length;
}
