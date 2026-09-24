/**
 * ui/reward.js — 答题奖励动效（全部为原创 DOM + CSS + WebAudio 合成，无第三方素材）
 *
 * v4 激励可视化闭环：
 *   · 逐星弹入：三颗串行点亮，scale 1.2 回弹（starPop 关键帧）。
 *   · 1 星 = 1 枚金币，沿二次贝塞尔曲线飞入顶部钱袋（WAAPI 计算曲线路径）。
 *   · 金币分档音效：WebAudio 现场合成上行小琶音（1 枚=单音，3 枚=三音琶音），
 *     不新增任何音频文件；人声表扬/鼓励仍走 speech.praise()/encourage()。
 *   · 答错温柔鼓励、不扣星、永不为 0 星（在 quiz.js 里判分，这里只负责正反馈）。
 *   · 每日金币上限到顶 → 弹「今天装满啦」提示，不再累加（由 store.addCoins 返回 0 触发）。
 *   · 跨课成就徽章（本地）→ 新徽章弹出庆祝条。
 *
 * 数据只在本地，不上报。
 */

import { h } from '../core/dom.js';

const STAR_PATH =
  '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.6l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.9 6.2 20.2l1.5-6.5-5-4.4 6.6-.6z"/></svg>';

const CONFETTI_COLORS = ['#FF8A65', '#FFD54F', '#6BCB77', '#4D96FF', '#B388EB', '#FF6B9D', '#FFB74D'];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

/* ─────────────────────────────────────────────────────────────
 * WebAudio 现场合成（懒加载单例，不新增音频文件）
 * ───────────────────────────────────────────────────────────── */

let actx = null;
function audioCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!actx) actx = new AC();
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}

/** 播一个音符；start 为相对当前的秒偏移，便于叠琶音。 */
function tone(freq, start, dur = 0.18, type = 'triangle', peak = 0.1) {
  const ctx = audioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/**
 * 金币分档音：n 枚金币 = n 个上行音（越攒越多、越听越开心）。
 * 1 枚 → 单音；2 枚 → 上行两音；3 枚 → 三音小琶音（C5 E5 G5）。
 */
export function playCoinTier(n) {
  const notes = [880, 1174.66, 1567.98]; // C6 / E6 / G6
  const count = Math.max(0, Math.min(3, Math.round(n || 0)));
  for (let i = 0; i < count; i += 1) {
    tone(notes[i], i * 0.09, 0.2, 'triangle', 0.09);
  }
}

/* ─────────────────────────────────────────────────────────────
 * 逐星弹入
 * ───────────────────────────────────────────────────────────── */

/** 三星组件：light(count) 串行点亮，scale 1.2 回弹由 .rstar.on 关键帧完成。 */
export function createStars() {
  const shapes = [0, 1, 2].map((i) =>
    h('span', { class: 'rstar', style: { '--i': String(i) } }, h('span', { class: 'rstar-s', html: STAR_PATH }))
  );
  const el = h('div', { class: 'reward-stars', 'aria-hidden': 'true' }, shapes);

  return {
    el,
    /**
     * 串行点亮：第 i 颗延迟 220 + i*300ms，依次弹入；同时播一颗星一个音效。
     * @param {number} count 1..3（答错温柔鼓励，starCount 永远 >=1，不在此扣星）
     * @param {(name:string)=>void} [sfx]
     */
    light(count, sfx) {
      const n = Math.max(1, Math.min(3, Math.round(count || 1))); // 永不为 0 星
      shapes.forEach((s, i) => {
        if (i < n) {
          setTimeout(() => {
            s.classList.add('on');
            if (sfx) sfx('star');
          }, 220 + i * 300);
        }
      });
      return n;
    },
  };
}

/** 彩带层：从顶部飘落，结束后自动移除 */
export function confetti(root, { count = 20 } = {}) {
  if (!root) return null;
  const layer = h('div', { class: 'confetti-layer', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i += 1) {
    const c = h('i', { class: 'confetti' });
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    c.style.setProperty('--x', `${rand(-40, 40)}px`);
    c.style.setProperty('--d', `${rand(1.1, 1.9)}s`);
    c.style.setProperty('--delay', `${rand(0, 0.35)}s`);
    c.style.setProperty('--rot', `${rand(220, 520)}deg`);
    c.style.setProperty('left', `${rand(4, 96)}%`);
    c.style.background = color;
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    layer.appendChild(c);
  }
  root.appendChild(layer);
  setTimeout(() => layer.remove(), 2400);
  return layer;
}

/* ─────────────────────────────────────────────────────────────
 * 金币沿二次贝塞尔飞入顶部钱袋
 * ───────────────────────────────────────────────────────────── */

/** 二次贝塞尔上取一点（t 0..1）。 */
function quadBezier(p0, pc, p1, t) {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return {
    x: a * p0.x + b * pc.x + c * p1.x,
    y: a * p0.y + b * pc.y + c * p1.y,
  };
}

/**
 * 金币飞袋：count 枚金币从浮层中心沿贝塞尔曲线飞到右上角钱袋位置。
 * 用 WAAPI 沿预计算的曲线点做关键帧动画，每枚带一点横向弧度差异。
 * @param {HTMLElement} root 全屏浮层
 * @param {{count?:number}} [opts]
 */
export function coinFly(root, { count = 1 } = {}) {
  if (!root) return null;
  const layer = h('div', { class: 'coin-layer', 'aria-hidden': 'true' });
  const w = root.clientWidth || window.innerWidth || 360;
  const hgt = root.clientHeight || window.innerHeight || 640;
  // 起点：浮层中心偏上；终点：右上角钱袋（与首页金币条同位置）
  const p0 = { x: w / 2, y: hgt * 0.42 };
  const p1 = { x: w - 24, y: 18 };
  // 控制点：往左上拱，形成一条上扬的弧线
  const pc = { x: w * 0.6, y: hgt * 0.12 };

  for (let i = 0; i < count; i += 1) {
    const coin = h('span', { class: 'reward-coin', style: { left: '0', top: '0' } });
    layer.appendChild(coin);
    // 每枚金币错开起点与弧度，避免叠成一条直线
    const jitter = rand(-18, 18);
    const start = { x: p0.x + jitter, y: p0.y };
    const ctrl = { x: pc.x + jitter, y: pc.y + rand(-10, 10) };
    const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const p = quadBezier(start, ctrl, p1, t);
      return { transform: `translate(${p.x}px, ${p.y}px) scale(${0.4 + 0.6 * t}) rotate(${360 * t}deg)`, opacity: t === 0 ? 0 : 1 };
    });
    const anim = coin.animate(pts, {
      duration: 900 + i * 120,
      delay: 200 + i * 180,
      easing: 'cubic-bezier(.3,.7,.4,1)',
      fill: 'forwards',
    });
    anim.onfinish = () => coin.remove();
  }
  root.appendChild(layer);
  setTimeout(() => { if (layer.parentNode) layer.remove(); }, 2200);
  return layer;
}

/** 兼容旧名：以前 celebrate 内部用的是直上 coinBurst，现统一走贝塞尔飞袋。 */
export function coinBurst(root, { count = 3 } = {}) {
  return coinFly(root, { count });
}

/* ─────────────────────────────────────────────────────────────
 * 每日上限提示 / 徽章庆祝条
 * ───────────────────────────────────────────────────────────── */

/** 每日金币到顶：温和弹一条提示（不再累加，由 store.addCoins 返回 0 触发）。 */
export function showDailyCapToast(root) {
  if (!root) return null;
  const toast = h(
    'div',
    { class: 'reward-toast', 'aria-live': 'polite' },
    h('span', { class: 'reward-toast-ico', html: '🏺' }),
    h('span', {}, '今天的金币已经装满啦，明天再来收集吧～')
  );
  root.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
  return toast;
}

/** 新徽章庆祝条：跨课成就（本地）。 */
export function showBadgeCelebration(root, badge) {
  if (!root || !badge) return null;
  const bar = h(
    'div',
    { class: 'reward-badge', 'aria-live': 'polite' },
    h('span', { class: 'reward-badge-ico', html: '🏅' }),
    h('span', { class: 'reward-badge-text' },
      h('strong', {}, '新徽章：' + badge.name),
      h('span', { class: 'reward-badge-desc' }, badge.desc || ''))
  );
  root.appendChild(bar);
  setTimeout(() => bar.remove(), 3000);
  return bar;
}

/* ─────────────────────────────────────────────────────────────
 * 编排一次完整的成功庆祝
 * ───────────────────────────────────────────────────────────── */

/**
 * @param {object} p
 * @param {HTMLElement} p.overlay 全屏浮层（彩带/金币挂载点）
 * @param {{el:HTMLElement, light:Function}} p.stars 三星组件
 * @param {number} p.starCount 1..3
 * @param {object} p.speech
 * @param {object}  [p.store]      可选：传了就评估本地徽章、识别每日上限
 * @param {number} [p.creditedCoins] 本次实际入账金币（store.addCoins 返回值）；
 *   为 0 且尝试过发币时，弹「今日装满」提示而不是再飞金币。
 */
export function celebrate({ overlay, stars, starCount, speech, store, creditedCoins }) {
  confetti(overlay);
  stars.light(starCount, (n) => speech.sfx(n));

  // 1 星 = 1 枚金币沿贝塞尔飞袋；分档音效现场合成
  const coins = Math.max(0, Math.min(3, Math.round(starCount || 1)));
  if (creditedCoins === 0 && store && store.dailyCoinCap && store.coinsToday() >= store.dailyCoinCap()) {
    // 到顶：不再飞金币，改弹温柔提示
    showDailyCapToast(overlay);
  } else if (coins > 0) {
    setTimeout(() => coinFly(overlay, { count: coins }), 450);
    setTimeout(() => playCoinTier(coins), 600);
  }

  setTimeout(() => speech.sfx('right'), 0);
  // 等星星音效节奏走完再播口头表扬，避免叠在一起听不清
  setTimeout(() => speech.praise(), 900);

  // 跨课成就徽章（本地）：有新解锁就弹庆祝条
  if (store && typeof store.evaluateBadges === 'function') {
    setTimeout(() => {
      const newly = store.evaluateBadges();
      if (newly && newly.length) showBadgeCelebration(overlay, newly[0]);
    }, 1200);
  }
}
