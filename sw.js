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

// v7：家长端（#/parent 本地成长报告）+ 新增 store 按项统计方法。
// v8：英语启蒙 26 个知识点 + 509 张英语卡片图接入。
// v9：内容扩充到 142 个知识点（新增 54 个）、116 张统一 3D 封面图替换内联 SVG，
//     并修复首页领域卡封面 .topic-art img 缺尺寸样式导致图片溢出的问题。
// v10：游戏化改版——本地音频讲解/读题/表扬（语音层重构）、小狮子奇奇引导角色、
//     探索地图首页、故事化详情页、三星彩带金币奖励；新增 styles-kids.css 与 ui/reward.js。
// v11：翻页有声绘本——card.js 改横向翻页 4 页绘本，speech.js 加 narratePage 逐页讲解；
//     媒体文件（narr 分页 mp3、book 绘本图）走运行时缓存不进 ASSETS。
// 新源文件必须进预缓存，否则离线状态加载失败。
// v12：全部 717 段语音统一为确认样音的同一音色重做；升版以清掉 runtime 缓存的旧音频
// v13：探究课堂（#/lesson/<id>）——五阶段十步互动课，新增 data/lessons.js 与 ui/lesson.js；
//     绘本卡片下方加「探究课堂」入口，只有 data/lessons.js 里写了的条目才显示。
// v15：工程卫生——摘掉已不存在的 age-bar.js、删除死文件 ui/curriculum-api.js；
//     reward.js 重写逐星弹入/金币贝塞尔/分档 WebAudio 音，store.js 加每日金币上限与本地徽章；
//     parent.js 主列表统一 7 板块；ageBands 字段作废。改了 JS/CSS，缓存版本号 +1。
// v16：探究课堂 v4.1——进环节自动连播（切环节先 stop 不叠音）、去掉「听一听」文字按钮改圆形小喇叭
//     重播、探究大图舞台 contain 居中不裁切（.lesson-stage/.lesson-demo）、大图热点呼吸光圈、
//     未完成推进给温柔提示、竖屏禁横向溢出。改了 lesson.js 与 styles-kids.css，缓存版本号 +1。
// v17：v5 全库水彩手绘绘本风 + 跟读复述改造 + 手绘奇奇 logo；改了 lesson.js 文案，缓存版本号 +1。
// v18：作品墙 + 成就卡 + 反馈降级链——新增 ui/work-card.js、ui/works.js，改 lesson/home/main/styles。
// v19：9 玩法落地——新增 quiz-types/egg.js、trace.js、coloring.js、mole.js、branch.js；
//     reward.js 存钱罐（飞罐+液面+投币/晃罐音）；lesson.js 报告满分/未满分两态；
//     book-library/card 加分级星章/已读/放大镜/点词翻译。
// v20：画风统一收尾——10 张用户可见旧 3D 风图重绘为 v5 水彩（编钟/钢琴/小提琴/灯塔/
//     雪山温度计/踏石/松鼠年轮/蜜蜂/大小熊/鼓与竖琴），新增 tools/check-style.mjs 画风闸。
//     原地替换图片 URL 不变，升缓存版本以清掉设备 runtime 里残留的旧 3D 图。
const CACHE = 'kids-encyclopedia-v20';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',

  './src/styles.css',
  './src/styles-kids.css',
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
  './src/ui/parent.js',
  './src/ui/topic.js',
  './src/ui/card.js',
  './src/ui/lesson.js',
  './src/ui/quiz.js',
  './src/ui/reward.js',
  './src/ui/section.js',
  './src/ui/book-library.js',
  './src/ui/level-bar.js',
  './src/ui/module-map.js',
  './src/ui/work-card.js',
  './src/ui/works.js',

  './src/quiz-types/index.js',
  './src/quiz-types/choice.js',
  './src/quiz-types/listen.js',
  './src/quiz-types/order.js',
  './src/quiz-types/match.js',
  './src/quiz-types/egg.js',
  './src/quiz-types/trace.js',
  './src/quiz-types/coloring.js',
  './src/quiz-types/mole.js',
  './src/quiz-types/branch.js',

  './src/data/index.js',
  './src/data/science.js',
  './src/data/geo.js',
  './src/data/culture.js',
  './src/data/logic.js',
  './src/data/space.js',
  './src/data/english.js',
  './src/data/lessons.js',
  './src/data/art.js',
  './src/data/writing.js',
  './src/data/music.js',
  './src/data/sections.js',
  './src/data/levels.js',
  './src/data/curriculum.js',

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
