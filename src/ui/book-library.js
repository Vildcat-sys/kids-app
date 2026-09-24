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

const TOTAL_PAGES = 4;

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
  renderShelf();

  /* ───────── 封面墙 ───────── */
  function renderShelf() {
    const buckets = englishByLevel();
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
              return h(
                'button',
                {
                  class: 'lib-card', type: 'button',
                  onClick: () => { speech.stop(); speech.sfx && speech.sfx('pop'); openReader(it); },
                },
                h('span', { class: 'lib-cover', html: getArt(it.art) || '' }),
                h('span', { class: 'lib-name' }, it.name),
                h('span', { class: 'lib-stars' },
                  h('span', { class: 'lib-star', html: STAR_ICON }),
                  h('span', {}, stars > 0 ? `${stars}` : '读一读'))
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
