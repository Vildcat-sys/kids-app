/**
 * store.test.mjs — 进度存储测试
 *
 * 用注入的内存 storage 替代 localStorage，这样测试不依赖浏览器环境，
 * 也不会污染真实数据。这也是当初把 storage 做成可注入的原因。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../src/core/store.js';

/** 最小内存 storage 实现，行为对齐 Web Storage */
function memoryStorage(seed) {
  const map = new Map(seed ? Object.entries(seed) : []);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

const KEY = 'kids-encyclopedia-progress-v2';

test('初始状态：没有任何已掌握的知识点', () => {
  const store = createStore({ storage: memoryStorage() });
  assert.equal(store.has('science-tooth'), false);
  assert.deepEqual(store.stats(), {
    learnedCount: 0,
    attempts: 0,
    correct: 0,
    accuracy: null,
  });
});

test('markLearned 是幂等的：重复标记不会重复计数', () => {
  const store = createStore({ storage: memoryStorage() });

  assert.equal(store.markLearned('science-tooth'), true, '首次应返回 true');
  assert.equal(store.markLearned('science-tooth'), false, '重复应返回 false');

  assert.equal(store.stats().learnedCount, 1);
});

test('recordAttempt 正确累计作答次数与答对次数', () => {
  const store = createStore({ storage: memoryStorage() });

  store.recordAttempt('logic-counting', true);
  store.recordAttempt('logic-counting', false);
  store.recordAttempt('logic-counting', true);

  const stats = store.stats();
  assert.equal(stats.attempts, 3);
  assert.equal(stats.correct, 2);
  assert.equal(stats.accuracy, 67);
});

test('进度会写入 storage，重建 store 后仍能读回', () => {
  const storage = memoryStorage();

  const first = createStore({ storage });
  first.markLearned('geo-compass');
  first.recordAttempt('geo-compass', true);

  const second = createStore({ storage });
  assert.equal(second.has('geo-compass'), true);
  assert.equal(second.stats().attempts, 1);
  assert.equal(second.stats().correct, 1);
});

test('subscribe 在状态变化时被调用，取消订阅后不再触发', () => {
  const store = createStore({ storage: memoryStorage() });
  let calls = 0;

  const off = store.subscribe(() => { calls += 1; });

  store.markLearned('space-cube');
  assert.equal(calls, 1);

  store.recordAttempt('space-cube', true);
  assert.equal(calls, 2);

  off();
  store.markLearned('space-symmetry');
  assert.equal(calls, 2, '取消订阅后不应再被调用');
});

test('reset 清空全部进度', () => {
  const store = createStore({ storage: memoryStorage() });

  store.markLearned('english-colors');
  store.recordAttempt('english-colors', true);
  assert.equal(store.stats().learnedCount, 1);

  store.reset();

  assert.equal(store.stats().learnedCount, 0);
  assert.equal(store.stats().attempts, 0);
  assert.equal(store.has('english-colors'), false);
});

test('storage 里是脏数据时不崩溃，降级为空状态', () => {
  const storage = memoryStorage({ [KEY]: '{ 这不是合法 JSON' });
  const store = createStore({ storage });
  assert.equal(store.stats().learnedCount, 0);
});

test('storage 里字段类型不对时被规整，不污染内存状态', () => {
  const storage = memoryStorage({
    [KEY]: JSON.stringify({ learned: '不是数组', attempts: 42, correct: null }),
  });
  const store = createStore({ storage });

  assert.deepEqual(store.stats(), {
    learnedCount: 0,
    attempts: 0,
    correct: 0,
    accuracy: null,
  });
});

test('没有可用的 storage 时仍能正常工作（隐私模式降级）', () => {
  const store = createStore({ storage: null });

  store.markLearned('culture-bulb');
  store.recordAttempt('culture-bulb', true);

  assert.equal(store.stats().learnedCount, 1);
  assert.equal(store.stats().correct, 1);
});

/* ─────────────── 复习机制（v3） ─────────────── */

/* 这里最关键的一条断言是「老数据升级时不会立刻全变复习态」——
   v2 没有 learnedAt，如果迁移时填 0，地图上 65 个驿站瞬间全部提示要温习。
   所以迁移策略是「升级时刻 = 初始时刻」，再过 7 天才进入温习期。 */

const ONE_DAY = 24 * 60 * 60 * 1000;

/** 注入可控时钟与原始 storage 种子的便捷写法
 *  —— seed 是「直接交给 memoryStorage」的对象，例如 { [KEY]: 'json 字符串' }。
 * 千万别传 storage 实例，那会被 Object.entries 当成普通对象迭代它的方法，
 * 把 getItem/setItem 当成数据条目 —— 这条 bug 上一轮调试时被抓到过。 */
function tickedStore(seed = {}) {
  let now = seed.now || 1_700_000_000_000;
  const advance = (days) => {
    now += days * ONE_DAY;
  };
  const storage = memoryStorage(seed);
  const store = createStore({ storage, now: () => now });
  return { store, advance, get now() { return now; } };
}

test('markLearned 后 learnedAt 返回当前时间戳', () => {
  const { store } = tickedStore();
  store.markLearned('science-water-cycle');
  const t = store.learnedAt('science-water-cycle');
  assert.ok(typeof t === 'number' && t > 0);
});

test('刚点亮的不需要温习；过 7 天后才需要', () => {
  const ctx = tickedStore();
  ctx.store.markLearned('science-water-cycle');
  assert.equal(ctx.store.needsReview('science-water-cycle'), false);
  ctx.advance(6);
  assert.equal(ctx.store.needsReview('science-water-cycle'), false, '6 天还不够');
  ctx.advance(2);
  assert.equal(ctx.store.needsReview('science-water-cycle'), true, '满 7 天需要温习');
});

test('复习间隔可调（适合快速验证）', () => {
  const ctx = tickedStore();
  ctx.store.markLearned('a');
  assert.equal(ctx.store.needsReview('a', 1), false, '刚点亮时调成 1 天也不算 —— 距离就是 0');
  ctx.advance(1);
  assert.equal(ctx.store.needsReview('a', 1), true, '过了 1 天之后调成 1 天的间隔就提示温习');
});

test('touchLearned 刷新掌握时刻，让复习态回到 done', () => {
  const ctx = tickedStore();
  ctx.store.markLearned('a');
  ctx.advance(8);
  assert.equal(ctx.store.needsReview('a'), true, '8 天后确实需要温习');
  ctx.store.touchLearned('a');
  assert.equal(ctx.store.needsReview('a'), false, '温习一次后回到 done');
});

test('touchLearned 对未掌握的项无效（不会让它变成已掌握）', () => {
  const { store } = tickedStore();
  const ok = store.touchLearned('never-learned');
  assert.equal(ok, false);
  assert.equal(store.has('never-learned'), false);
});

test('v2 数据（无 learnedAt）迁移：所有已点亮项按升级时刻填充', () => {
  /* 模拟「升级前老用户已点亮 science-water-cycle」—— 老 localStorage 里长这样 */
  const ctx = tickedStore({
    [KEY]: JSON.stringify({
      v: 2,
      learned: ['science-water-cycle', 'science-tooth'],
      attempts: { 'science-water-cycle': 1 },
      correct: { 'science-water-cycle': 1 },
    }),
  });
  const { store, advance } = ctx;
  const upgradeTime = ctx.now;

  assert.equal(store.has('science-water-cycle'), true);
  assert.equal(store.learnedAt('science-water-cycle'), upgradeTime,
    '迁移时按升级时刻填充 —— 避免升级后立刻全变复习态');
  assert.equal(store.needsReview('science-water-cycle'), false, '刚升级不该需要温习');

  advance(8);
  assert.equal(store.needsReview('science-water-cycle'), true,
    '升级后 7 天才进入温习期 —— 这是设计，不是 bug');
});

test('v3 数据（已有 learnedAt）迁移：保留原时间戳', () => {
  const oldTime = 1_600_000_000_000; // 早些时候
  const { store } = tickedStore({
    [KEY]: JSON.stringify({
      v: 3,
      learned: ['a'],
      learnedAt: { a: oldTime },
      attempts: {},
      correct: {},
    }),
  });
  assert.equal(store.learnedAt('a'), oldTime, '保留用户原有时间戳');
});

test('损坏的 learnedAt 数据（null、负数、字符串）降级为 now', () => {
  const ctx = tickedStore({
    [KEY]: JSON.stringify({
      v: 3,
      learned: ['a', 'b', 'c'],
      learnedAt: { a: -1, b: 'abc', c: null },
      attempts: {},
      correct: {},
    }),
  });
  const { store } = ctx;
  const upgradeTime = ctx.now;
  for (const id of ['a', 'b', 'c']) {
    assert.equal(store.learnedAt(id), upgradeTime, `${id} 的非法时间戳降级为 now`);
  }
});

test('reviewIds 默认 7 天间隔列出需要温习的项', () => {
  const ctx = tickedStore();
  ctx.store.markLearned('a');
  ctx.store.markLearned('b');
  ctx.advance(8);
  ctx.store.markLearned('c'); // c 是新鲜的（advanced 后的时间）
  assert.deepEqual(new Set(ctx.store.reviewIds()), new Set(['a', 'b']),
    '默认 7 天间隔：a/b 过了 8 天要温习，c 刚点亮不列');
});

test('reviewIds 可调间隔', () => {
  const ctx = tickedStore();
  ctx.store.markLearned('a');
  ctx.advance(2);
  assert.equal(ctx.store.reviewIds(3).length, 0, '2 天 < 3 天间隔，不列');
  assert.equal(ctx.store.reviewIds(1).length, 1, '2 天 ≥ 1 天间隔，列');
});

test('reset 会清空 learnedAt', () => {
  const { store } = tickedStore();
  store.markLearned('a');
  assert.equal(store.learnedAt('a') > 0, true);
  store.reset();
  assert.equal(store.has('a'), false);
  assert.equal(store.learnedAt('a'), null);
});
