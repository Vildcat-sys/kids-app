/**
 * sw.js — Service Worker
 *
 * 策略：预缓存全部应用资源（app shell 模式）。
 * 本项目无外部依赖、无后端接口，所有文件加起来不到 200 KB，
 * 一次性全量预缓存是最简单也最可靠的方案 —— 装到平板后完全离线可用。
 *
 * 维护提示：**新增源文件后必须同步更新下面的 ASSETS 列表**，
 * 否则离线状态下该模块会加载失败。tools/validate-content.mjs 会检查这一点。
 */

// v6：复习主动化（首页入口显示温习数）+ 岛屿地形装饰（terrain）。
// 内容结构变了，旧缓存里没有这些 UI 与 CSS，不升版会按旧版渲染。
const CACHE = 'kids-encyclopedia-v6';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',

  './src/styles.css',
  './src/main.js',

  './src/core/dom.js',
  './src/core/store.js',
  './src/core/prefs.js',
  './src/core/router.js',
  './src/core/speech.js',
  './src/core/util.js',

  './src/ui/shell.js',
  './src/ui/home.js',
  './src/ui/map.js',
  './src/ui/age-bar.js',
  './src/ui/topic.js',
  './src/ui/card.js',
  './src/ui/quiz.js',

  './src/quiz-types/index.js',
  './src/quiz-types/choice.js',
  './src/quiz-types/listen.js',
  './src/quiz-types/order.js',
  './src/quiz-types/match.js',

  './src/data/index.js',
  './src/data/science.js',
  './src/data/geo.js',
  './src/data/culture.js',
  './src/data/logic.js',
  './src/data/space.js',
  './src/data/english.js',

  './src/art/index.js',

  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // 单个资源失败不阻断整体安装，否则一个 404 会让整个应用装不上
      .then((c) => Promise.all(ASSETS.map((url) => c.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;

      return fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => {
          // 离线且未命中缓存时，导航请求回退到首页，其余请求如实失败
          if (e.request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
    })
  );
});
