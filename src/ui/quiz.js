/**
 * ui/quiz.js — 答题容器
 *
 * 职责边界（重要）：
 *   题型模块只负责「渲染题目」和「判定对错」；
 *   反馈文案、进度写入、按钮行为全部在这里统一处理。
 *   这样新增题型时不用重复实现一遍反馈逻辑，也不会出现各题型反馈不一致。
 */

import { h } from '../core/dom.js';
import { getQuizType } from '../quiz-types/index.js';

/**
 * 把题目的正确答案描述成人话，用于答错时的提示。
 * 每种题型的「答案」形态不同，集中在这里处理，避免散落到各题型模块。
 */
function describeAnswer(quiz) {
  switch (quiz.type) {
    case 'choice':
      return quiz.opts[quiz.a];
    case 'listen':
      return `${quiz.word}（${quiz.zh}）`;
    case 'order':
      return quiz.seq.join(' → ');
    case 'match':
      return quiz.pairs.map(([l, r]) => `${l}—${r}`).join('，');
    default:
      return '';
  }
}

/**
 * 打开答题浮层。
 *
 * @param {object} ctx
 * @param {object} ctx.item    知识点
 * @param {object} ctx.store
 * @param {object} ctx.speech
 * @param {() => void} [ctx.onHome] 点「回到首页」时调用
 * @param {() => void} [ctx.onNext] 点「再学一个」时调用
 * @returns {() => void} 关闭函数
 */
export function openQuiz({ item, store, speech, onHome, onNext }) {
  const quiz = item.quiz;
  const type = getQuizType(quiz.type);

  const overlay = h('div', { class: 'overlay' });
  const verdict = h('div', { class: 'verdict' });
  const actions = h('div', { class: 'actions actions-quiz', style: { display: 'none' } });

  let answered = false;
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    speech.stop();
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  // 题型未注册时给出可读的提示，而不是白屏
  if (!type) {
    const sheet = h(
      'div',
      { class: 'sheet' },
      h('div', { class: 'qhead' }, h('span', { class: 'qtag' }, '提示'), h('h3', {}, '这道题暂时不能作答')),
      h('div', { class: 'verdict show bad' }, `未知题型「${quiz.type}」。请检查内容数据，或联系开发同学补上该题型的实现。`),
      h(
        'div',
        { class: 'actions actions-quiz' },
        h('button', { class: 'btn btn-main', type: 'button', onClick: close }, '知道了')
      )
    );
    overlay.append(sheet);
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    return close;
  }

  const api = {
    item,
    speak: (text, opts) => speech.speak(text, opts),
    onAnswer({ correct }) {
      if (answered) return;
      answered = true;

      // 进度写入放在这里，题型模块不碰 store —— 保证「作答」和「记录」只有一条路径
      store.recordAttempt(item.id, correct);
      if (correct) {
        if (store.has(item.id)) {
          // 已点亮 —— 复习态被「答对」拉回 done，刷新掌握时刻
          store.touchLearned(item.id);
        } else {
          store.markLearned(item.id);
        }
      }

      const answerText = describeAnswer(quiz);
      verdict.className = `verdict show ${correct ? 'good' : 'bad'}`;
      verdict.replaceChildren(
        h('strong', {}, correct ? '答对了。' : '差一点点。'),
        correct ? '' : `正确答案是「${answerText}」。`,
        quiz.why
      );

      actions.replaceChildren(
        h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => { close(); if (onNext) onNext(); } }, '再学一个'),
        h('button', { class: 'btn btn-main', type: 'button', onClick: () => { close(); if (onHome) onHome(); } }, '回到首页')
      );
      actions.style.display = 'flex';

      // 答对时把解释读出来，强化正确记忆；答错时不朗读，避免像在「念错题」
      if (correct) {
        setTimeout(() => speech.speak(`答对了。${quiz.why}`), 420);
      }
    },
  };

  const view = type.create(quiz, api);

  const sheet = h(
    'div',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': quiz.q },
    h(
      'div',
      { class: 'qhead' },
      h('span', { class: 'qtag' }, type.name),
      h('h3', {}, quiz.q)
    ),
    view.el,
    verdict,
    actions
  );

  overlay.append(sheet);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.body.append(overlay);
  document.addEventListener('keydown', onKey);

  return close;
}
