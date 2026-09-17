/**
 * ui/topic.js — 领域页：列出该领域下的知识点
 *
 * 每个知识点一张卡，已掌握的显示绿色对勾。
 * 这里刻意不显示题目类型，孩子不需要知道「这是排序题还是配对题」。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { getArt } from '../art/index.js';
import { ageBandLabel } from '../data/index.js';

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {object} ctx.topic 已经按档位过滤过的领域对象（见 data/index.js 的 findTopicForAge）
 * @param {object} ctx.store
 * @param {string} ctx.band 当前年龄档位，仅用于在标题下显示
 * @param {(hash: string) => void} ctx.go
 */
export function renderTopic({ container, topic, store, band, go }) {
  const done = topic.items.filter((i) => store.has(i.id)).length;

  const grid = h(
    'div',
    { class: 'grid' },
    topic.items.map((item) => {
      const learned = store.has(item.id);
      return h(
        'button',
        {
          class: `card${learned ? ' done' : ''}`,
          type: 'button',
          onClick: () => go(`#/c/${item.id}`),
          'aria-label': `${item.name}${learned ? '，已掌握' : ''}`,
        },
        h('span', { class: 'badge' }, '✓'),
        h('span', { class: 'art', html: getArt(item.art) }),
        h('span', { class: 'nm' }, item.name),
        h('span', { class: 'py' }, item.pinyin)
      );
    })
  );

  render(
    container,
    h(
      'div',
      { class: 'wrap detail' },
      h(
        'button',
        { class: 'back', type: 'button', onClick: () => go('#/') },
        h('span', { class: 'back-arrow', html: BACK_ICON }),
        h('span', {}, '返回')
      ),
      h(
        'div',
        { class: 'topic-head', style: { '--accent': topic.accent } },
        h('h2', { class: 'topic-head-name' }, topic.name),
        h('p', { class: 'topic-head-tagline' }, topic.tagline),
        h(
          'p',
          { class: 'topic-head-progress' },
          // 档位胶囊：家长切到某个档位后进领域页，需要一眼看到「现在看的是哪一档」
          h('span', { class: 'topic-head-band' }, ageBandLabel(band)),
          h('span', {}, `已掌握 ${done} / ${topic.items.length}`)
        )
      ),
      grid
    )
  );

  scrollTop();
}
