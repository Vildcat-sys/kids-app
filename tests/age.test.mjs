/**
 * age.test.mjs — 年龄分级测试
 *
 * 这里最要紧的一条断言是「分级确实起了作用」：
 * 如果哪天有人偷懒把 60 个知识点全标成两档通用，切档位就没有任何差别，
 * 而界面上**看不出来** —— 档位按钮还在、点击还有反馈，只是内容一模一样。
 * 这种静默失效必须由测试兜住。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TOPICS,
  AGE_BANDS,
  AGE_ALL,
  isValidAgeBand,
  isRealAgeBand,
  ageBandLabel,
  fitsAge,
  filterItemsByAge,
  getTopicsForAge,
  findTopicForAge,
  listItemsForAge,
  countItemsForAge,
  listItems,
} from '../src/data/index.js';

/* ─────────────── 数据完整性 ─────────────── */

test('每个知识点都归入了至少一个合法档位', () => {
  for (const { item } of listItems()) {
    assert.ok(
      Array.isArray(item.ageBands) && item.ageBands.length > 0,
      `${item.id} 缺少 ageBands`
    );
    for (const b of item.ageBands) {
      assert.ok(isRealAgeBand(b), `${item.id} 含非法档位「${b}」`);
    }
    assert.equal(
      new Set(item.ageBands).size,
      item.ageBands.length,
      `${item.id} 的 ageBands 有重复项`
    );
  }
});

test('每个档位在每个领域下都至少有一个知识点', () => {
  for (const band of AGE_BANDS) {
    for (const topic of getTopicsForAge(band.id)) {
      assert.ok(
        topic.items.length > 0,
        `档位 ${band.id} 下领域 ${topic.id} 为空，首页那张卡会消失`
      );
    }
  }
});

/* ─────────────── 档位判定 ─────────────── */

test('isValidAgeBand：真实档位与 all 都算合法', () => {
  assert.equal(isValidAgeBand(AGE_ALL), true);
  assert.equal(isValidAgeBand('3-5'), true);
  assert.equal(isValidAgeBand('6-8'), true);

  for (const bad of ['4-6', '', null, undefined, 3, {}]) {
    assert.equal(isValidAgeBand(bad), false, `「${String(bad)}」不应算合法`);
  }
});

test('isRealAgeBand 不把 all 当真实档位', () => {
  assert.equal(isRealAgeBand(AGE_ALL), false);
  assert.equal(isRealAgeBand('3-5'), true);
});

test('ageBandLabel 给出可读名称', () => {
  assert.equal(ageBandLabel('3-5'), '3-5 岁');
  assert.equal(ageBandLabel('6-8'), '6-8 岁');
  assert.equal(ageBandLabel(AGE_ALL), '全部');
  assert.equal(ageBandLabel('乱写的'), '全部', '未知档位应回落到「全部」');
});

/* ─────────────── 过滤行为 ─────────────── */

test('fitsAge：全部档位与空值一律通过', () => {
  const item = { id: 'x', ageBands: ['6-8'] };

  assert.equal(fitsAge(item, AGE_ALL), true);
  assert.equal(fitsAge(item, null), true);
  assert.equal(fitsAge(item, undefined), true);
  assert.equal(fitsAge(item, ''), true);

  assert.equal(fitsAge(item, '6-8'), true);
  assert.equal(fitsAge(item, '3-5'), false);
});

test('fitsAge：缺 ageBands 字段的知识点视为全档可见', () => {
  // 宁可多显示，也不要因为漏填字段让孩子看不到内容。
  // 漏填由 tools/validate-content.mjs 在提交前拦住。
  assert.equal(fitsAge({ id: 'x' }, '3-5'), true);
  assert.equal(fitsAge({ id: 'x', ageBands: [] }, '3-5'), true);
});

test('filterItemsByAge 在 all 档下原样返回，不产生新数组', () => {
  const items = [{ id: 'a', ageBands: ['3-5'] }];
  assert.equal(filterItemsByAge(items, AGE_ALL), items);
});

test('getTopicsForAge 过滤后不留下空领域', () => {
  for (const band of [AGE_ALL, '3-5', '6-8']) {
    for (const topic of getTopicsForAge(band)) {
      assert.ok(topic.items.length > 0, `${band} 档下 ${topic.id} 是空领域`);
    }
  }
});

test('findTopicForAge：领域不存在时返回 null', () => {
  assert.equal(findTopicForAge('geo', AGE_ALL)?.id, 'geo');
  assert.equal(findTopicForAge('geo', '3-5')?.id, 'geo');

  assert.equal(findTopicForAge('不存在的领域', AGE_ALL), null);
  assert.equal(findTopicForAge('不存在的领域', '3-5'), null);

  // 注意：findTopicForAge 里还有一条「该档下过滤后为空则返回 null」的分支，
  // 那是防御性代码 —— 当前数据下不可达，因为校验器强制要求每档每领域至少一个
  // 知识点（否则首页那张卡会整个消失）。所以这里不构造伪数据去测它。
});

test('findTopicForAge 返回的是副本，改动它不会污染原始数据', () => {
  const before = TOPICS[0].items.length;
  const filtered = findTopicForAge(TOPICS[0].id, '3-5');

  filtered.items.push({ id: '假数据' });

  assert.equal(TOPICS[0].items.length, before, '原始 TOPICS 被改动了');
});

/* ─────────────── 统计口径 ─────────────── */

test('countItemsForAge 与 listItemsForAge 长度一致', () => {
  for (const band of [AGE_ALL, '3-5', '6-8']) {
    assert.equal(
      countItemsForAge(band),
      listItemsForAge(band).length,
      `${band} 档两种统计口径不一致`
    );
  }
});

test('全量档位等于知识点总数', () => {
  assert.equal(countItemsForAge(AGE_ALL), listItems().length);
});

/* ─────────────── 分级有效性（防静默失效） ─────────────── */

test('低龄档内容必须少于全量，否则分级形同虚设', () => {
  const all = countItemsForAge(AGE_ALL);
  const young = countItemsForAge('3-5');

  assert.ok(young > 0, '低龄档不能为空');
  assert.ok(young < all, `3-5 档有 ${young} 个，全量 ${all} 个 —— 分级没有起作用`);
});

test('两个档位的内容不完全相同', () => {
  const young = new Set(listItemsForAge('3-5').map((x) => x.item.id));
  const old = new Set(listItemsForAge('6-8').map((x) => x.item.id));

  const sameSize = young.size === old.size;
  const identical = sameSize && [...young].every((id) => old.has(id));

  assert.equal(identical, false, '3-5 与 6-8 看到的内容完全一样，切档没有意义');
});

test('每个档位都有独占知识点（切档能看出差别）', () => {
  const young = new Set(listItemsForAge('3-5').map((x) => x.item.id));
  const old = new Set(listItemsForAge('6-8').map((x) => x.item.id));

  const youngOnly = [...young].filter((id) => !old.has(id));
  const oldOnly = [...old].filter((id) => !young.has(id));

  assert.ok(youngOnly.length > 0, '没有任何只在低龄档出现的内容');
  assert.ok(oldOnly.length > 0, '没有任何只在高龄档出现的内容');
});
