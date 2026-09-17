/**
 * ui/age-bar.js — 年龄档位选择条
 *
 * 从 home.js 抽出来，是因为「我的地图」页也要用同一套档位切换。
 * 抽成独立模块而不是让 map.js 去 import home.js —— UI 模块之间互不引用，
 * 只共用 core 与数据层，这是本工程的分层纪律（见 docs/CODE-REVIEW.md）。
 *
 * 组件只负责渲染与回调，不自己刷新自己：
 * 改档位写进 prefs，由 main.js 的订阅统一触发重渲染。
 */

import { h } from '../core/dom.js';
import { AGE_BANDS, AGE_ALL } from '../data/index.js';

/**
 * @param {object} ctx
 * @param {string} ctx.current      当前档位 id
 * @param {(band: string) => void} ctx.onPick 选择回调
 * @param {boolean} [ctx.prominent] 首次引导样式（更大的标题与提示）
 */
export function renderAgeBar({ current, onPick, prominent }) {
  const chips = [
    ...AGE_BANDS.map((b) => ({ id: b.id, label: b.label })),
    { id: AGE_ALL, label: '全部' },
  ];

  return h(
    'div',
    { class: `age-bar${prominent ? ' age-bar-ask' : ''}` },
    h(
      'div',
      { class: 'age-bar-text' },
      h('span', { class: 'age-bar-title' }, prominent ? '你几岁啦？' : '适合年龄'),
      h(
        'span',
        { class: 'age-bar-hint' },
        prominent ? '选一下年龄，只给你看得懂的。' : '换个年龄，看到的内容会跟着换。'
      )
    ),
    h(
      'div',
      { class: 'age-chips' },
      chips.map((c) =>
        h(
          'button',
          {
            class: `age-chip${current === c.id ? ' on' : ''}`,
            type: 'button',
            onClick: () => onPick(c.id),
            'aria-pressed': current === c.id ? 'true' : 'false',
          },
          c.label
        )
      )
    )
  );
}
