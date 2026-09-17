/**
 * content.test.mjs — 内容数据契约测试
 *
 * 与 tools/validate-content.mjs 的分工：
 *   validate 面向「人」，输出可读的待办清单，用于提交前自查；
 *   test 面向「机器」，用断言锁死契约，防止后续改动悄悄破坏结构。
 * 两者有重叠是刻意的 —— 一道给人看，一道给 CI 看。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TOPICS, listItems, findItem, findTopic, topicOfItem } from '../src/data/index.js';
import { listArtKeys } from '../src/art/index.js';
import { listQuizTypeIds } from '../src/quiz-types/index.js';

const artKeys = new Set(listArtKeys());
const typeIds = new Set(listQuizTypeIds());

test('至少有一个领域，且每个领域结构完整', () => {
  assert.ok(TOPICS.length > 0, 'TOPICS 不能为空');

  for (const topic of TOPICS) {
    assert.equal(typeof topic.id, 'string', `${topic.id} 缺少 id`);
    assert.ok(topic.name, `${topic.id} 缺少 name`);
    assert.ok(topic.tagline, `${topic.id} 缺少 tagline`);
    assert.match(topic.accent, /^#[0-9A-Fa-f]{6}$/, `${topic.id} 的 accent 不是合法颜色`);
    assert.ok(Array.isArray(topic.items) && topic.items.length > 0, `${topic.id} 没有知识点`);
  }
});

test('领域 id 唯一', () => {
  const ids = TOPICS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, `领域 id 有重复：${ids.join(', ')}`);
});

test('知识点 id 全局唯一', () => {
  const ids = listItems().map(({ item }) => item.id);
  assert.equal(new Set(ids).size, ids.length, '知识点 id 存在全局重复');
});

test('每个知识点的插画引用都真实存在', () => {
  for (const { item } of listItems()) {
    assert.ok(artKeys.has(item.art), `${item.id} 引用了不存在的插画 key：${item.art}`);
  }
});

test('每个知识点有恰好 3 条非空事实', () => {
  for (const { item } of listItems()) {
    assert.equal(item.facts.length, 3, `${item.id} 的 facts 不是 3 条`);
    item.facts.forEach((f, i) => {
      assert.ok(typeof f === 'string' && f.trim().length > 0, `${item.id} 的 facts[${i}] 为空`);
    });
  }
});

test('每个知识点的题型都已注册', () => {
  for (const { item } of listItems()) {
    assert.ok(item.quiz, `${item.id} 缺少 quiz`);
    assert.ok(typeIds.has(item.quiz.type), `${item.id} 的题型 ${item.quiz.type} 未注册`);
  }
});

test('findItem / findTopic / topicOfItem 行为正确', () => {
  const first = listItems()[0];

  assert.equal(findItem(first.item.id).item, first.item);
  assert.equal(findTopic(first.topic.id), first.topic);
  assert.equal(topicOfItem(first.item.id), first.topic);

  assert.equal(findItem('不存在的-id'), null);
  assert.equal(findTopic('不存在的-id'), null);
  assert.equal(topicOfItem('不存在的-id'), null);
});
