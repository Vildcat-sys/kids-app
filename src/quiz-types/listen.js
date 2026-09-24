/**
 * listen.js — 听音选词（英语领域主用）
 *
 * 数据形状：
 *   {
 *     type: 'listen',
 *     word: 'apple',                          // 会被朗读的单词
 *     zh:   '苹果',                            // 中文释义，答完后揭示
 *     opts: ['apple', 'banana', 'orange'],    // 选项，通常是同主题词，干扰项要有区分度
 *     a:    0,
 *     why:  'apple 读作 /ˈæpl/，意思是苹果。'
 *   }
 *
 * 设计要点：
 *   1. 强制用 en-US 朗读，不靠文本内容猜语言 —— 选项里全是英文，自动判断会出错
 *   2. 语速压到 0.8，比中文朗读更慢，5 岁孩子需要更多反应时间
 *   3. 答完后揭示中文释义，把「声音—拼写—含义」三者绑在一起
 */

import { h } from '../core/dom.js';

const SPEAKER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>';

const KEY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default {
  id: 'listen',
  name: '听音选词',

  validate(quiz) {
    const errors = [];
    const opts = quiz.opts;

    if (!quiz.q || typeof quiz.q !== 'string') {
      errors.push('缺少 q（题干）。听音题也要写题干，例如「听一听，选出你听到的单词」，否则答题框标题会空白');
    }
    if (!quiz.word || typeof quiz.word !== 'string') {
      errors.push('缺少 word（要朗读的单词）');
    }
    if (!quiz.zh || typeof quiz.zh !== 'string') {
      errors.push('缺少 zh（中文释义）');
    }
    if (!Array.isArray(opts) || opts.length < 2) {
      errors.push('opts 必须是至少含 2 个选项的数组');
    }
    if (typeof quiz.a !== 'number' || !Number.isInteger(quiz.a)) {
      errors.push('a 必须是整数（正确项下标）');
    } else if (Array.isArray(opts) && (quiz.a < 0 || quiz.a >= opts.length)) {
      errors.push(`a=${quiz.a} 越界，合法范围 0..${opts.length - 1}`);
    }
    // 正确答案必须在选项里，且与 word 一致 —— 这是听音题最容易写错的地方
    if (Array.isArray(opts) && typeof quiz.a === 'number' && opts[quiz.a] !== quiz.word) {
      errors.push(`opts[a] 应等于 word：opts[${quiz.a}]="${opts[quiz.a]}"，word="${quiz.word}"`);
    }
    if (!quiz.why) errors.push('缺少 why（答后解释）');
    return errors;
  },

  create(quiz, api) {
    let answered = false;
    const buttons = [];

    function play() {
      // 优先播放随包内置的单词录音（统一温柔女声），缺失时由语音层兜底 TTS
      if (typeof api.sayWord === 'function') api.sayWord(quiz.word);
      else api.speak(quiz.word, { lang: 'en-US', rate: 0.78 });
    }

    const playBtn = h(
      'button',
      { class: 'listen-btn', type: 'button', onClick: play, 'aria-label': '再听一遍' },
      h('span', { class: 'listen-icon', html: SPEAKER_ICON }),
      h('span', { class: 'listen-label' }, '点我听一听')
    );

    function pick(index) {
      if (answered) return;
      const btn = buttons[index];

      // 选错：轻摇并禁用这一项，可继续听、继续选，不结束不记录
      if (index !== quiz.a) {
        if (btn.classList.contains('missed')) return;
        btn.classList.add('wrong', 'missed');
        btn.setAttribute('aria-disabled', 'true');
        if (typeof api.misstep === 'function') api.misstep();
        return;
      }

      answered = true;
      buttons.forEach((b, i) => {
        b.classList.add('locked');
        if (i === quiz.a) b.classList.add('right');
        else if (!b.classList.contains('missed')) b.classList.add('dim');
      });

      api.onAnswer({
        correct: true,
        detail: { picked: index, answer: quiz.a, word: quiz.word, zh: quiz.zh },
      });
    }

    const el = h(
      'div',
      { class: 'listen' },
      playBtn,
      h(
        'div',
        { class: 'opts' },
        quiz.opts.map((text, i) => {
          const btn = h(
            'button',
            { class: 'opt opt-en', type: 'button', onClick: () => pick(i) },
            h('span', { class: 'key' }, KEY_LABELS[i] || String(i + 1)),
            h('span', { class: 'opt-txt' }, text)
          );
          buttons.push(btn);
          return btn;
        })
      )
    );

    // 进入题目自动读一遍，孩子不用先学会点喇叭
    setTimeout(play, 260);

    return {
      el,
      destroy() {
        if (typeof api.stop === 'function') api.stop();
      },
    };
  },
};
