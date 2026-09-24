/**
 * router.test.mjs — 核心路由（core/router.js）测试
 *
 * 为什么之前没有它：router 直接抓全局 window，Node 里根本起不来。
 * 现在 createRouter 接受可注入的 win，我们传一个带 location.hash /
 * addEventListener 的假对象进来，就能在 Node 里把路由表跑全。
 *
 * 守住的四条行为契约（任一破了都是「整站打不开 / 点了没反应」级别的故障）：
 *   1. go(同一个 hash) —— 浏览器不触发 hashchange，路由必须手动派发一次，
 *      否则「点了同一张卡片没反应」。
 *   2. resolve 抛异常 —— 必须降级成 notfound，绝不能让整页白屏。
 *   3. 未知 hash —— 落到 notfound。
 *   4. 旧 #/t/<topic> 链接 —— 重定向到对应板块，重定向链路上 onChange 一定会
 *      被调到（不白屏）。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createRouter } from '../src/core/router.js';

/** 假 window：location.hash 可读写，手动 emit 模拟浏览器 hashchange。 */
function makeWin(initialHash = '#/') {
  const listeners = {};
  return {
    location: { hash: initialHash },
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    removeEventListener(type, fn) {
      listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
    },
    emit(type) {
      (listeners[type] || []).forEach((f) => f());
    },
  };
}

/* 镜像 main.js 里的最小路由表（home/map/parent/section/redirect/notfound）。
 * 这里故意复制业务表的形状，而不是空 resolve —— 因为我们要验证「重定向」这条
 * 两跳链路在 router 层真的能走通，而不是只验证函数被调了一次。 */
const SECTIONS = new Set(['science', 'thinking', 'english', 'reading', 'art', 'writing', 'music']);
const TOPIC_TO_SECTION = {
  science: 'science', geo: 'science',
  logic: 'thinking', space: 'thinking',
  english: 'english', culture: 'reading',
  art: 'art', writing: 'writing', music: 'music',
};

function resolveStub(hash) {
  if (hash === '#/' || hash === '' || hash === '#') return { name: 'home' };
  if (hash === '#/map') return { name: 'map' };
  if (hash === '#/parent') return { name: 'parent' };
  const sm = hash.match(/^#\/s\/([a-z]+)$/);
  if (sm) {
    return SECTIONS.has(sm[1]) ? { name: 'section', sectionId: sm[1] } : { name: 'notfound', hash };
  }
  const tm = hash.match(/^#\/t\/([a-z-]+)$/);
  if (tm) {
    const sec = TOPIC_TO_SECTION[tm[1]];
    return { name: 'redirect', to: sec ? `#/s/${sec}` : '#/' };
  }
  return { name: 'notfound', hash };
}

/* 模仿 main.js 的 onChange：遇到 redirect 就 go(route.to)，否则记下来。
 * router 实例要在 onChange 里用到，先用 let 占位，createRouter 后回填。 */
function startWithRedirect(win) {
  let router;
  const delivered = [];
  router = createRouter({
    resolve: resolveStub,
    onChange(route) {
      delivered.push(route);
      if (route.name === 'redirect') router.go(route.to); // main.js 就是这么做的
    },
    win,
  });
  router.start();
  return { router, delivered };
}

test('缺少 window（浏览器外且未注入）时抛错', () => {
  assert.throws(
    () => createRouter({ resolve: () => ({}), onChange: () => {} }),
    /window/
  );
});

test('start() 按当前 hash 派发一次', () => {
  const win = makeWin('#/map');
  let delivered = null;
  const router = createRouter({
    resolve: resolveStub,
    onChange: (route) => { delivered = route; },
    win,
  });
  router.start();
  assert.equal(delivered && delivered.name, 'map');
  router.stop();
});

test('go(同一个 hash) 手动再派发一次 —— 点同一张卡片不能没反应', () => {
  const win = makeWin('#/');
  let count = 0;
  const router = createRouter({ resolve: resolveStub, onChange: () => { count += 1; }, win });
  router.start();
  assert.equal(count, 1, 'start 派发一次');

  router.go('#/'); // 同 hash，浏览器本不触发，路由必须手动派发
  assert.equal(count, 2, '同 hash 手动派发后 onChange 应再触发一次');
  assert.equal(win.location.hash, '#/', '同 hash 不应改写地址');
  router.stop();
});

test('go(不同 hash) 改写地址，hashchange 后派发新路由', () => {
  const win = makeWin('#/');
  const delivered = [];
  const router = createRouter({
    resolve: resolveStub,
    onChange: (r) => delivered.push(r),
    win,
  });
  router.start();
  router.go('#/s/science');
  assert.equal(win.location.hash, '#/s/science', 'go 应把 hash 写进 location');
  assert.equal(delivered.length, 1, '改 hash 本身不立即派发（等 hashchange）');

  win.emit('hashchange'); // 模拟浏览器
  assert.equal(delivered.length, 2);
  assert.equal(delivered[1].name, 'section');
  assert.equal(delivered[1].sectionId, 'science');
  router.stop();
});

test('resolve 抛异常时降级 notfound，不白屏', () => {
  const win = makeWin('#/anything');
  const boom = new Error('resolve 炸了');
  const delivered = [];
  const router = createRouter({
    resolve: () => { throw boom; },
    onChange: (r) => delivered.push(r),
    win,
  });
  router.start();
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].name, 'notfound');
  assert.equal(delivered[0].error, boom, '降级路由要带上原始错误，便于诊断');
  router.stop();
});

test('未知 hash → notfound', () => {
  const win = makeWin('#/no/such/place');
  const delivered = [];
  const router = createRouter({
    resolve: resolveStub,
    onChange: (r) => delivered.push(r),
    win,
  });
  router.start();
  assert.equal(delivered[0].name, 'notfound');
  assert.equal(delivered[0].hash, '#/no/such/place');
  router.stop();
});

test('旧 #/t/<topic> 重定向到板块：两跳后落到 section，不白屏', () => {
  const win = makeWin('#/t/geo'); // geo 属 science 板块
  const { router, delivered } = startWithRedirect(win);

  // 第一跳：start() 同步派发 #/t/geo → redirect；onChange 里 router.go(to) 改写地址
  assert.equal(delivered[0].name, 'redirect');
  assert.equal(win.location.hash, '#/s/science', '重定向把地址改写到板块');

  // 第二跳：浏览器因 hash 变化触发 hashchange（假 win 手动 emit 模拟），落到板块页
  win.emit('hashchange');
  assert.equal(delivered[delivered.length - 1].name, 'section');
  assert.equal(delivered[delivered.length - 1].sectionId, 'science');
  router.stop();
});

test('stop() 后不再响应 hashchange', () => {
  const win = makeWin('#/');
  let count = 0;
  const router = createRouter({ resolve: resolveStub, onChange: () => { count += 1; }, win });
  router.start();
  router.stop();
  const afterStop = count;
  win.emit('hashchange');
  assert.equal(count, afterStop, 'stop 后不应再派发');
});
