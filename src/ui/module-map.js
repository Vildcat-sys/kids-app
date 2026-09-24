/**
 * ui/module-map.js — 模块学习地图（规格 §5.4，核心游戏化）
 *
 * 一条蜿蜒（蛇形）关卡路径，每个节点 = 一个知识点（圆形 + 封面小图）。
 * 节点状态：
 *   - 已点亮：亮，带 1–3 星（store.getStars）；
 *   - 当前可学：高亮脉冲（第一个「已解锁但还没学会」的节点）；
 *   - 未解锁：灰锁（前一个节点还没学会）。
 * 解锁规则（规格）：模块内按 items 顺序，第 1 个默认解锁，其余需前一个已学；
 *   已学节点永远可重玩。
 * 奇奇站在「当前节点」旁说引导语；点节点进 #/c/<itemId>。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { getArt } from '../art/index.js';
import { findItem } from '../data/index.js';
import {
  getSection,
  listStages,
  listItemsInModule,
  moduleProgress,
} from '../data/curriculum.js';

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const LOCK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>';
const STAR_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6z"/></svg>';

const MASCOT_SRC = 'src/images/mascot/lion-wave.webp';

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {string} ctx.sectionId
 * @param {string} ctx.stageId
 * @param {string} ctx.moduleId
 * @param {object} ctx.store
 * @param {object} [ctx.speech]
 * @param {(hash: string) => void} ctx.go
 */
export function renderModuleMap({ container, sectionId, stageId, moduleId, store, speech, go }) {
  const section = getSection(sectionId) || { name: '', accent: '#E8734A' };
  const stages = listStages(sectionId);
  const stage = stages.find((s) => s.id === stageId) || { title: stageId, modules: [] };
  const mod = (stage.modules || []).find((m) => m.id === moduleId) || { name: '', goal: [], items: [] };
  const items = listItemsInModule(sectionId, stageId, moduleId);
  const prog = moduleProgress(sectionId, stageId, moduleId, store);

  // 节点状态
  const learned = items.map((id) => store.has(id));
  const unlocked = items.map((_, i) => i === 0 || store.has(items[i - 1]));
  const currentIdx = items.findIndex((_, i) => unlocked[i] && !learned[i]);

  const guide =
    currentIdx === -1
      ? '这一关全部学会啦！再玩一次，把星星攒满吧！'
      : '从亮着的这一关开始，点一下就能学习啦！';

  const nodeRows = items.map((id, i) => {
    const hit = findItem(id);
    const item = hit ? hit.item : { name: id, art: '' };
    const isLearned = learned[i];
    const isUnlocked = unlocked[i];
    const isCurrent = i === currentIdx;
    const stars = store.getStars(id);
    // 蛇形左右交替
    const align = i % 2 === 0 ? 'left' : 'right';

    const node = h(
      'button',
      {
        class: [
          'map-node',
          align,
          isLearned ? ' lit' : '',
          isCurrent ? ' current' : '',
          isUnlocked ? '' : ' locked',
        ].join(' '),
        type: 'button',
        disabled: isUnlocked ? false : true,
        style: { '--accent': section.accent },
        onClick: () => {
          if (!isUnlocked) return;
          speech && speech.sfx && speech.sfx('open');
          go(`#/c/${id}`);
        },
        'aria-label': `${item.name}${isLearned ? '，已学会' : isUnlocked ? '' : '，未解锁'}`,
      },
      h(
        'span',
        { class: 'map-node-cover', html: item.art ? getArt(item.art) : undefined },
        isUnlocked ? null : h('span', { class: 'map-lock', html: LOCK_ICON })
      ),
      h('span', { class: 'map-node-name' }, item.name),
      isLearned
        ? h(
            'span',
            { class: 'map-stars' },
            [0, 1, 2].map((s) => h('i', { class: s < stars ? ' on' : '', html: STAR_ICON }))
          )
        : null
    );

    // 当前节点旁放奇奇
    const mascot = isCurrent
      ? h(
          'div',
          { class: 'map-mascot' },
          h('img', { src: MASCOT_SRC, alt: '奇奇', 'aria-hidden': 'true' }),
          h('span', { class: 'map-bubble' }, guide)
        )
      : null;

    return h('div', { class: `map-row ${align}` }, mascot, node);
  });

  render(
    container,
    h(
      'div',
      { class: 'wrap detail map-page', style: { '--accent': section.accent } },
      h(
        'button',
        { class: 'back', type: 'button', onClick: () => go(`#/s/${sectionId}`) },
        h('span', { class: 'back-arrow', html: BACK_ICON }),
        h('span', {}, section.name)
      ),
      h(
        'div',
        { class: 'map-head' },
        h('h1', {}, mod.name || '学习地图'),
        h('p', { class: 'map-progress' }, `已点亮 ${prog.done} / ${prog.total}`)
      ),
      items.length === 0
        ? h('div', { class: 'stage-empty' }, h('p', {}, '这一关还没有内容，先去别的模块玩吧。'))
        : h('div', { class: 'map-path' }, ...nodeRows)
    )
  );

  scrollTop();
}
