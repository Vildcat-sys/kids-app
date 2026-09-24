/**
 * lesson.test.mjs — 探究课堂
 *
 * 这里只测两件事：
 *   1. 数据完整性 —— 课程内容写错了，界面上看不出来，只有断言能拦。
 *      尤其「课程 key 指向一个不存在的知识点」这类错，点进去才会白屏。
 *   2. 步骤推导与评星 —— 纯函数，和渲染无关。
 *
 * 渲染本身（DOM 状态机）不在这里测：项目没有 DOM 测试库，
 * 那条线由 .preview/shot-lesson.html 的截图 + verify-apk.py 的开包断言兜。
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { LESSONS, LESSON_PHASES, hasLesson, getLesson, lessonSteps } from '../src/data/lessons.js';
import { starsFor } from '../src/ui/lesson.js';
import { findItem } from '../src/data/index.js';

const ALL = Object.values(LESSONS);

test('每个课程的 id 必须等于它注册的 key', () => {
  for (const [key, lesson] of Object.entries(LESSONS)) {
    assert.equal(lesson.id, key, `${key} 的 lesson.id 应等于 key`);
  }
});

test('每个课程都指向一个真实存在的知识点', () => {
  /* 这条拦的是「内容改名后课程变孤儿」——知识点 id 一改，
     课程还挂在旧 key 上，用户永远点不进去，而且不报任何错。 */
  for (const key of Object.keys(LESSONS)) {
    const hit = findItem(key);
    assert.ok(hit, `课程 ${key} 没有对应的知识点，是个孤儿课程`);
  }
});

test('hasLesson / getLesson 行为正确', () => {
  assert.equal(hasLesson('science-shadow'), true);
  assert.equal(getLesson('science-shadow').title, '影子的秘密');
  assert.equal(hasLesson('science-does-not-exist'), false);
  assert.equal(getLesson('science-does-not-exist'), null);
  // 防原型链误判：'constructor' 不该被当成有课程
  assert.equal(hasLesson('constructor'), false);
});

test('课程必需的标题字段齐全', () => {
  for (const l of ALL) {
    assert.ok(l.title && l.title.length > 0, `${l.id} 缺 title`);
    assert.ok(l.subtitle && l.subtitle.length > 0, `${l.id} 缺 subtitle`);
    assert.ok(l.mascotTip && l.mascotTip.length > 0, `${l.id} 缺 mascotTip`);
  }
});

test('猜想环节：选项至少 3 个，且**不带正确答案**', () => {
  for (const l of ALL) {
    if (!l.conjecture) continue;
    assert.ok(l.conjecture.q, `${l.id} 猜想缺问题`);
    assert.ok(Array.isArray(l.conjecture.opts) && l.conjecture.opts.length >= 3,
      `${l.id} 猜想要给至少 3 个选项`);
    /* 猜想是「先猜后验」，有 a 字段就说明被当成题了 —— 这是设计红线 */
    assert.equal('a' in l.conjecture, false,
      `${l.id} 的猜想不该有正确答案（a），猜错不扣分是设计约定`);
  }
});

test('准备环节：材料 1~4 样，且不重复', () => {
  for (const l of ALL) {
    if (!l.prepare) continue;
    const items = l.prepare.items;
    assert.ok(Array.isArray(items) && items.length >= 1 && items.length <= 4,
      `${l.id} 实验材料应在 1~4 样之间（超过 4 样孩子准备不下来）`);
    assert.equal(new Set(items).size, items.length, `${l.id} 材料清单有重复项`);
  }
});

test('实验环节：每步都有引导语和揭晓结论', () => {
  for (const l of ALL) {
    if (!l.experiment) continue;
    const steps = l.experiment.steps;
    assert.ok(Array.isArray(steps) && steps.length >= 1, `${l.id} 实验没有步骤`);
    steps.forEach((s, i) => {
      assert.ok(s.text && s.text.length > 0, `${l.id} 实验第 ${i + 1} 步缺引导语`);
      assert.ok(s.tip && s.tip.length > 0, `${l.id} 实验第 ${i + 1} 步缺揭晓结论`);
    });
  }
});

test('互动问答：正确答案下标必须落在选项范围内', () => {
  for (const l of ALL) {
    if (!l.interactive) continue;
    const { opts, a, why } = l.interactive;
    assert.ok(Array.isArray(opts) && opts.length >= 2, `${l.id} 互动问答选项不足`);
    assert.ok(Number.isInteger(a) && a >= 0 && a < opts.length,
      `${l.id} 互动问答的答案下标 ${a} 越界（共 ${opts.length} 个选项）`);
    assert.ok(why && why.length > 0, `${l.id} 互动问答缺 why 讲解`);
  }
});

test('生活应用：2~4 条，每条有名有文', () => {
  for (const l of ALL) {
    if (!l.life) continue;
    assert.ok(l.life.length >= 2 && l.life.length <= 4, `${l.id} 生活应用应 2~4 条`);
    for (const it of l.life) {
      assert.ok(it.name && it.text, `${l.id} 生活应用有条目缺 name 或 text`);
    }
  }
});

test('单元测试：每道题的答案下标合法，且有讲解', () => {
  for (const l of ALL) {
    if (!l.test) continue;
    assert.ok(l.test.length >= 1, `${l.id} 单元测试没有题目`);
    l.test.forEach((q, i) => {
      assert.ok(Array.isArray(q.opts) && q.opts.length >= 2, `${l.id} 第 ${i + 1} 题选项不足`);
      assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.opts.length,
        `${l.id} 第 ${i + 1} 题答案下标 ${q.a} 越界`);
      assert.ok(q.why && q.why.length > 0, `${l.id} 第 ${i + 1} 题缺 why 讲解`);
    });
  }
});

test('表达环节有讲述提示与句式脚手架', () => {
  for (const l of ALL) {
    if (!l.teach) continue;
    assert.ok(l.teach.prompt && l.teach.prompt.length > 0, `${l.id} 表达环节缺 prompt`);
    assert.ok(l.teach.hint && l.teach.hint.length > 0, `${l.id} 表达环节缺句式提示（hint）`);
  }
});

test('lessonSteps 按固定阶段顺序推导出完整步骤', () => {
  const steps = lessonSteps(LESSONS['science-shadow']);
  assert.deepEqual(steps.map((s) => s.kind), [
    'explore', 'conjecture', 'prepare', 'experiment', 'interactive',
    'life', 'expand', 'teach', 'test', 'report',
  ]);
  assert.deepEqual(steps.map((s) => s.phase), [
    'intro', 'intro', 'probe', 'probe', 'probe',
    'apply', 'apply', 'express', 'check', 'check',
  ]);
});

test('lessonSteps 的每个阶段都必须是已知阶段', () => {
  const known = new Set(LESSON_PHASES.map((p) => p.id));
  for (const l of ALL) {
    for (const s of lessonSteps(l)) {
      assert.ok(known.has(s.phase), `${l.id} 的步骤 ${s.kind} 用了未知阶段 ${s.phase}`);
    }
  }
});

test('lessonSteps 会跳过没写的环节，且始终以 report 收尾', () => {
  const minimal = { id: 'x', title: 't', explore: { narr: 'n' } };
  const steps = lessonSteps(minimal);
  assert.deepEqual(steps.map((s) => s.kind), ['explore', 'report'],
    '只写了引入时，应只剩引入 + 报告两步');
  assert.equal(steps[steps.length - 1].kind, 'report', '报告必须是最后一步');
});

test('评星：全对 3 星、对 2/3 给 2 星、对 1/3 给 1 星，永远不给 0 星', () => {
  assert.equal(starsFor(3, 3), 3);
  assert.equal(starsFor(2, 3), 2);
  assert.equal(starsFor(1, 3), 1);
  assert.equal(starsFor(0, 3), 1, '一题没对也给 1 星 —— 不给孩子 0 星的挫败');
  assert.equal(starsFor(0, 0), 1, '没有题目时也要给 1 星，不能算出 0');
  assert.equal(starsFor(4, 4), 3);
});
