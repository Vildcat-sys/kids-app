/**
 * ui/home.js — 首页：七大内容板块
 *
 * 设计取向（面向 3–8 岁，大图少字）：
 *   顶部是角色欢迎横幅 + 已点亮星星数；下面是七大板块的「大图标卡片」，
 *   封面图占主导、文字尽量少；最后是「我的探索地图」入口。
 *
 * ═══════════════════════════════════════════════════════════════
 * 为什么首页从 6 张领域卡换成 7 张板块卡（2026-09-23）
 * ═══════════════════════════════════════════════════════════════
 * 原来的 6 张卡是「生活科普 / 地理军事 / 人文科技 / 逻辑思维 / 空间思维 / 英语」——
 * 这是我们自己的内容切法，家长要先把「地理军事」翻译成「哦是讲地理的」。
 * 换成思维 / 英语 / 阅读 / 美术 / 写字 / 音乐 / 科学之后，家长扫一眼就知道
 * 这里有没有他要的东西。
 *
 * 代价是板块比领域大：点进「科学」会看到 72 个知识点，比原来一张卡 24 个多。
 * 所以板块页按级别分了档，孩子仍然一次只面对一小撮。
 *
 * 规划中的板块（阅读/美术/写字/音乐）也占位显示，但**明确标出规划中**。
 * 不藏起来的理由：家长看到的是完整的 7 个方向，而不是「这个 app 只有科学」。
 * 点进去会给一个说明页，不是白屏 —— 见 ui/section.js 的 renderPlanned。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { sectionsWithProgress } from '../data/index.js';
import { getArt } from '../art/index.js';
import { renderLevelBar } from './level-bar.js';

const MASCOT_SRC = 'src/images/mascot/lion-wave.webp';

const MAP_ICON =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M4 17c3-2 5 1 8-1s5 3 8 0" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 3"/><circle cx="4" cy="17" r="2.8" fill="#fff"/><circle cx="12" cy="16" r="2.8" fill="#FFE7B0" stroke="#fff" stroke-width="1.6"/><circle cx="20" cy="16" r="2.8" fill="#FFE7B0" stroke="#fff" stroke-width="1.6"/></svg>';

const STAR_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6z"/></svg>';

const SOON_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.2 2"/></svg>';

/** 横幅里的漂浮装饰（云 + 星星，纯 SVG/CSS） */
const COIN_ICON =
  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#FFD54F"/><circle cx="12" cy="12" r="6" fill="#FFB300"/><path d="M12 8v8M9.5 10.2h5M9.5 13.8h5" stroke="#8a5a00" stroke-width="1.4" stroke-linecap="round"/></svg>`;

const FLAME_ICON =
  `<svg viewBox="0 0 24 24"><path d="M12 2.5c1.5 3 4.5 4.6 4.5 8.5a4.5 4.5 0 11-9 0c0-1.6.7-2.7 1.4-3.6.3 1.1 1 1.9 2 2.2-.3-2.4-.4-5.3 1.1-7.1z" fill="#FF7043"/></svg>`;

const BOTTLE_ICON =
  `<svg viewBox="0 0 24 24"><path d="M9 3h6v2l-1 2v13a1.5 1.5 0 01-1.5 1.5h-1A1.5 1.5 0 019 20V7L9 5V3z" fill="#B3E5FC" stroke="#4FA3D1" stroke-width="1.4"/><path d="M9.5 14h5v6H9.5z" fill="#7FD4FF"/></svg>`;

function floatDecor() {
  return h('div', { class: 'hero-decor', 'aria-hidden': 'true' },
    h('span', { class: 'dc dc-cloud1' }),
    h('span', { class: 'dc dc-cloud2' }),
    h('span', { class: 'dc dc-star1', html: STAR_ICON }),
    h('span', { class: 'dc dc-star2', html: STAR_ICON }),
    h('span', { class: 'dc dc-star3', html: STAR_ICON })
  );
}

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {object} ctx.store
 * @param {object} ctx.prefs
 * @param {object} [ctx.speech]
 * @param {(hash: string) => void} ctx.go
 */
export function renderHome({ container, store, prefs, speech, go }) {
  const level = prefs.level();
  const sections = sectionsWithProgress(store, level);

  const totalItems = sections.reduce((sum, s) => sum + s.total, 0);
  const totalLearned = sections.reduce((sum, s) => sum + s.learned, 0);
  const reviewCount = sections.reduce((sum, s) => sum + s.review, 0);

  const headline =
    totalLearned === 0
      ? '今天想去哪儿探险呀？'
      : totalLearned >= totalItems
        ? '哇，全部认识啦！'
        : `已经点亮 ${totalLearned} 个小知识啦`;

  const tap = () => {
    if (speech) {
      speech.unlock && speech.unlock();
      speech.sfx('tap');
    }
  };

  // 顶部游戏化栏：金币 / 星星瓶（累计星）/ 连续打卡火焰
  const gameBar = h(
    "div",
    { class: "game-bar" },
    h("span", { class: "gb-item gb-coins" },
      h("span", { class: "gb-ico", html: COIN_ICON }),
      h("span", { class: "gb-num" }, String(store.getCoins()))),
    h("span", { class: "gb-item gb-stars" },
      h("span", { class: "gb-ico", html: BOTTLE_ICON }),
      h("span", { class: "gb-num" }, String(store.totalStars()))),
    h("span", { class: "gb-item gb-streak" },
      h("span", { class: "gb-ico", html: FLAME_ICON }),
      h("span", { class: "gb-num" }, `${store.getStreak()} 天`))
  );

  const cards = h(
    'div',
    { class: 'land-grid sec-grid' },
    sections.map((sec) => {
      const allDone = sec.total > 0 && sec.learned === sec.total;
      const cls = [
        'land-card',
        'sec-card',
        allDone ? 'done' : '',
        sec.planned ? 'planned' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return h(
        'button',
        {
          class: cls,
          type: 'button',
          style: { '--accent': sec.accent },
          onClick: () => { tap(); go(`#/s/${sec.id}`); },
          'aria-label': sec.planned
            ? `${sec.name}，正在规划中`
            : `${sec.name}，已学 ${sec.learned} 个，共 ${sec.total} 个`,
        },
        h(
          'span',
          { class: 'land-art' },
          sec.planned
            ? h('span', { class: 'sec-soon-icon', html: SOON_ICON })
            : h('span', { html: getArt(sec.coverKey) })
        ),
        h('span', { class: 'land-name' }, sec.name),
        sec.planned
          ? h('span', { class: 'sec-soon' }, '规划中')
          : h(
              'span',
              { class: 'land-bar' },
              h('span', { class: 'land-bar-fill', style: { width: `${sec.pct}%` } })
            ),
        sec.planned
          ? h('span', { class: 'land-meta' }, h('span', { class: 'sec-soon-txt' }, '即将上线'))
          : h(
              'span',
              { class: 'land-meta' },
              h('span', { class: 'land-star', html: STAR_ICON }),
              h('span', {}, `${sec.learned}/${sec.total}`)
            ),
        allDone ? h('span', { class: 'land-done' }, '✓') : null
      );
    })
  );

  const needsAsk = !prefs.hasAskedLevel();
  function pick(nextLevel) {
    prefs.setLevel(nextLevel);
    prefs.markAskedLevel();
  }

  const mapSub =
    totalLearned === 0
      ? '还没点亮任何地方，先挑一个开始吧'
      : reviewCount > 0
        ? `${reviewCount} 个小知识该温习啦`
        : `已经点亮 ${totalLearned} 个地方`;

  const mapEntry = h(
    'button',
    {
      class: `map-quest${reviewCount > 0 ? ' has-review' : ''}`,
      type: 'button',
      onClick: () => { tap(); go('#/map'); },
      'aria-label': '打开我的探索地图',
    },
    h('span', { class: 'map-quest-icon', html: MAP_ICON }),
    h(
      'span',
      { class: 'map-quest-body' },
      h('span', { class: 'map-quest-title' }, '我的探索地图'),
      h('span', { class: 'map-quest-sub' }, mapSub)
    ),
    h('span', { class: 'map-quest-arrow' }, '→')
  );

  render(
    container,
    h(
      'div',
      { class: 'wrap home-wrap' },
      gameBar,
      // 角色欢迎横幅
      h(
        'section',
        { class: 'home-hero' },
        floatDecor(),
        h('img', { class: 'home-hero-mascot', src: MASCOT_SRC, alt: '小狮子奇奇', 'aria-hidden': 'true' }),
        h(
          'div',
          { class: 'home-hero-txt' },
          h('h1', {}, headline),
          h(
            'div',
            { class: 'home-hero-score' },
            h('span', { class: 'hs-star', html: STAR_ICON }),
            h('span', {}, `${totalLearned} / ${totalItems}`)
          )
        )
      ),
      renderLevelBar({ current: level, onPick: pick, prominent: needsAsk, withCount: true }),
      h('div', { class: 'land-section-title' }, '选一个方向开始吧'),
      cards,
      mapEntry
    )
  );

  scrollTop();
}
