/**
 * ui/topic.js — 领域页：列出该领域下的知识点
 *
 * 领域页现在是**二级页面** —— 从板块页顶部的领域胶囊进来，
 * 用来单独看某一个领域的完整清单。首页不再直接展示领域。
 *
 * 每个知识点一张卡，已掌握的显示绿色对勾，右下角标出难度级别。
 * 这里刻意不显示题目类型，孩子不需要知道「这是排序题还是配对题」。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { getArt } from '../art/index.js';
import { levelFilterLabel, levelOf, sectionOfTopic } from '../data/index.js';

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {object} ctx.topic 已经按级别过滤过的领域对象（见 data/index.js 的 findTopicForLevel）
 * @param {object} ctx.store
 * @param {string} ctx.level 当前级别，仅用于在标题下显示
 * @param {(hash: string) => void} ctx.go
 */
export function renderTopic({ container, topic, store, level, go }) {
  const done = topic.items.filter((i) => store.has(i.id)).length;
  const section = sectionOfTopic(topic.id);

  const grid = h(
    'div',
    { class: 'grid' },
    topic.items.map((item) => {
      const learned = store.has(item.id);
      const lv = levelOf(item.id);
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
        h('span', { class: 'py' }, item.pinyin),
        lv ? h('span', { class: 'card-lv' }, lv) : null
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
        {
          class: 'back',
          type: 'button',
          // 从哪来回哪去：有板块就回板块页，没有（不该发生）才回首页
          onClick: () => go(section ? `#/s/${section.id}` : '#/'),
        },
        h('span', { class: 'back-arrow', html: BACK_ICON }),
        h('span', {}, section ? `返回${section.name}` : '返回')
      ),
      h(
        'div',
        { class: 'topic-head', style: { '--accent': topic.accent } },
        h('h2', { class: 'topic-head-name' }, topic.name),
        h('p', { class: 'topic-head-tagline' }, topic.tagline),
        h(
          'p',
          { class: 'topic-head-progress' },
          // 级别胶囊：家长切到某个级别后进领域页，需要一眼看到「现在看的是哪一级」
          h('span', { class: 'topic-head-band' }, levelFilterLabel(level)),
          h('span', {}, `已掌握 ${done} / ${topic.items.length}`)
        )
      ),
      grid
    )
  );

  scrollTop();
}
