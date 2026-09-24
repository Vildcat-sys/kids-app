/**
 * ui/card.js — 知识点详情页（翻页有声绘本版）
 *
 * 4 页绘本：page0=封面+名称+lead，page1-3=各 fact 配插图
 * 图片随台词翻页切换，自动连播；可手动左右滑、暂停/重播
 * 第 4 页播完高亮「玩一玩」进答题
 */

import { h, render, scrollTop } from '../core/dom.js';
import { getArt } from '../art/index.js';
import { bookPages } from '../core/speech.js';
import { hasLesson, getLesson, buildLesson } from '../data/lessons.js';

const MASCOT_SRC = 'src/images/mascot/lion-wave.webp';
const BOOK_DIR = 'src/images/book';

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const PLAY_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 001.54.84l10-6.5a1 1 0 000-1.68l-10-6.5A1 1 0 008 5.5z"/></svg>';
const PAUSE_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/></svg>';
const REPLAY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.7 3L3 8"/><path d="M3 4v4h4"/></svg>';
const GAME_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h4M8 10v4"/><circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="17.5" cy="13.5" r="1" fill="currentColor" stroke="none"/><path d="M7 6h10a5 5 0 015 5v2a3.5 3.5 0 01-6.4 2L14 13h-4l-1.6 2A3.5 3.5 0 012 13v-2a5 5 0 015-5z"/></svg>';
const ARROW_LEFT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const ARROW_RIGHT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
const LAB_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6.2L4.8 18a2.4 2.4 0 002.1 3.6h10.2A2.4 2.4 0 0019.2 18L14 9.2V3"/><path d="M7.6 14.5h8.8"/></svg>';

const TOTAL_PAGES = 4;

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {object} ctx.item
 * @param {object} ctx.topic
 * @param {object} ctx.store
 * @param {object} ctx.speech
 * @param {(hash: string) => void} ctx.go
 * @param {(item: object) => void} ctx.openQuiz
 */
export function renderCard({ container, item, topic, store, speech, go, openQuiz, backRoute }) {
  const returnRoute = backRoute || `#/t/` + topic.id;
  const pages = bookPages(item);
  let currentPage = 0;
  let pageToken = 0; // 防止快速翻页时旧回调覆盖新状态

  /* ---------- 构建 4 页 ---------- */

  function pageImageHTML(pageIdx) {
    if (pageIdx === 0) return getArt(item.art);
    const src = `${BOOK_DIR}/${item.id}-${pageIdx}.webp`;
    return `<img src="${src}" alt="" loading="lazy" onerror="this.style.display='none'">`;
  }

  const pageEls = [];
  for (let i = 0; i < TOTAL_PAGES; i++) {
    const imgArea = h('div', { class: 'book-img', html: pageImageHTML(i) });
    const textArea = h('p', { class: 'book-text' }, pages[i]);
    const page = h('div', { class: `book-page ${i === 0 ? 'active' : ''}` }, imgArea, textArea);
    pageEls.push(page);
  }

  /* ---------- 控制点 ---------- */

  const fabIcon = h('span', { class: 'fab-icon', html: PLAY_ICON });
  const fabWave = h('span', { class: 'fab-wave', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const fab = h(
    'button',
    { class: 'story-fab', type: 'button', 'aria-label': '播放' },
    fabIcon, fabWave
  );
  const mascot = h('img', {
    class: 'story-mascot',
    src: MASCOT_SRC,
    alt: '小狮子奇奇',
    'aria-hidden': 'true',
  });

  const dots = h('div', { class: 'book-dots' });
  for (let i = 0; i < TOTAL_PAGES; i++) {
    const dot = h('button', {
      class: `book-dot ${i === 0 ? 'active' : ''}`,
      type: 'button',
      'aria-label': `第${i + 1}页`,
      onClick: () => goToPage(i, true),
    });
    dots.appendChild(dot);
  }

  const btnPrev = h('button', {
    class: 'book-arrow prev',
    type: 'button',
    'aria-label': '上一页',
    onClick: () => goToPage(Math.max(0, currentPage - 1), true),
  }, h('span', { html: ARROW_LEFT }));

  const btnNext = h('button', {
    class: 'book-arrow next',
    type: 'button',
    'aria-label': '下一页',
    onClick: () => goToPage(Math.min(TOTAL_PAGES - 1, currentPage + 1), true),
  }, h('span', { html: ARROW_RIGHT }));

  const btnQuiz = h('button', {
    class: 'btn btn-main btn-play book-quiz',
    type: 'button',
    onClick: () => { speech.stop(); openQuiz(item); },
  }, h('span', { class: 'btn-icon', html: GAME_ICON }), h('span', {}, '玩一玩'));

  const btnReplay = h('button', {
    class: 'btn btn-ghost',
    type: 'button',
    onClick: () => playPage(currentPage),
  }, h('span', { class: 'btn-icon', html: REPLAY_ICON }), h('span', {}, '再听一遍'));

  /* 探究课堂入口：数据驱动引擎让每个知识点都有一节 5 阶段课，
     所以入口**常显**。手写精编课显示它的副标题，自动课用知识点 lead。 */
  const hand = getLesson(item.id);
  const auto = buildLesson(item);
  const lessonSub = hand ? hand.subtitle : (auto ? auto.subtitle : '');
  const btnLesson = h(
    'button',
    {
      class: 'lesson-entry',
      type: 'button',
      onClick: () => { speech.stop(); go(`#/lesson/${item.id}`); },
    },
    h('span', { class: 'lesson-entry-ico', html: LAB_ICON }),
    h(
      'span',
      { class: 'lesson-entry-body' },
      h('span', { class: 'lesson-entry-title' }, hand ? '探究课堂' : '探究课堂'),
      h('span', { class: 'lesson-entry-sub' }, lessonSub)
    ),
    h('span', { class: 'lesson-entry-arrow', html: ARROW_RIGHT })
  );

  /* ---------- 页面切换 ---------- */

  function updatePageUI() {
    pageEls.forEach((p, i) => p.classList.toggle('active', i === currentPage));
    Array.from(dots.children).forEach((d, i) => d.classList.toggle('active', i === currentPage));
    btnPrev.disabled = currentPage === 0;
    btnNext.disabled = currentPage === TOTAL_PAGES - 1;
    // 最后一页高亮答题按钮
    if (currentPage === TOTAL_PAGES - 1) {
      btnQuiz.classList.add('ready');
    } else {
      btnQuiz.classList.remove('ready');
    }
  }

  function goToPage(idx, shouldPlay) {
    if (idx === currentPage && shouldPlay) { playPage(idx); return; }
    currentPage = idx;
    updatePageUI();
    if (shouldPlay) playPage(idx);
  }

  /* ---------- 播放控制 ---------- */

  function syncPlayUI(state, kind) {
    if ((state === 'playing' || state === 'paused') && kind && kind !== 'narr') return;
    const playing = state === 'playing';
    fab.classList.toggle('playing', playing);
    fab.classList.toggle('paused', state === 'paused');
    // 图标切换走 dom helper 重建子节点，不直接碰 innerHTML
    fabIcon.replaceChildren(h('span', { html: playing ? PAUSE_ICON : PLAY_ICON }));
    mascot.classList.toggle('talking', playing);
    fab.setAttribute('aria-label', playing ? '暂停' : '播放');
  }

  function playPage(pageIdx) {
    const token = ++pageToken;
    speech.unlock && speech.unlock();
    Promise.resolve(speech.narratePage(item, pageIdx)).then((r) => {
      if (token !== pageToken) return; // 已翻页
      if (r === 'blocked') fab.classList.add('pulse');
      else fab.classList.remove('pulse');
    });
  }

  function onFab() {
    fab.classList.remove('pulse');
    const st = speech.getState ? speech.getState() : 'idle';
    if (st === 'playing') speech.pause();
    else if (st === 'paused') speech.resume();
    else playPage(currentPage);
  }
  fab.addEventListener('click', onFab);

  // 页面音频结束 → 自动翻到下一页
  if (container._unsubSpeech) container._unsubSpeech();
  container._unsubSpeech = speech.onStateChange((state, kind) => {
    syncPlayUI(state, kind);
    if (state === 'idle' && kind === 'narr' && currentPage < TOTAL_PAGES - 1) {
      // 当前页播完，自动翻页
      setTimeout(() => {
        currentPage++;
        updatePageUI();
        playPage(currentPage);
      }, 600);
    }
  });

  /* ---------- 渲染 ---------- */

  render(
    container,
    h(
      'div',
      { class: 'wrap detail kid-detail book-detail' },
      h(
        'button',
        { class: 'back', type: 'button', onClick: () => { speech.stop(); go(returnRoute); } },
        h('span', { class: 'back-arrow', html: BACK_ICON }),
        h('span', {}, '返回')
      ),

      h(
        'div',
        { class: 'story-head' },
        h('h2', {}, item.name),
        h('div', { class: 'py' }, item.pinyin)
      ),

      h(
        'div',
        { class: 'book-stage' },
        btnPrev,
        h('div', { class: 'book-pages' }, ...pageEls),
        btnNext
      ),

      dots,
      mascot,
      fab,

      h(
        'div',
        { class: 'actions' },
        btnReplay,
        btnQuiz
      ),

      btnLesson
    )
  );

  scrollTop();

  // 进入自动播第 1 页
  setTimeout(() => playPage(0), 380);
}
