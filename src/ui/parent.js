/**
 * ui/parent.js — 家长端：本地成长报告
 *
 * 设计立场：本页**只读取** store 里已经记下的数据，不做任何网络请求。
 * 我们整个应用的隐私原则是「零外部上报」，家长端只是把本地数据聚合成
 * 一个看得懂的报告，不引入任何新数据出口。
 *
 * 模块分两层：
 *   - buildParentReport / timeAgo：纯函数，便于单测（不碰 DOM、不碰真实时钟）
 *   - renderParent：把报告画出来，依赖注入 store / prefs / go
 *
 * 为什么聚合放这里而不是 store 里：聚合需要「知识点 id → 所属领域」的映射，
 * 那属于内容数据层（data/index.js 的 topicOfItem）。按分层纪律，core/store.js
 * 不允许 import 内容数据，所以聚合只能落在 UI 层。store 只负责提供原始读数。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { findItem, getTopicsForLevel, levelFilterLabel, SECTIONS } from '../data/index.js';

/**
 * 把毫秒时间戳转成「N 分钟前 / 昨天 / N 天前 / N 周前 / N 个月前」。
 * 纯函数：注入 now 便于测试，不读真实时钟。
 * @param {number|null} ts
 * @param {number} [now]
 */
export function timeAgo(ts, now = Date.now()) {
  if (!ts || typeof ts !== 'number') return '—';
  const diff = Math.max(0, now - ts);
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MIN))} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY);
    return d === 1 ? '昨天' : `${d} 天前`;
  }
  if (diff < 4 * WEEK) return `${Math.floor(diff / WEEK)} 周前`;
  return `${Math.floor(diff / (30 * DAY))} 个月前`;
}

/**
 * 聚合成长报告。纯函数，不依赖 DOM。
 * @param {object} store createStore 实例
 * @param {Array<{id:string,name:string,accent:string,items:Array}>} topics 已按档位过滤的领域列表
 * @param {number} [now]
 * @returns {{
 *   overall: {total,learned,review,attempts,correct,accuracy},
 *   domains: Array, recent: Array, review: Array
 * }}
 */
export function buildParentReport(store, topics, now = Date.now()) {
  const domains = topics.map((t) => {
    let learned = 0;
    let review = 0;
    let attempts = 0;
    let correct = 0;
    for (const it of t.items) {
      if (store.has(it.id)) {
        learned += 1;
        if (store.needsReview(it.id)) review += 1;
      }
      attempts += store.attemptsOf(it.id);
      correct += store.correctOf(it.id);
    }
    const total = t.items.length;
    return {
      id: t.id,
      name: t.name,
      accent: t.accent,
      total,
      learned,
      review,
      attempts,
      correct,
      accuracy: attempts === 0 ? null : Math.round((correct / attempts) * 100),
    };
  });

  const overall = domains.reduce(
    (acc, d) => {
      acc.total += d.total;
      acc.learned += d.learned;
      acc.review += d.review;
      acc.attempts += d.attempts;
      acc.correct += d.correct;
      return acc;
    },
    { total: 0, learned: 0, review: 0, attempts: 0, correct: 0, accuracy: null }
  );
  overall.accuracy =
    overall.attempts === 0 ? null : Math.round((overall.correct / overall.attempts) * 100);

  // 最近学习：所有已掌握项按掌握时刻倒序，取前 8 条
  const learnedItems = [];
  for (const t of topics) {
    for (const it of t.items) {
      if (store.has(it.id)) learnedItems.push({ id: it.id, name: it.name, domain: t.name, at: store.learnedAt(it.id) || 0 });
    }
  }
  learnedItems.sort((a, b) => b.at - a.at);
  const recent = learnedItems.slice(0, 8);

  // 需要温习：按 store 的 reviewIds 映射出名称与领域
  const review = store.reviewIds().map((id) => {
    const hit = findItem(id);
    return { id, name: hit ? hit.item.name : id, domain: hit ? hit.topic.name : '' };
  });

  return { overall, domains, recent, review };
}

/**
 * 把「领域(topic)级」聚合结果按 7 板块分组，主列表逐字对齐首页板块名。
 *
 * 为什么单独放这一层：buildParentReport 仍按领域算（细粒度、可单测），
 * 但家长端主列表要和首页的 7 张板块卡叫同一个名字（科学/思维/英语/阅读/
 * 美术/写字/音乐），所以这里把领域归到板块下、作为板块的二级细分展示。
 *
 * @param {Array} domains buildParentReport 返回的 domains（领域级）
 * @returns {Array<{id,name,accent,total,learned,review,attempts,correct,accuracy,topics:Array}>}
 */
export function groupDomainsBySection(domains) {
  const byTopic = new Map(domains.map((d) => [d.id, d]));
  return SECTIONS.map((sec) => {
    const topics = (sec.topics || [])
      .map((tid) => byTopic.get(tid))
      .filter(Boolean);
    const total = topics.reduce((a, t) => a + t.total, 0);
    const learned = topics.reduce((a, t) => a + t.learned, 0);
    const review = topics.reduce((a, t) => a + t.review, 0);
    const attempts = topics.reduce((a, t) => a + t.attempts, 0);
    const correct = topics.reduce((a, t) => a + t.correct, 0);
    return {
      id: sec.id,
      name: sec.name, // 与首页板块卡逐字一致
      accent: sec.accent,
      total,
      learned,
      review,
      attempts,
      correct,
      accuracy: attempts === 0 ? null : Math.round((correct / attempts) * 100),
      topics, // 板块下的领域细分（二级）
    };
  }).filter((sec) => sec.topics.length > 0);
}

const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 100));

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {object} ctx.store
 * @param {object} ctx.prefs
 * @param {(hash: string) => void} ctx.go
 */
export function renderParent({ container, store, prefs, go }) {
  const topics = getTopicsForLevelLocal(prefs);
  const report = buildParentReport(store, topics);
  const o = report.overall;

  const overview = h(
    'div',
    { class: 'parent-overview' },
    statCard(`${o.learned} / ${o.total}`, '已掌握', null),
    statCard(String(o.review), '该温习', o.review > 0 ? '#E8A33D' : null),
    statCard(o.accuracy === null ? '—' : `${o.accuracy}%`, '总正确率', null),
    statCard(String(store.getCoins()), '金币', '#E8A33D'),
    statCard(String(store.totalStars()), '星星瓶', '#F5A623'),
    statCard(`${store.getStreak()} 天`, '连续打卡', '#FF7043')
  );

  const sectionRows = groupDomainsBySection(report.domains).map((sec) =>
    h(
      'div',
      { class: 'parent-domain' },
      h(
        'div',
        { class: 'parent-domain-head' },
        h('span', { class: 'parent-dot', style: { background: sec.accent } }),
        h('span', { class: 'parent-domain-name' }, sec.name),
        h('span', { class: 'parent-domain-count' }, `${sec.learned} / ${sec.total}`)
      ),
      h(
        'div',
        { class: 'parent-bar' },
        h('span', {
          class: 'parent-bar-fill',
          style: { width: `${pct(sec.learned, sec.total)}%`, background: sec.accent },
        })
      ),
      // 领域(topic)二级细分：板块下拆到「生活科普 / 地理军事」，家长能对上首页板块
      h(
        'div',
        { class: 'parent-topics' },
        ...sec.topics.map((t) =>
          h(
            'div',
            { class: 'parent-topic' },
            h('span', { class: 'parent-topic-name' }, t.name),
            h('span', { class: 'parent-topic-count' }, `${t.learned}/${t.total}`)
          )
        )
      ),
      h(
        'div',
        { class: 'parent-domain-meta' },
        h('span', {}, sec.review > 0 ? `${sec.review} 个该温习` : '无需温习'),
        h('span', {}, sec.accuracy === null ? '还没作答' : `正确率 ${sec.accuracy}%`)
      )
    )
  );

  const recentList = renderRecent(report.recent);
  const reviewList = renderReview(report.review);

  const resetBtn = h(
    'button',
    {
      class: 'parent-reset',
      type: 'button',
      onClick: () => {
        if (window.confirm('确定清空所有学习进度吗？此操作不可恢复。')) {
          store.reset();
          go('#/parent'); // 重置后重新渲染本页
        }
      },
    },
    '清空学习进度'
  );

  const view = h(
    'div',
    { class: 'parent' },
    h(
      'div',
      { class: 'parent-top' },
      h('button', { class: 'parent-back', type: 'button', onClick: () => go('#/') }, '← 首页'),
      h('h1', { class: 'parent-title' }, '成长报告'),
      h('span', { class: 'parent-band' }, levelFilterLabelLocal(prefs))
    ),
    h(
      'p',
      { class: 'parent-privacy' },
      '本页数据只存在这台设备里，不会上传到任何地方。'
    ),
    overview,
    h('h2', { class: 'parent-h2' }, '各板块掌握情况'),
    h('div', { class: 'parent-domains' }, ...sectionRows),
    h('h2', { class: 'parent-h2' }, '最近学习'),
    recentList,
    h('h2', { class: 'parent-h2' }, '需要温习'),
    reviewList,
    resetBtn
  );

  render(container, view);
  scrollTop();
}

function statCard(value, label, accent) {
  return h(
    'div',
    { class: 'parent-stat' },
    h('span', { class: 'parent-stat-value', style: accent ? { color: accent } : {} }, value),
    h('span', { class: 'parent-stat-label' }, label)
  );
}

function renderRecent(recent) {
  if (recent.length === 0) {
    return h('p', { class: 'parent-empty' }, '还没有学会任何知识点，去首页挑一个开始吧。');
  }
  return h(
    'ul',
    { class: 'parent-list' },
    ...recent.map((r) =>
      h(
        'li',
        { class: 'parent-li' },
        h('span', { class: 'parent-li-name' }, r.name),
        h('span', { class: 'parent-li-sub' }, `${r.domain} · ${timeAgo(r.at)}`)
      )
    )
  );
}

function renderReview(review) {
  if (review.length === 0) {
    return h('p', { class: 'parent-empty' }, '暂时没有需要温习的内容，学过的都还很牢。');
  }
  return h(
    'ul',
    { class: 'parent-list parent-list-review' },
    ...review.map((r) =>
      h(
        'li',
        { class: 'parent-li' },
        h('span', { class: 'parent-li-name' }, r.name),
        h('span', { class: 'parent-li-sub' }, r.domain)
      )
    )
  );
}

function getTopicsForLevelLocal(prefs) {
  return getTopicsForLevel(prefs.level());
}
function levelFilterLabelLocal(prefs) {
  return levelFilterLabel(prefs.level());
}
