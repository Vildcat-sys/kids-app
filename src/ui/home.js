/**
 * ui/home.js — 首页：六大领域
 *
 * 设计取舍：
 *   首页只放领域，不直接铺知识点。60 个知识点平铺会让 5 岁孩子无从下手，
 *   先选「我想学哪一类」，再进入二级列表，每次只面对 6 个选项，认知负担更小。
 *
 * 年龄分级（2026-09-17 加）：
 *   首页是过滤发生的两个地方之一（另一个是领域页）。所有统计的分母
 *   都取自 getTopicsForAge(band) —— 切档后分母跟着变，否则切到低龄档
 *   进度条永远填不满，孩子会以为自己退步了。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { getTopicsForAge } from '../data/index.js';
import { getArt } from '../art/index.js';
import { renderAgeBar } from './age-bar.js';

/** 地图入口图标：一条没走完的路线，前两个点还没点亮 */
const MAP_ICON =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M4 17c3-2 5 1 8-1s5 3 8 0" stroke="#B08A5A" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3"/><circle cx="4" cy="17" r="2.6" fill="#E8A33D"/><circle cx="12" cy="16" r="2.6" fill="#FFFFFF" stroke="#B08A5A" stroke-width="1.6"/><circle cx="20" cy="16" r="2.6" fill="#FFFFFF" stroke="#B08A5A" stroke-width="1.6"/></svg>';

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container 主内容容器
 * @param {object} ctx.store
 * @param {object} ctx.prefs
 * @param {(hash: string) => void} ctx.go
 */
export function renderHome({ container, store, prefs, go }) {
  const band = prefs.ageBand();
  const topics = getTopicsForAge(band);

  const totalItems = topics.reduce((sum, t) => sum + t.items.length, 0);
  const totalLearned = topics.reduce(
    (sum, t) => sum + t.items.filter((i) => store.has(i.id)).length,
    0
  );
  // 当前档下需要温习的项数 —— 复习计数要让首页也能感知到，不能藏进地图里。
  const reviewCount = topics.reduce(
    (sum, t) => sum + t.items.filter((i) => store.has(i.id) && store.needsReview(i.id)).length,
    0
  );

  const headline =
    totalLearned === 0
      ? '今天想认识什么？'
      : totalLearned >= totalItems
        ? '全部认识啦！'
        : `已经认识 ${totalLearned} 个啦`;

  const grid = h(
    'div',
    { class: 'topic-grid' },
    topics.map((topic) => {
      const done = topic.items.filter((i) => store.has(i.id)).length;
      const total = topic.items.length;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      // 用领域下第一个知识点的插画作为该领域封面，避免额外维护一套领域图标
      const coverKey = topic.items[0] ? topic.items[0].art : '';

      return h(
        'button',
        {
          class: `topic-card${done === total && total > 0 ? ' done' : ''}`,
          type: 'button',
          style: { '--accent': topic.accent },
          onClick: () => go(`#/t/${topic.id}`),
          'aria-label': `${topic.name}，已学 ${done} 个，共 ${total} 个`,
        },
        h('span', { class: 'topic-art', html: getArt(coverKey) }),
        h('span', { class: 'topic-body' },
          h('span', { class: 'topic-name' }, topic.name),
          h('span', { class: 'topic-tagline' }, topic.tagline)
        ),
        h('span', { class: 'topic-foot' },
          h('span', { class: 'topic-bar' },
            h('span', { class: 'topic-bar-fill', style: { width: `${pct}%` } })
          ),
          h('span', { class: 'topic-count' }, `${done}/${total}`)
        )
      );
    })
  );

  /** 首次进入才出现的引导。选过任何一项（含「全部」）就不再显示。 */
  const needsAsk = !prefs.hasAskedAge();

  function pick(nextBand) {
    prefs.setAgeBand(nextBand);
    prefs.markAskedAge();
  }

  /* 地图入口放在领域网格**之后**，不抢首次进入的注意力 ——
     一个进度为空的地图对孩子没有任何信息，只会多一次点击。
     有进度之后它才是「看看我走到哪了」。
     —— 有复习项时卡片整体加 has-review 类，描边变成橙色，一眼能挑出来。 */
  const mapSub =
    totalLearned === 0
      ? '还没点亮任何地方，先挑一个开始吧'
      : reviewCount > 0
        ? `已经点亮 ${totalLearned} 个，${reviewCount} 个该温习了`
        : `已经点亮 ${totalLearned} 个地方了`;

  const mapEntry = h(
    'button',
    {
      class: `map-entry${reviewCount > 0 ? ' has-review' : ''}`,
      type: 'button',
      onClick: () => go('#/map'),
      'aria-label':
        reviewCount > 0
          ? `打开我的地图，${reviewCount} 个该温习`
          : '打开我的地图',
    },
    h('span', { class: 'map-entry-icon', html: MAP_ICON }),
    h(
      'span',
      { class: 'map-entry-body' },
      h('span', { class: 'map-entry-title' }, '我的地图'),
      h('span', { class: 'map-entry-sub' }, mapSub)
    ),
    h('span', { class: 'map-entry-arrow' }, '→')
  );

  render(
    container,
    h(
      'div',
      { class: 'wrap' },
      renderAgeBar({ current: band, onPick: pick, prominent: needsAsk }),
      h(
        'div',
        { class: 'intro' },
        h('h1', {}, headline),
        h('p', {}, '先选一个你喜欢的，进去看一看、听一听，再回答一个小问题。')
      ),
      grid,
      mapEntry
    )
  );

  scrollTop();
}
