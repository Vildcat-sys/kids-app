/**
 * quiz.test.mjs — 题型引擎测试
 *
 * 重点覆盖两类问题：
 *   1. seededShuffle 的确定性 —— 一旦失去确定性，同一道题每次呈现顺序不同，
 *      孩子会困惑，测试也无法复现
 *   2. 各题型 validate 的边界 —— 这是内容错误的主要来源，必须锁死
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { seededShuffle } from '../src/core/util.js';
import { getQuizType, listQuizTypeIds } from '../src/quiz-types/index.js';
import { TOPICS } from '../src/data/index.js';

/* ─────────────── seededShuffle ─────────────── */

test('seededShuffle：同一 seed 结果完全一致', () => {
  const src = ['a', 'b', 'c', 'd', 'e'];
  const first = seededShuffle(src, 'seed-1');
  const second = seededShuffle(src, 'seed-1');
  assert.deepEqual(first, second);
});

test('seededShuffle：不同 seed 结果不同', () => {
  const src = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const a = seededShuffle(src, 'seed-A');
  const b = seededShuffle(src, 'seed-B');
  assert.notDeepEqual(a, b);
});

test('seededShuffle：不修改原数组，且元素不增不减', () => {
  const src = ['a', 'b', 'c', 'd'];
  const snapshot = src.slice();
  const out = seededShuffle(src, 'x');

  assert.deepEqual(src, snapshot, '原数组被修改了');
  assert.equal(out.length, src.length);
  assert.deepEqual(out.slice().sort(), snapshot.slice().sort());
});

test('seededShuffle：空数组与单元素数组直接返回', () => {
  assert.deepEqual(seededShuffle([], 'x'), []);
  assert.deepEqual(seededShuffle(['only'], 'x'), ['only']);
});

/* ─────────────── 题型注册表 ─────────────── */

test('每种已注册题型都实现了完整契约', () => {
  for (const id of listQuizTypeIds()) {
    const impl = getQuizType(id);
    assert.equal(typeof impl.id, 'string', `${id} 缺少 id`);
    assert.equal(impl.id, id, `${id} 的 id 与注册 key 不一致`);
    assert.equal(typeof impl.name, 'string', `${id} 缺少 name`);
    assert.equal(typeof impl.validate, 'function', `${id} 缺少 validate`);
    assert.equal(typeof impl.create, 'function', `${id} 缺少 create`);
  }
});

test('getQuizType 对未知类型返回 null 而不是抛异常', () => {
  assert.equal(getQuizType('不存在的题型'), null);
});

/* ─────────────── 各题型 validate ─────────────── */

test('choice：合法数据通过', () => {
  const impl = getQuizType('choice');
  assert.deepEqual(
    impl.validate({ type: 'choice', q: '问题', opts: ['甲', '乙', '丙'], a: 1, why: '解释' }),
    []
  );
});

test('choice：答案下标越界必须报错', () => {
  const impl = getQuizType('choice');
  const errs = impl.validate({ type: 'choice', q: '问题', opts: ['甲', '乙'], a: 5, why: '解释' });
  assert.ok(errs.some((e) => e.includes('越界')), `未检出越界：${errs.join(' / ')}`);
});

test('choice：重复选项必须报错', () => {
  const impl = getQuizType('choice');
  const errs = impl.validate({ type: 'choice', q: '问题', opts: ['甲', '甲', '乙'], a: 0, why: '解释' });
  assert.ok(errs.some((e) => e.includes('重复')), `未检出重复：${errs.join(' / ')}`);
});

test('choice：缺 why 必须报错', () => {
  const impl = getQuizType('choice');
  const errs = impl.validate({ type: 'choice', q: '问题', opts: ['甲', '乙'], a: 0 });
  assert.ok(errs.some((e) => e.includes('why')));
});

test('listen：opts[a] 与 word 不一致必须报错（这是听音题最容易犯的错）', () => {
  const impl = getQuizType('listen');
  const errs = impl.validate({
    type: 'listen',
    q: '听一听',
    word: 'apple',
    zh: '苹果',
    opts: ['banana', 'orange', 'apple'],
    a: 0,
    why: '解释',
  });
  assert.ok(errs.some((e) => e.includes('应等于 word')), `未检出不一致：${errs.join(' / ')}`);
});

test('listen：缺 q 必须报错（否则答题框标题会空白）', () => {
  const impl = getQuizType('listen');
  const errs = impl.validate({
    type: 'listen',
    word: 'apple',
    zh: '苹果',
    opts: ['apple', 'orange', 'banana'],
    a: 0,
    why: '解释',
  });
  assert.ok(errs.some((e) => e.includes('缺少 q')), `未检出缺 q：${errs.join(' / ')}`);
});

test('listen：正确数据通过', () => {
  const impl = getQuizType('listen');
  assert.deepEqual(
    impl.validate({
      type: 'listen',
      q: '听一听',
      word: 'apple',
      zh: '苹果',
      opts: ['apple', 'orange', 'banana'],
      a: 0,
      why: '解释',
    }),
    []
  );
});

test('order：重复项必须报错', () => {
  const impl = getQuizType('order');
  const errs = impl.validate({ type: 'order', q: '排序', seq: ['甲', '乙', '甲'], why: '解释' });
  assert.ok(errs.some((e) => e.includes('重复')));
});

test('order：超过 6 项给出过载提醒', () => {
  const impl = getQuizType('order');
  const errs = impl.validate({
    type: 'order',
    q: '排序',
    seq: ['1', '2', '3', '4', '5', '6', '7'],
    why: '解释',
  });
  assert.ok(errs.some((e) => e.includes('过载')));
});

test('match：左项或右项重复必须报错', () => {
  const impl = getQuizType('match');

  const dupLeft = impl.validate({
    type: 'match',
    q: '配对',
    pairs: [['甲', '一'], ['甲', '二']],
    why: '解释',
  });
  assert.ok(dupLeft.some((e) => e.includes('左项必须唯一')));

  const dupRight = impl.validate({
    type: 'match',
    q: '配对',
    pairs: [['甲', '一'], ['乙', '一']],
    why: '解释',
  });
  assert.ok(dupRight.some((e) => e.includes('右项必须唯一')));
});

test('match：pairs 元素不是两元组必须报错', () => {
  const impl = getQuizType('match');
  const errs = impl.validate({ type: 'match', q: '配对', pairs: [['甲'], ['乙', '二']], why: '解释' });
  assert.ok(errs.some((e) => e.includes('两元组')));
});

/* ─────────────── 全量内容回归 ─────────────── */

test('线上所有真实内容的 validate 全部通过', () => {
  for (const topic of TOPICS) {
    for (const item of topic.items) {
      const impl = getQuizType(item.quiz.type);
      const errs = impl.validate(item.quiz) || [];
      assert.deepEqual(errs, [], `${item.id} 的题目校验失败：${errs.join(' / ')}`);
    }
  }
});
