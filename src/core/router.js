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
 * @param {object} [options.win]  注入 window（测试用），默认真实 window。
 *   以前 window 是硬抓的，Node 里测不了；现在可注入一个带
 *   `location.hash` / `addEventListener` / `removeEventListener` 的假对象。
 * @returns {{ go: Function, current: Function, start: Function, stop: Function }}
 */
export function createRouter({ resolve, onChange, win } = {}) {
  // 浏览器里默认全局 window；测试时注入假对象。
  const W = win || (typeof window !== 'undefined' ? window : undefined);
  if (!W) throw new Error('createRouter: 缺少 window —— 浏览器外使用请注入 options.win');

  let started = false;

  function current() {
    return (W.location && W.location.hash) || '#/';
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
      else W.location.hash = hash;
    },

    current,

    start() {
      if (started) return;
      started = true;
      W.addEventListener('hashchange', handleHashChange);
      dispatch();
    },

    stop() {
      if (!started) return;
      started = false;
      W.removeEventListener('hashchange', handleHashChange);
    },
  };
}
