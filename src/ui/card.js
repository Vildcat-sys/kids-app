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
const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const TOTAL_PAGES = 4;

/* ── §3.6 新增：本模块作用域样式（放大镜浮层 / 点词翻译气泡，不碰全局 CSS） ── */
let cardCssInited = false;
function ensureCardCss() {
  if (cardCssInited || typeof document === 'undefined') return;
  cardCssInited = true;
  const style = document.createElement('style');
  style.textContent = `
    .crdx-lightbox { position: fixed; inset: 0; z-index: 9999; background: rgba(20,24,30,.92);
      display: flex; align-items: center; justify-content: center; touch-action: none; }
    .crdx-stage { display: flex; align-items: center; justify-content: center; cursor: grab; touch-action: none; }
    .crdx-stage:active { cursor: grabbing; }
    .crdx-media { will-change: transform; }
    .crdx-media img, .crdx-media svg { width: 64vmin; height: auto; max-height: 80vh; display: block; pointer-events: none; }
    .crdx-x { position: absolute; top: 16px; right: 16px; width: 44px; height: 44px; border-radius: 50%;
      border: none; background: rgba(255,255,255,.92); color: #333; display: flex; align-items: center;
      justify-content: center; cursor: pointer; }
    .crdx-x svg { width: 22px; height: 22px; }
    .crdx-tip { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
      max-width: min(92vw, 560px); background: #fff; border-radius: 16px; padding: 14px 18px;
      box-shadow: 0 8px 30px rgba(0,0,0,.2); z-index: 9998; font-size: 15px; line-height: 1.55; color: #3a3a3a; }
    .crdx-tip b { color: #185FA5; }
    .book-img { cursor: zoom-in; }
  `;
  document.head.appendChild(style);
}

/* 从一页文本里抽出英文片段（整句点按，不做逐词分词）。
   本项目绘本页文本是中文讲解，里面夹着目标英文词（red、apple…），
   取这些拉丁串拼成一句交给 sayWord 用 en-US 朗读。 */
function englishOnPage(text) {
  const m = String(text || '').match(/[A-Za-z][A-Za-z''-]*/g);
  if (!m) return '';
  return m.map((s) => s.trim()).filter(Boolean).join(' ').trim();
}

/** 全屏放大镜：图片 CSS transform scale(2) 居中，可拖动看细节，X/点空白退出 */
function openLightbox(html) {
  ensureCardCss();
  const overlay = h('div', { class: 'crdx-lightbox' });
  const media = h('div', { class: 'crdx-media', html });
  const stage = h('div', { class: 'crdx-stage' }, media);
  const closeBtn = h('button', { class: 'crdx-x', type: 'button', 'aria-label': '关闭', html: CLOSE_ICON });
  overlay.appendChild(stage);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  let ox = 0;
  let oy = 0;
  const apply = () => { media.style.transform = `translate(${ox}px, ${oy}px) scale(2)`; };
  apply();

  let dragging = false;
  let pid = null;
  let sx = 0;
  let sy = 0;
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    pid = e.pointerId;
    sx = e.clientX - ox;
    sy = e.clientY - oy;
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    ox = e.clientX - sx;
    oy = e.clientY - sy;
    apply();
  });
  const end = () => { dragging = false; pid = null; };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  function close() { overlay.remove(); }
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

/* 点词翻译：朗读该页英文 + 弹「这一页讲的是：<中文>」 */
function tapTranslate(item, pages, speech, idx) {
  ensureCardCss();
  const zh = pages[idx] || '';
  const en = englishOnPage(zh) || (item.quiz && item.quiz.word) || '';
  if (en) speech.sayWord(en);
  // 中文浮层
  const old = document.querySelector('.crdx-tip');
  if (old) old.remove();
  const tip = h('div', { class: 'crdx-tip' }, h('b', {}, '这一页讲的是：'), zh);
  document.body.appendChild(tip);
  clearTimeout(tapTranslate._t);
  tapTranslate._t = setTimeout(() => tip.remove(), 3200);
}

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
    // 点大图 → 全屏放大浮层（放大镜看细节）
    const imgArea = h('div', {
      class: 'book-img', html: pageImageHTML(i),
      onClick: () => openLightbox(pageImageHTML(i)),
    });
    // 点文本 → 朗读该页英文 + 弹中文翻译浮层（整句点按，不做逐词分词）
    const textArea = h('p', {
      class: 'book-text',
      onClick: () => tapTranslate(item, pages, speech, i),
    }, pages[i]);
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
