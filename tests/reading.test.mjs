/**
 * reading.test.mjs — 阅读玩法纯函数测试（§3.6）
 *
 * 只测纯函数 medalFor(readCount)：叶子勋章按「读完次数」分档。
 * 渲染/DOM 不在 node 下测（无 jsdom）。
 *
 * 分档契约：
 *   0 次(及非法值) → 'none'    不发
 *   1 次           → 'leaf'     单叶
 *   2~3 次         → 'double'   双叶
 *   >3 次 (≥4)     → 'medal'   奖章
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { medalFor } from '../src/ui/book-library.js';

test('未读完 / 非法值 → none', () => {
  assert.equal(medalFor(0), 'none');
  assert.equal(medalFor(undefined), 'none');
  assert.equal(medalFor(null), 'none');
  assert.equal(medalFor(-2), 'none');
  assert.equal(medalFor(NaN), 'none');
});

test('读完 1 次 → 单叶 leaf', () => {
  assert.equal(medalFor(1), 'leaf');
});

test('读完 2~3 次 → 双叶 double', () => {
  assert.equal(medalFor(2), 'double');
  assert.equal(medalFor(3), 'double');
});

test('读完超过 3 次（≥4）→ 奖章 medal', () => {
  assert.equal(medalFor(4), 'medal');
  assert.equal(medalFor(5), 'medal');
  assert.equal(medalFor(10), 'medal');
});

test('字符串数字也能识别（防御性）', () => {
  assert.equal(medalFor('1'), 'leaf');
  assert.equal(medalFor('3'), 'double');
});
