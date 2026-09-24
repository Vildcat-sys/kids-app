/**
 * coloring.js — 涂色（自由画笔）
 *
 * 数据形状（契约 §3.3）：
 *   {
 *     type: 'coloring',
 *     q:       '给太阳涂上温暖的颜色',
 *     target:  'sun',              // 预设线稿：sun | flower | star | apple
 *     palette: ['#FF8A3D','#FFD54F','#FF6B6B','#A5D6A7','#90CAF9'],
 *     why:     '涂得真漂亮！',
 *   }
 *
 * 设计要点：
 *   - 双层 canvas：底层铺黑线稿（重涂时保留），顶层接收画笔；
 *     「重涂」只清顶层，线稿不动。
 *   - 自由粗圆头笔触（lineWidth 18 / lineCap round），pointer 事件，
 *     不做 flood fill（契约明确要求简单可靠）。
 *   - 点「完成」即 api.onAnswer({correct:true})，由容器统一反馈。
 */

import { h } from '../core/dom.js';

const SIZE = 360;
const BRUSH = 18;

/** 本阶段支持的预设线稿（素材阶段换 webp 线稿） */
export const PRESET_TARGETS = ['sun', 'flower', 'star', 'apple'];

/* ─────────────── 线稿绘制（ctx 直接画黑描边） ─────────────── */

function stroke(ctx, draw) {
  ctx.beginPath();
  draw();
  ctx.stroke();
}

/** 在底层 canvas 上画奶白底 + 深棕轮廓（水彩绘本风） */
function drawLineArt(ctx, target) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#FFF7E8';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#6D4C41';

  if (target === 'sun') {
    const cx = SIZE / 2, cy = 165;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = 78, r2 = 98;
      stroke(ctx, () => {
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      });
    }
    stroke(ctx, () => ctx.arc(cx, cy, 52, 0, Math.PI * 2));
  } else if (target === 'flower') {
    const cx = SIZE / 2, cy = 150;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      stroke(ctx, () => ctx.arc(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46, 26, 0, Math.PI * 2));
    }
    stroke(ctx, () => ctx.arc(cx, cy, 22, 0, Math.PI * 2));
    stroke(ctx, () => {
      ctx.moveTo(cx, cy + 22);
      ctx.lineTo(cx, 300);
    });
    stroke(ctx, () => ctx.ellipse(cx + 22, 270, 16, 9, -0.5, 0, Math.PI * 2));
  } else if (target === 'star') {
    const cx = SIZE / 2, cy = 170;
    const outer = 90, inner = 38;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  } else {
    // apple
    const cx = SIZE / 2;
    stroke(ctx, () => {
      ctx.moveTo(cx, 120);
      ctx.quadraticCurveTo(cx + 6, 95, cx + 2, 80);
    });
    stroke(ctx, () => ctx.ellipse(cx + 26, 96, 16, 9, -0.5, 0, Math.PI * 2));
    stroke(ctx, () => {
      ctx.moveTo(cx - 40, 150);
      ctx.bezierCurveTo(cx - 95, 170, cx - 70, 290, cx, 292);
      ctx.bezierCurveTo(cx + 70, 290, cx + 95, 170, cx + 40, 150);
      ctx.bezierCurveTo(cx + 22, 138, cx - 22, 138, cx - 40, 150);
    });
  }
}

/* ─────────────── 作用域样式 ─────────────── */

let inited = false;
function ensureCss() {
  if (inited || typeof document === 'undefined') return;
  inited = true;
  const style = document.createElement('style');
  style.textContent = `
    .color-stage { display:flex; flex-direction:column; align-items:center; gap:14px; padding:8px 4px; }
    .color-palette { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; }
    .color-swatch { width:44px; height:44px; border-radius:50%; border:3px solid #fff;
      box-shadow:0 2px 6px rgba(93,64,55,.25); cursor:pointer; transition:transform .15s ease, border-color .15s ease; padding:0; }
    .color-swatch.on { transform:scale(1.28); border-color:#6D4C41; }
    .color-canvas-wrap { position:relative; width:min(360px, 92vw); aspect-ratio:1/1;
      border-radius:20px; overflow:hidden; box-shadow:0 6px 18px rgba(93,64,55,.25); }
    .color-canvas { position:absolute; inset:0; width:100%; height:100%; touch-action:none; cursor:crosshair; }
    .color-tools { display:flex; gap:14px; }
    .color-btn { padding:10px 26px; border:none; border-radius:999px; font-size:16px;
      font-weight:700; cursor:pointer; box-shadow:0 3px 8px rgba(93,64,55,.2); }
    .color-clear { background:#FFE0B2; color:#6D4C41; }
    .color-done { background:#81C784; color:#fff; }
  `;
  document.head.appendChild(style);
}

/* ─────────────── 题型实现 ─────────────── */

export default {
  id: 'coloring',
  name: '涂色',

  validate(quiz) {
    const errors = [];
    if (!quiz.q || typeof quiz.q !== 'string') {
      errors.push('缺少 q（题干）');
    }
    if (!quiz.target || typeof quiz.target !== 'string') {
      errors.push('缺少 target（线稿标识）');
    } else if (!PRESET_TARGETS.includes(quiz.target)) {
      errors.push(`target="${quiz.target}" 不是预设线稿，可选：${PRESET_TARGETS.join(' / ')}`);
    }
    if (!Array.isArray(quiz.palette) || quiz.palette.length === 0) {
      errors.push('palette 必须是非空颜色数组');
    } else {
      quiz.palette.forEach((c, i) => {
        if (typeof c !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(c)) {
          errors.push(`palette[${i}]="${c}" 不是合法十六进制颜色`);
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
    let answered = false;
    let color = quiz.palette[0];

    // 双层 canvas：底=线稿，顶=画笔
    const lineCanvas = h('canvas', { class: 'color-canvas', width: SIZE, height: SIZE });
    const paintCanvas = h('canvas', { class: 'color-canvas' });
    paintCanvas.width = SIZE;
    paintCanvas.height = SIZE;
    drawLineArt(lineCanvas.getContext('2d'), quiz.target);
    const pctx = paintCanvas.getContext('2d');
    pctx.lineWidth = BRUSH;
    pctx.lineCap = 'round';
    pctx.lineJoin = 'round';

    /* 画笔 */
    let drawing = false;
    let lastPos = null;
    function posOf(e) {
      const rect = paintCanvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (SIZE / rect.width),
        y: (e.clientY - rect.top) * (SIZE / rect.height),
      };
    }
    function dot(p) {
      pctx.fillStyle = color;
      pctx.beginPath();
      pctx.arc(p.x, p.y, BRUSH / 2, 0, Math.PI * 2);
      pctx.fill();
    }
    function strokeTo(p) {
      pctx.strokeStyle = color;
      pctx.beginPath();
      pctx.moveTo(lastPos.x, lastPos.y);
      pctx.lineTo(p.x, p.y);
      pctx.stroke();
    }
    paintCanvas.addEventListener('pointerdown', (e) => {
      if (answered) return;
      drawing = true;
      paintCanvas.setPointerCapture(e.pointerId);
      lastPos = posOf(e);
      dot(lastPos);
    });
    paintCanvas.addEventListener('pointermove', (e) => {
      if (!drawing || answered) return;
      const p = posOf(e);
      strokeTo(p);
      lastPos = p;
    });
    const stop = () => { drawing = false; lastPos = null; };
    paintCanvas.addEventListener('pointerup', stop);
    paintCanvas.addEventListener('pointercancel', stop);

    /* 调色板 */
    const swatches = quiz.palette.map((c) => {
      const sw = h('button', {
        class: c === color ? 'color-swatch on' : 'color-swatch',
        type: 'button',
        style: { background: c },
        'aria-label': '选色',
        onClick: () => {
          color = c;
          swatches.forEach((s) => s.classList.remove('on'));
          sw.classList.add('on');
        },
      });
      return sw;
    });

    /* 工具行 */
    const clearBtn = h('button', {
      class: 'color-btn color-clear',
      type: 'button',
      onClick: () => { pctx.clearRect(0, 0, SIZE, SIZE); },
    }, '重涂');

    const doneBtn = h('button', {
      class: 'color-btn color-done',
      type: 'button',
      onClick: () => {
        if (answered) return;
        answered = true;
        api.onAnswer({ correct: true });
      },
    }, '完成');

    const el = h(
      'div',
      { class: 'color-stage' },
      h('div', { class: 'color-palette' }, swatches),
      h('div', { class: 'color-canvas-wrap' }, lineCanvas, paintCanvas),
      h('div', { class: 'color-tools' }, clearBtn, doneBtn)
    );

    return { el };
  },
};
