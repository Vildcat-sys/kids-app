/**
 * match.js — 配对题（空间思维 / 关联关系主用）
 *
 * 数据形状：
 *   {
 *     type: 'match',
 *     q:     '把动物和它住的地方配成一对',
 *     pairs: [['蜜蜂', '蜂巢'], ['鱼', '水里'], ['鸟', '树上']],
 *     why:   '每种动物都有自己的家。……'
 *   }
 *
 * 交互设计：
 *   左列点一个、右列点一个，配对成功两边一起变绿并锁定；
 *   配错只是闪一下红再松开，可以继续试，不会中断。
 *   全部配对完成后才结算 —— 只要中途错过一次就算「未一次通过」，
 *   这样既允许试错，又保留了「想清楚再点」的激励。
 */

import { h } from '../core/dom.js';
import { seededShuffle } from '../core/util.js';

export default {
  id: 'match',
  name: '配对',

  validate(quiz) {
    const errors = [];
    const pairs = quiz.pairs;

    if (!quiz.q || typeof quiz.q !== 'string') errors.push('缺少 q（题干）');
    if (!Array.isArray(pairs) || pairs.length < 2) {
      errors.push('pairs 必须是至少含 2 组的数组');
    } else {
      const lefts = new Set();
      const rights = new Set();
      pairs.forEach((pair, i) => {
        if (!Array.isArray(pair) || pair.length !== 2) {
          errors.push(`pairs[${i}] 必须是 [左, 右] 两元组`);
          return;
        }
        const [left, right] = pair;
        if (typeof left !== 'string' || !left.trim()) errors.push(`pairs[${i}] 左侧必须是非空字符串`);
        else if (lefts.has(left)) errors.push(`pairs[${i}] 左侧重复：「${left}」，配对题的左项必须唯一`);
        else lefts.add(left);

        if (typeof right !== 'string' || !right.trim()) errors.push(`pairs[${i}] 右侧必须是非空字符串`);
        else if (rights.has(right)) errors.push(`pairs[${i}] 右侧重复：「${right}」，配对题的右项必须唯一`);
        else rights.add(right);
      });
      if (pairs.length > 5) {
        errors.push(`pairs 有 ${pairs.length} 组，超过 5 组对 3–8 岁孩子过载，建议拆成两题`);
      }
    }
    if (!quiz.why || typeof quiz.why !== 'string') errors.push('缺少 why（答后解释）');
    return errors;
  },

  create(quiz, api) {
    const seed = `match:${quiz.q}`;
    // 左右用不同 seed，避免两列顺序一一对应，否则一眼就能连出来
    const leftValues = seededShuffle(quiz.pairs.map((p) => p[0]), `${seed}:L`);
    const rightValues = seededShuffle(quiz.pairs.map((p) => p[1]), `${seed}:R`);
    const answerOf = new Map(quiz.pairs.map(([l, r]) => [l, r]));

    let selectedLeft = null;
    let selectedLeftEl = null;
    let hadError = false;
    let matchedCount = 0;
    let settled = false;

    const leftEls = new Map();
    const rightEls = new Map();

    function clearSelection() {
      if (selectedLeftEl) selectedLeftEl.classList.remove('sel');
      selectedLeft = null;
      selectedLeftEl = null;
    }

    function settleIfDone() {
      if (settled || matchedCount !== quiz.pairs.length) return;
      settled = true;
      // 留一点时间让最后一步的绿色反馈被看见，再弹结算
      setTimeout(() => {
        api.onAnswer({ correct: !hadError, detail: { pairs: quiz.pairs.length, hadError } });
      }, 520);
    }

    function pickLeft(value, el) {
      if (settled || el.classList.contains('done')) return;
      if (selectedLeftEl === el) {
        clearSelection();
        return;
      }
      clearSelection();
      selectedLeft = value;
      selectedLeftEl = el;
      el.classList.add('sel');
    }

    function pickRight(value, el) {
      if (settled || el.classList.contains('done')) return;
      if (!selectedLeft) {
        el.classList.add('bad');
        setTimeout(() => el.classList.remove('bad'), 420);
        return;
      }

      const expected = answerOf.get(selectedLeft);
      if (expected === value) {
        selectedLeftEl.classList.remove('sel');
        selectedLeftEl.classList.add('done');
        el.classList.add('done');
        matchedCount += 1;
        clearSelection();
        settleIfDone();
      } else {
        hadError = true;
        const lEl = selectedLeftEl;
        lEl.classList.add('bad');
        el.classList.add('bad');
        setTimeout(() => {
          lEl.classList.remove('bad', 'sel');
          el.classList.remove('bad');
        }, 460);
        selectedLeft = null;
        selectedLeftEl = null;
      }
    }

    const leftCol = h(
      'div',
      { class: 'match-col' },
      leftValues.map((value) => {
        const el = h(
          'button',
          { class: 'match-item', type: 'button', onClick: () => pickLeft(value, el) },
          value
        );
        leftEls.set(value, el);
        return el;
      })
    );

    const rightCol = h(
      'div',
      { class: 'match-col' },
      rightValues.map((value) => {
        const el = h(
          'button',
          { class: 'match-item', type: 'button', onClick: () => pickRight(value, el) },
          value
        );
        rightEls.set(value, el);
        return el;
      })
    );

    return {
      el: h(
        'div',
        { class: 'match' },
        h('div', { class: 'match-grid' }, leftCol, rightCol),
        h('div', { class: 'match-hint' }, '先点左边，再点右边')
      ),
    };
  },
};
