/**
 * works.test.mjs — 作品墙 / 成就卡 / 反馈降级链
 *
 * 测试范围（纯逻辑，不依赖 DOM）：
 *   - processFeedback：三分支措辞与边界（全对 / ≥60% / 其余）
 *   - worksDueForVisit：3 天回访边界 + seen 只回访一次
 * 说明：createWorkCard / renderWorks 的 DOM 渲染需浏览器环境，项目无 DOM 测试库
 *   （dependencies 保持为空），那条线由浏览器竖屏实测 + verify-apk.py 兜底，
 *   与 lesson.test.mjs 的既定策略一致。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { processFeedback } from '../src/ui/work-card.js';
import { createStore } from '../src/core/store.js';

/** 最小内存 storage（对齐 Web Storage），与 store.test.mjs 同款 */
function memoryStorage(seed) {
  const map = new Map(seed ? Object.entries(seed) : []);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

const DAY = 24 * 60 * 60 * 1000;

function work(over = {}) {
  return {
    itemId: 'science-x', itemName: '水循环', sectionId: 'science', sectionName: '科学',
    stars: 3, correct: 3, total: 3, pickedFact: null, ...over,
  };
}

/* ---------- processFeedback 三分支 ---------- */

test('processFeedback：全对 → 指向「都答对了」', () => {
  assert.equal(
    processFeedback(work({ correct: 3, total: 3 })),
    '你把「水循环」的 3 道题都答对了。'
  );
});

test('processFeedback：答对≥60% → 提到自己挑的那一条', () => {
  assert.equal(
    processFeedback(work({ correct: 2, total: 3 })),
    '你答对了 2 道，还记住了自己挑的那一条。'
  );
});

test('processFeedback：答对<60% → 肯定听完并记住一条', () => {
  assert.equal(
    processFeedback(work({ correct: 1, total: 3 })),
    '你听完了「水循环」的全部内容，记住了其中一条。'
  );
});

test('processFeedback：边界 60%（含等号）归入第二档', () => {
  assert.match(processFeedback(work({ correct: 3, total: 5 })), /还记住了自己挑的那一条/);
});

test('processFeedback：total=0 不崩，归第一档', () => {
  assert.equal(
    processFeedback(work({ correct: 0, total: 0 })),
    '你把「水循环」的 0 道题都答对了。'
  );
});

/* ---------- worksDueForVisit：3 天回访 ---------- */

test('worksDueForVisit：满3天且未见过才回访；seen 后不再返回', () => {
  let now = 1_000_000_000_000;
  const store = createStore({ storage: memoryStorage(), now: () => now });

  now -= 4 * DAY; // 旧卡：4 天前完成
  const oldCard = store.addWork(work({ itemId: 'old-item', itemName: '旧知识' }));
  now += 4 * DAY; // 回到"今天"再学一个
  store.addWork(work({ itemId: 'new-item', itemName: '新知识' }));

  let due = store.worksDueForVisit(3);
  assert.deepEqual(due.map((w) => w.itemId), ['old-item'], '只有满3天的旧卡到期');

  store.markWorkSeen(oldCard.id); // 打开看看 → seen=true，只回访一次
  due = store.worksDueForVisit(3);
  assert.deepEqual(due, [], '回访过的卡不再出现');
});

test('worksDueForVisit：3天边界（严格大于3天才算到期）', () => {
  let now = 1_000_000_000_000;
  const store = createStore({ storage: memoryStorage(), now: () => now });
  store.addWork(work());

  now += 3 * DAY - 1; // 距3天还差1毫秒
  assert.deepEqual(store.worksDueForVisit(3), []);
  now += 1; // 刚好整3天：ts < cutoff 仍为 false
  assert.deepEqual(store.worksDueForVisit(3), []);
  now += 1; // 满3天之后
  assert.equal(store.worksDueForVisit(3).length, 1);
});
