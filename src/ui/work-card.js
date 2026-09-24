/**
 * ui/work-card.js — 学习证据卡（成就卡）
 *
 * 三段式卡片（三段式结构）：
 *   上段固定装饰（标题「我的探索卡」+ 吉祥物）、中段动态填孩子数据、下段固定落款。
 *
 * 只读展示组件：只接收 work 对象渲染，不自己读写 store、不发网络请求。
 * 家长回路的「听完了」通过 onHeard 回调交给外层（lesson.js / works.js）接 store。
 */

import { h } from '../core/dom.js';

const MASCOT_SRC = 'src/images/mascot/lion-wave.webp';

/* 与 reward.js 第 18 行 STAR_PATH 同形（reward.js 未导出，这里内联复刻） */
const STAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.6l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.9 6.2 20.2l1.5-6.5-5-4.4 6.6-.6z"/></svg>';

/**
 * 三级 · 结构化自评：针对「这次具体做了什么」的过程性文字（纯函数，便于单测）。
 * 措辞照工单 §5.4，不增删分支。
 */
export function processFeedback(work) {
  const correct = (work && work.correct) || 0;
  const total = (work && work.total) || 0;
  const name = (work && work.itemName) || '这个小知识';
  if (correct === total) return `你把「${name}」的 ${total} 道题都答对了。`;
  if (correct >= total * 0.6) return `你答对了 ${correct} 道，还记住了自己挑的那一条。`;
  return `你听完了「${name}」的全部内容，记住了其中一条。`;
}

function localDate(ts) {
  const d = new Date(ts || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function starRow(stars) {
  const cells = [];
  for (let i = 1; i <= 3; i += 1) {
    cells.push(
      h('span', {
        class: `wc-star${i <= stars ? ' wc-on' : ' wc-off'}`,
        html: STAR_SVG,
        'aria-hidden': 'true',
      })
    );
  }
  return h('div', { class: 'wc-stars', 'aria-label': `${stars} 颗星` }, ...cells);
}

function pickedFactRow(work, facts) {
  const i = work.pickedFact;
  if (i !== null && i !== undefined && Array.isArray(facts) && facts[i]) {
    const text = String(facts[i]);
    const shown = text.length > 30 ? `${text.slice(0, 30)}…` : text;
    return h('div', { class: 'wc-picked' }, h('strong', {}, '我记住了：'), h('span', {}, shown));
  }
  return h('div', { class: 'wc-picked wc-empty' }, '选一条你记住的 →');
}

/**
 * 家长回路（一级反馈）：按钮 + 给家长看的面板，非阻塞。
 * 已听过时变成灰色不可点标记。
 */
function parentBlock(work, onHeard) {
  if (work.parentHeard === true) {
    return h('div', { class: 'wc-heard' }, '爸爸妈妈听过');
  }
  if (typeof onHeard !== 'function') return null;

  const panel = h(
    'div',
    { class: 'wc-parent-panel', hidden: true },
    h('div', { class: 'wc-parent-title' }, '请听孩子讲一讲'),
    h(
      'p',
      { class: 'wc-parent-body' },
      '让孩子说说他为什么选这一条。不用纠正对错，听完说一句「我听到了」就够了。'
    ),
    h(
      'button',
      {
        class: 'wc-heard-btn',
        type: 'button',
        onClick: () => onHeard(work.id),
      },
      '听完了'
    )
  );

  const openBtn = h(
    'button',
    {
      class: 'wc-parent-btn',
      type: 'button',
      onClick: () => {
        panel.hidden = !panel.hidden;
      },
    },
    '请爸爸妈妈听我讲'
  );

  return h('div', { class: 'wc-parent' }, openBtn, panel);
}

/**
 * 三段式学习证据卡。
 * @param {object} work
 * @param {object}  [opts]
 * @param {boolean} [opts.compact=false]  紧凑版式（作品墙网格用）
 * @param {Array}   [opts.facts=null]     该知识点的 facts 原文，用于展示「我记住了」
 * @param {number}  [opts.count=null]     是第几张作品（落款用）
 * @param {(workId:string)=>void} [opts.onHeard=null] 家长「听完了」回调
 */
export function createWorkCard(work, { compact = false, facts = null, count = null, onHeard = null } = {}) {
  const top = h(
    'div',
    { class: 'wc-top' },
    h('img', { class: 'wc-mascot', src: MASCOT_SRC, alt: '', 'aria-hidden': 'true' }),
    h('span', { class: 'wc-top-title' }, '我的探索卡')
  );

  const mid = h(
    'div',
    { class: 'wc-mid' },
    h('div', { class: 'wc-item' }, work.itemName || ''),
    h(
      'div',
      { class: 'wc-meta' },
      h('span', {}, work.sectionName || ''),
      h('span', { class: 'wc-dot' }, '·'),
      h('span', {}, localDate(work.ts))
    ),
    starRow(Math.max(1, Math.min(3, work.stars || 1))),
    h('div', { class: 'wc-feedback' }, processFeedback(work)),
    pickedFactRow(work, facts)
  );

  const foot = h(
    'div',
    { class: 'wc-foot' },
    h('span', {}, count ? `第 ${count} 张作品` : '我的作品'),
    h('span', { class: 'wc-foot-sep' }, '·'),
    h('span', {}, '小小百科')
  );

  return h(
    'div',
    { class: `wc-card${compact ? ' wc-compact' : ''}` },
    top,
    mid,
    parentBlock(work, onHeard),
    foot
  );
}

/**
 * 报告页的「你还记得哪一条？」选择器：孩子从 3 条 fact 里选一条我记住的。
 * 没有正确答案，选哪条都对；右下角不显眼的「先不选」可跳过。
 *
 * @param {object}   opts
 * @param {object}   opts.work
 * @param {Array}    opts.facts   item.facts 的 3 条原文
 * @param {(i:number)=>void} opts.onPick  点某条后回调（外层写 store 并局部刷新卡片）
 */
export function renderPickedFactPicker({ work, facts, onPick }) {
  const options = (Array.isArray(facts) ? facts : []).map((text, i) =>
    h(
      'button',
      {
        class: 'wc-fact-opt',
        type: 'button',
        onClick: () => onPick(i),
      },
      h('span', { class: 'wc-fact-dot', 'aria-hidden': 'true' }, String.fromCharCode(65 + i)),
      h('span', { class: 'wc-fact-text' }, String(text))
    )
  );

  return h(
    'div',
    { class: 'wc-picker' },
    h('div', { class: 'wc-picker-q' }, '你还记得哪一条？'),
    h('div', { class: 'wc-fact-list' }, ...options),
    h(
      'button',
      {
        class: 'wc-skip',
        type: 'button',
        onClick: () => onPick(null),
      },
      '先不选'
    )
  );
}
