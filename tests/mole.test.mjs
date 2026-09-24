/**
 * mole.test.mjs — 打地鼠纯函数测试（不碰 DOM）
 *
 * 覆盖：
 *   1. validate()：合法/非法数据（duration 正数、moles ≥2 且 target 布尔）
 *   2. 计分纯函数 createScore / updateScore
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import mole, { createScore, updateScore } from '../src/quiz-types/mole.js';

const validQuiz = {
  type: 'mole',
  q: '找出所有「圆形」的东西',
  duration: 20,
  moles: [
    { label: '皮球', target: true },
    { label: '积木', target: false },
    { label: '篮球', target: true },
  ],
  why: '圆的东西滚得快。',
};

/* ─────────────── validate ─────────────── */

test('mole：合法数据通过（返回空错误数组）', () => {
  assert.deepEqual(mole.validate(validQuiz), []);
});

test('mole：id 为 mole，name 非空', () => {
  assert.equal(mole.id, 'mole');
  assert.ok(typeof mole.name === 'string' && mole.name.length > 0);
});

test('mole：duration 为 0 / 负数 / 非数字都必须报错', () => {
  for (const bad of [0, -5, NaN, '20', undefined]) {
    const errs = mole.validate({ ...validQuiz, duration: bad });
    assert.ok(errs.some((e) => e.includes('duration')), `duration=${bad} 未被检出：${errs.join(' / ')}`);
  }
});

test('mole：moles 少于 2 个必须报错', () => {
  const errs = mole.validate({ ...validQuiz, moles: [{ label: '皮球', target: true }] });
  assert.ok(errs.some((e) => e.includes('moles')), `未检出 moles 过少：${errs.join(' / ')}`);
});

test('mole：target 非布尔必须报错', () => {
  const errs = mole.validate({
    ...validQuiz,
    moles: [
      { label: '皮球', target: 'yes' },
      { label: '积木', target: 1 },
    ],
  });
  assert.ok(errs.some((e) => e.includes('target 必须是布尔')), `未检出 target 类型：${errs.join(' / ')}`);
});

test('mole：label 为空字符串必须报错', () => {
  const errs = mole.validate({
    ...validQuiz,
    moles: [
      { label: '皮球', target: true },
      { label: '   ', target: false },
    ],
  });
  assert.ok(errs.some((e) => e.includes('label')), `未检出空 label：${errs.join(' / ')}`);
});

test('mole：缺 q / 缺 why 必须报错', () => {
  const { q, ...noQ } = validQuiz;
  assert.ok(mole.validate(noQ).some((e) => e.includes('缺少 q')));
  const { why, ...noWhy } = validQuiz;
  assert.ok(mole.validate(noWhy).some((e) => e.includes('why')));
});

/* ─────────────── 计分纯函数 ─────────────── */

test('createScore：total 等于 target 地鼠数量，初始 hit/wrong 为 0', () => {
  const s = createScore(validQuiz.moles);
  assert.equal(s.total, 2);
  assert.equal(s.hit, 0);
  assert.equal(s.wrong, 0);
  assert.equal(s.done, false);
});

test('updateScore：点中 target 地鼠 hit+1，且不修改原状态', () => {
  const s0 = createScore(validQuiz.moles);
  const s1 = updateScore(s0, { label: '皮球', target: true });
  assert.equal(s1.hit, 1);
  assert.equal(s1.wrong, 0);
  assert.equal(s1.done, false);
  assert.equal(s0.hit, 0, '原状态被修改了');
});

test('updateScore：点中非 target 地鼠 wrong+1，hit 不变', () => {
  const s0 = createScore(validQuiz.moles);
  const s1 = updateScore(s0, { label: '积木', target: false });
  assert.equal(s1.wrong, 1);
  assert.equal(s1.hit, 0);
});

test('updateScore：hit 攒满 total 后 done=true', () => {
  let s = createScore(validQuiz.moles);
  s = updateScore(s, { target: true });
  assert.equal(s.done, false);
  s = updateScore(s, { target: true });
  assert.equal(s.hit, 2);
  assert.equal(s.done, true);
});

test('updateScore：done 之后任何点击都不再改变状态', () => {
  let s = createScore(validQuiz.moles);
  s = updateScore(s, { target: true });
  s = updateScore(s, { target: true });
  assert.equal(s.done, true);
  const frozen = s;
  assert.equal(updateScore(s, { target: true }), frozen);
  assert.equal(updateScore(s, { target: false }), frozen);
});

test('updateScore：连点干扰地鼠只累计 wrong，不影响通关判定', () => {
  let s = createScore(validQuiz.moles);
  s = updateScore(s, { target: false });
  s = updateScore(s, { target: false });
  s = updateScore(s, { target: true });
  assert.equal(s.wrong, 2);
  assert.equal(s.hit, 1);
  assert.equal(s.done, false);
});
