/**
 * ui/level-bar.js — 级别选择条（S1–S6）
 *
 * 取代原来的 age-bar.js。从 home.js 抽出来的原因不变：
 * 「我的地图」页也要用同一套切换。抽成独立模块而不是让 map.js 去
 * import home.js —— UI 模块之间互不引用，只共用 core 与数据层，
 * 这是本工程的分层纪律（见 docs/CODE-REVIEW.md）。
 *
 * 组件只负责渲染与回调，不自己刷新自己：
 * 改级别写进 prefs，由 main.js 的订阅统一触发重渲染。
 *
 * ═══════════════════════════════════════════════════════════════
 * 为什么按钮上只写 S1–S6，不写「S1 感知」
 * ═══════════════════════════════════════════════════════════════
 * 7 个按钮横排（6 级 + 全部），每个多带两个字就会挤成两行或缩到看不清。
 * 级别名放在下方提示行，**跟着选中项变** —— 一次只解释一个，反而比
 * 七个按钮各带一长串更好读。
 *
 * 首次引导的标题用「孩子现在会做什么」而不是「你几岁啦」：
 * 级别是认知台阶，家长对着"会不会比较大小"能直接判断，
 * 对着"S3"判断不了。标题和选项要对得上，否则家长只能随便点一个。
 */

import { h } from '../core/dom.js';
import { LEVELS, LEVEL_ALL, levelCounts } from '../data/index.js';

/**
 * @param {object} ctx
 * @param {string} ctx.current      当前级别 id（'all' 或 S1–S6）
 * @param {(level: string) => void} ctx.onPick 选择回调
 * @param {boolean} [ctx.prominent] 首次引导样式（更大的标题与提示）
 * @param {boolean} [ctx.withCount] 是否在按钮上显示各级内容数
 */
export function renderLevelBar({ current, onPick, prominent, withCount }) {
  const counts = withCount ? levelCounts() : null;

  const chips = [
    ...LEVELS.map((l) => ({ id: l.id, short: l.id, full: `${l.id} ${l.name}`, desc: l.desc })),
    { id: LEVEL_ALL, short: '全部', full: '全部级别', desc: '不分级别，所有内容都看得到' },
  ];

  const active = chips.find((c) => c.id === current) || chips[chips.length - 1];

  return h(
    'div',
    { class: `level-bar${prominent ? ' level-bar-ask' : ''}` },
    h(
      'div',
      { class: 'level-bar-text' },
      h(
        'span',
        { class: 'level-bar-title' },
        prominent ? '孩子现在会做什么？' : '难度级别'
      ),
      h(
        'span',
        { class: 'level-bar-hint' },
        prominent
          ? '按孩子能做到的事选，比按年龄准。拿不准就先看全部。'
          : '换一级，看到的内容会跟着换。'
      )
    ),
    h(
      'div',
      { class: 'level-chips' },
      chips.map((c) =>
        h(
          'button',
          {
            class: `level-chip${current === c.id ? ' on' : ''}`,
            type: 'button',
            onClick: () => onPick(c.id),
            'aria-pressed': current === c.id ? 'true' : 'false',
            'aria-label': c.full,
            title: `${c.full} —— ${c.desc}`,
          },
          h('span', { class: 'level-chip-id' }, c.short),
          counts && counts[c.id] !== undefined
            ? h('span', { class: 'level-chip-n' }, String(counts[c.id]))
            : null
        )
      )
    ),
    h(
      'div',
      { class: 'level-now' },
      h('span', { class: 'level-now-id' }, active.full),
      h('span', { class: 'level-now-desc' }, active.desc)
    )
  );
}
