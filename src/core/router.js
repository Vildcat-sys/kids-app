/**
 * router.js — 基于 hash 的极简路由
 *
 * 设计意图：
 *   核心层不认识任何业务概念，只负责「把当前 URL 交给调用方解析」。
 *   路由规则写在 main.js，改业务不用动核心层。
 *
 * 为什么用 hash 而不是 History API：
 *   本项目要能直接从本地文件或任意静态服务器打开，hash 不需要服务端 rewrite 规则。
 *   平板的物理返回键在 hash 模式下也能正确回退。
 */

/**
 * @param {object} options
 * @param {(hash: string) => any} options.resolve  把 hash 解析成路由对象
 * @param {(route: any) => void}  options.onChange 解析结果变化时回调
 * @returns {{ go: Function, current: Function, start: Function, stop: Function }}
 */
export function createRouter({ resolve, onChange }) {
  let started = false;

  function current() {
    return window.location.hash || '#/';
  }

  function dispatch() {
    let route;
    try {
      route = resolve(current());
    } catch (err) {
      // 解析失败不应让整个应用白屏，降级为 fallback 由调用方处理
      route = { name: 'notfound', hash: current(), error: err };
    }
    onChange(route);
  }

  function handleHashChange() {
    dispatch();
  }

  return {
    /**
     * 跳转到指定 hash。
     * 若目标与当前一致，浏览器不会触发 hashchange，这里手动派发一次，
     * 否则会出现「点了同一个卡片没反应」的问题。
     */
    go(hash) {
      if (current() === hash) dispatch();
      else window.location.hash = hash;
    },

    current,

    start() {
      if (started) return;
      started = true;
      window.addEventListener('hashchange', handleHashChange);
      dispatch();
    },

    stop() {
      if (!started) return;
      started = false;
      window.removeEventListener('hashchange', handleHashChange);
    },
  };
}
