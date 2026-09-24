import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildParentReport, timeAgo, groupDomainsBySection } from '../src/ui/parent.js';

/* ── 测试用的假 store：只实现 buildParentReport 实际调用的方法 ── */
function fakeStore(over) {
  const learned = over.learned || [];
  const learnedAt = over.learnedAt || {};
  const attempts = over.attempts || {};
  const correct = over.correct || {};
  const reviewSet = new Set(over.review || []);
  return {
    has: (id) => learned.includes(id),
    learnedAt: (id) => learnedAt[id] || null,
    needsReview: (id) => reviewSet.has(id),
    attemptsOf: (id) => attempts[id] || 0,
    correctOf: (id) => correct[id] || 0,
    reviewIds: () => [...reviewSet],
  };
}

const topics = [
  {
    id: 'a',
    name: '领域甲',
    accent: '#111',
    items: [
      { id: 'a1', name: '甲一' },
      { id: 'a2', name: '甲二' },
    ],
  },
  {
    id: 'b',
    name: '领域乙',
    accent: '#222',
    items: [
      { id: 'b1', name: '乙一' },
      { id: 'b2', name: '乙二' },
      { id: 'b3', name: '乙三' },
    ],
  },
];

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

test('timeAgo：分钟 / 小时 / 天 / 周 / 月', () => {
  assert.equal(timeAgo(NOW - 5 * 60 * 1000, NOW), '5 分钟前');
  assert.equal(timeAgo(NOW - 3 * 60 * 60 * 1000, NOW), '3 小时前');
  assert.equal(timeAgo(NOW - 1 * DAY, NOW), '昨天');
  assert.equal(timeAgo(NOW - 3 * DAY, NOW), '3 天前');
  assert.equal(timeAgo(NOW - 2 * 7 * DAY, NOW), '2 周前');
  assert.equal(timeAgo(NOW - 60 * DAY, NOW), '2 个月前');
  assert.equal(timeAgo(null, NOW), '—');
});

test('buildParentReport：总览与分领域聚合', () => {
  const store = fakeStore({
    learned: ['a1', 'b1', 'b2'],
    attempts: { a1: 1, b1: 2, b2: 1 },
    correct: { a1: 1, b1: 1, b2: 1 },
    review: ['b2'],
  });
  const r = buildParentReport(store, topics, NOW);

  assert.equal(r.overall.total, 5);
  assert.equal(r.overall.learned, 3);
  assert.equal(r.overall.review, 1);
  assert.equal(r.overall.attempts, 4);
  assert.equal(r.overall.correct, 3);
  assert.equal(r.overall.accuracy, 75); // 3/4

  const a = r.domains.find((d) => d.id === 'a');
  assert.equal(a.learned, 1);
  assert.equal(a.total, 2);
  assert.equal(a.accuracy, 100); // 1/1

  const b = r.domains.find((d) => d.id === 'b');
  assert.equal(b.learned, 2);
  assert.equal(b.review, 1);
  assert.equal(b.accuracy, 67); // 2/3 四舍五入
});

test('buildParentReport：最近学习按 learnedAt 倒序，取前 8', () => {
  const store = fakeStore({
    learned: ['a1', 'a2', 'b1', 'b2', 'b3'],
    learnedAt: { a1: NOW - 3 * DAY, a2: NOW - 1 * DAY, b1: NOW - 5 * DAY, b2: NOW - 10 * DAY, b3: NOW - 2 * DAY },
  });
  const r = buildParentReport(store, topics, NOW);
  assert.equal(r.recent.length, 5); // 只有 5 个已掌握
  assert.deepEqual(
    r.recent.map((x) => x.id),
    ['a2', 'b3', 'a1', 'b1', 'b2'] // 时间倒序
  );
});

test('buildParentReport：未作答的领域正确率为 null', () => {
  const store = fakeStore({ learned: ['a1'] }); // 无 attempts
  const r = buildParentReport(store, topics, NOW);
  const a = r.domains.find((d) => d.id === 'a');
  assert.equal(a.accuracy, null);
  assert.equal(r.overall.accuracy, null);
});

test('buildParentReport：无复习项时 review 列表为空', () => {
  const store = fakeStore({ learned: ['a1'], review: [] });
  const r = buildParentReport(store, topics, NOW);
  assert.deepEqual(r.review, []);
});

/* -- 板块分组：家长端主列表按 7 板块、领域(topic)降为二级 -- */

test('groupDomainsBySection：领域归到板块，板块名与首页逐字一致', () => {
  const domains = [
    { id: 'science', name: '生活科普', accent: '#3D8FC7', total: 10, learned: 4, review: 1, attempts: 5, correct: 4, accuracy: 80 },
    { id: 'geo', name: '地理军事', accent: '#3D8FC7', total: 10, learned: 2, review: 0, attempts: 2, correct: 2, accuracy: 100 },
    { id: 'english', name: '英语', accent: '#2E9BC7', total: 8, learned: 3, review: 0, attempts: 3, correct: 3, accuracy: 100 },
  ];
  const rows = groupDomainsBySection(domains);
  const science = rows.find((r) => r.id === 'science');
  assert.equal(science.name, '科学');
  assert.equal(science.total, 20);
  assert.equal(science.learned, 6);
  assert.equal(science.topics.length, 2);
  assert.deepEqual(science.topics.map((t) => t.id), ['science', 'geo']);
  const english = rows.find((r) => r.id === 'english');
  assert.equal(english.name, '英语');
  assert.equal(english.total, 8);
  assert.deepEqual(rows.map((r) => r.name), ['科学', '英语']);
});