/**
 * ui/works.js — 我的作品墙（#/works）
 *
 * 展示全部学习证据卡，新的在前；顶部为「二级 · 系统回访」区：
 * 完成满 VISIT_DAYS 天且未回访过的卡，提示「你还记得这张吗？」，
 * 点开后 markWorkSeen（同一张卡只回访一次），进入普通网格。
 */

import { h } from '../core/dom.js';
import { createWorkCard } from './work-card.js';
import { findItem } from '../data/index.js';

const VISIT_DAYS = 3;

/** 按知识点 id 取 facts 原文（卡片展示「我记住了」用），取不到返回 null */
function factsFor(itemId) {
  const hit = findItem(itemId);
  return hit && hit.item && Array.isArray(hit.item.facts) ? hit.item.facts : null;
}

export function renderWorks({ container, store, go }) {
  function paint() {
    const works = store.works();
    const due = store.worksDueForVisit(VISIT_DAYS);
    const count = works.length;

    const children = [];

    /* 标题 */
    children.push(
      h(
        'div',
        { class: 'works-head' },
        h('h1', { class: 'works-title' }, '我的作品墙'),
        h('p', { class: 'works-sub' }, `你做过 ${count} 张探索卡`)
      )
    );

    /* 空态 */
    if (count === 0) {
      children.push(
        h(
          'div',
          { class: 'works-empty' },
          h('p', {}, '还没有作品，去学一个小知识吧'),
          h(
            'button',
            {
              class: 'works-home-btn',
              type: 'button',
              onClick: () => go('#/'),
            },
            '回首页'
          )
        )
      );
      container.replaceChildren(...children);
      return;
    }

    /* 二级回访区：没有到期就整块不显示 */
    if (due.length > 0) {
      const first = due[0];
      children.push(
        h(
          'div',
          { class: 'works-visit' },
          h('div', { class: 'works-visit-q' }, '你还记得这张吗？'),
          createWorkCard(first, { facts: factsFor(first.itemId), onHeard: (id) => { store.markWorkHeard(id); paint(); } }),
          h(
            'button',
            {
              class: 'works-visit-btn',
              type: 'button',
              onClick: () => {
                store.markWorkSeen(first.id);
                paint();
              },
            },
            '打开看看'
          )
        )
      );
    }

    /* 卡片网格：新的在前 */
    const grid = works.map((w, idx) =>
      createWorkCard(w, {
        compact: true,
        facts: factsFor(w.itemId),
        count: count - idx,
        onHeard: (id) => { store.markWorkHeard(id); paint(); },
      })
    );
    children.push(h('div', { class: 'works-grid' }, ...grid));

    container.replaceChildren(...children);
  }

  paint();
}
