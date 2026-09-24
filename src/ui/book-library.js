/**
 * ui/book-library.js — 英语绘本馆
 *
 * 英语板块的 26 个知识点做成一座「绘本馆」：
 *   按级别（S1–S6 分龄）排成封面墙 → 点封面逐页翻读（复用朗读/翻页）
 *   → 读完给星（复用 store 的星）。
 *
 * 与 card.js 的区别：card.js 是「单个知识点详情」；这里是英语板块的
 * 「图书馆入口」，先按级别选一本，再进去读。入口挂在英语板块页。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { getArt } from '../art/index.js';
import { bookPages } from '../core/speech.js';
import { findTopic, levelOf, LEVELS } from '../data/index.js';

const BOOK_DIR = 'src/images/book';

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const ARROW_LEFT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const ARROW_RIGHT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
const STAR_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6z"/></svg>';

/* ── §3.6 新增：角标图标（全部内联 SVG，水彩儿童风） ── */
/* 实心星（已得）/ 空心灰星（未得） */
const STAR_FILLED =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6z"/></svg>';
const STAR_GRAY =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6z"/></svg>';
/* 单叶 / 双叶 / 奖章（叶子勋章，读越多叶子越多） */
const LEAF_SVG =
  '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 10 4 20 4c0 10-5.5 15-15 15z" fill="#6FBF73"/><path d="M7 17C10 12 13 9 17 7" stroke="#3E8E4F" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg>';
const LEAF_DOUBLE_SVG =
  '<svg viewBox="0 0 24 24"><path d="M3.5 20.5C3.5 13.5 7.5 8.5 13.5 7.5c.4 5.8-3 11-10 13z" fill="#6FBF73"/><path d="M11.5 20.5C11.5 14.5 14.5 9.5 20.5 8.5c.3 5.4-2.6 10.4-9 12z" fill="#8BCB8E"/><path d="M6 17c1.8-3 3.8-5 6.5-6.5" stroke="#3E8E4F" stroke-width="1.1" stroke-linecap="round" fill="none"/></svg>';
const MEDAL_SVG =
  '<svg viewBox="0 0 24 24"><path d="M8.5 3l2 4.6 1.5-.9 1.5.9 2-4.6z" fill="#E8734A"/><circle cx="12" cy="14" r="6" fill="#F5C542" stroke="#E0A32E" stroke-width="1.2"/><path d="M9.4 14l1.8 1.8 3.3-3.6" stroke="#B97E1B" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
/* 已读=绿色对勾；未读=灰色空心圆 */
const CHECK_SVG =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#4CAF50"/><path d="M7 12.5l3.2 3.2L17 9.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
const CIRCLE_SVG =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="rgba(255,255,255,.75)" stroke="#B9B2A6" stroke-width="2"/></svg>';

const TOTAL_PAGES = 4;

/**
 * 叶子勋章等级（纯函数，可单测）。
 * 简单按「读完次数」分档：读越多叶子越多。
 *   0 次        → 'none'   不发
 *   1 次        → 'leaf'   单叶
 *   2~3 次      → 'double' 双叶
 *   >3 次(≥4)   → 'medal'  奖章
 * @param {number} readCount 读完次数（来自 store.attemptsOf）
 * @returns {'none'|'leaf'|'double'|'medal'}
 */
export function medalFor(readCount) {
  const n = Number(readCount);
  if (!Number.isFinite(n) || n <= 0) return 'none';
  if (n === 1) return 'leaf';
  if (n <= 3) return 'double';
  return 'medal';
}

/* 本模块作用域样式（不碰 styles-kids.css） */
let libCssInited = false;
function ensureLibCss() {
  if (libCssInited || typeof document === 'undefined') return;
  libCssInited = true;
  const style = document.createElement('style');
  style.textContent = `
    .lib-cover { position: relative; display: block; }
    .rlb-level { position: absolute; top: 6px; left: 6px; padding: 1px 8px; border-radius: 10px;
      background: rgba(24,95,165,.92); color: #fff; font-size: 11px; font-weight: 700; line-height: 1.5; }
    .rlb-stars { position: absolute; left: 6px; bottom: 6px; display: flex; gap: 2px; }
    .rlb-star { display: inline-flex; width: 14px; height: 14px; }
    .rlb-star svg { width: 14px; height: 14px; display: block; }
    .rlb-star.on { color: #F5A623; }
    .rlb-star.off { color: rgba(120,110,95,.55); }
    .rlb-medal { position: absolute; top: 6px; right: 6px; display: inline-flex; width: 24px; height: 24px;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,.15)); }
    .rlb-medal svg { width: 100%; height: 100%; display: block; }
    .rlb-read { position: absolute; right: 6px; bottom: 6px; display: inline-flex; width: 20px; height: 20px; }
    .rlb-read svg { width: 100%; height: 100%; display: block; }
  `;
  document.head.appendChild(style);
}

/** 英语板块全部知识点，按级别分桶 */
function englishByLevel() {
  const topic = findTopic('english');
  const items = (topic && topic.items) || [];
  const buckets = new Map();
  for (const lv of LEVELS) buckets.set(lv.id, []);
  for (const it of items) {
    const lv = levelOf(it.id) || 'S1';
    if (!buckets.has(lv)) buckets.set(lv, []);
    buckets.get(lv).push(it);
  }
  return buckets;
}

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {object} ctx.store
 * @param {object} ctx.speech
 * @param {(hash:string)=>void} ctx.go
 */
export function renderBookLibrary({ container, store, speech, go }) {
  ensureLibCss();
  renderShelf();

  /* ───────── 封面墙 ───────── */
  function renderShelf() {
    const buckets = englishByLevel();

    /* 封面星位：满星实心 / 未得灰星（共 3 档星） */
    function starSlots(n) {
      const out = [];
      for (let i = 0; i < 3; i++) {
        out.push(h('span', { class: `rlb-star ${i < n ? 'on' : 'off'}`, html: i < n ? STAR_FILLED : STAR_GRAY }));
      }
      return out;
    }

    /* 叶子勋章：按读完次数（readCount = store.attemptsOf） */
    function medalBadge(readCount) {
      const m = medalFor(readCount);
      if (m === 'none') return null;
      const svg = m === 'leaf' ? LEAF_SVG : m === 'double' ? LEAF_DOUBLE_SVG : MEDAL_SVG;
      return h('span', { class: 'rlb-medal', html: svg, title: '阅读勋章' });
    }

    /* 已读/未读：封面右下角小标记 */
    function readMark(learned) {
      return h('span', { class: `rlb-read ${learned ? 'done' : 'todo'}`, html: learned ? CHECK_SVG : CIRCLE_SVG });
    }

    const sections = [];
    for (const lv of LEVELS) {
      const items = buckets.get(lv.id) || [];
      if (!items.length) continue;
      sections.push(
        h('section', { class: 'lib-level' },
          h('h2', { class: 'lib-level-name' }, `${lv.id} · ${lv.name}`),
          h('div', { class: 'lib-grid' },
            ...items.map((it) => {
              const stars = store.getStars(it.id);
              const readCount = store.attemptsOf ? store.attemptsOf(it.id) : 0;
              const learned = store.has(it.id);
              const level = levelOf(it.id) || 'S1';
              return h(
                'button',
                {
                  class: 'lib-card', type: 'button',
                  onClick: () => { speech.stop(); speech.sfx && speech.sfx('pop'); openReader(it); },
                },
                h('span', { class: 'lib-cover', html: getArt(it.art) || '' },
                  h('span', { class: 'rlb-level', title: '蓝思分级' }, level),
                  medalBadge(readCount),
                  h('span', { class: 'rlb-stars' }, ...starSlots(stars)),
                  readMark(learned)
                ),
                h('span', { class: 'lib-name' }, it.name)
              );
            })
          )
        )
      );
    }

    render(
      container,
      h('div', { class: 'wrap detail lib-page', style: { '--accent': '#185FA5' } },
        h('button', { class: 'back', type: 'button', onClick: () => { speech.stop(); go('#/s/english'); } },
          h('span', { class: 'back-arrow', html: BACK_ICON }),
          h('span', {}, '返回')),
        h('div', { class: 'sec-head' },
          h('h1', { class: 'sec-head-name' }, '英语绘本馆'),
          h('p', { class: 'sec-head-tagline' }, '按级别选一本，点封面开始读')),
        ...sections
      )
    );
    scrollTop();
  }

  /* ───────── 单本翻页阅读器 ───────── */
  function openReader(item) {
    const pages = bookPages(item);
    let currentPage = 0;
    let pageToken = 0;

    function pageImg(p) {
      if (p === 0) return getArt(item.art) || '';
      return `<img src="${BOOK_DIR}/${item.id}-${p}.webp" alt="" loading="lazy" onerror="this.style.display='none'">`;
    }

    const pageEls = [];
    for (let i = 0; i < TOTAL_PAGES; i++) {
      pageEls.push(
        h('div', { class: `book-page ${i === 0 ? 'active' : ''}` },
          h('div', { class: 'book-img', html: pageImg(i) }),
          h('p', { class: 'book-text' }, pages[i]))
      );
    }

    const dots = h('div', { class: 'book-dots' });
    for (let i = 0; i < TOTAL_PAGES; i++) {
      dots.appendChild(h('button', { class: `book-dot ${i === 0 ? 'active' : ''}`, type: 'button', onClick: () => goToPage(i, true) }));
    }

    const prev = h('button', { class: 'book-arrow prev', type: 'button', onClick: () => goToPage(Math.max(0, currentPage - 1), true) }, h('span', { html: ARROW_LEFT }));
    const nextB = h('button', { class: 'book-arrow next', type: 'button', onClick: () => goToPage(Math.min(TOTAL_PAGES - 1, currentPage + 1), true) }, h('span', { html: ARROW_RIGHT }));

    function updateUI() {
      pageEls.forEach((p, i) => p.classList.toggle('active', i === currentPage));
      Array.from(dots.children).forEach((d, i) => d.classList.toggle('active', i === currentPage));
      prev.disabled = currentPage === 0;
      nextB.disabled = currentPage === TOTAL_PAGES - 1;
    }

    function play(p) {
      const token = ++pageToken;
      speech.unlock && speech.unlock();
      Promise.resolve(speech.narratePage(item, p));
      // 播完自动翻页
      setTimeout(() => {
        if (token !== pageToken) return;
        if (currentPage < TOTAL_PAGES - 1) {
          currentPage += 1; updateUI(); play(currentPage);
        } else {
          finishBtn.style.display = 'inline-flex';
        }
      }, 2600);
    }

    function goToPage(idx, shouldPlay) {
      if (idx === currentPage && shouldPlay) { play(idx); return; }
      currentPage = idx;
      pageToken += 1; // 停掉旧的自动翻页
      updateUI();
      if (shouldPlay) play(idx);
    }

    const finishBtn = h('button', {
      class: 'btn btn-main btn-play', type: 'button', style: { display: 'none' },
      onClick: () => awardStars(),
    }, '读完啦，领星星');

    function awardStars() {
      speech.stop();
      const had = store.getStars(item.id);
      // 读完给 2 星（读绘本不考试，不给 0、不苛刻）
      store.setStars(item.id, Math.max(had, 2));
      // 记一次「读完」：用 attemptsOf 作为读完次数来源（叶子勋章分档依据）
      if (store.recordAttempt) store.recordAttempt(item.id, true);
      store.markLearned(item.id);
      speech.sfx && speech.sfx('coin');
      // 简短庆祝后回书架
      render(
        container,
        h('div', { class: 'wrap detail lib-page', style: { '--accent': '#185FA5' } },
          h('div', { class: 'lesson-report' },
            h('h3', { class: 'lesson-report-title' }, `${item.name} 读完啦`),
            h('div', { class: 'reward-stars' },
              h('span', { class: 'rstar on', style: { '--i': '0' } }, h('span', { class: 'rstar-s', html: STAR_ICON })),
              h('span', { class: 'rstar on', style: { '--i': '1' } }, h('span', { class: 'rstar-s', html: STAR_ICON }))),
            h('p', { class: 'lesson-note' }, '星星已存好，回书架再读一本吧。'),
            h('button', { class: 'btn btn-main', type: 'button', onClick: renderShelf }, '回绘本馆')))
      );
      scrollTop();
    }

    render(
      container,
      h('div', { class: 'wrap detail kid-detail book-detail' },
        h('button', { class: 'back', type: 'button', onClick: () => { speech.stop(); renderShelf(); } },
          h('span', { class: 'back-arrow', html: BACK_ICON }),
          h('span', {}, '返回')),
        h('div', { class: 'story-head' }, h('h2', {}, item.name), h('div', { class: 'py' }, item.pinyin || '')),
        h('div', { class: 'book-stage' }, prev, h('div', { class: 'book-pages' }, ...pageEls), nextB),
        dots,
        h('div', { class: 'actions' },
          h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => play(currentPage) }, '再听一遍'),
          finishBtn))
    );
    scrollTop();
    setTimeout(() => play(0), 380);
  }
}
