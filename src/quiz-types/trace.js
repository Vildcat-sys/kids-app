/**
 * trace.js — 描红字帖（type:'trace'）
 *
 * 数据形状：
 *   {
 *     type: 'trace',
 *     q:    '写一写：一',
 *     char: '一',                    // 要描的字
 *     grid: 'mi',                    // 'mi' 米字格 | 'square' 方格
 *     strokes: [                     // 笔顺，SVG path，相对 0..100 viewBox
 *       { d: 'M15 50 L85 50', tip: '横：起笔轻顿，行笔平稳，收笔再顿。' }
 *     ],
 *     why: '横要左低右高一点点。',
 *   }
 *
 * 交互（全 CSS / SVG / Canvas，零位图）：
 *   1. CSS 画米字格/方格，格内放空心大字（-webkit-text-stroke，系统楷体栈）。
 *   2. SVG(viewBox 0 0 100 100) 按 strokes[].d 用 WAAPI 逐笔描红；
 *      每笔画完 api.speak(stroke.tip) 女声引导。
 *   3. 「看我写一遍」重播笔顺；「我来描」在字上盖透明 canvas，
 *      pointer 事件自由画线（红色半透明，不判分纯玩，可清空）。
 *   4. 全部笔演示完 或 孩子点「写好了」→ api.onAnswer({correct:true})。
 *   5. 「再写一次」重置笔顺动画与画布。
 */

import { h } from '../core/dom.js';

/* ───────────────────────── 纯函数（可在 node --test 下单测） ───────────────────────── */

/**
 * 全部笔顺是否已演示完。
 * @param {number} total   总笔数（strokes.length）
 * @param {number} current 已演示完的笔数（从 0 开始）
 * @returns {boolean}
 */
export function allStrokesDone(total, current) {
  return Number.isInteger(total) && total > 0 && Number.isInteger(current) && current >= total;
}

/**
 * 当前笔顺进度（0..1）。用于进度提示，不做判分。
 * @param {number} total
 * @param {number} current
 * @returns {number}
 */
export function strokeFraction(total, current) {
  if (!Number.isInteger(total) || total <= 0) return 0;
  if (!Number.isInteger(current)) return 0;
  return Math.min(1, Math.max(0, current / total));
}

/* ───────────────────────── 模块级作用域样式（trace- 前缀，只注入一次） ───────────────────────── */

let inited = false;
function ensureCss() {
  if (inited || typeof document === 'undefined') return;
  inited = true;
  const style = document.createElement('style');
  style.textContent = `
    .trace-stage {
      max-width: 430px;
      margin: 0 auto;
      padding: 16px 16px 24px;
      background: #f6ecd2;            /* 作业本米黄纸 */
      border-radius: 18px;
      font-family: "Kaiti SC","STKaiti","KaiTi","楷体",serif;
      color: #6b4420;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      box-shadow: inset 0 0 0 2px #e7d3a8;
      touch-action: manipulation;
    }
    .trace-q { font-size: 22px; font-weight: 700; letter-spacing: 1px; }

    /* ── 字帖格子：外框 + 中线；米字格再加两条虚线对角线 ── */
    .trace-grid {
      position: relative;
      width: 300px;
      height: 300px;
      border: 3px solid #8a5a2b;      /* 棕色毛笔外框感 */
      background-color: #fbf3dd;
      background-image:
        linear-gradient(to right, transparent calc(50% - .5px), #d9b98a calc(50% - .5px), #d9b98a calc(50% + .5px), transparent calc(50% + .5px)),
        linear-gradient(to bottom, transparent calc(50% - .5px), #d9b98a calc(50% - .5px), #d9b98a calc(50% + .5px), transparent calc(50% + .5px));
      background-size: 100% 100%;
      overflow: hidden;
    }
    .trace-grid.mi::before,
    .trace-grid.mi::after {
      content: '';
      position: absolute;
      left: 50%; top: 50%;
      width: 142%;                    /* √2 ≈ 1.414，盖满对角 */
      border-top: 1px dashed #d9b98a;
      transform: translate(-50%, -50%) rotate(45deg);
    }
    .trace-grid.mi::after { transform: translate(-50%, -50%) rotate(-45deg); }

    /* 空心大字：描边棕、透明填充 */
    .trace-char {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 210px;
      line-height: 1;
      color: transparent;
      -webkit-text-stroke: 2px #c9a06a;
      pointer-events: none;
      user-select: none;
    }

    /* 笔顺演示 SVG */
    .trace-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .trace-stroke {
      fill: none;
      stroke: #8a3b1e;               /* 棕色毛笔描红 */
      stroke-width: 6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* 孩子自由画的透明覆盖层 */
    .trace-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      touch-action: none;
    }
    .trace-grid.tracing .trace-canvas { pointer-events: auto; cursor: crosshair; }
    .trace-grid.tracing .trace-canvas-veil {
      position: absolute; inset: 0; pointer-events: none;
      box-shadow: inset 0 0 0 4px #f0932b;
      border-radius: 2px;
    }

    .trace-tip {
      min-height: 30px;
      font-size: 17px;
      color: #8a5a2b;
      text-align: center;
      padding: 0 10px;
    }

    /* 大按钮 */
    .trace-btns { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    .trace-btn {
      border: none;
      border-radius: 999px;
      padding: 12px 22px;
      font-size: 18px;
      font-family: inherit;
      font-weight: 700;
      color: #fff;
      background: #c9a06a;
      box-shadow: 0 3px 0 rgba(120, 80, 40, .35);
      cursor: pointer;
    }
    .trace-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(120,80,40,.35); }
    .trace-btn[data-kind="watch"] { background: #5aa469; }
    .trace-btn[data-kind="draw"]  { background: #f0932b; }
    .trace-btn[data-kind="done"]  { background: #e86a8a; }
    .trace-btn[data-kind="reset"] { background: #a89f8d; }
    .trace-btn[data-kind="clear"] { background: #8a5a2b; }
    .trace-btn[disabled] { opacity: .5; cursor: default; }

    .trace-toolbar { display: none; gap: 10px; justify-content: center; }
    .trace-grid.tracing ~ .trace-toolbar,
    .trace-stage.tracing .trace-toolbar { display: flex; }
  `;
  document.head.appendChild(style);
}

/* ───────────────────────── 题型模块 ───────────────────────── */

export default {
  id: 'trace',
  name: '描红字帖',

  validate(quiz) {
    const errors = [];
    if (!quiz || typeof quiz !== 'object') {
      return ['quiz 必须是对象'];
    }
    if (!quiz.q || typeof quiz.q !== 'string') {
      errors.push('缺少 q（题干）');
    }
    if (!quiz.char || typeof quiz.char !== 'string' || !quiz.char.trim()) {
      errors.push('缺少 char（要描的字）');
    }
    if (quiz.grid && quiz.grid !== 'mi' && quiz.grid !== 'square') {
      errors.push(`grid 只能是 'mi' 或 'square'，收到 '${quiz.grid}'`);
    }
    if (!Array.isArray(quiz.strokes) || quiz.strokes.length === 0) {
      errors.push('strokes 必须是非空数组（至少一笔 SVG path）');
    } else {
      quiz.strokes.forEach((s, i) => {
        if (!s || typeof s.d !== 'string' || !s.d.trim()) {
          errors.push(`strokes[${i}].d 必须是非空字符串（SVG path）`);
        }
      });
    }
    return errors;
  },

  create(quiz, api) {
    ensureCss();

    const strokes = Array.isArray(quiz.strokes) ? quiz.strokes : [];
    const total = strokes.length;
    const gridClass = quiz.grid === 'square' ? 'square' : 'mi';

    let demonstrated = false;   // 是否演示完全部笔
    let submitted = false;       // 是否已上报
    let currentAnim = null;      // 当前正在跑的 WAAPI 动画

    /* ── 字帖格子 ── */
    const pathsHtml = strokes
      .map((s) => `<path class="trace-stroke" d="${s.d}"></path>`)
      .join('');
    const svgWrap = h('div', {
      class: 'trace-svg',
      html: `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${pathsHtml}</svg>`,
    });
    const paths = Array.from(svgWrap.querySelectorAll('.trace-stroke'));

    const charEl = h('div', { class: 'trace-char' }, quiz.char);

    const canvas = h('canvas', { class: 'trace-canvas' });
    const veil = h('div', { class: 'trace-canvas-veil' });

    const grid = h(
      'div',
      { class: `trace-grid ${gridClass}` },
      charEl,
      svgWrap,
      canvas,
      veil
    );

    /* ── 提示语（每笔演示时同步显示） ── */
    const tipEl = h('div', { class: 'trace-tip' }, quiz.why || '看我写一遍，再自己描一描');

    /* ── 上报：全部笔演示完 或 孩子点「写好了」，都只上报一次 ── */
    function submit() {
      if (submitted) return;
      submitted = true;
      if (typeof api.stop === 'function') api.stop();
      api.onAnswer({
        correct: true,
        detail: { char: quiz.char, strokes: total, demonstrated },
      });
    }

    /* ── 笔顺动画：WAAPI 把一笔从全长画到 0 ── */
    function resetAnimation() {
      if (currentAnim) { try { currentAnim.cancel(); } catch (_) {} currentAnim = null; }
      paths.forEach((p) => {
        try {
          const len = p.getTotalLength();
          p.style.strokeDasharray = len;
          p.style.strokeDashoffset = len;
        } catch (_) { /* 节点未挂载时忽略 */ }
      });
    }

    function playAll() {
      if (submitted) return;
      resetAnimation();
      let i = 0;
      const step = () => {
        if (submitted) return;
        if (i >= total) {
          demonstrated = true;
          submit();              // 全部笔演示完 → 上报
          return;
        }
        const path = paths[i];
        let len = 100;
        try { len = path.getTotalLength(); } catch (_) {}
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        const dur = Math.max(600, Math.min(1800, len * 16));
        currentAnim = path.animate(
          [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: dur, easing: 'ease-in-out' }
        );
        const tip = strokes[i] && strokes[i].tip;
        tipEl.textContent = tip || `第 ${i + 1} 笔`;
        currentAnim.onfinish = () => {
          if (tip && typeof api.speak === 'function') api.speak(tip);
          i++;
          setTimeout(step, 260);
        };
      };
      step();
    }

    /* ── 「我来描」：透明 canvas 自由画线（红色半透明，纯玩不判分） ── */
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    function fitCanvas() {
      const rect = grid.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    const ctx = canvas.getContext('2d');
    let drawing = false;

    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
      };
    }
    canvas.addEventListener('pointerdown', (e) => {
      if (submitted) return;
      drawing = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      ctx.strokeStyle = 'rgba(216, 74, 54, .55)';   /* 红色半透明笔 */
      ctx.lineWidth = 10 * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing || submitted) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    });
    const endStroke = () => { drawing = false; };
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    function clearCanvas() {
      ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    /* ── 按钮 ── */
    const btnWatch = h('button', {
      class: 'trace-btn', type: 'button', 'data-kind': 'watch', onClick: playAll,
    }, '看我写一遍');

    const btnDraw = h('button', {
      class: 'trace-btn', type: 'button', 'data-kind': 'draw',
      onClick: () => {
        if (submitted) return;
        fitCanvas();
        grid.classList.add('tracing');
        stage.classList.add('tracing');
      },
    }, '我来描');

    const btnDone = h('button', {
      class: 'trace-btn', type: 'button', 'data-kind': 'done', onClick: submit,
    }, '写好了');

    const btnReset = h('button', {
      class: 'trace-btn', type: 'button', 'data-kind': 'reset',
      onClick: () => {
        resetAnimation();
        clearCanvas();
        demonstrated = false;
        tipEl.textContent = quiz.why || '看我写一遍，再自己描一描';
      },
    }, '再写一次');

    const btnClear = h('button', {
      class: 'trace-btn', type: 'button', 'data-kind': 'clear', onClick: clearCanvas,
    }, '擦掉重画');

    const btnExitDraw = h('button', {
      class: 'trace-btn', type: 'button', 'data-kind': 'reset',
      onClick: () => {
        grid.classList.remove('tracing');
        stage.classList.remove('tracing');
      },
    }, '描好了，退出');

    const toolbar = h('div', { class: 'trace-toolbar' }, btnClear, btnExitDraw);

    const stage = h(
      'div',
      { class: 'trace-stage' },
      h('div', { class: 'trace-q' }, quiz.q || '写一写'),
      grid,
      tipEl,
      h('div', { class: 'trace-btns' }, btnWatch, btnDraw, btnDone, btnReset),
      toolbar
    );

    // 挂到文档后再量画布、初始化笔锋隐藏态
    requestAnimationFrame(() => {
      fitCanvas();
      resetAnimation();
    });

    return {
      el: stage,
      destroy() {
        resetAnimation();
        if (typeof api.stop === 'function') api.stop();
      },
    };
  },
};
