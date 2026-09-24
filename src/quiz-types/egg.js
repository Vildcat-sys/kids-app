/**
 * egg.js — 英语砸蛋（type:'egg'）
 *
 * 数据形状（见 docs/玩法接线契约-20260925.md §3.1）：
 *   {
 *     type: 'egg',
 *     q:    '砸蛋出单词',
 *     words: ['apple','banana','cat'],   // 2~5 个单词序列
 *     why:  '砸蛋真好玩',
 *   }
 *
 * 交互链（全部内联 SVG + CSS 关键帧 + Canvas 粒子，零位图零第三方库）：
 *   点蛋 → 摇晃(CSS 左右摆动 ~0.6s) → 分级裂纹(SVG path 三级依次叠加)
 *        → 弹出单词卡(大字英文 + api.sayWord) → 「我会读了」自确认(不录音)
 *        → 蛋落下消失(WAAPI translateY+fade) → 进度条+1 → 循环
 *        → 全部砸完 → 扭蛋机(旋钮按下/转动) → 烟花(Canvas 粒子 ~1.2s 暖色)
 *        → api.onAnswer({correct:true}) → 「再来一轮」可重置。
 *
 * 音效全部 WebAudio 现场合成（懒加载 AudioContext + tone()，照 reward.js 写法），
 * 不新增任何 mp3：摇晃=低频短抖、裂纹=短脆响、出蛋=明亮上行音、烟花=上行琶音。
 */

import { h } from '../core/dom.js';

/* ─────────────────────────────────────────────────────────────
 * 纯函数（不碰 DOM，可在 node --test 里直接测）
 * ───────────────────────────────────────────────────────────── */

/**
 * 给定当前进度状态，返回下一个要砸的单词下标；全部砸完返回 -1。
 * @param {{index:number, total:number}} state index=当前正在展示的单词下标
 * @returns {number} 下一个下标；-1 表示本轮已全部完成
 */
export function nextWordIndex(state) {
  if (!state || typeof state.index !== 'number' || typeof state.total !== 'number') return 0;
  const next = state.index + 1;
  return next < state.total ? next : -1;
}

/** 是否已砸完全部单词。 */
export function isRoundComplete(state) {
  return (
    !!state &&
    typeof state.index === 'number' &&
    typeof state.total === 'number' &&
    state.index >= state.total
  );
}

/* ─────────────────────────────────────────────────────────────
 * 校验
 * ───────────────────────────────────────────────────────────── */

function validate(quiz) {
  const errors = [];
  if (!quiz || typeof quiz !== 'object') {
    errors.push('quiz 必须是对象');
    return errors;
  }
  if (!quiz.q || typeof quiz.q !== 'string') {
    errors.push('缺少 q（题干）');
  }
  const words = quiz.words;
  if (!Array.isArray(words)) {
    errors.push('words 必须是字符串数组');
  } else {
    if (words.length < 2) errors.push('words 至少需要 2 个单词');
    else if (words.length > 5) errors.push('words 最多 5 个单词');
    words.forEach((w, i) => {
      if (typeof w !== 'string' || !w.trim()) errors.push(`words[${i}] 必须是非空字符串`);
    });
  }
  if (!quiz.why || typeof quiz.why !== 'string') {
    errors.push('缺少 why（答后解释）');
  }
  return errors;
}

/* ─────────────────────────────────────────────────────────────
 * 内联 SVG（水彩暖色，手绘原创）
 * ───────────────────────────────────────────────────────────── */

const EGG_SVG = `
<svg viewBox="0 0 200 240" class="egg-svg" aria-hidden="true">
  <defs>
    <radialGradient id="egggrad" cx="42%" cy="32%" r="85%">
      <stop offset="0%" stop-color="#FFE7C8"/>
      <stop offset="55%" stop-color="#FFBC8A"/>
      <stop offset="100%" stop-color="#FF9E7D"/>
    </radialGradient>
  </defs>
  <path d="M100 16 C152 16 170 80 170 142 C170 202 141 228 100 228 C59 228 30 202 30 142 C30 80 48 16 100 16 Z"
        fill="url(#egggrad)" stroke="#F08A5C" stroke-width="3"/>
  <ellipse cx="72" cy="76" rx="16" ry="26" fill="#ffffff" opacity="0.5" transform="rotate(-14 72 76)"/>
  <circle cx="128" cy="180" r="5" fill="#FF7E67" opacity="0.55"/>
  <circle cx="66" cy="170" r="4" fill="#FFD54F" opacity="0.7"/>
  <path class="egg-crack egg-c1" d="M100 62 L90 82 L104 96 L95 112" fill="none" stroke="#8a5a3b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path class="egg-crack egg-c2" d="M100 62 L84 96 L110 118 L88 150 L104 176" fill="none" stroke="#8a5a3b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path class="egg-crack egg-c3" d="M100 52 L80 100 L114 128 L84 170 L102 210 M110 128 L128 152" fill="none" stroke="#6e4226" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const GACHA_SVG = `
<svg viewBox="0 0 200 200" class="egg-svg" aria-hidden="true">
  <path d="M42 92 Q100 26 158 92 Z" fill="#FFD54F" stroke="#E8A93C" stroke-width="3"/>
  <rect x="42" y="92" width="116" height="90" rx="16" fill="#FF8A3D" stroke="#E0701F" stroke-width="3"/>
  <circle cx="100" cy="120" r="26" fill="#FFF6E8" stroke="#E0701F" stroke-width="3"/>
  <circle cx="91" cy="115" r="9" fill="#FF9E7D"/>
  <circle cx="110" cy="124" r="9" fill="#6BCB77"/>
  <circle cx="100" cy="132" r="7" fill="#90CAF9"/>
  <circle class="egg-knob" cx="150" cy="158" r="13" fill="#7A4A2B" stroke="#5c3520" stroke-width="3"/>
</svg>`;

const FW_COLORS = ['#FF8A3D', '#FFD54F', '#FF6B6B', '#FFB74D', '#FF9E7D'];

/* ─────────────────────────────────────────────────────────────
 * WebAudio 现场合成（懒加载单例，不新增音频文件；照 reward.js 写法）
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
function tone(freq, start, dur = 0.15, type = 'triangle', peak = 0.08) {
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

/** 摇晃：低频短抖（三连短促低音）。 */
function sfxShake() {
  tone(95, 0, 0.1, 'square', 0.05);
  tone(95, 0.12, 0.1, 'square', 0.05);
  tone(95, 0.24, 0.13, 'square', 0.05);
}

/** 裂纹：短脆响。 */
function sfxCrack() {
  tone(1600, 0, 0.05, 'square', 0.07);
  tone(2500, 0.02, 0.04, 'square', 0.05);
}

/** 出蛋：明亮上行音。 */
function sfxPop() {
  tone(660, 0, 0.12, 'triangle', 0.09);
  tone(990, 0.09, 0.18, 'triangle', 0.09);
}

/** 烟花：上行琶音 C5 E5 G5 C6。 */
function sfxFanfare() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.09));
}

/* ─────────────────────────────────────────────────────────────
 * CSS 注入（模块自带作用域样式，所有 class 前缀 egg-）
 * ───────────────────────────────────────────────────────────── */

let inited = false;
function ensureCss() {
  if (inited || typeof document === 'undefined') return;
  inited = true;
  const style = document.createElement('style');
  style.textContent = `
    .egg-stage {
      max-width: 430px;
      margin: 0 auto;
      padding: 18px 16px 30px;
      box-sizing: border-box;
      background: linear-gradient(180deg, #FFF8EE 0%, #FFEEDD 100%);
      border-radius: 26px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      font-family: inherit;
    }
    .egg-progress { display: flex; gap: 9px; }
    .egg-dot { width: 12px; height: 12px; border-radius: 50%; background: #F3D9C2; transition: all .25s; }
    .egg-dot.done { background: #6BCB77; }
    .egg-dot.cur { background: #FF8A3D; transform: scale(1.3); }
    .egg-scene {
      position: relative; width: 100%; min-height: 340px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
    }
    .egg-egg-wrap { cursor: pointer; line-height: 0; }
    .egg-egg { display: block; width: 180px; }
    .egg-svg { width: 100%; height: auto; display: block; }
    .egg-egg-wrap.shaking { animation: eggWobble 0.6s ease-in-out; }
    @keyframes eggWobble {
      0%   { transform: rotate(0); }
      20%  { transform: rotate(-9deg); }
      40%  { transform: rotate(8deg); }
      60%  { transform: rotate(-7deg); }
      80%  { transform: rotate(5deg); }
      100% { transform: rotate(0); }
    }
    .egg-crack { opacity: 0; transition: opacity .25s ease; }
    .egg-egg-wrap.crack-1 .egg-c1 { opacity: 1; }
    .egg-egg-wrap.crack-2 .egg-c1, .egg-egg-wrap.crack-2 .egg-c2 { opacity: 1; }
    .egg-egg-wrap.crack-3 .egg-c1, .egg-egg-wrap.crack-3 .egg-c2, .egg-egg-wrap.crack-3 .egg-c3 { opacity: 1; }
    .egg-hint { margin: 0; color: #B07A52; font-size: 15px; }
    .egg-card { display: flex; flex-direction: column; align-items: center; gap: 20px; animation: eggPop .35s cubic-bezier(.34,1.56,.64,1); }
    @keyframes eggPop { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .egg-word { font-size: 46px; font-weight: 700; color: #7A4A2B; letter-spacing: 1px; }
    .egg-btn {
      border: none; cursor: pointer;
      background: linear-gradient(180deg, #FFA45B, #FF8A3D);
      color: #fff; font-size: 20px; font-weight: 700;
      padding: 14px 34px; border-radius: 999px;
      box-shadow: 0 6px 0 #d96f22, 0 10px 18px rgba(217,111,34,.35);
    }
    .egg-btn:active { transform: translateY(3px); box-shadow: 0 3px 0 #d96f22; }
    .egg-gacha { display: flex; flex-direction: column; align-items: center; gap: 18px; }
    .egg-gacha-machine { display: block; width: 180px; line-height: 0; }
    .egg-knob { transform-box: fill-box; transform-origin: center; }
    .egg-gacha-machine.turned .egg-knob { animation: eggKnob .55s ease-in-out; }
    @keyframes eggKnob {
      0% { transform: rotate(0); }
      50% { transform: rotate(160deg); }
      100% { transform: rotate(160deg); }
    }
    .egg-fworks { width: 100%; max-width: 400px; height: 320px; display: block; }
    .egg-again { margin-top: 6px; }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────────────────────
 * 题型模块
 * ───────────────────────────────────────────────────────────── */

export default {
  id: 'egg',
  name: '砸蛋出单词',
  validate,

  create(quiz, api) {
    ensureCss();
    const words = quiz.words.slice();
    let index = 0;
    let busy = false;
    const timers = [];
    const later = (fn, ms) => {
      const t = setTimeout(fn, ms);
      timers.push(t);
      return t;
    };

    const root = h('div', { class: 'egg-stage' });
    const progress = h('div', { class: 'egg-progress', 'aria-hidden': 'true' });
    const scene = h('div', { class: 'egg-scene' });
    root.appendChild(progress);
    root.appendChild(scene);

    function renderProgress() {
      progress.replaceChildren();
      words.forEach((_, i) => {
        const cls = 'egg-dot' + (i < index ? ' done' : '') + (i === index ? ' cur' : '');
        progress.appendChild(h('i', { class: cls }));
      });
    }

    /* —— 阶段一：舞台上的大蛋，点击开始摇晃 —— */
    function showEgg() {
      busy = false;
      renderProgress();
      scene.replaceChildren();
      const wrap = h(
        'div',
        { class: 'egg-egg-wrap', onClick: onEggTap },
        h('span', { class: 'egg-egg', html: EGG_SVG })
      );
      scene.appendChild(wrap);
      scene.appendChild(h('p', { class: 'egg-hint' }, '点一点，砸开蛋'));
    }

    function onEggTap() {
      if (busy) return;
      busy = true;
      const wrap = scene.querySelector('.egg-egg-wrap');
      if (!wrap) return;
      const hint = scene.querySelector('.egg-hint');
      if (hint) hint.remove();
      sfxShake();
      wrap.classList.add('shaking');
      later(() => { wrap.classList.remove('shaking'); wrap.classList.add('crack-1'); sfxCrack(); }, 600);
      later(() => { wrap.classList.add('crack-2'); sfxCrack(); }, 980);
      later(() => { wrap.classList.add('crack-3'); sfxPop(); }, 1360);
      later(() => showCard(words[index]), 1700);
    }

    /* —— 阶段二：裂开弹出单词卡，自动发音 + 自确认 —— */
    function showCard(word) {
      scene.appendChild(
        h(
          'div',
          { class: 'egg-card' },
          h('div', { class: 'egg-word' }, word),
          h('button', { class: 'egg-btn', type: 'button', onClick: onConfirm }, '我会读了')
        )
      );
      if (typeof api.sayWord === 'function') api.sayWord(word);
    }

    function onConfirm() {
      if (!busy) return;
      if (typeof api.stop === 'function') api.stop();
      const card = scene.querySelector('.egg-card');
      if (card) card.remove();
      const wrap = scene.querySelector('.egg-egg-wrap');

      const advance = () => {
        busy = false;
        const next = nextWordIndex({ index, total: words.length });
        if (next < 0) { finish(); return; }
        index = next;
        later(() => showEgg(), 300);
      };

      // 蛋落下消失（WAAPI translateY + fade out）。
      // onfinish 与 700ms 兜底二选一、advanced 幂等：即使个别 WebView 不触发
      // onfinish，也必定推进且只推进一次，不会把整题卡死。
      let advanced = false;
      const go = () => {
        if (advanced) return;
        advanced = true;
        if (wrap) wrap.remove();
        advance();
      };
      if (wrap && typeof wrap.animate === 'function') {
        const anim = wrap.animate(
          [
            { transform: 'translateY(0) rotate(0)', opacity: 1 },
            { transform: 'translateY(260px) rotate(14deg)', opacity: 0 },
          ],
          { duration: 480, easing: 'ease-in', fill: 'forwards' }
        );
        anim.onfinish = go;
        later(go, 700);
      } else {
        go();
      }
    }

    /* —— 阶段三：全部砸完 → 扭蛋机 → 烟花 → onAnswer —— */
    function finish() {
      index = words.length;
      renderProgress();
      scene.replaceChildren();
      scene.appendChild(
        h(
          'div',
          { class: 'egg-gacha' },
          h('span', { class: 'egg-gacha-machine', html: GACHA_SVG }),
          h('button', { class: 'egg-btn', type: 'button', onClick: onKnob }, '扭一个奖')
        )
      );
    }

    function onKnob() {
      if (busy) return;
      busy = true;
      const machine = scene.querySelector('.egg-gacha-machine');
      if (machine) machine.classList.add('turned');
      sfxPop();
      later(() => launchFireworks(), 550);
    }

    function launchFireworks() {
      sfxFanfare();
      const canvas = h('canvas', { class: 'egg-fworks', width: '400', height: '320' });
      scene.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const particles = [];
      const bursts = [
        { x: 130, y: 110 },
        { x: 265, y: 90 },
        { x: 200, y: 170 },
      ];
      bursts.forEach((b, bi) => {
        for (let i = 0; i < 26; i += 1) {
          const ang = (Math.PI * 2 * i) / 26 + Math.random() * 0.2;
          const sp = 1.6 + Math.random() * 2.6;
          particles.push({
            x: b.x, y: b.y,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            life: 1, color: FW_COLORS[(i + bi) % FW_COLORS.length],
          });
        }
      });

      const DUR = 1200;
      const start = performance.now();
      const frame = (now) => {
        const t = now - start;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of particles) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 0.022;
          if (p.life > 0) {
            alive = true;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        if (alive && t < DUR) {
          requestAnimationFrame(frame);
        } else {
          later(() => {
            scene.appendChild(h('button', { class: 'egg-btn egg-again', type: 'button', onClick: reset }, '再来一轮'));
            api.onAnswer({ correct: true, detail: { words: words.slice() } });
          }, 200);
        }
      };
      requestAnimationFrame(frame);
    }

    /* —— 再来一轮 —— */
    function reset() {
      if (typeof api.stop === 'function') api.stop();
      index = 0;
      showEgg();
    }

    showEgg();

    return {
      el: root,
      destroy() {
        timers.forEach(clearTimeout);
        if (typeof api.stop === 'function') api.stop();
      },
    };
  },
};
