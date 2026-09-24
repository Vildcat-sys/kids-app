/**
 * ui/shell.js — 应用外壳
 *
 * 负责两件固定不变的事：顶部栏、主内容容器。
 * 它不认识任何业务概念，只暴露 setStats 让外部更新进度显示。
 */

import { h } from '../core/dom.js';

const STAR_ICON =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6z" fill="#E8A33D"/></svg>';

/**
 * @param {object} options
 * @param {() => void} options.onHome 点击标题回到首页
 * @param {() => void} [options.onParent] 点击「家长」进入成长报告
 * @returns {{ header: HTMLElement, main: HTMLElement, setStats: Function }}
 */
export function createShell({ onHome, onParent }) {
  const statsText = h('span', { class: 'stars-txt' }, '0 / 0');

  const parentBtn = onParent
    ? h(
        'button',
        {
          class: 'parent-entry',
          type: 'button',
          onClick: onParent,
          'aria-label': '打开成长报告',
          title: '家长查看学习报告',
        },
        '家长'
      )
    : null;

  const header = h(
    'header',
    { class: 'app-header' },
    h(
      'button',
      { class: 'brand', type: 'button', onClick: onHome, 'aria-label': '回到首页' },
      h('span', { class: 'brand-dot' }),
      h('span', { class: 'brand-name' }, '小小百科')
    ),
    h('span', { class: 'spacer' }),
    parentBtn,
    h(
      'div',
      { class: 'stars', title: '已经认识的知识点' },
      h('span', { class: 'stars-icon', html: STAR_ICON }),
      statsText
    )
  );

  const main = h('main', { class: 'app-main', id: 'app' });

  return {
    header,
    main,
    /** @param {string} text 例如 "3 / 18" */
    setStats(text) {
      statsText.textContent = text;
    },
  };
}
