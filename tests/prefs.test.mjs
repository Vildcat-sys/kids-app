/**
 * prefs.test.mjs — 偏好存储测试
 *
 * 重点验证五件事：
 *   1. 脏数据/非法输入不会让应用崩掉（和 store 一样的降级策略）
 *   2. prefs 与 store 的存储 key 相互独立 —— 重置进度不该清掉级别选择
 *   3. core 层不 import 内容数据（分层纪律，靠读源码断言）
 *   4. 白名单没注入时退化为宽松模式，而不是「什么都切不动」
 *   5. v1 → v2 是**故意不迁移**的：老 key 里的 ageBand 不该被当成 level 读进来
 *
 * 第 5 条最容易被"顺手优化"掉：有人看到两个版本，第一反应是写个映射把
 * 3-5 转成 S2、6-8 转成 S5。那个映射是猜的 —— 猜错了会把孩子锁在他
 * 看不见的内容里，而且**没人会发现**（界面上只是内容变少了）。
 * 所以这里明确断言「不读老 key」。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createPrefs, STORAGE_KEY_FOR_TEST as PREFS_KEY } from '../src/core/prefs.js';
import { createStore, STORAGE_KEY_FOR_TEST as STORE_KEY } from '../src/core/store.js';
import { LEVEL_IDS_WITH_ALL, LEVEL_ALL, DEFAULT_LEVEL } from '../src/data/index.js';

/** 历史 key：v1 时代存的是 ageBand，v2 起换成了 level。这里只用来验「不会被误读」。 */
const LEGACY_PREFS_KEY = 'kids-encyclopedia-prefs-v1';

function memoryStorage(seed) {
  const map = new Map(seed ? Object.entries(seed) : []);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

/** 按 main.js 的方式装配：白名单与默认值都从数据层注入 */
function makePrefs(storage) {
  return createPrefs({
    storage,
    validLevels: LEVEL_IDS_WITH_ALL,
    defaultLevel: DEFAULT_LEVEL,
  });
}

/* ─────────────── 分层纪律 ─────────────── */

test('core/prefs.js 不 import 内容数据（分层纪律）', () => {
  const src = readFileSync(new URL('../src/core/prefs.js', import.meta.url), 'utf8');

  assert.equal(
    /from\s+['"][^'"]*\/data\//.test(src),
    false,
    'core 层不允许 import data/ —— 合法级别应由 main.js 注入'
  );
});

test('两个模块的存储 key 必须不同', () => {
  assert.notEqual(PREFS_KEY, STORE_KEY);
});

/* ─────────────── 基本行为 ─────────────── */

test('初始状态：级别为默认值，未走过级别引导', () => {
  const prefs = makePrefs(memoryStorage());
  assert.equal(prefs.level(), DEFAULT_LEVEL);
  assert.equal(prefs.hasAskedLevel(), false);
});

test('setLevel 接受白名单内的级别', () => {
  const prefs = makePrefs(memoryStorage());

  assert.equal(prefs.setLevel('S1'), true);
  assert.equal(prefs.level(), 'S1');

  assert.equal(prefs.setLevel('S4'), true);
  assert.equal(prefs.level(), 'S4');

  assert.equal(prefs.setLevel(LEVEL_ALL), true);
  assert.equal(prefs.level(), LEVEL_ALL);
});

test('setLevel 忽略白名单外的值，不抛异常也不改状态', () => {
  const prefs = makePrefs(memoryStorage());
  prefs.setLevel('S2');

  for (const bad of ['S7', '3-5', 'S2 辨认', '不存在的级别', '', null, undefined, 42, {}, []]) {
    assert.equal(prefs.setLevel(bad), false, `「${String(bad)}」应被拒绝`);
  }

  assert.equal(prefs.level(), 'S2', '非法输入后级别应保持不变');
});

test('setLevel 传入当前值返回 false，不重复触发订阅', () => {
  const prefs = makePrefs(memoryStorage());
  let calls = 0;
  prefs.subscribe(() => { calls += 1; });

  prefs.setLevel('S5');
  assert.equal(calls, 1);

  assert.equal(prefs.setLevel('S5'), false);
  assert.equal(calls, 1, '同值不应再通知订阅者');
});

test('markAskedLevel 幂等', () => {
  const prefs = makePrefs(memoryStorage());

  assert.equal(prefs.markAskedLevel(), true);
  assert.equal(prefs.markAskedLevel(), false);
  assert.equal(prefs.hasAskedLevel(), true);
});

test('取消订阅后不再收到通知', () => {
  const prefs = makePrefs(memoryStorage());
  let calls = 0;
  const off = prefs.subscribe(() => { calls += 1; });

  prefs.setLevel('S1');
  off();
  prefs.setLevel('S2');

  assert.equal(calls, 1, '取消订阅后仍被通知');
});

/* ─────────────── 持久化 ─────────────── */

test('偏好会写入 storage，重建 prefs 后仍能读回', () => {
  const storage = memoryStorage();

  const first = makePrefs(storage);
  first.setLevel('S3');
  first.markAskedLevel();

  const second = makePrefs(storage);
  assert.equal(second.level(), 'S3');
  assert.equal(second.hasAskedLevel(), true);
});

test('落盘的数据带版本号，便于将来迁移', () => {
  const storage = memoryStorage();
  const prefs = makePrefs(storage);
  prefs.setLevel('S2');

  const raw = JSON.parse(storage.getItem(PREFS_KEY));
  assert.equal(raw.v, 2, 'state.v 必须是 2，否则将来没法做版本迁移');
  assert.equal(raw.level, 'S2');
});

test('storage 里是脏数据时降级为默认值', () => {
  const prefs = makePrefs(memoryStorage({ [PREFS_KEY]: '{ 这不是合法 JSON' }));

  assert.equal(prefs.level(), DEFAULT_LEVEL);
  assert.equal(prefs.hasAskedLevel(), false);
});

test('storage 里级别非法时被规整为默认值', () => {
  const storage = memoryStorage({
    [PREFS_KEY]: JSON.stringify({ v: 2, level: 'S9', askedLevel: 'yes' }),
  });
  const prefs = makePrefs(storage);

  assert.equal(prefs.level(), DEFAULT_LEVEL, '非法级别应回落到默认值');
  assert.equal(prefs.hasAskedLevel(), false, 'askedLevel 非布尔 true 应视为 false');
});

/* ─────────────── v1 → v2：故意不迁移 ─────────────── */

test('老 key（v1 的 ageBand）不会被当成级别读进来', () => {
  // v1 的 '3-5' / '6-8' 与 v2 的 'S1'–'S6' 值域没有交集。
  // 如果哪天有人为了"兼容老用户"写了个映射，这条会先炸 —— 那个映射是猜的。
  const storage = memoryStorage({
    [LEGACY_PREFS_KEY]: JSON.stringify({ v: 1, ageBand: '6-8', askedAge: true }),
  });
  const prefs = makePrefs(storage);

  assert.equal(prefs.level(), DEFAULT_LEVEL, '不该把 6-8 读成某个级别');
  assert.equal(prefs.hasAskedLevel(), false, '老 key 里的 askedAge 不该被当成本轮的引导标记');
});

/* ─────────────── 与 store 的关系 ─────────────── */

test('重置进度不会清掉级别选择（两个 key 相互独立）', () => {
  const storage = memoryStorage();

  const prefs = makePrefs(storage);
  const store = createStore({ storage });

  prefs.setLevel('S4');
  store.markLearned('geo-compass');
  assert.equal(store.has('geo-compass'), true);

  store.reset();

  assert.equal(store.has('geo-compass'), false, '进度应被清空');
  assert.equal(prefs.level(), 'S4', '级别选择不应被连带清空');
});

test('reset 把偏好恢复为默认', () => {
  const prefs = makePrefs(memoryStorage());

  prefs.setLevel('S1');
  prefs.markAskedLevel();
  prefs.reset();

  assert.equal(prefs.level(), DEFAULT_LEVEL);
  assert.equal(prefs.hasAskedLevel(), false);
});

/* ─────────────── 降级路径 ─────────────── */

test('没有可用的 storage 时仍能正常工作（隐私模式降级）', () => {
  const prefs = makePrefs(null);

  assert.equal(prefs.setLevel('S1'), true);
  assert.equal(prefs.level(), 'S1');
  assert.equal(prefs.markAskedLevel(), true);
});

test('storage 抛异常时不崩（配额满 / 被禁用）', () => {
  const hostile = {
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => {},
  };
  const prefs = makePrefs(hostile);

  assert.equal(prefs.level(), DEFAULT_LEVEL);
  assert.equal(prefs.setLevel('S2'), true, '写不进去也不该抛出来');
  assert.equal(prefs.level(), 'S2', '内存里的状态仍应更新');
});

test('没注入白名单时退化为宽松模式，而不是什么都切不动', () => {
  // 取舍：忘传参数的后果应该是「校验变松」，而不是「点了按钮毫无反应」。
  const prefs = createPrefs({ storage: memoryStorage() });

  assert.equal(prefs.setLevel('任意级别'), true);
  assert.equal(prefs.level(), '任意级别');

  // 但空值仍然要被挡住 —— 否则 UI 会显示一个空标签
  assert.equal(prefs.setLevel(''), false);
  assert.equal(prefs.setLevel(null), false);
});
