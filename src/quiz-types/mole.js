/**
 * mole.js — 打地鼠
 *
 * 数据形状（契约 §3.4）：
 *   {
 *     type: 'mole',
 *     q:        '找出所有「圆形」的东西',
 *     duration: 20,                       // 限时秒数
 *     moles: [
 *       { label: '皮球', target: true  },
 *       { label: '积木', target: false },
 *     ],
 *     why: '圆的东西滚得快。',
 *   }
 *
 * 设计要点：
 *   - CSS 半圆地洞 + 统一圆脸 SVG（label 标在下方），每次一只从随机洞冒出。
 *   - 点中 target=true → 缩回笑；点中 target=false → api.misstep() 摇头（不结束）。
 *   - 顶部倒计时条；所有 target 点完或时间到 →
 *     api.onAnswer({correct:true, detail:{hit,total,wrong}})。
 *   - 「再来一局」重置整局。
 *   - 计分逻辑抽成纯函数 createScore / updateScore，便于 node --test 单测。
 */

import { h } from '../core/dom.js';

const POP_EVERY = 900;   // 每隔多久冒一只（ms）
const SHOW_FOR = 1100;   // 一只停留多久（ms）
const TICK = 100;        // 倒计时条刷新间隔（ms）

/** 统一卡通圆脸 SVG（本阶段所有地鼠同一张脸，靠 label 区分） */
const MOLE_SVG = `
<svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true">
  <circle cx="50" cy="55" r="38" fill="#FFCC80" stroke="#8D6E63" stroke-width="3"/>
  <circle cx="38" cy="48" r="4.5" fill="#5D4C41"/>
  <circle cx="62" cy="48" r="4.5" fill="#5D4C41"/>
  <ellipse cx="33" cy="60" rx="5" ry="3" fill="#FFAB91"/>
  <ellipse cx="67" cy="60" rx="5" ry="3" fill="#FFAB91"/>
  <path d="M42 66 Q50 74 58 66" stroke="#5D4C41" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;

/* ─────────────── 纯函数：计分 ─────────────── */

/** 初始计分状态：total = 该题 target 地鼠总数 */
export function createScore(moles) {
  return {
    hit: 0,
    total: moles.filter((m) => m && m.target === true).length,
    wrong: 0,
    done: false,
  };
}

/**
 * 点击一只地鼠后的下一个状态（不可变返回）。
 * target 地鼠 → hit+1，攒满 total 即 done；
 * 非 target 地鼠 → wrong+1；
 * 已 done 后不再变化。
 */
export function updateScore(state, mole) {
  if (!state || state.done) return state;
  if (mole && mole.target === true) {
    const hit = state.hit + 1;
    return { hit, total: state.total, wrong: state.wrong, done: hit >= state.total };
  }
  return { hit: state.hit, total: state.total, wrong: state.wrong + 1, done: false };
}

/* ─────────────── 作用域样式 ─────────────── */

let inited = false;
function ensureCss() {
  if (inited || typeof document === 'undefined') return;
  inited = true;
  const style = document.createElement('style');
  style.textContent = `
    .mole-stage { display:flex; flex-direction:column; align-items:center; gap:16px; padding:8px 4px; }
    .mole-timer-wrap { width:min(360px, 92vw); height:14px; background:#EFEBE9;
      border-radius:999px; overflow:hidden; box-shadow:inset 0 1px 3px rgba(0,0,0,.15); }
    .mole-timer-bar { height:100%; width:100%; border-radius:999px;
      background:linear-gradient(90deg,#FFD54F,#FF8A3D); }
    .mole-count { font-size:15px; font-weight:700; color:#6D4C41; }
    .mole-field { display:flex; gap:10px; align-items:flex-end; justify-content:center; flex-wrap:wrap; }
    .mole-hole-wrap { position:relative; width:84px; height:118px; }
    .mole-mole { position:absolute; left:50%; bottom:20px; z-index:1; padding:0; border:none;
      background:none; cursor:pointer; display:flex; flex-direction:column; align-items:center;
      transform:translateX(-50%) translateY(115%); transition:transform .18s ease; }
    .mole-mole.up { transform:translateX(-50%) translateY(0); }
    .mole-face { display:block; }
    .mole-label { margin-top:2px; font-size:13px; font-weight:700; color:#5D4C41;
      background:#fff; padding:1px 10px; border-radius:999px; box-shadow:0 1px 3px rgba(0,0,0,.15); white-space:nowrap; }
    .mole-hole { position:absolute; left:50%; bottom:0; transform:translateX(-50%);
      width:80px; height:26px; border-radius:50%; background:#6D4C41; z-index:2;
      box-shadow:inset 0 4px 6px rgba(0,0,0,.35); }
    .mole-mole.happy { animation: moleHappy .3s ease; }
    .mole-mole.shake { animation: moleShake .35s ease; }
    @keyframes moleHappy { 50% { transform:translateX(-50%) translateY(-14%) scale(1.12); } }
    @keyframes moleShake {
      25% { transform:translateX(calc(-50% - 7px)); }
      75% { transform:translateX(calc(-50% + 7px)); }
    }
    .mole-again { display:none; padding:10px 26px; border:none; border-radius:999px;
      font-size:16px; font-weight:700; cursor:pointer; background:#90CAF9; color:#fff;
      box-shadow:0 3px 8px rgba(93,64,55,.2); }
    .mole-again.show { display:block; }
  `;
  document.head.appendChild(style);
}

/* ─────────────── 题型实现 ─────────────── */

export default {
  id: 'mole',
  name: '打地鼠',

  validate(quiz) {
    const errors = [];
    if (!quiz.q || typeof quiz.q !== 'string') {
      errors.push('缺少 q（题干）');
    }
    if (typeof quiz.duration !== 'number' || !Number.isFinite(quiz.duration) || quiz.duration <= 0) {
      errors.push('duration 必须是正数秒数');
    }
    if (!Array.isArray(quiz.moles) || quiz.moles.length < 2) {
      errors.push('moles 必须是至少含 2 个地鼠的数组');
    } else {
      quiz.moles.forEach((m, i) => {
        if (!m || typeof m.label !== 'string' || !m.label.trim()) {
          errors.push(`moles[${i}].label 必须是非空字符串`);
        }
        if (!m || typeof m.target !== 'boolean') {
          errors.push(`moles[${i}].target 必须是布尔值`);
        }
      });
    }
    if (!quiz.why || typeof quiz.why !== 'string') {
      errors.push('缺少 why（答后解释）');
    }
    return errors;
  },

  create(quiz, api) {
    ensureCss();
    let destroyed = false;
    let answered = false;
    let score = createScore(quiz.moles);
    const totalTargets = score.total;
    const DURATION_MS = quiz.duration * 1000;
    let remaining = DURATION_MS;

    let popTimer = null;
    let hideTimer = null;
    let ticker = null;
    let visible = null; // { holeIdx, moleIdx }

    /* 洞数：契约要求一行 3~5 个 */
    const holeCount = Math.min(5, Math.max(3, quiz.moles.length));
    const holes = [];

    const barEl = h('div', { class: 'mole-timer-bar' });
    const countEl = h('div', { class: 'mole-count' }, `打中 0/${totalTargets}`);

    function renderCount() {
      countEl.textContent = `打中 ${score.hit}/${totalTargets}`;
    }

    /* 每只洞：按钮(地鼠) + 洞 */
    for (let i = 0; i < holeCount; i++) {
      const labelEl = h('span', { class: 'mole-label' }, '');
      const moleBtn = h('button', {
        class: 'mole-mole',
        type: 'button',
        onClick: () => onMoleClick(i),
      }, h('span', { class: 'mole-face', html: MOLE_SVG }), labelEl);
      const wrap = h('div', { class: 'mole-hole-wrap' }, moleBtn, h('div', { class: 'mole-hole' }));
      holes.push({ wrap, moleBtn, labelEl });
    }

    function retractVisible() {
      if (!visible) return;
      holes[visible.holeIdx].moleBtn.classList.remove('up', 'happy', 'shake');
      visible = null;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }

    function scheduleNext() {
      if (destroyed || answered) return;
      popTimer = setTimeout(pop, POP_EVERY);
    }

    function pop() {
      if (destroyed || answered) return;
      retractVisible();
      const holeIdx = Math.floor(Math.random() * holes.length);
      const moleIdx = Math.floor(Math.random() * quiz.moles.length);
      const hole = holes[holeIdx];
      hole.labelEl.textContent = quiz.moles[moleIdx].label;
      hole.moleBtn.classList.remove('happy', 'shake');
      hole.moleBtn.classList.add('up');
      visible = { holeIdx, moleIdx };
      hideTimer = setTimeout(() => {
        retractVisible();
        scheduleNext();
      }, SHOW_FOR);
    }

    function onMoleClick(holeIdx) {
      if (destroyed || answered || !visible || visible.holeIdx !== holeIdx) return;
      const mole = quiz.moles[visible.moleIdx];
      const hole = holes[holeIdx];
      if (mole.target === true) {
        score = updateScore(score, mole);
        hole.moleBtn.classList.add('happy');
        renderCount();
        retractVisible();
        if (score.done) { finish(); return; }
      } else {
        if (typeof api.misstep === 'function') api.misstep();
        score = updateScore(score, mole);
        hole.moleBtn.classList.add('shake');
        retractVisible();
      }
      scheduleNext();
    }

    function finish() {
      if (answered) return;
      answered = true;
      retractVisible();
      if (popTimer) clearTimeout(popTimer);
      if (ticker) clearInterval(ticker);
      againBtn.classList.add('show');
      api.onAnswer({ correct: true, detail: { hit: score.hit, total: totalTargets, wrong: score.wrong } });
    }

    function reset() {
      score = createScore(quiz.moles);
      answered = false;
      remaining = DURATION_MS;
      retractVisible();
      barEl.style.width = '100%';
      againBtn.classList.remove('show');
      renderCount();
      startLoop();
    }

    const againBtn = h('button', {
      class: 'mole-again',
      type: 'button',
      onClick: reset,
    }, '再来一局');

    function startLoop() {
      ticker = setInterval(() => {
        if (destroyed || answered) return;
        remaining -= TICK;
        barEl.style.width = `${Math.max(0, (remaining / DURATION_MS) * 100)}%`;
        if (remaining <= 0) finish();
      }, TICK);
      scheduleNext();
    }

    const el = h(
      'div',
      { class: 'mole-stage' },
      h('div', { class: 'mole-timer-wrap' }, barEl),
      countEl,
      h('div', { class: 'mole-field' }, holes.map((ho) => ho.wrap)),
      againBtn
    );

    startLoop();

    return {
      el,
      destroy() {
        destroyed = true;
        retractVisible();
        if (popTimer) clearTimeout(popTimer);
        if (ticker) clearInterval(ticker);
      },
    };
  },
};
