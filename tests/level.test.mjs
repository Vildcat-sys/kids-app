/**
 * level.test.mjs — S1–S6 级别体系测试
 *
 * 这个文件接手了 age.test.mjs 的岗位：**守住「分级真的起了作用」**。
 *
 * 为什么这条最要紧
 * ────────────────
 * 如果哪天有人图省事，把大半知识点塞进同一级、或者新增内容时忘了标级别，
 * 界面上**看不出来** —— 级别按钮还在、点击还有反馈、进度条照常走，
 * 只是切级别看到的内容几乎一样，或者某个阶段永远是空的。
 * 这种静默失效只能由测试兜住（校验器是提交门禁，测试是回归网）。
 *
 * 为什么从「年龄档」换成「级别」
 * ──────────────────────────────
 * ageBands 是**年龄轴**（这个内容适合几岁），级别是**认知轴**
 * （这个内容要求孩子会做什么）。两者相关但不等价。
 * 换轴之后分级是**单值**的：一个知识点只有一个级别。
 * 单值让筛选逻辑简单，也让「进度」有一个确定的分母。
 * 判据见 src/data/levels.js 头注。
 *
 * 注意：ageBands 年龄带字段已**整体作废**（2026-09-23 拍板 A），
 * item 上不再保留它。本文件最后一条用例反向守住「它真的被删干净了」，
 * 防止有人误回填 —— 筛选一律走 S1–S6 级别，不再有第二条年龄轴。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LEVELS,
  LEVEL_IDS,
  LEVEL_ALL,
  DEFAULT_LEVEL,
  LEVEL_IDS_WITH_ALL,
  levelOf,
  levelName,
  levelLabel,
  isValidLevel,
  levelIndex,
  isValidLevelFilter,
  levelFilterLabel,
  fitsLevel,
  filterItemsByLevel,
  getTopicsForLevel,
  findTopicForLevel,
  listItemsForLevel,
  countItemsForLevel,
  levelCounts,
  listItems,
} from '../src/data/index.js';
import { ITEM_LEVELS } from '../src/data/levels.js';

/* ─────────────── 数据完整性 ─────────────── */

test('每个知识点都标了级别', () => {
  for (const { item } of listItems()) {
    const lv = levelOf(item.id);
    assert.ok(lv, `${item.id} 没有级别 —— 它会从所有级别视图里消失`);
    assert.ok(isValidLevel(lv), `${item.id} 的级别「${lv}」不在 S1–S6 之内`);
  }
});

test('级别是单值的 —— 一个知识点只有一个级别', () => {
  // 有人把 levelOf 改成返回数组时，这条会先炸。
  // 单值是筛选逻辑简单的前提，破坏了它，countItemsForLevel 的分母就不可信。
  for (const { item } of listItems()) {
    assert.equal(typeof levelOf(item.id), 'string', `${item.id} 的级别不是单个字符串`);
  }
});

test('ITEM_LEVELS 里没有指向不存在知识点的死条目', () => {
  // 拼错 id 或删内容忘了清 levels.js，都会留下这种死条目。
  // 它不会让任何东西崩，只会让后来的人以为那个知识点还在。
  const known = new Set(listItems().map(({ item }) => item.id));
  const orphans = Object.keys(ITEM_LEVELS).filter((id) => !known.has(id));
  assert.deepEqual(orphans, [], `levels.js 里这些 id 在内容里不存在：${orphans.join(', ')}`);
});

test('每一级都有内容，否则那个阶段会白屏', () => {
  const counts = levelCounts();
  for (const lv of LEVEL_IDS) {
    assert.ok(counts[lv] > 0, `级别 ${lv} 下没有任何知识点`);
  }
});

/* ─────────────── 分级有效性（防静默失效） ─────────────── */

test('级别分布不能退化成「一级独大」', () => {
  // 全部塞进一级的话，级别条就只是个装饰。当前最大一级约占 24%。
  const counts = levelCounts();
  const total = listItems().length;
  const max = Math.max(...LEVEL_IDS.map((lv) => counts[lv]));

  assert.ok(
    max / total < 0.5,
    `有一级占了 ${Math.round((max / total) * 100)}% 的内容，分级形同虚设`
  );
});

test('相邻两级不能是同一批内容', () => {
  const sets = new Map(LEVEL_IDS.map((lv) => [lv, new Set()]));
  for (const { item } of listItems()) {
    const lv = levelOf(item.id);
    if (sets.has(lv)) sets.get(lv).add(item.id);
  }

  for (let i = 0; i + 1 < LEVEL_IDS.length; i += 1) {
    const a = sets.get(LEVEL_IDS[i]);
    const b = sets.get(LEVEL_IDS[i + 1]);
    const identical = a.size === b.size && [...a].every((id) => b.has(id));
    assert.equal(identical, false, `${LEVEL_IDS[i]} 与 ${LEVEL_IDS[i + 1]} 看到的内容完全一样`);
  }
});

test('低级不能比高级内容还多', () => {
  // 「难度螺旋上升」的粗略体现：底部可以重，但不能倒挂。
  // S1 与 S6 两端最典型：入门内容必须多于迁移级内容。
  assert.ok(
    countItemsForLevel('S1') > countItemsForLevel('S6'),
    `S1 有 ${countItemsForLevel('S1')} 个，S6 有 ${countItemsForLevel('S6')} 个 —— 倒挂了`
  );
});

/* ─────────────── 级别元数据 ─────────────── */

test('LEVELS 每级都有 id / name / desc', () => {
  for (const lv of LEVELS) {
    assert.ok(lv.id, '有一级缺 id');
    assert.ok(lv.name, `级别 ${lv.id} 缺 name`);
    assert.ok(lv.desc, `级别 ${lv.id} 缺 desc —— 板块页那句描述会空着`);
  }
});

test('LEVEL_IDS 顺序是 S1…S6', () => {
  assert.deepEqual(LEVEL_IDS, ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
});

test('levelName / levelLabel 取不到时原样返回，不显示 undefined', () => {
  assert.equal(levelName('S1'), '感知');
  assert.equal(levelLabel('S1'), 'S1 感知');

  assert.equal(levelLabel('乱写的'), '乱写的');
  assert.notEqual(String(levelLabel('S9')), 'undefined', '未知级别不该渲染成字符串 undefined');
});

test('isValidLevel：all 不算真实级别', () => {
  assert.equal(isValidLevel('S1'), true);
  assert.equal(isValidLevel('S6'), true);
  assert.equal(isValidLevel(LEVEL_ALL), false, 'all 是筛选值，不是级别');

  for (const bad of ['S7', 's1', 'S0', '', null, undefined, 1, {}]) {
    assert.equal(isValidLevel(bad), false, `「${String(bad)}」不应算合法级别`);
  }
});

test('levelIndex 从 0 递增到 5', () => {
  assert.equal(levelIndex('S1'), 0);
  assert.equal(levelIndex('S6'), 5);

  for (let i = 1; i < LEVEL_IDS.length; i += 1) {
    assert.ok(
      levelIndex(LEVEL_IDS[i]) > levelIndex(LEVEL_IDS[i - 1]),
      `${LEVEL_IDS[i]} 的序号没有大于 ${LEVEL_IDS[i - 1]}`
    );
  }
});

/* ─────────────── 筛选白名单 ─────────────── */

test('LEVEL_IDS_WITH_ALL 含 all 与全部真实级别', () => {
  assert.equal(LEVEL_IDS_WITH_ALL.length, LEVEL_IDS.length + 1);
  assert.equal(LEVEL_IDS_WITH_ALL.includes(LEVEL_ALL), true);
  for (const lv of LEVEL_IDS) {
    assert.equal(LEVEL_IDS_WITH_ALL.includes(lv), true, `白名单漏了 ${lv}`);
  }
});

test('isValidLevelFilter 认 all 与 S1–S6，不认别的', () => {
  assert.equal(isValidLevelFilter(LEVEL_ALL), true);
  assert.equal(isValidLevelFilter('S3'), true);

  for (const bad of ['S7', '3-5', '', null, undefined]) {
    assert.equal(isValidLevelFilter(bad), false, `「${String(bad)}」不应算合法筛选值`);
  }
});

test('levelFilterLabel 把 all 显示成「全部」', () => {
  assert.equal(levelFilterLabel(LEVEL_ALL), '全部');
  assert.equal(levelFilterLabel('S2'), 'S2 辨认');
});

test('默认级别是「全部」—— 家长没选过之前不替他砍内容', () => {
  assert.equal(DEFAULT_LEVEL, LEVEL_ALL);
});

/* ─────────────── 过滤行为 ─────────────── */

test('fitsLevel：all 与空值一律通过', () => {
  const item = { id: 'x' };

  assert.equal(fitsLevel(item, LEVEL_ALL), true);
  assert.equal(fitsLevel(item, null), true);
  assert.equal(fitsLevel(item, undefined), true);
  assert.equal(fitsLevel(item, ''), true);
});

test('fitsLevel：按级别单值比较', () => {
  const { item } = listItems()[0];
  const lv = levelOf(item.id);
  const other = LEVEL_IDS.find((x) => x !== lv);

  assert.equal(fitsLevel(item, lv), true, `${item.id} 应出现在自己的级别 ${lv} 里`);
  assert.equal(fitsLevel(item, other), false, `${item.id} 是 ${lv}，不该出现在 ${other} 里`);
});

test('fitsLevel：漏标级别的知识点视为全级可见', () => {
  // 宁可多显示，也不要因为漏标让孩子看不到内容。
  // 漏标由 tools/validate-content.mjs 在提交前拦住。
  assert.equal(fitsLevel({ id: '从没标过的id' }, 'S3'), true);
});

test('filterItemsByLevel 在 all 下原样返回，不产生新数组', () => {
  const items = [{ id: 'a' }];
  assert.equal(filterItemsByLevel(items, LEVEL_ALL), items);
});

test('filterItemsByLevel 在真实级别下不修改原数组', () => {
  const items = listItemsForLevel(LEVEL_ALL).map(({ item }) => item);
  const before = items.length;

  filterItemsByLevel(items, 'S1');

  assert.equal(items.length, before, '过滤时改动了传入的数组');
});

test('getTopicsForLevel 过滤后不留下空领域', () => {
  for (const lv of [LEVEL_ALL, ...LEVEL_IDS]) {
    for (const topic of getTopicsForLevel(lv)) {
      assert.ok(topic.items.length > 0, `${lv} 下领域「${topic.id}」是空领域，那张卡会空着`);
    }
  }
});

test('findTopicForLevel：领域不存在时返回 null', () => {
  assert.equal(findTopicForLevel('geo', LEVEL_ALL)?.id, 'geo');
  assert.equal(findTopicForLevel('geo', 'S3')?.id, 'geo');

  assert.equal(findTopicForLevel('不存在的领域', LEVEL_ALL), null);
  assert.equal(findTopicForLevel('不存在的领域', 'S3'), null);
});

test('findTopicForLevel：该级别下过滤后为空则返回 null', () => {
  // 防御性分支 —— 当前数据下不可达（校验器强制每一级都有内容）。
  // 用伪 id 走一遍，确认它返回 null 而不是抛异常。
  assert.equal(findTopicForLevel('geo', 'S9'), null, '非法级别不该崩，应回落');
});

/* ─────────────── 统计口径 ─────────────── */

test('countItemsForLevel 与 listItemsForLevel 长度一致', () => {
  for (const lv of [LEVEL_ALL, ...LEVEL_IDS]) {
    assert.equal(
      countItemsForLevel(lv),
      listItemsForLevel(lv).length,
      `${lv} 两种统计口径不一致 —— 进度条分母会和实际列表对不上`
    );
  }
});

test('全量级别等于知识点总数', () => {
  assert.equal(countItemsForLevel(LEVEL_ALL), listItems().length);
});

test('每一级的内容都少于全量', () => {
  const all = countItemsForLevel(LEVEL_ALL);
  for (const lv of LEVEL_IDS) {
    const n = countItemsForLevel(lv);
    assert.ok(n > 0, `${lv} 是空的`);
    assert.ok(n < all, `${lv} 有 ${n} 个，全量 ${all} 个 —— 级别筛选没有起作用`);
  }
});

test('levelCounts 与逐级实测一致', () => {
  const counts = levelCounts();
  for (const lv of LEVEL_IDS) {
    assert.equal(
      counts[lv],
      listItemsForLevel(lv).length,
      `${lv} 的计数与实际列表对不上 —— 级别条上的数字会骗人`
    );
  }
});

test('每级的计数之和等于知识点总数', () => {
  const counts = levelCounts();
  const sum = LEVEL_IDS.reduce((n, lv) => n + counts[lv], 0);
  assert.equal(sum, listItems().length, '有知识点没被算进任何一级（或重复计入）');
});

/* ─────────────── ageBands 已作废（拍板 A） ─────────────── */

test('ageBands 字段已从全部知识点删除（不再有第二条年龄轴）', () => {
  // 拍板 A：年龄轴被认知级别（S1–S6）取代。这条反向守住「删干净」，
  // 防止有人按旧规格把 ageBands 又回填回来 —— 回填了校验器也不会拦（规则已撤）。
  for (const { item } of listItems()) {
    assert.ok(
      !('ageBands' in item),
      `${item.id} 仍带着已作废的 ageBands 字段 —— 请删掉它`
    );
  }
});
