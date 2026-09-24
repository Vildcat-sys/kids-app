/**
 * store.test.mjs — 进度存储测试
 *
 * 用注入的内存 storage 替代 localStorage，这样测试不依赖浏览器环境，
 * 也不会污染真实数据。这也是当初把 storage 做成可注入的原因。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createStore, CURRENT_VERSION_FOR_TEST } from '../src/core/store.js';

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

/* ─────────────── 游戏化字段（v4：stars / coins / streak） ─────────────── */

test('getStars 默认 0；setStars 只升不降', () => {
  const { store } = tickedStore();
  assert.equal(store.getStars('item-x'), 0);

  store.setStars('item-x', 2);
  assert.equal(store.getStars('item-x'), 2);

  // 后来一次只拿到 1 星 —— 历史最好值不回退
  store.setStars('item-x', 1);
  assert.equal(store.getStars('item-x'), 2, '低星不覆盖高星');

  store.setStars('item-x', 3);
  assert.equal(store.getStars('item-x'), 3);
});

test('setStars 越界被夹到 0..3，非法 itemId 不写', () => {
  const { store } = tickedStore();
  store.setStars('a', 99);
  assert.equal(store.getStars('a'), 3);
  store.setStars('b', -5);
  assert.equal(store.getStars('b'), 0);
  store.setStars('', 3);
  assert.equal(store.totalStars(), 3);
});

test('addCoins 累计金币；getCoins 返回当前值', () => {
  const { store } = tickedStore();
  assert.equal(store.getCoins(), 0);
  store.addCoins(10);
  store.addCoins(10);
  assert.equal(store.getCoins(), 20);
});

test('连续打卡：首日=1，昨天连着=+1，今天重复=不变，断签后重新=1', () => {
  const ctx = tickedStore();
  const { store } = ctx;

  store.addCoins(10);
  assert.equal(store.getStreak(), 1, '第一次打卡');

  store.addCoins(10); // 同一天再玩，不重复计数
  assert.equal(store.getStreak(), 1, '同一天打卡不变');

  ctx.advance(1); // 第二天
  store.addCoins(10);
  assert.equal(store.getStreak(), 2, '连续第二天 +1');

  ctx.advance(2); // 跳过一天（断签）
  assert.equal(store.getStreak(), 0, '断签后今天还没学，显示为 0');
  store.addCoins(10);
  assert.equal(store.getStreak(), 1, '断签后重新打卡从 1 计');
});

test('totalStars 汇总所有知识点星数', () => {
  const { store } = tickedStore();
  store.setStars('a', 3);
  store.setStars('b', 2);
  store.setStars('c', 1);
  assert.equal(store.totalStars(), 6);
});

test('v3 老数据无损迁移：learned 保留，新字段给安全默认', () => {
  const oldTime = 1_600_000_000_000;
  const storage = memoryStorage({
    [KEY]: JSON.stringify({
      v: 3,
      learned: ['a', 'b'],
      learnedAt: { a: oldTime },
      attempts: { a: 2 },
      correct: { a: 1 },
    }),
  });
  const store = createStore({ storage, now: () => 1_700_000_000_000 });

  assert.equal(store.has('a'), true, '老知识点不丢');
  assert.equal(store.has('b'), true);
  assert.equal(store.learnedAt('a'), oldTime, '老时间戳保留');
  assert.equal(store.stats().attempts, 2);
  assert.equal(store.getStars('a'), 0);
  assert.equal(store.getCoins(), 0);
  assert.equal(store.getStreak(), 0);
  assert.equal(store.totalStars(), 0);

  // 触发一次写盘，确认落盘后 state.v 升到当前版本（迁移无损、进度不清零）
  // 用 CURRENT_VERSION_FOR_TEST 而不是硬编码数字 —— 以后升版本不必再改这条断言
  store.addCoins(1);
  const persisted = JSON.parse(storage.getItem(KEY));
  assert.equal(persisted.v, CURRENT_VERSION_FOR_TEST);
  assert.deepEqual(persisted.learned, ['a', 'b'], '落盘后 learned 仍在');
});

test('v4 脏字段被降级：非法 stars/coins/streak 不污染状态', () => {
  const { store } = tickedStore({
    [KEY]: JSON.stringify({
      v: 4,
      learned: ['d'],
      learnedAt: { d: 1_700_000_000_000 },
      stars: { a: 99, b: -2, c: 'x', d: 2 },
      coins: 'not-a-number',
      streak: '3',
      lastDay: 12345,
    }),
  });

  assert.equal(store.getStars('a'), 3, '越界夹到 3');
  assert.equal(store.getStars('b'), 0, '负数夹到 0');
  assert.equal(store.getStars('c'), 0, '非法值丢弃');
  assert.equal(store.getStars('d'), 2);
  assert.equal(store.getCoins(), 0, '非法金币降级为 0');
});

test('reset 同时清空星数/金币/打卡', () => {
  const { store } = tickedStore();
  store.setStars('a', 3);
  store.addCoins(10);
  store.reset();
  assert.equal(store.getCoins(), 0);
  assert.equal(store.totalStars(), 0);
  assert.equal(store.getStreak(), 0);
});

/* -- 每日金币上限（v4 激励） -- */

test('addCoins 每日上限：发满 100 后超出部分不再入账', () => {
  const store = createStore({ storage: memoryStorage() });
  assert.equal(store.addCoins(60), 60);
  assert.equal(store.addCoins(50), 40, '本日只剩 40 额度，入账 40');
  assert.equal(store.getCoins(), 100);
  assert.equal(store.addCoins(30), 0, '已到顶，超出部分入账 0');
  assert.equal(store.getCoins(), 100, '总金币不再增加');
  assert.equal(store.coinsToday(), 100);
});

test('addCoins 跨天重置今日额度', () => {
  let now = Date.UTC(2026, 8, 23, 8, 0, 0);
  const store = createStore({ storage: memoryStorage(), now: () => now });
  store.addCoins(100);
  assert.equal(store.getCoins(), 100);
  assert.equal(store.addCoins(10), 0, '今天已到顶');

  now = Date.UTC(2026, 8, 24, 8, 0, 0); // 第二天
  assert.equal(store.addCoins(10), 10, '新的一天额度恢复');
  assert.equal(store.getCoins(), 110);
});

/* -- 本地徽章（跨课成就） -- */

test('evaluateBadges：点亮首个知识点解锁 first-light，重复评估不重复', () => {
  const store = createStore({ storage: memoryStorage() });
  assert.deepEqual(store.evaluateBadges(), [], '还没点亮，无徽章');

  store.markLearned('science-tooth');
  const newly = store.evaluateBadges();
  assert.equal(newly.length, 1);
  assert.equal(newly[0].id, 'first-light');
  assert.ok(store.hasBadge('first-light'));

  assert.deepEqual(store.evaluateBadges(), [], '已解锁的不重复发');
  assert.equal(store.badgeIds().length, 1);
});

test('evaluateBadges：点亮 5 个解锁 light-5', () => {
  const store = createStore({ storage: memoryStorage() });
  for (let i = 1; i <= 5; i++) store.markLearned('item-' + i);
  const newly = store.evaluateBadges().map((b) => b.id).sort();
  assert.deepEqual(newly, ['first-light', 'light-5']);
});

test('reset 同时清空徽章与今日金币计数', () => {
  const store = createStore({ storage: memoryStorage() });
  store.addCoins(50);
  store.markLearned('science-tooth');
  store.evaluateBadges();
  assert.ok(store.hasBadge('first-light'));
  store.reset();
  assert.deepEqual(store.badgeIds(), []);
  assert.equal(store.coinsToday(), 0);
  assert.equal(store.getCoins(), 0);
});
/* ---------- v4 → v5：作品墙 works ---------- */

test('v4 老数据迁移：字段一个不丢，works 为空，版本升到 5', () => {
  const v4 = {
    v: 4,
    learned: ['science-tooth'],
    learnedAt: { 'science-tooth': 1000 },
    attempts: { 'science-tooth': { done: 1, right: 1 } },
    correct: { 'science-tooth': { right: 1 } },
    stars: { 'science-tooth': 3 },
    coins: 50,
    coinsToday: 10,
    coinsDay: 1,
    lastDay: '2026-01-01',
    streak: 2,
    badges: ['b1'],
  };
  const storage = memoryStorage({ [KEY]: JSON.stringify(v4) });
  const store = createStore({ storage });
  store.touchLearned('science-tooth'); // 触发 persist，normalize 的 v5 才落盘
  const dump = JSON.parse(storage._dump()[KEY]);
  assert.equal(dump.v, 5);
  assert.deepEqual(dump.learned, ['science-tooth']);
  assert.equal(dump.coins, 50);
  assert.equal(dump.streak, 2);
  assert.deepEqual(dump.badges, ['b1']);
  assert.equal(dump.stars['science-tooth'], 3);
  assert.ok(dump.learnedAt['science-tooth']);
  assert.deepEqual(dump.works, []);
});

test('addWork：写入能读回，id/ts 自动补全', () => {
  const store = createStore({ storage: memoryStorage(), now: () => 5000 });
  const w = store.addWork({ itemId: 'science-tooth', itemName: '牙齿', stars: 3, correct: 2, total: 3 });
  assert.ok(w.id.startsWith('w-science-tooth-'));
  assert.equal(w.ts, 5000);
  assert.equal(store.workCount(), 1);
  assert.equal(store.works()[0].itemName, '牙齿');
});

test('works：按 ts 倒序，新的在前', () => {
  let t = 1000;
  const store = createStore({ storage: memoryStorage(), now: () => t });
  t = 1000; store.addWork({ itemId: 'a' });
  t = 2000; store.addWork({ itemId: 'b' });
  t = 3000; store.addWork({ itemId: 'c' });
  assert.deepEqual(store.works().map((x) => x.itemId), ['c', 'b', 'a']);
});

test('works：超过 200 只留最新 200，弃最旧 5 条', () => {
  let t = 1;
  const store = createStore({ storage: memoryStorage(), now: () => t });
  for (let i = 0; i < 205; i += 1) { t = i + 1; store.addWork({ itemId: 'it-' + i }); }
  assert.equal(store.workCount(), 200);
  const ids = store.works().map((x) => x.itemId);
  assert.ok(ids.includes('it-204'), '最新的保留');
  assert.ok(!ids.includes('it-0') && !ids.includes('it-4'), '最旧5条丢弃');
});

test('normalize：works 脏数据被丢弃或夹紧，不抛错', () => {
  const dirty = {
    v: 5,
    works: [
      { id: 'ok', itemId: 'x', ts: 100, stars: 2, pickedFact: null },
      { itemId: 'x', ts: 100 },
      { id: 'bad-ts', itemId: 'x', ts: 'abc' },
      { id: 'bad-fact', itemId: 'x', ts: 100, pickedFact: 9 },
      'not-an-object',
    ],
  };
  const store = createStore({ storage: memoryStorage({ [KEY]: JSON.stringify(dirty) }) });
  const ws = store.works();
  assert.equal(ws.length, 1);
  assert.equal(ws[0].id, 'ok');

  const store2 = createStore({ storage: memoryStorage(), now: () => 1 });
  assert.equal(store2.addWork({ itemId: 'y', stars: 99 }).stars, 3);
  assert.equal(store2.addWork({ itemId: 'z', stars: -5 }).stars, 1);
});

test('worksDueForVisit：只返回超期且未见过的', () => {
  let t = 1000;
  const store = createStore({ storage: memoryStorage(), now: () => t });
  const w = store.addWork({ itemId: 'old' });
  t = 1000 + 4 * 24 * 60 * 60 * 1000;
  assert.equal(store.worksDueForVisit(3).length, 1);
  store.markWorkSeen(w.id);
  assert.equal(store.worksDueForVisit(3).length, 0);
});