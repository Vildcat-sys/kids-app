/**
 * choice.js — 三选一（也支持四选一）
 *
 * 数据形状：
 *   {
 *     type: 'choice',
 *     q:    '大象的鼻子里大约有多少块肌肉？',
 *     opts: ['40 块', '4000 块', '4 万块'],
 *     a:    2,                      // 正确项下标，从 0 开始
 *     why:  '是 4 万多块。……'        // 答完后给孩子的解释
 *   }
 *
 * 设计要点：
 *   答错不结束、不惩罚、不记录失败：错误项轻轻摇头后禁用，孩子可以接着选，
 *   直到选对为止，最终按错误次数给 1–3 星（星级与奖励在 ui/quiz.js 统一处理）。
 *   3–8 岁阶段，答错本身已经是负反馈，立刻判负会让孩子不敢尝试。
 */

import { h } from '../core/dom.js';

const KEY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default {
  id: 'choice',
  name: '三选一',

  validate(quiz) {
    const errors = [];
    const opts = quiz.opts;

    if (!quiz.q || typeof quiz.q !== 'string') {
      errors.push('缺少 q（题干）');
    }
    if (!Array.isArray(opts) || opts.length < 2) {
      errors.push('opts 必须是至少含 2 个选项的数组');
    }
    if (typeof quiz.a !== 'number' || !Number.isInteger(quiz.a)) {
      errors.push('a 必须是整数（正确项下标）');
    } else if (Array.isArray(opts) && (quiz.a < 0 || quiz.a >= opts.length)) {
      errors.push(`a=${quiz.a} 越界，合法范围 0..${opts.length - 1}`);
    }
    if (!quiz.why || typeof quiz.why !== 'string') {
      errors.push('缺少 why（答后解释）');
    }
    if (Array.isArray(opts)) {
      const seen = new Set();
      opts.forEach((o, i) => {
        if (typeof o !== 'string' || !o.trim()) errors.push(`opts[${i}] 必须是非空字符串`);
        else if (seen.has(o)) errors.push(`opts[${i}] 与前面的选项重复：「${o}」`);
        else seen.add(o);
      });
    }
    return errors;
  },

  create(quiz, api) {
    let answered = false;
    const buttons = [];

    function pick(index) {
      if (answered) return;
      const btn = buttons[index];

      // 点错：只把这一项轻轻摇头并禁用，鼓励孩子继续试，不结束、不记录失败
      if (index !== quiz.a) {
        if (btn.classList.contains('missed')) return;
        btn.classList.add('wrong', 'missed');
        btn.setAttribute('aria-disabled', 'true');
        if (typeof api.misstep === 'function') api.misstep();
        return;
      }

      // 答对：锁定全部，正确项变绿，未试过的干扰项变暗，错过的项保留浅红
      answered = true;
      buttons.forEach((b, i) => {
        b.classList.add('locked');
        if (i === quiz.a) b.classList.add('right');
        else if (!b.classList.contains('missed')) b.classList.add('dim');
      });

      api.onAnswer({
        correct: true,
        detail: { picked: index, answer: quiz.a, answerText: quiz.opts[quiz.a] },
      });
    }

    const el = h(
      'div',
      { class: 'opts' },
      quiz.opts.map((text, i) => {
        const btn = h(
          'button',
          { class: 'opt', type: 'button', onClick: () => pick(i) },
          h('span', { class: 'key' }, KEY_LABELS[i] || String(i + 1)),
          h('span', { class: 'opt-txt' }, text)
        );
        buttons.push(btn);
        return btn;
      })
    );

    return { el };
  },
};
