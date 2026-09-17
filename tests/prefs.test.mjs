/**
 * prefs.test.mjs — 年龄偏好存储测试
 *
 * 重点验证四件事：
 *   1. 脏数据/非法输入不会让应用崩掉（和 store 一样的降级策略）
 *   2. prefs 与 store 的存储 key 相互独立 —— 重置进度不该清掉年龄档位
 *   3. core 层不 import 内容数据（分层纪律，靠读源码断言）
 *   4. 白名单没注入时退化为宽松模式，而不是「什么都切不动」
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createPrefs, STORAGE_KEY_FOR_TEST as PREFS_KEY } from '../src/core/prefs.js';
import { createStore, STORAGE_KEY_FOR_TEST as STORE_KEY } from '../src/core/store.js';
import { AGE_BAND_IDS, DEFAULT_AGE_BAND } from '../src/data/index.js';

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
    validBands: AGE_BAND_IDS,
    defaultBand: DEFAULT_AGE_BAND,
  });
}

/* ─────────────── 分层纪律 ─────────────── */

test('core/prefs.js 不 import 内容数据（分层纪律）', () => {
  const src = readFileSync(new URL('../src/core/prefs.js', import.meta.url), 'utf8');

  assert.equal(
    /from\s+['"][^'"]*\/data\//.test(src),
    false,
    'core 层不允许 import data/ —— 合法档位应由 main.js 注入'
  );
});

test('两个模块的存储 key 必须不同', () => {
  assert.notEqual(PREFS_KEY, STORE_KEY);
});

/* ─────────────── 基本行为 ─────────────── */

test('初始状态：档位为默认值，未走过年龄引导', () => {
  const prefs = makePrefs(memoryStorage());
  assert.equal(prefs.ageBand(), DEFAULT_AGE_BAND);
  assert.equal(prefs.hasAskedAge(), false);
});

test('setAgeBand 接受白名单内的档位', () => {
  const prefs = makePrefs(memoryStorage());

  assert.equal(prefs.setAgeBand('3-5'), true);
  assert.equal(prefs.ageBand(), '3-5');

  assert.equal(prefs.setAgeBand('6-8'), true);
  assert.equal(prefs.ageBand(), '6-8');
});

test('setAgeBand 忽略白名单外的值，不抛异常也不改状态', () => {
  const prefs = makePrefs(memoryStorage());
  prefs.setAgeBand('3-5');

  for (const bad of ['4-6', '3-5 岁', '不存在的档位', '', null, undefined, 42, {}, []]) {
    assert.equal(prefs.setAgeBand(bad), false, `「${String(bad)}」应被拒绝`);
  }

  assert.equal(prefs.ageBand(), '3-5', '非法输入后档位应保持不变');
});

test('setAgeBand 传入当前值返回 false，不重复触发订阅', () => {
  const prefs = makePrefs(memoryStorage());
  let calls = 0;
  prefs.subscribe(() => { calls += 1; });

  prefs.setAgeBand('6-8');
  assert.equal(calls, 1);

  assert.equal(prefs.setAgeBand('6-8'), false);
  assert.equal(calls, 1, '同值不应再通知订阅者');
});

test('markAskedAge 幂等', () => {
  const prefs = makePrefs(memoryStorage());

  assert.equal(prefs.markAskedAge(), true);
  assert.equal(prefs.markAskedAge(), false);
  assert.equal(prefs.hasAskedAge(), true);
});

/* ─────────────── 持久化 ─────────────── */

test('偏好会写入 storage，重建 prefs 后仍能读回', () => {
  const storage = memoryStorage();

  const first = makePrefs(storage);
  first.setAgeBand('3-5');
  first.markAskedAge();

  const second = makePrefs(storage);
  assert.equal(second.ageBand(), '3-5');
  assert.equal(second.hasAskedAge(), true);
});

test('storage 里是脏数据时降级为默认值', () => {
  const prefs = makePrefs(memoryStorage({ [PREFS_KEY]: '{ 这不是合法 JSON' }));

  assert.equal(prefs.ageBand(), DEFAULT_AGE_BAND);
  assert.equal(prefs.hasAskedAge(), false);
});

test('storage 里档位非法时被规整为默认值', () => {
  const storage = memoryStorage({
    [PREFS_KEY]: JSON.stringify({ v: 1, ageBand: '5-7', askedAge: 'yes' }),
  });
  const prefs = makePrefs(storage);

  assert.equal(prefs.ageBand(), DEFAULT_AGE_BAND, '非法档位应回落到默认值');
  assert.equal(prefs.hasAskedAge(), false, 'askedAge 非布尔 true 应视为 false');
});

/* ─────────────── 与 store 的关系 ─────────────── */

test('重置进度不会清掉年龄档位（两个 key 相互独立）', () => {
  const storage = memoryStorage();

  const prefs = makePrefs(storage);
  const store = createStore({ storage });

  prefs.setAgeBand('6-8');
  store.markLearned('geo-compass');
  assert.equal(store.has('geo-compass'), true);

  store.reset();

  assert.equal(store.has('geo-compass'), false, '进度应被清空');
  assert.equal(prefs.ageBand(), '6-8', '年龄档位不应被连带清空');
});

test('reset 把偏好恢复为默认', () => {
  const prefs = makePrefs(memoryStorage());

  prefs.setAgeBand('3-5');
  prefs.markAskedAge();
  prefs.reset();

  assert.equal(prefs.ageBand(), DEFAULT_AGE_BAND);
  assert.equal(prefs.hasAskedAge(), false);
});

/* ─────────────── 降级路径 ─────────────── */

test('没有可用的 storage 时仍能正常工作（隐私模式降级）', () => {
  const prefs = makePrefs(null);

  assert.equal(prefs.setAgeBand('3-5'), true);
  assert.equal(prefs.ageBand(), '3-5');
  assert.equal(prefs.markAskedAge(), true);
});

test('没注入白名单时退化为宽松模式，而不是什么都切不动', () => {
  // 取舍：忘传参数的后果应该是「校验变松」，而不是「点了按钮毫无反应」。
  const prefs = createPrefs({ storage: memoryStorage() });

  assert.equal(prefs.setAgeBand('任意档位'), true);
  assert.equal(prefs.ageBand(), '任意档位');

  // 但空值仍然要被挡住 —— 否则 UI 会显示一个空标签
  assert.equal(prefs.setAgeBand(''), false);
  assert.equal(prefs.setAgeBand(null), false);
});
