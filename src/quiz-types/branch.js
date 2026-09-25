/**
 * branch.js — 实验分支（type:'branch'）
 *
 * 数据形状：
 *   {
 *     type: 'branch',
 *     q:    '第一步先怎么做？',
 *     steps: [
 *       {
 *         prompt:  '把玩具放在桌上。',
 *         choices: [
 *           { label: '手电筒从正面照', result: '影子出现在玩具背面。',
 *             tip: '光过不去的地方留下暗区。', next: 0 },
 *           { label: '手电筒举高',     result: '影子变长了。',
 *             tip: '光越斜影子越长。' },
 *         ],
 *       },
 *     ],
 *     why: '光从哪边照，影子就在对面。',
 *   }
 *
 * 设计要点：
 *   - 纯状态机（当前 stepIndex + chosen + 回溯栈 path），不引入路由。
 *   - 试错无代价：选错只展示不同结果卡片，不调 api.misstep()，不扣分。
 *   - 结果卡上「重选」= 清空 chosen 留在本步再选；「下一步」= 沿 choice.next
 *     （缺省线性 +1）前进，到头或自环即完成 → api.onAnswer({correct:true})。
 *   - 「上一步」沿走过的路径回退，回到该步的选项态（重新选）。
 */

import { h } from '../core/dom.js';

/* ────────────────────────── 纯状态机（可单测，不碰 DOM） ────────────────────────── */

/**
 * 创建分支题型的纯状态机。
 *
 * @param {Array<{prompt:string, choices:Array<{label:string,result:string,tip?:string,next?:number}>}>} steps
 * @returns {{
 *   stepIndex:number, chosen:number|null, done:boolean, canGoBack:boolean, willFinish:boolean,
 *   path:number[],
 *   pick(i:number):void, reselect():void, goNext():void, goBack():void,
 * }}
 *
 * 转移规则：
 *   pick(i)     ：在当前步选中第 i 个 choice（仅当未完成、下标合法）。
 *   reselect()  ：清空 chosen，回到本步选项态（「重选」，无代价）。
 *   goNext()    ：必须已 pick。目标步 = choice.next（若为整数）否则 stepIndex+1；
 *                 目标越界 / <0 / 等于当前步（自环）→ done=true；否则压栈前进。
 *   goBack()    ：从 path 弹回上一步，chosen 清空（「上一步」）。
 */
export function createBranchState(steps) {
  const safe = Array.isArray(steps) ? steps : [];
  const s = {
    stepIndex: 0,
    chosen: null,
    path: [],
    done: false,
  };

  function currentStep() {
    return safe[s.stepIndex] || null;
  }

  function nextIndex() {
    const step = currentStep();
    if (!step || s.chosen == null) return s.stepIndex + 1;
    const choice = step.choices[s.chosen];
    if (choice && Number.isInteger(choice.next)) return choice.next;
    return s.stepIndex + 1;
  }

  function willFinish() {
    if (s.done || s.chosen == null) return false;
    const n = nextIndex();
    return n >= safe.length || n < 0 || n === s.stepIndex;
  }

  function pick(i) {
    if (s.done) return;
    const step = currentStep();
    if (!step || !Array.isArray(step.choices)) return;
    if (!Number.isInteger(i) || i < 0 || i >= step.choices.length) return;
    s.chosen = i;
  }

  function reselect() {
    if (s.done) return;
    s.chosen = null;
  }

  function goNext() {
    if (s.done) return;
    const step = currentStep();
    if (!step || s.chosen == null) return; // 没选不能前进
    const n = nextIndex();
    if (n >= safe.length || n < 0 || n === s.stepIndex) {
      s.done = true;
      s.chosen = null; // 终态干净：不再展示任何选择
      return;
    }
    s.path.push(s.stepIndex);
    s.stepIndex = n;
    s.chosen = null;
  }

  function goBack() {
    if (s.done || s.path.length === 0) return;
    s.stepIndex = s.path.pop();
    s.chosen = null;
  }

  return {
    get stepIndex() { return s.stepIndex; },
    get chosen() { return s.chosen; },
    get done() { return s.done; },
    get canGoBack() { return s.path.length > 0 && !s.done; },
    get willFinish() { return willFinish(); },
    get path() { return s.path.slice(); },
    pick, reselect, goNext, goBack,
  };
}

/* ────────────────────────── 题型模块（default export） ────────────────────────── */

const ICON_CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
const ICON_BULB =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 1.8V17h6v-.5c0-.5.4-1.3 1-1.8A7 7 0 0 0 12 2z"/></svg>';

let cssInited = false;
function ensureCss() {
  if (cssInited || typeof document === 'undefined') return;
  cssInited = true;
  const style = document.createElement('style');
  style.textContent = `
    .br-root { font-family: inherit; padding: 6px; }
    .br-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
    .br-progress { font-size: 14px; color: #b08968; background: #fff4e0; padding: 4px 14px; border-radius: 999px; }
    .br-back {
      background: #fff; border: 2px solid #ffd6a5; color: #b08968;
      border-radius: 999px; padding: 6px 14px; font-size: 14px; cursor: pointer;
    }
    .br-back:active { transform: translateY(1px); }
    .br-prompt {
      font-size: 20px; font-weight: 600; color: #5c4a3a;
      margin: 8px 0 18px; line-height: 1.5;
    }
    .br-choices { display: flex; flex-direction: column; gap: 12px; }
    .br-choice {
      background: linear-gradient(180deg, #fff8ec, #ffe9c7);
      border: 2px solid #ffd6a5; border-radius: 20px;
      padding: 16px 18px; font-size: 18px; color: #5c4a3a; cursor: pointer;
      box-shadow: 0 4px 0 #f0c987; transition: transform .1s ease;
      text-align: left;
    }
    .br-choice:active { transform: translateY(2px); box-shadow: 0 2px 0 #f0c987; }
    .br-card {
      background: linear-gradient(180deg, #ffffff, #fff7ec);
      border: 3px solid #ffd6a5; border-radius: 28px;
      padding: 24px 20px; text-align: center;
      box-shadow: 0 8px 24px rgba(255, 180, 120, .25);
      animation: brPop .35s ease;
    }
    .br-icon { display: inline-flex; width: 48px; height: 48px; color: #ffb347; }
    .br-icon svg { width: 100%; height: 100%; }
    .br-result { font-size: 22px; font-weight: 700; color: #4a3728; margin: 10px 0 8px; line-height: 1.4; }
    .br-tip { font-size: 15px; color: #8a6e5a; margin-bottom: 18px; line-height: 1.5; }
    .br-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .br-again {
      background: #fff; border: 2px solid #ffc9a3; color: #c76b3a;
      border-radius: 999px; padding: 10px 20px; font-size: 16px; cursor: pointer;
    }
    .br-next {
      background: linear-gradient(180deg, #ffd66b, #ffab4a);
      border: 2px solid #ff9a3d; color: #fff; border-radius: 999px;
      padding: 10px 22px; font-size: 16px; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 0 #e07f2a;
    }
    .br-next:active { transform: translateY(2px); box-shadow: 0 2px 0 #e07f2a; }
    @keyframes brPop { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `;
  document.head.appendChild(style);
}

export default {
  id: 'branch',
  name: '实验分支',

  validate(quiz) {
    const errors = [];
    if (!quiz.q || typeof quiz.q !== 'string') {
      errors.push('缺少 q（题干）');
    }
    if (!Array.isArray(quiz.steps) || quiz.steps.length < 1) {
      errors.push('steps 必须是至少含 1 步的数组');
    } else {
      quiz.steps.forEach((step, si) => {
        if (!step || typeof step !== 'object') {
          errors.push(`steps[${si}] 必须是对象`);
          return;
        }
        if (!step.prompt || typeof step.prompt !== 'string') {
          errors.push(`steps[${si}].prompt 必须是非空字符串`);
        }
        if (!Array.isArray(step.choices) || step.choices.length < 1) {
          errors.push(`steps[${si}].choices 必须是至少含 1 项的数组`);
        } else {
          step.choices.forEach((c, ci) => {
            if (!c || typeof c !== 'object') {
              errors.push(`steps[${si}].choices[${ci}] 必须是对象`);
              return;
            }
            if (!c.label || typeof c.label !== 'string') {
              errors.push(`steps[${si}].choices[${ci}].label 必须是非空字符串`);
            }
            if (!c.result || typeof c.result !== 'string') {
              errors.push(`steps[${si}].choices[${ci}].result 必须是非空字符串`);
            }
            if (c.tip != null && typeof c.tip !== 'string') {
              errors.push(`steps[${si}].choices[${ci}].tip 必须是字符串`);
            }
            if (c.next != null) {
              if (!Number.isInteger(c.next) || c.next < 0 || c.next >= quiz.steps.length) {
                errors.push(
                  `steps[${si}].choices[${ci}].next=${c.next} 越界，合法范围 0..${quiz.steps.length - 1}（或省略走线性前进）`
                );
              }
            }
          });
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
    const steps = Array.isArray(quiz.steps) ? quiz.steps : [];
    const state = createBranchState(steps);
    const el = h('div', { class: 'br-root' });

    function render() {
      el.replaceChildren();
      const idx = state.stepIndex;
      const step = steps[idx] || { prompt: '', choices: [] };
      const total = steps.length;
      const chosenChoice = state.chosen != null ? step.choices[state.chosen] : null;

      // 头部：进度 + 上一步（沿路径回退）
      const head = h('div', { class: 'br-head' });
      if (state.canGoBack) {
        head.appendChild(
          h('button', {
            class: 'br-back', type: 'button',
            onClick: () => { state.goBack(); render(); },
          }, '← 上一步')
        );
      }
      head.appendChild(
        h('span', { class: 'br-progress' }, total > 0 ? `第 ${idx + 1} / ${total} 步` : '')
      );
      el.appendChild(head);

      if (!chosenChoice) {
        // 选项态：prompt + choices 按钮
        el.appendChild(h('div', { class: 'br-prompt' }, step.prompt));
        const box = h('div', { class: 'br-choices' });
        step.choices.forEach((c, i) => {
          box.appendChild(
            h('button', {
              class: 'br-choice', type: 'button',
              onClick: () => {
                state.pick(i);
                if (typeof api.speak === 'function') api.speak(c.result);
                render();
              },
            }, c.label)
          );
        });
        el.appendChild(box);
      } else {
        // 结果卡态：结果大字 + tip 小注 + 重选 / 下一步
        const card = h(
          'div', { class: 'br-card' },
          h('span', { class: 'br-icon', html: state.willFinish ? ICON_CHECK : ICON_BULB }),
          h('div', { class: 'br-result' }, chosenChoice.result),
          chosenChoice.tip ? h('div', { class: 'br-tip' }, chosenChoice.tip) : null,
          h(
            'div', { class: 'br-actions' },
            h('button', {
              class: 'br-again', type: 'button',
              onClick: () => { state.reselect(); render(); },
            }, '↺ 重选'),
            h('button', {
              class: 'br-next', type: 'button',
              onClick: () => {
                state.goNext();
                if (state.done) {
                  api.onAnswer({ correct: true, detail: { steps: steps.length } });
                  return;
                }
                render();
              },
            }, state.willFinish ? '完成 ✓' : '下一步 →')
          )
        );
        el.appendChild(card);
      }
    }

    render();
    return { el };
  },
};
