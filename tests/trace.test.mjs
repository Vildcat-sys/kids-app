/**
 * trace.test.mjs — 描红字帖纯函数测试
 *
 * 只测不碰 DOM 的纯逻辑：
 *   1. validate()：合法数据通过；char 缺失、strokes 非空数组、grid 取值等边界报错
 *   2. allStrokesDone() / strokeFraction()：当前笔进度与全部完成判定
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import trace, { allStrokesDone, strokeFraction } from '../src/quiz-types/trace.js';

const legal = {
  type: 'trace',
  q: '写一写：一',
  char: '一',
  grid: 'mi',
  strokes: [
    { d: 'M15 50 L85 50', tip: '横：起笔轻顿，行笔平稳，收笔再顿。' },
  ],
  why: '横要左低右高一点点。',
};

/* ─────────────── validate ─────────────── */

test('trace：合法数据通过，错误数组为空', () => {
  assert.deepEqual(trace.validate(legal), []);
});

test('trace：方格 grid 也合法', () => {
  assert.deepEqual(trace.validate({ ...legal, grid: 'square' }), []);
});

test('trace：char 缺失必须报错', () => {
  const errs = trace.validate({ ...legal, char: undefined });
  assert.ok(errs.some((e) => e.includes('char')), `未检出 char：${errs.join(' / ')}`);
});

test('trace：char 为空白字符串必须报错', () => {
  const errs = trace.validate({ ...legal, char: '   ' });
  assert.ok(errs.some((e) => e.includes('char')));
});

test('trace：strokes 不是数组必须报错', () => {
  for (const bad of [undefined, null, 'M15 50 L85 50', {}, 1]) {
    const errs = trace.validate({ ...legal, strokes: bad });
    assert.ok(errs.some((e) => e.includes('strokes')), `strokes=${String(bad)} 未报错`);
  }
});

test('trace：strokes 为空数组必须报错', () => {
  const errs = trace.validate({ ...legal, strokes: [] });
  assert.ok(errs.some((e) => e.includes('strokes') && e.includes('非空')));
});

test('trace：strokes 里某笔缺 d 必须报错', () => {
  const errs = trace.validate({
    ...legal,
    strokes: [{ d: 'M15 50 L85 50' }, { tip: '这笔没有 path' }],
  });
  assert.ok(errs.some((e) => e.includes('strokes[1].d')), `未检出缺 d：${errs.join(' / ')}`);
});

test('trace：非法 grid 取值必须报错', () => {
  const errs = trace.validate({ ...legal, grid: 'triangle' });
  assert.ok(errs.some((e) => e.includes("'mi'") && e.includes("'square'")));
});

test('trace：缺 q 必须报错', () => {
  const errs = trace.validate({ ...legal, q: undefined });
  assert.ok(errs.some((e) => e.includes('q')));
});

test('trace：null 输入不抛异常', () => {
  assert.doesNotThrow(() => trace.validate(null));
  assert.ok(Array.isArray(trace.validate(null)));
});

/* ─────────────── 笔顺进度 / 完成判定 ─────────────── */

test('allStrokesDone：未演示完不完成', () => {
  assert.equal(allStrokesDone(3, 0), false);
  assert.equal(allStrokesDone(3, 1), false);
  assert.equal(allStrokesDone(3, 2), false);  // 第 3 笔正在画，还没画完
});

test('allStrokesDone：演示完全部笔才完成', () => {
  assert.equal(allStrokesDone(3, 3), true);
  assert.equal(allStrokesDone(1, 1), true);
  assert.equal(allStrokesDone(3, 4), true);   // 多走了也只算完成一次
});

test('allStrokesDone：0 笔或非法入参不判完成', () => {
  assert.equal(allStrokesDone(0, 0), false);
  assert.equal(allStrokesDone(-1, 0), false);
  assert.equal(allStrokesDone(3, undefined), false);
});

test('strokeFraction：进度按笔数线性增长', () => {
  assert.equal(strokeFraction(3, 0), 0);
  assert.equal(strokeFraction(3, 1), 1 / 3);
  assert.equal(strokeFraction(3, 2), 2 / 3);
  assert.equal(strokeFraction(3, 3), 1);
});

test('strokeFraction：越界钳制在 0..1', () => {
  assert.equal(strokeFraction(3, -2), 0);
  assert.equal(strokeFraction(3, 9), 1);
});

test('strokeFraction：0 笔或非法入参返回 0', () => {
  assert.equal(strokeFraction(0, 0), 0);
  assert.equal(strokeFraction(-5, 1), 0);
  assert.equal(strokeFraction(3, 'x'), 0);
});

/* ─────────────── 模块契约 ─────────────── */

test('题型模块：id 为 trace，导出 validate/create', () => {
  assert.equal(trace.id, 'trace');
  assert.equal(typeof trace.name, 'string');
  assert.equal(typeof trace.validate, 'function');
  assert.equal(typeof trace.create, 'function');
});
