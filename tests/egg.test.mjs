/**
 * egg.test.mjs — 英语砸蛋题型的纯函数测试（node --test，不碰 DOM）
 *
 * 覆盖：
 *   1. validate()：合法数据返回空数组；缺 words / 非数组 / 空数组 /
 *      长度越界 / 元素非法 / 缺 q / 缺 why 都要报错。
 *   2. 推进纯函数 nextWordIndex / isRoundComplete：单词索引推进与完成判定。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import egg from '../src/quiz-types/egg.js';
import { nextWordIndex, isRoundComplete } from '../src/quiz-types/egg.js';

/* ─────────────── 模块契约 ─────────────── */

test('egg：实现题型契约（id / name / validate / create）', () => {
  assert.equal(egg.id, 'egg');
  assert.equal(typeof egg.name, 'string');
  assert.equal(typeof egg.validate, 'function');
  assert.equal(typeof egg.create, 'function');
});

/* ─────────────── validate ─────────────── */

const validQuiz = { type: 'egg', q: '砸蛋出单词', words: ['apple', 'banana', 'cat'], why: '砸蛋真好玩' };

test('validate：合法数据返回空数组', () => {
  assert.deepEqual(egg.validate(validQuiz), []);
});

test('validate：2 个与 5 个单词的边界都合法', () => {
  assert.deepEqual(
    egg.validate({ ...validQuiz, words: ['a', 'b'] }),
    []
  );
  assert.deepEqual(
    egg.validate({ ...validQuiz, words: ['a', 'b', 'c', 'd', 'e'] }),
    []
  );
});

test('validate：缺 words 必须报错', () => {
  const { words, ...rest } = validQuiz;
  const errs = egg.validate(rest);
  assert.ok(errs.some((e) => e.includes('words')), `未检出缺 words：${errs.join(' / ')}`);
});

test('validate：words 非数组必须报错', () => {
  const errs = egg.validate({ ...validQuiz, words: 'apple,banana' });
  assert.ok(errs.some((e) => e.includes('数组')), `未检出非数组：${errs.join(' / ')}`);
});

test('validate：words 空数组必须报错', () => {
  const errs = egg.validate({ ...validQuiz, words: [] });
  assert.ok(errs.some((e) => e.includes('words')), `未检出空数组：${errs.join(' / ')}`);
});

test('validate：words 少于 2 个 / 多于 5 个必须报错', () => {
  const tooFew = egg.validate({ ...validQuiz, words: ['only'] });
  assert.ok(tooFew.some((e) => e.includes('至少')), `未检出过少：${tooFew.join(' / ')}`);

  const tooMany = egg.validate({ ...validQuiz, words: ['a', 'b', 'c', 'd', 'e', 'f'] });
  assert.ok(tooMany.some((e) => e.includes('最多')), `未检出过多：${tooMany.join(' / ')}`);
});

test('validate：words 元素必须是非空字符串', () => {
  const errs = egg.validate({ ...validQuiz, words: ['apple', '', 123] });
  assert.ok(errs.some((e) => e.includes('words[1]')), `未检出空串：${errs.join(' / ')}`);
  assert.ok(errs.some((e) => e.includes('words[2]')), `未检出非字符串：${errs.join(' / ')}`);
});

test('validate：缺 q / 缺 why 必须报错', () => {
  const noQ = egg.validate({ words: ['a', 'b'], why: 'x' });
  assert.ok(noQ.some((e) => e.includes('q')), `未检出缺 q：${noQ.join(' / ')}`);

  const noWhy = egg.validate({ type: 'egg', q: '砸蛋', words: ['a', 'b'] });
  assert.ok(noWhy.some((e) => e.includes('why')), `未检出缺 why：${noWhy.join(' / ')}`);
});

/* ─────────────── 推进纯函数 ─────────────── */

test('nextWordIndex：依次推进，最后一个之后返回 -1（完成）', () => {
  const total = 3;
  assert.equal(nextWordIndex({ index: 0, total }), 1);
  assert.equal(nextWordIndex({ index: 1, total }), 2);
  assert.equal(nextWordIndex({ index: 2, total }), -1);
});

test('nextWordIndex：单元素数组直接返回 -1', () => {
  assert.equal(nextWordIndex({ index: 0, total: 1 }), -1);
});

test('nextWordIndex：非法状态安全返回 0，不抛异常', () => {
  assert.equal(nextWordIndex(undefined), 0);
  assert.equal(nextWordIndex({}), 0);
  assert.equal(nextWordIndex({ index: 'x', total: 3 }), 0);
});

test('isRoundComplete：index >= total 即完成', () => {
  assert.equal(isRoundComplete({ index: 0, total: 3 }), false);
  assert.equal(isRoundComplete({ index: 2, total: 3 }), false);
  assert.equal(isRoundComplete({ index: 3, total: 3 }), true);
  assert.equal(isRoundComplete({ index: 5, total: 3 }), true);
  assert.equal(isRoundComplete(undefined), false);
});
