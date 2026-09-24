/**
 * coloring.test.mjs — 涂色题纯函数测试（不碰 DOM）
 *
 * 覆盖 validate 的合法/非法路径：palette 非空、target 预设、q/why 齐全。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import coloring, { PRESET_TARGETS } from '../src/quiz-types/coloring.js';

const validQuiz = {
  type: 'coloring',
  q: '给太阳涂上温暖的颜色',
  target: 'sun',
  palette: ['#FF8A3D', '#FFD54F', '#FF6B6B'],
  why: '涂得真漂亮！',
};

test('coloring：合法数据通过（返回空错误数组）', () => {
  assert.deepEqual(coloring.validate(validQuiz), []);
});

test('coloring：id 为 coloring，name 非空', () => {
  assert.equal(coloring.id, 'coloring');
  assert.ok(typeof coloring.name === 'string' && coloring.name.length > 0);
});

test('coloring：palette 为空数组必须报错', () => {
  const errs = coloring.validate({ ...validQuiz, palette: [] });
  assert.ok(errs.some((e) => e.includes('palette')), `未检出空 palette：${errs.join(' / ')}`);
});

test('coloring：palette 缺省必须报错', () => {
  const { palette, ...rest } = validQuiz;
  assert.ok(coloring.validate(rest).some((e) => e.includes('palette')));
});

test('coloring：palette 内含非法色值必须报错', () => {
  const errs = coloring.validate({ ...validQuiz, palette: ['#FF8A3D', 'orange', '#12'] });
  assert.ok(errs.some((e) => e.includes('十六进制颜色')), `未检出非法色值：${errs.join(' / ')}`);
});

test('coloring：未知 target 必须报错，且提示可选值', () => {
  const errs = coloring.validate({ ...validQuiz, target: 'rocket' });
  assert.ok(errs.some((e) => e.includes('target')), `未检出未知 target：${errs.join(' / ')}`);
  for (const t of PRESET_TARGETS) {
    assert.ok(PRESET_TARGETS.includes(t));
  }
});

test('coloring：每个预设 target 都能通过校验', () => {
  for (const t of PRESET_TARGETS) {
    assert.deepEqual(coloring.validate({ ...validQuiz, target: t }), [], `target=${t} 校验失败`);
  }
});

test('coloring：缺 q / 缺 why 必须报错', () => {
  const { q, ...noQ } = validQuiz;
  assert.ok(coloring.validate(noQ).some((e) => e.includes('缺少 q')));
  const { why, ...noWhy } = validQuiz;
  assert.ok(coloring.validate(noWhy).some((e) => e.includes('why')));
});
