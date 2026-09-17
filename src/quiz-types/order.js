/**
 * order.js — 排序题（逻辑思维 / 空间思维主用）
 *
 * 数据形状：
 *   {
 *     type: 'order',
 *     q:   '按从小到大的顺序，依次点一遍',
 *     seq: ['1', '2', '3', '4'],        // 正确顺序
 *     why: '1 最小，4 最大。……'
 *   }
 *
 * 交互设计：
 *   卡片以打乱后的顺序平铺，孩子按自己认为正确的次序逐张点击，
 *   点过的卡片角上出现序号。全部点完后统一判定 —— 而不是点错一步就立刻
 *   判负。因为 5 岁孩子的操作意图常常领先于动作，中途打断会让他以为自己
 *   「一动手就错」，从而不敢继续尝试。
 */

import { h } from '../core/dom.js';
import { seededShuffle } from '../core/util.js';

export default {
  id: 'order',
  name: '排序',

  validate(quiz) {
    const errors = [];
    const seq = quiz.seq;

    if (!quiz.q || typeof quiz.q !== 'string') errors.push('缺少 q（题干）');
    if (!Array.isArray(seq) || seq.length < 2) {
      errors.push('seq 必须是至少含 2 项的数组');
    } else {
      const seen = new Set();
      seq.forEach((v, i) => {
        if (typeof v !== 'string' || !v.trim()) errors.push(`seq[${i}] 必须是非空字符串`);
        else if (seen.has(v)) errors.push(`seq[${i}] 重复：「${v}」，排序题的各项必须互不相同`);
        else seen.add(v);
      });
      if (seq.length > 6) {
        errors.push(`seq 有 ${seq.length} 项，超过 6 项对 3–8 岁孩子过载，建议拆成两题`);
      }
    }
    if (!quiz.why || typeof quiz.why !== 'string') errors.push('缺少 why（答后解释）');
    return errors;
  },

  create(quiz, api) {
    const seed = `order:${quiz.q}:${quiz.seq.join('|')}`;
    const shown = seededShuffle(quiz.seq, seed);

    const picked = [];
    let answered = false;
    const cardEls = new Map();

    function judge() {
      if (answered) return;
      answered = true;

      const correct = picked.every((v, i) => v === quiz.seq[i]);
      const firstWrongAt = picked.findIndex((v, i) => v !== quiz.seq[i]);

      // 标出第一个出错的位置，让孩子看到「从哪一步开始不一样了」
      if (!correct && firstWrongAt >= 0) {
        const wrongValue = picked[firstWrongAt];
        const wrongEl = cardEls.get(wrongValue);
        if (wrongEl) wrongEl.classList.add('wrong');
      }

      cardEls.forEach((el) => el.classList.add('locked'));

      api.onAnswer({
        correct,
        detail: { picked: picked.slice(), answer: quiz.seq.slice(), firstWrongAt },
      });
    }

    function pick(value) {
      if (answered || picked.includes(value)) return;
      picked.push(value);

      const el = cardEls.get(value);
      if (el) {
        el.classList.add('picked');
        const badge = el.querySelector('.ord');
        if (badge) badge.textContent = String(picked.length);
      }

      if (picked.length === quiz.seq.length) {
        setTimeout(judge, 320);
      }
    }

    const grid = h(
      'div',
      { class: 'order-grid' },
      shown.map((value) => {
        const card = h(
          'button',
          { class: 'order-card', type: 'button', onClick: () => pick(value) },
          h('span', { class: 'ord' }, ''),
          h('span', { class: 'order-txt' }, value)
        );
        cardEls.set(value, card);
        return card;
      })
    );

    return {
      el: h('div', { class: 'order' }, grid, h('div', { class: 'order-hint' }, '点过的卡片会标上序号')),
    };
  },
};
