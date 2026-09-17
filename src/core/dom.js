/**
 * dom.js — 极简 DOM 构建工具
 *
 * 设计意图：
 *   所有 UI 模块只通过这里创建元素，不直接拼字符串写 innerHTML。
 *   好处是将来若要换成虚拟 DOM 或框架，只需替换本文件，UI 层不用动。
 *
 * 为什么不用 innerHTML 拼模板：
 *   内容来自数据文件，数据将来可能由非开发同学维护，拼字符串容易漏转义。
 *   走 createElement + textContent 可以从结构上杜绝注入问题。
 */

/** 判断是否为可插入的节点 */
function isNode(v) {
  return v instanceof Node;
}

/** 递归挂载子元素，自动跳过 null / false / undefined，便于条件渲染 */
function appendChildren(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === '') continue;
    if (Array.isArray(child)) {
      appendChildren(el, child);
    } else if (isNode(child)) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }
}

/**
 * 创建元素。
 *
 * @param {string} tag            标签名
 * @param {object} [props]        属性、样式、事件
 *   - class     {string}
 *   - style     {object}  直接赋给 el.style
 *   - dataset   {object}  直接赋给 el.dataset
 *   - html      {string}  显式声明才允许写 innerHTML（仅用于内联 SVG）
 *   - onXxx     {function} 绑定事件，如 onClick
 *   - 其余键    {string|number|boolean} 走 setAttribute，true 渲染为布尔属性
 * @param {...any} children       子节点，支持嵌套数组与条件值
 * @returns {HTMLElement}
 *
 * @example
 *   h('button', { class: 'btn', onClick: () => go() }, '开始')
 *   h('div', { class: 'row' }, items.map(it => h('span', {}, it.name)))
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  const p = props || {};

  for (const key of Object.keys(p)) {
    const value = p[key];
    if (value === null || value === undefined || value === false) continue;

    if (key === 'class') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(el.dataset, value);
    } else if (key === 'html') {
      el.innerHTML = value;
    } else if (key.length > 2 && key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }

  appendChildren(el, children);
  return el;
}

/**
 * 用新的子节点整体替换容器内容。
 * 相比 innerHTML = '' 更明确，也不会丢掉已有的事件监听器（监听器挂在父容器上时）。
 */
export function render(container, ...children) {
  container.replaceChildren();
  appendChildren(container, children);
  return container;
}

/** 查询单个元素 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/** 查询多个元素，返回真数组（而非 NodeList），方便直接用数组方法 */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/** 滚动到页面顶部。切换视图时调用，避免继承上一个页面的滚动位置。 */
export function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'instant' });
}
