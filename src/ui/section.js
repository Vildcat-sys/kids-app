/**
 * ui/section.js — 板块页
 *
 * 版式对齐截图：
 *   顶部一行 7 板块 tab（可切板块）；其下 S1…S6 阶段横排（当前项带下划线）。
 *   当前阶段显示「阶段标题 + 一句描述」+ 两列模块卡网格。
 *   模块卡 = 绿色「模块N」标签 + 模块名 + 3 条学习目标 + 插画位 + 进度。
 *   点模块 → 进模块学习地图（#/m/<sec>/<stage>/<mod>）。
 *   阶段无内容 → 友好占位，绝不白屏。
 *
 * 数据全部来自冻结课程 API（data/curriculum.js）。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { getArt } from '../art/index.js';
import { findItem } from '../data/index.js';
import {
  listSections,
  listStages,
  listModules,
  moduleProgress,
} from '../data/curriculum.js';

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const ARROW_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
const LOCK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>';

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container
 * @param {string} ctx.sectionId
 * @param {object} ctx.store
 * @param {object} [ctx.speech]
 * @param {(hash: string) => void} ctx.go
 */
export function renderSection({ container, sectionId, store, speech, go }) {
  const sections = listSections();
  const section = sections.find((s) => s.id === sectionId) || sections[0];
  const stages = listStages(section.id);

  // 默认选中：第一个有模块的阶段，否则 S1。
  const firstWithModules = stages.find((s) => s.modules && s.modules.length > 0);
  let currentStageId = (firstWithModules || stages[0] || { id: 'S1' }).id;

  /* 板块 tab（顶部横排，可切板块） */
  const sectionTabs = h(
    'div',
    { class: 'sec-tabs' },
    sections.map((s) =>
      h(
        'button',
        {
          class: `sec-tab${s.id === section.id ? ' on' : ''}`,
          type: 'button',
          style: { '--accent': s.accent },
          onClick: () => { speech && speech.sfx && speech.sfx('tap'); go(`#/s/${s.id}`); },
        },
        s.name
      )
    )
  );

  /* 阶段横排 */
  const stageRow = h(
    'div',
    { class: 'stage-row' },
    stages.map((st) =>
      h(
        'button',
        {
          class: `stage-chip${st.id === currentStageId ? ' on' : ''}`,
          type: 'button',
          onClick: () => {
            currentStageId = st.id;
            speech && speech.sfx && speech.sfx('tap');
            renderBody();
          },
        },
        st.id
      )
    )
  );

  const body = h('div', { class: 'sec-body' });

  /* 板块内模块序号（模块1…），跨阶段连续编号 */
  function sectionModuleIndex() {
    const map = new Map();
    let n = 0;
    for (const st of stages) {
      for (const m of st.modules || []) {
        n += 1;
        map.set(`${st.id}/${m.id}`, n);
      }
    }
    return map;
  }
  const moduleIndex = sectionModuleIndex();

  function moduleArtHtml(mod) {
    const firstId = mod.items && mod.items[0];
    if (!firstId) return '';
    const hit = findItem(firstId);
    return hit && hit.item ? getArt(hit.item.art) : '';
  }

  function renderBody() {
    const stage = stages.find((s) => s.id === currentStageId) || stages[0];
    const mods = (stage && stage.modules) || [];

    if (!stage || mods.length === 0) {
      render(
        body,
        h(
          'div',
          { class: 'stage-empty' },
          h('span', { class: 'stage-empty-icon', html: LOCK_ICON }),
          h('p', {}, '本阶段内容准备中，先去上面的阶段玩吧。')
        )
      );
      return;
    }

    const cards = mods.map((mod) => {
      const prog = moduleProgress(section.id, stage.id, mod.id, store);
      const idx = moduleIndex.get(`${stage.id}/${mod.id}`) || 1;
      const art = moduleArtHtml(mod);
      return h(
        'button',
        {
          class: 'module-card',
          type: 'button',
          style: { '--accent': section.accent },
          onClick: () => {
            speech && speech.sfx && speech.sfx('pop');
            go(`#/m/${section.id}/${stage.id}/${mod.id}`);
          },
        },
        h('span', { class: 'module-cover', html: art || undefined }),
        h('span', { class: 'module-tag' }, `模块${idx}`),
        h('span', { class: 'module-name' }, mod.name),
        h(
          'ul',
          { class: 'module-goals' },
          (mod.goal || []).map((g) => h('li', {}, g))
        ),
        h(
          'span',
          { class: 'module-meta' },
          h('span', {}, `${prog.done}/${prog.total}`),
          h('span', { class: 'module-go', html: ARROW_ICON })
        )
      );
    });

    render(
      body,
      h(
        'div',
        { class: 'stage-head', style: { '--accent': section.accent } },
        h('h2', {}, stage.title || `${stage.id}`),
        h('p', {}, stage.desc)
      ),
      h('div', { class: 'module-grid' }, ...cards)
    );
  }

  render(
    container,
    h(
      'div',
      { class: 'wrap detail sec-page', style: { '--accent': section.accent } },
      h(
        'button',
        { class: 'back', type: 'button', onClick: () => go('#/') },
        h('span', { class: 'back-arrow', html: BACK_ICON }),
        h('span', {}, '返回')
      ),
      h(
        'div',
        { class: 'sec-head' },
        h('h1', { class: 'sec-head-name' }, section.name),
        h('p', { class: 'sec-head-tagline' }, section.tagline)
      ),
      sectionTabs,
      stageRow,
      body
    )
  );

  renderBody();
  scrollTop();
}
