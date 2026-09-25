/**
 * ui/quiz.js — 答题容器（游戏化版）
 *
 * 职责边界：
 *   题型模块只负责「渲染题目」和「判定单次操作」；
 *   读题、反馈文案、星级、奖励动效、进度写入、按钮行为都在这里统一处理。
 *
 * 游戏化规则 —— 面向 3–8 岁的正向反馈设计：
 *   - 进入自动读题（本地录音，离线可用），右上角可重听
 *   - choice / listen 答错不结束：错误项轻轻摇头禁用，鼓励再试，不扣星、不记录失败
 *   - 一次答对三星 → 两次二星 → 多次一星；伴随彩带 / 星星 / 金币 / 口头表扬
 *   - order / match 为多步题，结束时统一判定：成功给星，失败温和提示并可「再试一次」
 */

import { h } from '../core/dom.js';
import { getQuizType } from '../quiz-types/index.js';
import { createStars, celebrate } from './reward.js';

const SOUND_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>';

const MASCOT_SRC = 'src/images/mascot/lion-wave.webp';

/**
 * 把题目的正确答案描述成人话，用于失败时提示。
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
 * @param {object} ctx
 * @param {object} ctx.item 知识点
 * @param {object} ctx.store
 * @param {object} ctx.speech
 * @param {() => void} [ctx.onHome]
 * @param {() => void} [ctx.onNext]
 * @param {() => void} [ctx.onRetry] 多步题失败后「再试一次」（重开本题）
 * @returns {() => void} 关闭函数
 */
export function openQuiz({ item, store, speech, onHome, onNext, onRetry }) {
  const quiz = item.quiz;
  const type = getQuizType(quiz.type);

  const overlay = h('div', { class: 'overlay' });
  const verdict = h('div', { class: 'verdict' });
  const actions = h('div', { class: 'actions actions-quiz', style: { display: 'none' } });

  // 三星奖励卡（成功时显示）
  const stars = createStars();
  const rewardCard = h(
    'div',
    { class: 'reward-card', hidden: true },
    h('img', { class: 'reward-mascot', src: MASCOT_SRC, alt: '奇奇', 'aria-hidden': 'true' }),
    stars.el,
    h('div', { class: 'reward-words' }, '太棒了！')
  );

  // 听题按钮：listen 题重听单词，其他题重听题干
  function replay() {
    if (quiz.type === 'listen') speech.sayWord(quiz.word);
    else speech.ask(item);
  }
  const replayBtn = h(
    'button',
    { class: 'replay-btn', type: 'button', 'aria-label': '再听一遍题目', onClick: replay },
    h('span', { class: 'replay-icon', html: SOUND_ICON })
  );

  let tries = 0; // choice/listen 的错误尝试次数，用于定星
  let finished = false;
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

  // 未知题型兜底
  if (!type) {
    const sheet = h(
      'div',
      { class: 'sheet' },
      h('div', { class: 'qhead' }, h('span', { class: 'qtag' }, '提示'), h('h3', {}, '这道题暂时不能作答')),
      h('div', { class: 'verdict show bad' }, `未知题型「${quiz.type}」。请检查内容数据。`),
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

  function showActions(kind) {
    actions.replaceChildren();
    if (kind === 'success') {
      actions.append(
        h(
          'button',
          { class: 'btn btn-ghost', type: 'button', onClick: () => { close(); if (onNext) onNext(); } },
          '再学一个'
        ),
        h(
          'button',
          { class: 'btn btn-main', type: 'button', onClick: () => { close(); if (onHome) onHome(); } },
          '回到首页'
        )
      );
    } else {
      if (onRetry) {
        actions.append(
          h('button', { class: 'btn btn-main', type: 'button', onClick: () => { close(); onRetry(); } }, '再试一次')
        );
      }
      actions.append(
        h(
          'button',
          { class: 'btn btn-ghost', type: 'button', onClick: () => { close(); if (onHome) onHome(); } },
          '回到首页'
        )
      );
    }
    actions.style.display = 'flex';
  }

  const api = {
    item,
    // 兼容题型里可能用到的直接朗读
    speak: (text, opts) => speech.speak(text, opts),
    sayWord: (word) => speech.sayWord(word),
    stop: () => speech.stop(),

    /** choice / listen 点错一项：不结束、不记录，温和提示并允许继续选 */
    misstep() {
      if (finished) return;
      tries += 1;
      speech.sfx('wrong');
      // 第一次错念完整鼓励，之后只给轻音效，避免反复唠叨
      if (tries === 1) setTimeout(() => speech.encourage(), 250);
    },

    onAnswer({ correct, detail }) {
      if (finished) return;

      if (correct) {
        finished = true;

        // 定星
        let starCount;
        if (quiz.type === 'match') starCount = detail && detail.hadError ? 2 : 3;
        else if (quiz.type === 'order') starCount = 3;
        else starCount = tries === 0 ? 3 : tries === 1 ? 2 : 1;

        // 进度写入（只有最终成功才记录）；首次完成才发金币 + 刷新打卡
        const isNew = !store.has(item.id);
        store.recordAttempt(item.id, true);
        if (isNew) store.markLearned(item.id); else store.touchLearned(item.id);
        store.setStars(item.id, starCount); // 只升不降
        const creditedCoins = isNew ? store.addCoins(10) : 0;

        // 奖励 UI
        rewardCard.hidden = false;
        rewardCard.classList.add('show');
        if (creditedCoins > 0) {
          rewardCard.append(h("div", { class: "reward-coins" }, `＋${creditedCoins} 金币`));
        }
        verdict.className = 'verdict show good';
        verdict.replaceChildren(h('strong', {}, '答对啦！'), quiz.why);
        showActions('success');

        // 动效 + 音效 + 表扬
        celebrate({ overlay, stars, starCount, speech, store, creditedCoins });
      } else {
        finished = true;
        store.recordAttempt(item.id, false);

        const answerText = describeAnswer(quiz);
        verdict.className = 'verdict show bad';
        verdict.replaceChildren(
          h('strong', {}, '差一点点。'),
          answerText ? `正确答案是「${answerText}」。` : '',
          quiz.why
        );
        showActions('fail');

        speech.sfx('wrong');
        setTimeout(() => speech.encourage(), 250);
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
      h('h3', {}, quiz.q),
      replayBtn
    ),
    rewardCard,
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

  speech.sfx('pop');
  // 进入自动读题；listen 题由题型模块自己读单词，这里不重复
  if (quiz.type !== 'listen') {
    setTimeout(() => speech.ask(item), 420);
  }

  return close;
}
