/**
 * ui/lesson.js — 探究课堂（数据驱动的 5 阶段互动课引擎）
 *
 * ═══════════════════════════════════════════════════════════════
 * 一节课从哪来
 * ═══════════════════════════════════════════════════════════════
 *   renderLesson 不再只认 data/lessons.js 里手写的少数几节，
 *   而是调 buildLesson(item)：手写精编课优先命中，其余知识点
 *   由它的 lead / facts[3] / quiz 自动拼出同一套 5 阶段课。
 *   所以「探究课堂」对全部知识点开放，入口只有这一个。
 *
 * ═══════════════════════════════════════════════════════════════
 * 五阶段（顶部阶段小路径高亮当前在哪）
 * ═══════════════════════════════════════════════════════════════
 *   引入  explore      主动探索：封面可点，点了播旁白+反馈音效，先不给答案
 *   引入  conjecture  问题猜想：选错不纠正，只引导「去看看」
 *   探究  experiment  facts 逐点演示（绘本图 + 第 page 页旁白，可回顾）
 *   探究  interactive 互动问答：choice/listen 答错禁用重试；order/match 整题重来
 *   应用  life/expand 生活应用 + 拓展翻卡
 *   表达  teach       当小老师：优先设备录音；不支持/失败降级「跟读复述」，不卡不报错
 *   检验  test/report 单元测 + 探索报告（本次星数，结算只一次）
 *
 * 奖励动效不自己写：统一走 reward.js 的 createStars/celebrate，
 * 这里只包一层 playReward()（另一路若换成「传容器+星数」的新函数，
 * 只改这一个薄封装）。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { buildLesson, lessonSteps, LESSON_PHASES } from '../data/lessons.js';
import { getArt } from '../art/index.js';
import { getQuizType } from '../quiz-types/index.js';
import { createStars, celebrate } from './reward.js';
import { createWorkCard, renderPickedFactPicker } from './work-card.js';
import { sectionOfItem } from '../data/index.js';

const MASCOT_SRC = 'src/images/mascot/lion-wave.webp';
const BOOK_DIR = 'src/images/book';

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const PLAY_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 001.54.84l10-6.5a1 1 0 000-1.68l-10-6.5A1 1 0 008 5.5z"/></svg>';
const MIC_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0013 0"/><path d="M12 18v3"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const COIN_ICON =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2" fill="#F5B942" stroke="#D99A1F" stroke-width="1.4"/><path d="M12 6.6v10.8M9.4 9.2h4a1.8 1.8 0 010 3.6h-4 4.4a1.8 1.8 0 010 3.6H9.4" fill="none" stroke="#B87A0E" stroke-width="1.5" stroke-linecap="round"/></svg>';
const SOUND_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>';
const FLIP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.3 3L3 8"/><path d="M3 4v4h4"/></svg>';

/**
 * 单元测答对几题给几颗星。全对 3、对 ≥60% 给 2、其余 1 —— 不给 0 星。
 * 导出为纯函数供单测；本文件顶层不碰 DOM。
 */
export function starsFor(correct, total) {
  if (total === 0) return 1;
  const ratio = correct / total;
  if (ratio === 1) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}

/**
 * 奖励薄封装：进入报告页时调用。
 * 另一路若把奖励换成「传容器元素 + 星数 n」的新函数，只改这里。
 */
function playReward({ overlay, stars, starCount, speech }) {
  celebrate({ overlay, stars, starCount, speech });
}

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {object} ctx.item     知识点（data/*.js）
 * @param {object} ctx.topic    所属领域
 * @param {object} ctx.store
 * @param {object} ctx.speech
 * @param {(hash: string) => void} ctx.go
 */
export function renderLesson({ container, item, topic, store, speech, go }) {
  const lesson = buildLesson(item);
  if (!lesson) {
    go(`#/c/${item.id}`);
    return;
  }

  const steps = lessonSteps(lesson);
  const total = steps.length;

  /* 一节课的全部可变状态都收在这里 */
  const state = {
    idx: 0,
    conjecture: null,
    exploreTapped: false,
    expStep: 0,
    expTip: false,
    interactiveSolved: false,
    testIdx: 0,
    testCorrect: 0,
    testTried: false,
    recordState: 'idle', // 录音能力仅作兜底保留，主路径不走它
    recordUrl: null,
    teachRead: false,    // 当小老师：是否已看完这一段
    teachSpoke: false,   // 当小老师：是否已跟读复述
    finished: false,
  };

  let recorder = null;
  let workCard = null;   // 本次课生成的证据卡（stepReport 里赋值，报告页渲染用）

  /* ────────────── 顶部：返回 / 标题 / 阶段条 / 进度 ────────────── */

  const backBtn = h(
    'button',
    {
      class: 'back',
      type: 'button',
      onClick: () => {
        speech.stop();
        stopRecording();
        go(`#/c/${item.id}`);
      },
    },
    h('span', { class: 'back-arrow', html: BACK_ICON }),
    h('span', {}, '返回')
  );

  const phaseEls = LESSON_PHASES.map((p) =>
    h('span', { class: 'lesson-phase', 'data-phase': p.id }, p.name)
  );
  const phaseBar = h('div', { class: 'lesson-phases' }, ...phaseEls);

  const barFill = h('span', { class: 'lesson-bar-fill' });
  const progressBar = h('div', { class: 'lesson-bar' }, barFill);

  const body = h('div', { class: 'lesson-body' });
  const foot = h('div', { class: 'lesson-foot' });

  const root = h(
    'div',
    { class: 'wrap lesson' },
    backBtn,
    h(
      'div',
      { class: 'lesson-head' },
      h('h2', { class: 'lesson-title' }, lesson.title),
      h('p', { class: 'lesson-sub' }, lesson.subtitle)
    ),
    phaseBar,
    progressBar,
    body,
    foot
  );

  render(container, root);
  scrollTop();

  /* ────────────── 小工具 ────────────── */

  function mascotImg(cls = '') {
    return h('img', {
      class: `lesson-mascot ${cls}`.trim(),
      src: MASCOT_SRC,
      alt: '',
      'aria-hidden': 'true',
    });
  }

  function bubble(text) {
    return h(
      'div',
      { class: 'lesson-bubble' },
      mascotImg('talking'),
      h('p', { class: 'lesson-bubble-txt' }, text)
    );
  }

  function primary(label, onClick, disabled = false) {
    const btn = h(
      'button',
      { class: 'lesson-next', type: 'button', onClick },
      h('span', {}, label)
    );
    btn.disabled = !!disabled;
    return btn;
  }

  function ghost(label, onClick, iconHtml) {
    return h(
      'button',
      { class: 'lesson-ghost', type: 'button', onClick },
      iconHtml ? h('span', { class: 'lesson-ghost-ico', html: iconHtml }) : null,
      h('span', {}, label)
    );
  }

  /* 不显眼的「跳过」逃生口（小、非主路径，仅互动练习/单元测用） */
  function skipLink(onClick) {
    return h(
      'button',
      {
        class: 'lesson-skip', type: 'button', onClick,
        style: 'display:block;margin:2px auto 0;background:none;border:none;color:var(--ink2);font-size:13px;text-decoration:underline;cursor:pointer;',
      },
      '跳过'
    );
  }

  function setProgress() {
    const cur = steps[state.idx];
    phaseEls.forEach((el) => {
      const i = LESSON_PHASES.findIndex((p) => p.id === el.getAttribute('data-phase'));
      el.classList.toggle('on', i === LESSON_PHASES.findIndex((p) => p.id === cur.phase));
      el.classList.toggle('past', i < LESSON_PHASES.findIndex((p) => p.id === cur.phase));
    });
    barFill.style.width = `${total <= 1 ? 100 : Math.round((state.idx / (total - 1)) * 100)}%`;
  }

  function goStep(i) {
    state.idx = Math.max(0, Math.min(total - 1, i));
    renderStep();
  }

  function next() {
    goStep(state.idx + 1);
  }

  /* ────────────── 录音（有麦克风就真录，没有就跟读复述，绝不拦路） ────────────── */

  function stopRecording() {
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (err) {
        /* 忽略 */
      }
    }
    recorder = null;
  }

  function canRecord() {
    return (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder === 'function'
    );
  }

  async function startRecording(onDone) {
    if (!canRecord()) {
      state.recordState = 'unavailable';
      onDone && onDone();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      recorder = new window.MediaRecorder(stream);
      recorder.addEventListener('dataavailable', (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      });
      recorder.addEventListener('stop', () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length > 0) {
          state.recordUrl = URL.createObjectURL(new Blob(chunks, { type: 'audio/webm' }));
        }
        state.recordState = 'done';
        onDone && onDone();
      });
      recorder.start();
      state.recordState = 'recording';
      onDone && onDone();
    } catch (err) {
      state.recordState = 'unavailable'; // 拒绝/失败一律降级，不报错
      onDone && onDone();
    }
  }

  /* ────────────── 各步渲染 ────────────── */

  /* 1 引入·主动探索：封面可点，点了播旁白 + 反馈音效，先不给答案 */
  function stepExplore() {
    const d = lesson.explore;

    // 封面（知识点登记的插画），可点
    const cover = h('div', {
      class: 'lesson-cover tappable',
      'aria-label': '点一点看一看',
      onClick: () => {
        state.exploreTapped = true;
        speech.unlock && speech.unlock();
        speech.sfx('pop');
        // 首次讲解已由进入即播负责；点封面只叠加探索反馈音效与点评
        tapNote.replaceChildren(
          h('span', { class: 'lesson-tip-tag' }, '你观察到了吗'),
          h('p', { class: 'lesson-tip-txt' }, '先自己说说看到了什么，小耳朵听一听。')
        );
        refreshFoot();
      },
    }, h('div', { class: 'lesson-cover-art', html: getArt(item.art) }));

    const tapNote = h('div', { class: 'lesson-tapnote' });

    const points = h(
      'ul',
      { class: 'lesson-points' },
      ...(d.points || []).map((t) => h('li', { class: 'lesson-point' }, t))
    );

    function refreshFoot() {
      foot.replaceChildren(
        h(
          'p',
          { class: 'lesson-foot-note' },
          state.exploreTapped ? '观察好了，去猜一猜' : '先点封面看一看、听一听'
        ),
        primary('下一步', next)
      );
    }

    body.replaceChildren(
      bubble(lesson.mascotTip),
      h('p', { class: 'lesson-lead' }, d.narr),
      cover,
      tapNote,
      points
    );
    refreshFoot();
  }

  /* 2 引入·问题猜想：不判对错，只记录 */
  function stepConjecture() {
    const d = lesson.conjecture;
    const optEls = d.opts.map((text, i) =>
      h(
        'button',
        {
          class: 'lesson-opt',
          type: 'button',
          onClick: () => {
            state.conjecture = i; // 只记录，不纠正
            speech.sfx('tap');
            Array.from(optWrap.children).forEach((el, k) => el.classList.toggle('picked', k === i));
            foot.replaceChildren(
              h('p', { class: 'lesson-foot-note' }, '猜好了，带着问题去看看吧'),
              primary('下一步', next)
            );
          },
        },
        h('span', { class: 'lesson-opt-idx' }, String.fromCharCode(65 + i)),
        h('span', { class: 'lesson-opt-txt' }, text)
      )
    );
    const optWrap = h('div', { class: 'lesson-opts' }, ...optEls);

    body.replaceChildren(
      h('p', { class: 'lesson-step-tag' }, '先猜一猜'),
      h('h3', { class: 'lesson-q' }, d.q),
      optWrap,
      h('p', { class: 'lesson-note' }, d.note)
    );
    foot.replaceChildren(
      h('p', { class: 'lesson-foot-note' }, '选一个你猜的答案（猜错也没关系）'),
      primary('下一步', next, true)
    );
  }

  /* 3 探究·实验/逐点演示：进环节自动播旁白；大图本身就是可点热点 */
  function stepExperiment() {
    const d = lesson.experiment;
    const n = d.steps.length;
    const cur = d.steps[state.expStep];
    const hasImage = !!cur.page; // 自动课：这一步配绘本图 + 旁白

    const warmNote = h('p', { class: 'lesson-warm' });

    function replayIcon() {
      return h('button', {
        class: 'lesson-replay', type: 'button', 'aria-label': '再听一遍',
        onClick: () => { speech.unlock && speech.unlock(); speech.narratePage(item, cur.page); },
      }, h('span', { class: 'lesson-replay-ico', html: SOUND_ICON }));
    }

    const stage = h('div', { class: 'lesson-stage' });

    if (hasImage) {
      const img = h('img', {
        class: 'lesson-demo',
        src: `${BOOK_DIR}/${item.id}-${cur.page}.webp`,
        alt: '',
        loading: 'lazy',
      });
      const hotspot = h('span', { class: 'lesson-hotspot', 'aria-hidden': 'true' });
      img.addEventListener('click', tapFind);
      hotspot.addEventListener('click', tapFind);
      stage.append(img, hotspot);
    }

    const why = h('div', { class: 'lesson-tip' });

    function tapFind() {
      if (state.expTip) return;
      state.expTip = true;
      speech.unlock && speech.unlock();
      speech.sfx('pop');
      why.replaceChildren(
        h('span', { class: 'lesson-tip-tag' }, '你发现了吗'),
        h('p', { class: 'lesson-tip-txt' }, cur.tip)
      );
      warmNote.replaceChildren();
      refreshFoot();
      speech.speak(cur.tip); // 点出来后自动把发现读给孩子听
    }

    function refreshFoot() {
      if (!state.expTip) {
        foot.replaceChildren(
          h('div', { class: 'lesson-foot-row' },
            hasImage ? replayIcon() : null,
            primary('我看好了', () => {
              if (hasImage) {
                // 还没点大图：温柔提示，不卡死、不直接放行
                warmNote.replaceChildren(
                  h('p', { class: 'lesson-warm-txt' }, '再点一点大图，找找线索~')
                );
                speech.sfx('tap');
              } else {
                tapFind(); // 无配图：直接揭晓发现
              }
            })
          )
        );
      } else {
        const last = state.expStep === n - 1;
        foot.replaceChildren(
          h('div', { class: 'lesson-foot-row' },
            hasImage ? replayIcon() : null,
            primary(last ? '看完啦' : '下一步', () => {
              if (last) { next(); return; }
              state.expStep += 1;
              state.expTip = false;
              renderStep();
            })
          )
        );
      }
    }

    // 自动朗读由 renderStep 统一在「进入环节」时触发，这里不重复播。
    body.replaceChildren(
      h('p', { class: 'lesson-step-tag' }, `观察 · 第 ${state.expStep + 1} / ${n} 点`),
      h('h3', { class: 'lesson-q' }, d.title),
      ...(hasImage
        ? [stage, h('p', { class: 'lesson-stage-hint' }, state.expTip ? '' : '点一点大图，看看发生了什么')]
        : []),
      h('p', { class: 'lesson-exp-text' }, cur.text),
      why,
      warmNote
    );
    refreshFoot();
  }

  /* 4 探究·互动问答：复用题型渲染，答错可重试 */
  function stepInteractive() {
    const d = lesson.interactive;
    // 手写课是 choice 形态 {q,opts,a,why}，包一层 type 走题型渲染
    const quiz = d.type ? d : { type: 'choice', q: d.q, opts: d.opts, a: d.a, why: d.why };
    const Type = getQuizType(quiz.type);

    const why = h('div', { class: 'lesson-why' });
    const viewSlot = h('div', { class: 'lesson-quiz-view' });
    let tries = 0;

    function buildView() {
      viewSlot.replaceChildren();
      tries = 0;
      if (!Type) {
        // 未知题型兜底：简单三选
        renderChoiceFallback(quiz, viewSlot, why);
        return;
      }
      const api = {
        item,
        speak: (text, opts) => speech.speak(text, opts),
        sayWord: (word) => speech.sayWord(word),
        stop: () => speech.stop(),
        misstep() {
          tries += 1;
          speech.sfx('wrong');
          if (tries === 1) setTimeout(() => speech.encourage(), 250);
        },
        onAnswer({ correct, detail }) {
          if (correct) {
            state.interactiveSolved = true;
            speech.sfx('right');
            why.replaceChildren(
              h('span', { class: 'lesson-why-tag' }, '答对啦'),
              h('p', { class: 'lesson-why-txt' }, quiz.why || '真棒！')
            );
            safePlay(() => speech.speak(quiz.why || '真棒！')); // 答对自动讲解
            foot.replaceChildren(primary('继续', next));
          } else {
            // order/match 整题重来，不一次结束
            speech.sfx('wrong');
            why.replaceChildren(
              h('span', { class: 'lesson-why-tag' }, '再试一次'),
              h('p', { class: 'lesson-why-txt' }, quiz.why || '没关系，重新排一排。')
            );
            foot.replaceChildren(primary('再试一次', () => { why.replaceChildren(); buildView(); }));
          }
        },
      };
      const view = Type.create(quiz, api);
      viewSlot.appendChild(view.el);
    }

    body.replaceChildren(
      h('p', { class: 'lesson-step-tag' }, '想一想，答一答'),
      h('h3', { class: 'lesson-q' }, quiz.q),
      viewSlot,
      why
    );
    foot.replaceChildren(h('p', { class: 'lesson-foot-note' }, '答错没关系，可以再试'), skipLink(next));
    buildView();
  }

  /* 未知题型的极简三选兜底（几乎用不到） */
  function renderChoiceFallback(quiz, slot, why) {
    const optEls = quiz.opts.map((text, i) =>
      h('button', {
        class: 'lesson-opt', type: 'button',
        onClick: () => {
          if (i === quiz.a) {
            optEls.forEach((el) => { el.disabled = true; });
            optEls[i].classList.add('right');
            why.replaceChildren(h('span', { class: 'lesson-why-tag' }, '答对啦'),
              h('p', { class: 'lesson-why-txt' }, quiz.why || ''));
            foot.replaceChildren(primary('继续', next));
          } else {
            optEls[i].classList.add('wrong');
            optEls[i].disabled = true;
            speech.sfx('wrong');
          }
        },
      }, h('span', { class: 'lesson-opt-txt' }, text))
    );
    slot.replaceChildren(h('div', { class: 'lesson-opts' }, ...optEls));
  }

  /* 5 应用·生活应用 */
  function stepLife() {
    const cards = lesson.life.map((it) =>
      h(
        'div',
        { class: 'lesson-life-card' },
        h('span', { class: 'lesson-life-name' }, it.name),
        h('p', { class: 'lesson-life-txt' }, it.text)
      )
    );
    body.replaceChildren(
      h('p', { class: 'lesson-step-tag' }, '生活里到处都有它'),
      h('div', { class: 'lesson-life' }, ...cards)
    );
    foot.replaceChildren(primary('继续', next));
  }

  /* 6 应用·拓展翻卡 */
  function stepExpand() {
    const d = lesson.expand;
    const flipped = { on: false };
    const card = h('div', { class: 'lesson-flipcard' },
      h('div', { class: 'lesson-flip-front' },
        h('span', { class: 'lesson-step-tag' }, '拓展小卡'),
        h('h3', { class: 'lesson-q' }, d.title),
        h('p', { class: 'lesson-note' }, '点卡片翻到背面看一看')
      )
    );
    card.addEventListener('click', () => {
      flipped.on = !flipped.on;
      speech.sfx('tap');
      card.replaceChildren(
        flipped.on
          ? h('div', { class: 'lesson-flip-back' },
              h('h3', { class: 'lesson-q' }, d.title),
              h('p', { class: 'lesson-exp-text' }, d.text))
          : h('div', { class: 'lesson-flip-front' },
              h('span', { class: 'lesson-step-tag' }, '拓展小卡'),
              h('h3', { class: 'lesson-q' }, d.title),
              h('p', { class: 'lesson-note' }, '点卡片翻到背面看一看'))
      );
    });
    body.replaceChildren(card);
    foot.replaceChildren(primary('继续', next));
  }

  /* 7 表达·当小老师：跟读复述主路径（不期待系统录音/回放；录音能力仅作兜底保留） */
  function stepTeach() {
    const d = lesson.teach;
    const stage = h('div', { class: 'lesson-record' });

    function paint() {
      if (!state.teachRead) {
        stage.replaceChildren(
          h('p', { class: 'lesson-record-hint' }, '先看完这一段，再跟着大声说一遍。')
        );
      } else if (!state.teachSpoke) {
        stage.replaceChildren(
          h('p', { class: 'lesson-record-hint' }, '跟着下面的提示，大声复述一遍吧。'),
          h('p', { class: 'lesson-hint' }, d.hint)
        );
      } else {
        stage.replaceChildren(
          h('div', { class: 'lesson-record-ok' },
            h('span', { class: 'lesson-record-ok-ico', html: CHECK_ICON }),
            h('span', {}, '说得真棒，再讲给爸爸妈妈听吧'))
        );
      }
    }

    function refreshFoot() {
      if (!state.teachRead) {
        foot.replaceChildren(
          h('p', { class: 'lesson-foot-note' }, '看完这一段，再开始跟读'),
          primary('我看完了', () => {
            state.teachRead = true;
            speech.sfx('tap');
            paint();
            refreshFoot();
          }),
          primary('继续', next)
        );
      } else if (!state.teachSpoke) {
        foot.replaceChildren(
          h('div', { class: 'lesson-foot-row' },
            ghost('跟读复述', () => {
              speech.unlock && speech.unlock();
              speech.speak(`${d.prompt}。${d.hint}`);
              state.teachSpoke = true;
              speech.sfx('pop');
              paint();
              refreshFoot();
            }, SOUND_ICON)
          ),
          primary('继续', next)
        );
      } else {
        foot.replaceChildren(primary('继续', next));
      }
    }

    body.replaceChildren(
      h('p', { class: 'lesson-step-tag' }, '当小老师'),
      h('h3', { class: 'lesson-q' }, d.prompt),
      stage
    );
    paint();
    refreshFoot();
  }
  /* 8 检验·单元测 */
  function stepTest() {
    const qs = lesson.test;
    const q = qs[state.testIdx];
    const why = h('div', { class: 'lesson-why' });

    const optEls = q.opts.map((text, i) =>
      h(
        'button',
        {
          class: 'lesson-opt',
          type: 'button',
          onClick: () => {
            if (state.testTried) return;
            if (i === q.a) {
              state.testTried = true;
              state.testCorrect += 1;
              store.recordAttempt(item.id, true);
              speech.sfx('right');
              optEls[i].classList.add('right');
              optEls.forEach((el) => { el.disabled = true; });
              why.replaceChildren(
                h('span', { class: 'lesson-why-tag' }, '答对啦'),
                h('p', { class: 'lesson-why-txt' }, q.why)
              );
              const last = state.testIdx === qs.length - 1;
              foot.replaceChildren(primary(last ? '看我的报告' : '下一题', () => {
                if (last) { next(); return; }
                state.testIdx += 1;
                state.testTried = false;
                renderStep();
              }));
            } else {
              // 答错禁用该项、可重试，不一次结束
              optEls[i].classList.add('wrong');
              optEls[i].disabled = true;
              speech.sfx('wrong');
              setTimeout(() => speech.encourage(), 200);
            }
          },
        },
        h('span', { class: 'lesson-opt-idx' }, String.fromCharCode(65 + i)),
        h('span', { class: 'lesson-opt-txt' }, text)
      )
    );

    body.replaceChildren(
      h('p', { class: 'lesson-step-tag' }, `单元测 · 第 ${state.testIdx + 1} / ${qs.length} 题`),
      h('h3', { class: 'lesson-q' }, q.q),
      h('div', { class: 'lesson-opts' }, ...optEls),
      why
    );
    foot.replaceChildren(h('p', { class: 'lesson-foot-note' }, '认真想一想再选'), skipLink(next));
  }

  /* 9 检验·探索报告 */
  function stepReport() {
    const qs = lesson.test || [];
    const correct = state.testCorrect;
    const totalQ = qs.length;
    const starCount = starsFor(correct, totalQ);
    const coins = 10 + correct * 5 + (state.teachSpoke ? 5 : 0);

    if (!state.finished) {
      state.finished = true;
      if (store.has(item.id)) store.touchLearned(item.id);
      else store.markLearned(item.id);
      store.setStars(item.id, starCount); // 只升不降
      store.addCoins(coins);
      const sec = sectionOfItem(item.id);
      workCard = store.addWork({
        itemId: item.id,
        itemName: item.name,
        sectionId: sec ? sec.id : '',
        sectionName: sec ? sec.name : '',
        stars: starCount,
        correct,
        total: totalQ,
        pickedFact: null,
      });
    }

    const stars = createStars();
    const overlay = h('div', { class: 'lesson-overlay' });

    const isFull = starCount === 3;
    // 满分 / 未满分两态横幅（金色庆祝 / 橙色鼓励）
    const banner = h(
      'div',
      {
        class: 'lesson-report-banner',
        style: isFull
          ? 'margin:6px auto 0;padding:8px 18px;border-radius:999px;background:linear-gradient(135deg,#FFE082,#FFB300);color:#7a4a00;font-weight:700;font-size:17px;display:inline-block;box-shadow:0 2px 8px rgba(255,179,0,.35);'
          : 'margin:6px auto 0;padding:8px 18px;border-radius:999px;background:#E8F5E9;color:#2e7d32;font-weight:700;font-size:16px;display:inline-block;',
      },
      isFull ? '满分！你真是小学霸 🌟' : '完成啦，继续加油'
    );

    const stats = [
      { k: '答对', v: `${correct} / ${totalQ}` },
      { k: '讲述', v: state.teachSpoke ? '完成' : '跟读' },
      { k: '本次星', v: `${starCount} 星` },
    ];

    /* 产物环：fact 提取练习 + 学习证据卡。点选 fact / 家长「听完了」只局部刷新卡片，
       不整页重渲染（避免重播星星动画）。 */
    const cardSlot = h('div', { class: 'lesson-wc-slot' });
    const refreshCard = () => {
      if (!workCard) return;
      cardSlot.replaceChildren(
        createWorkCard(workCard, {
          facts: item.facts,
          count: store.workCount(),
          onHeard: (id) => { store.markWorkHeard(id); refreshCard(); },
        })
      );
    };
    const factPicker = workCard
      ? renderPickedFactPicker({
          work: workCard,
          facts: item.facts,
          onPick: (i) => {
            if (i !== null) store.setWorkPickedFact(workCard.id, i);
            refreshCard();
          },
        })
      : null;
    refreshCard();

    body.replaceChildren(
      overlay,
      h('p', { class: 'lesson-step-tag' }, '探索报告'),
      h('div', { style: 'text-align:center;' }, banner),
      h('div', { class: 'lesson-report' },
        mascotImg('cheer'),
        h('h3', { class: 'lesson-report-title' }, `${item.name} · 探究完成`),
        stars.el,
        h('div', { class: 'lesson-stats' },
          ...stats.map((s) =>
            h('div', { class: 'lesson-stat' },
              h('span', { class: 'lesson-stat-k' }, s.k),
              h('span', { class: 'lesson-stat-v' }, s.v)
            )
          )
        ),
        h('div', { class: 'lesson-coins' },
          h('span', { class: 'lesson-coin-ico', html: COIN_ICON }),
          h('span', { class: 'lesson-coin-num' }, `+${coins}`)
        )
      ),
      factPicker,
      cardSlot
    );

    foot.replaceChildren(
      primary('回到首页', () => { speech.stop(); go('#/'); }),
      primary('再看绘本', () => { speech.stop(); go(`#/c/${item.id}`); })
    );

    setTimeout(() => {
      playReward({ overlay, stars, starCount, speech });
    }, 260);
  }

  /* ────────────── 步骤派发 ────────────── */

  const RENDERERS = {
    explore: stepExplore,
    conjecture: stepConjecture,
    experiment: stepExperiment,
    interactive: stepInteractive,
    life: stepLife,
    expand: stepExpand,
    teach: stepTeach,
    test: stepTest,
    report: stepReport,
  };

  /* ────────────── 自动朗读：进入任何有语音的环节/子步骤即播一次 ────────────── */

  function safePlay(fn) {
    try { fn(); } catch (e) { /* autoplay 被拦时静默，不弹错 */ }
  }

  function autoplayCurrent() {
    const step = steps[state.idx];
    if (!step) return;
    speech.unlock && speech.unlock();
    switch (step.kind) {
      case 'explore':
        safePlay(() => speech.narratePage(item, 0));
        break;
      case 'conjecture':
        safePlay(() => speech.speak(lesson.conjecture.q));
        break;
      case 'experiment': {
        const c = lesson.experiment.steps[state.expStep];
        if (c && c.page != null) safePlay(() => speech.narratePage(item, c.page));
        break;
      }
      case 'interactive': {
        const q = lesson.interactive.type ? lesson.interactive.q : lesson.interactive.q;
        safePlay(() => speech.speak(q));
        break;
      }
      case 'life':
        safePlay(() => speech.speak(lesson.life.map((x) => `${x.name}，${x.text}`).join('。')));
        break;
      case 'expand':
        safePlay(() => speech.speak(`${lesson.expand.title}。${lesson.expand.text}`));
        break;
      case 'teach':
        safePlay(() => speech.speak(`${lesson.teach.prompt}。${lesson.teach.hint}`));
        break;
      case 'test':
        safePlay(() => speech.speak(lesson.test[state.testIdx].q));
        break;
      case 'report':
        safePlay(() => speech.praise());
        break;
      default:
        break;
    }
  }

  /* 浏览器拦 autoplay 时，孩子首次点页面任意处：解锁并补播当前环节 */
  container.addEventListener(
    'pointerdown',
    () => {
      speech.unlock && speech.unlock();
      autoplayCurrent();
    },
    { once: true }
  );

  function renderStep() {
    speech.stop(); // 切环节/子步骤前先停，杜绝叠音
    setProgress();
    const step = steps[state.idx];
    root.setAttribute('data-step', step.kind);
    root.setAttribute('data-step-index', String(state.idx));
    const fn = RENDERERS[step.kind];
    if (fn) fn();
    scrollTop();
    autoplayCurrent(); // 真正进入时播一次；refreshFoot/replaceChildren 不触发
  }

  renderStep();
}
