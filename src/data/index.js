/**
 * data/index.js — 内容注册表
 *
 * 唯一的内容入口。UI 层只从这里取数据，不直接 import 具体领域文件，
 * 这样新增领域时只需在下方数组里加一行，其余代码零改动。
 */

import science from './science.js';
import geo from './geo.js';
import culture from './culture.js';
import logic from './logic.js';
import space from './space.js';
import english from './english.js';

/** 领域顺序即首页展示顺序 */
export const TOPICS = [science, geo, culture, logic, space, english];

/* ═══════════════════════════════════════════════════════════════
 * 主题分组
 * ═══════════════════════════════════════════════════════════════
 *
 * 为什么是 4 组，而不是参考产品那样的「自然 / 人文 / 科技」3 组
 *   参考产品的三分法是照它的内容长出来的，我们是六个领域，硬套会让分组名和内容对不上：
 *   「地理军事」算自然还是人文？「逻辑思维」跟科技没关系。
 *   分组的意义是**让知识有结构**，不是让结构看起来整齐。所以按我们的内容实际切成 4 组。
 *
 * 为什么分组只用在「我的地图」，不用在首页
 *   首页的 6 张领域卡已经是「每次只面对 6 个选项」，认知负担足够了。
 *   再加一层分组，只是多一次点击，没有减少选择 —— 分组要长在能看到结构的地方，
 *   也就是地图页。首页保持最短路径：一点就进领域。
 *
 * 新增领域时别忘了在这里登记
 *   忘登记不会报错，但该领域会从地图页**静默消失**。
 *   `npm run validate` 里有断言兜底：任何未分组的领域会直接报错误。
 */

/**
 * 主题分组定义。顺序即地图页从上到下的展示顺序。
 * topics 存领域 id 而非对象 —— 避免和 TOPICS 形成循环引用。
 */
export const GROUPS = [
  {
    id: 'world',
    name: '看世界',
    tagline: '身边的大自然，和脚下的土地',
    accent: '#2E7D5B',
    topics: ['science', 'geo'],
  },
  {
    id: 'people',
    name: '看人类',
    tagline: '人想出来的办法，造出来的东西',
    accent: '#B5651D',
    topics: ['culture'],
  },
  {
    id: 'mind',
    name: '动脑筋',
    tagline: '找规律、想形状、脑子转个弯',
    accent: '#5B4FA8',
    topics: ['logic', 'space'],
  },
  {
    id: 'words',
    name: '学说话',
    tagline: '认识另一个世界的说法',
    accent: '#185FA5',
    topics: ['english'],
  },
];

/**
 * 按档位取分组，组内领域已按档位过滤，全空的组整组消失。
 * 返回结构与 GROUPS 相同，只是 topics 从 id 数组换成领域对象数组。
 */
export function getGroupsForAge(band) {
  const byId = new Map(getTopicsForAge(band).map((t) => [t.id, t]));
  return GROUPS.map((g) => ({
    ...g,
    topics: g.topics.map((id) => byId.get(id)).filter(Boolean),
  })).filter((g) => g.topics.length > 0);
}

/* ═══════════════════════════════════════════════════════════════
 * 年龄分级
 * ═══════════════════════════════════════════════════════════════
 *
 * 为什么要分级
 *   3 岁和 8 岁的认知差距，比 8 岁和 15 岁的差距还大。不分级意味着
 *   3 岁孩子会撞上「传递推理」这种他完全无从下手的题，而 8 岁孩子
 *   又要陪着看「蜜蜂有 6 条腿」。同一个应用没法同时服务两端。
 *
 * 分档判据（新内容照这个来）
 *   低龄档（3-5）：看得见、摸得着、能动手；家长配着插画一句话能讲清。
 *   高龄档（6-8）：需要想一步、需要比较、带原理或带历史背景。
 *
 * 为什么是数组而不是单个档位
 *   大部分知识点天然跨档 ——「磁铁」3 岁能玩、8 岁也能懂磁极。
 *   用单值字段会被迫硬归档，切档时内容白白缩水。
 *
 * 为什么详情页不做过滤
 *   孩子正停在一个知识点上，家长切了档位，不该把内容从他眼前抽走。
 *   过滤只发生在「列目录」的两个地方：首页与领域页。
 */

/** 档位定义。顺序即 UI 上按钮的顺序。 */
export const AGE_BANDS = [
  { id: '3-5', label: '3-5 岁', short: '3-5' },
  { id: '6-8', label: '6-8 岁', short: '6-8' },
];

/** 特殊值：不过滤，看全部内容 */
export const AGE_ALL = 'all';

/** 默认档位。首次进入时用「全部」，避免家长跳过引导后内容被悄悄砍掉一半。 */
export const DEFAULT_AGE_BAND = AGE_ALL;

/**
 * 全部合法档位 id（含 'all'）。
 *
 * 存在的理由是**分层纪律**：core/prefs.js 属于基础设施层，不允许 import 内容数据
 * （见 docs/CODE-REVIEW.md 第二节「核心层变更」）。所以由 main.js 把这个白名单
 * 从数据层取出来、注入进 prefs，core 层不需要知道「年龄档位」到底有哪几个取值。
 */
export const AGE_BAND_IDS = [AGE_ALL, ...AGE_BANDS.map((b) => b.id)];

const BAND_IDS = new Set(AGE_BANDS.map((b) => b.id));
const ALL_BAND_IDS = new Set(AGE_BAND_IDS);

/** 是否是合法档位（含 'all'） */
export function isValidAgeBand(band) {
  return ALL_BAND_IDS.has(band);
}

/** 是否是合法档位（不含 'all'），校验器用 */
export function isRealAgeBand(band) {
  return BAND_IDS.has(band);
}

/** 档位显示名，'all' 显示为「全部」 */
export function ageBandLabel(band) {
  if (band === AGE_ALL) return '全部';
  const hit = AGE_BANDS.find((b) => b.id === band);
  return hit ? hit.label : '全部';
}

/**
 * 单个知识点是否适合某个档位。
 * 缺 ageBands 字段的知识点一律视为「全档可见」——
 * 宁可多显示，也不要因为漏填字段让孩子看不到内容。
 */
export function fitsAge(item, band) {
  if (!band || band === AGE_ALL) return true;
  if (!Array.isArray(item.ageBands) || item.ageBands.length === 0) return true;
  return item.ageBands.includes(band);
}

/** 按档位过滤知识点数组。'all' 时原样返回，不产生新数组。 */
export function filterItemsByAge(items, band) {
  if (!band || band === AGE_ALL) return items;
  return items.filter((item) => fitsAge(item, band));
}

/** 按档位过滤领域列表。过滤后没有知识点的领域会整个消失（首页不留空卡）。 */
export function getTopicsForAge(band) {
  if (!band || band === AGE_ALL) return TOPICS;
  return TOPICS.map((topic) => ({ ...topic, items: filterItemsByAge(topic.items, band) })).filter(
    (topic) => topic.items.length > 0
  );
}

/** 按档位找领域，找不到或该档下为空则返回 null */
export function findTopicForAge(topicId, band) {
  const topic = findTopic(topicId);
  if (!topic) return null;
  if (!band || band === AGE_ALL) return topic;
  const items = filterItemsByAge(topic.items, band);
  return items.length ? { ...topic, items } : null;
}

/** 按档位列出全部知识点（含所属领域），供顶栏统计与校验使用 */
export function listItemsForAge(band) {
  return getTopicsForAge(band).flatMap((topic) =>
    topic.items.map((item) => ({ item, topic }))
  );
}

/** 按档位统计知识点总数 —— 进度条的分母，必须跟着档位变 */
export function countItemsForAge(band) {
  if (!band || band === AGE_ALL) return itemIndex.size;
  let n = 0;
  for (const topic of TOPICS) {
    for (const item of topic.items) if (fitsAge(item, band)) n += 1;
  }
  return n;
}

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
