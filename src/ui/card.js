/**
 * ui/card.js — 知识点详情页
 *
 * 页面结构：返回 → 大插画 + 一句话核心 → 三条事实 → 听一听 / 考一考
 * 「听一听」把名称、核心句、三条事实连起来读一遍，
 * 让还不太识字的孩子也能完整接收内容。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { getArt } from '../art/index.js';

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const SOUND_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>';
const QUIZ_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>';

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {object} ctx.item
 * @param {object} ctx.topic
 * @param {object} ctx.store
 * @param {object} ctx.speech
 * @param {(hash: string) => void} ctx.go
 * @param {(item: object) => void} ctx.openQuiz
 */
export function renderCard({ container, item, topic, store, speech, go, openQuiz }) {
  const learned = store.has(item.id);

  function readAloud() {
    const text = [item.name, item.lead, ...item.facts].join(' ');
    const ok = speech.speak(text);
    if (!ok) {
      // 语音不可用时不打断流程，只在按钮上给一次提示
      const btn = container.querySelector('[data-speak]');
      if (btn) {
        const label = btn.querySelector('span:last-child');
        if (label) label.textContent = '这台设备不支持朗读';
        setTimeout(() => {
          if (label) label.textContent = '听一听';
        }, 2200);
      }
    }
  }

  render(
    container,
    h(
      'div',
      { class: 'wrap detail' },
      h(
        'button',
        { class: 'back', type: 'button', onClick: () => go(`#/t/${topic.id}`) },
        h('span', { class: 'back-arrow', html: BACK_ICON }),
        h('span', {}, '返回')
      ),

      h(
        'div',
        { class: 'hero' },
        h('div', { class: 'art', html: getArt(item.art) }),
        h(
          'div',
          { class: 'hero-txt' },
          h('h2', {}, item.name),
          h('div', { class: 'py' }, item.pinyin),
          h('div', { class: 'lead' }, item.lead)
        )
      ),

      h(
        'div',
        { class: 'sec-title' },
        learned ? '你可能还不知道（已掌握）' : '你可能还不知道'
      ),
      h(
        'div',
        { class: 'facts' },
        item.facts.map((fact, i) =>
          h(
            'div',
            { class: 'fact' },
            h('div', { class: 'no' }, String(i + 1)),
            h('p', {}, fact)
          )
        )
      ),

      h(
        'div',
        { class: 'actions' },
        h(
          'button',
          { class: 'btn btn-ghost', type: 'button', 'data-speak': '1', onClick: readAloud },
          h('span', { class: 'btn-icon', html: SOUND_ICON }),
          h('span', {}, '听一听')
        ),
        h(
          'button',
          { class: 'btn btn-main', type: 'button', 'data-quiz': '1', onClick: () => openQuiz(item) },
          h('span', { class: 'btn-icon', html: QUIZ_ICON }),
          h('span', {}, '考一考')
        )
      )
    )
  );

  scrollTop();
}
