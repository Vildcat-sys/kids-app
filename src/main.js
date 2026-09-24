/**
 * main.js — 应用入口与装配层
 *
 * 这是唯一知道「有哪些模块、谁依赖谁」的地方。
 * 各模块之间互不引用，只依赖构造函数注入的接口 —— 这样单测可以
 * 用假对象替换任意一个依赖，不用启动整个应用。
 *
 * 装配顺序：store / speech（无依赖） → shell（依赖导航回调） → router（依赖上面全部）
 */

import { createStore } from './core/store.js';
import { createPrefs } from './core/prefs.js';
import { createSpeech } from './core/speech.js';
import { createRouter } from './core/router.js';
import { h } from './core/dom.js';

import { createShell } from './ui/shell.js';
import { renderHome } from './ui/home.js';
import { renderMap } from './ui/map.js';
import { renderParent } from './ui/parent.js';
import { renderSection } from './ui/section.js';
import { renderModuleMap } from './ui/module-map.js';
import { renderTopic } from './ui/topic.js';
import { renderCard } from './ui/card.js';
import { renderLesson } from './ui/lesson.js';
import { renderBookLibrary } from './ui/book-library.js';
import { renderWorks } from './ui/works.js';
import { openQuiz } from './ui/quiz.js';

import {
  findSection,
  findTopicForLevel,
  findItem,
  getTopicsForLevel,
  countItemsForLevel,
  sectionOfTopic,
  LEVEL_IDS_WITH_ALL,
  DEFAULT_LEVEL,
} from './data/index.js';
import { locateItem } from './data/curriculum.js';

/* ---------- 基础设施 ---------- */

const store = createStore();

/* 合法级别白名单从数据层取出来注入 —— core/prefs.js 不允许 import 内容数据，
   它只认「一个字符串偏好项 + 一组允许的取值」。详见该文件头的分层说明。 */
const prefs = createPrefs({
  validLevels: LEVEL_IDS_WITH_ALL,
  defaultLevel: DEFAULT_LEVEL,
});

const speech = createSpeech();

let router;

const shell = createShell({
  onHome: () => router.go('#/'),
  onParent: () => router.go('#/parent'),
});

document.body.append(shell.header, shell.main);

/* ---------- 进度显示 ---------- */
/* 分母跟着级别变。切到 S1 后是 "3 / 23" 而不是 "3 / 142" ——
 * 否则低级别下进度条永远填不满，孩子会以为自己退步了。 */

function updateStats() {
  const level = prefs.level();
  shell.setStats(`${countLearnedForLevel(level)} / ${countItemsForLevel(level)}`);
}

/** 当前级别下已掌握的知识点数 */
function countLearnedForLevel(level) {
  let n = 0;
  for (const topic of getTopicsForLevel(level)) {
    for (const item of topic.items) if (store.has(item.id)) n += 1;
  }
  return n;
}

store.subscribe(updateStats);

/* ---------- 路由解析 ---------- */
/* hash 规则：
 *   #/                  首页（七大板块）
 *   #/s/<sectionId>     板块页（该板块内容，按 S1–S6 分档）
 *   #/map               我的地图（按板块分组的进度总览）
 *   #/parent            家长端（本地成长报告，只读 store 数据）
 *   #/t/<topicId>       领域页（单一领域的完整清单）
 *   #/c/<itemId>        知识点详情页（翻页绘本）
 *   #/lesson/<itemId>   探究课堂（5 阶段 10 步，仅 data/lessons.js 里有的条目）
 *   #/works           我的作品墙（学习证据卡 + 回访）
 *
 * 级别过滤只作用在「列目录」的三处：首页、地图页、板块页与领域页。
 * 详情页刻意**不按级别过滤** —— 孩子正停在一个知识点上、家长切了级别，
 * 不该把内容从他眼前抽走。
 */

const SECTION_RE = /^#\/s\/([a-z-]+)$/;
const MODULE_RE = /^#\/m\/([a-z-]+)\/(S[1-6])\/([a-z0-9-]+)$/;
const TOPIC_RE = /^#\/t\/([a-z-]+)$/;
const CARD_RE = /^#\/c\/([a-z-]+)$/;
const LESSON_RE = /^#\/lesson\/([a-z-]+)$/;
const LIBRARY_RE = /^#\/library$/;
const WORKS_RE = /^#\/works$/;

function resolve(hash) {
  if (hash === '#/' || hash === '' || hash === '#') return { name: 'home' };
  if (hash === '#/map') return { name: 'map' };
  if (hash === '#/parent') return { name: 'parent' };

  const level = prefs.level();

  const sectionMatch = hash.match(SECTION_RE);
  if (sectionMatch) {
    const section = findSection(sectionMatch[1]);
    return section ? { name: 'section', sectionId: sectionMatch[1] } : { name: 'notfound', hash };
  }

  const moduleMatch = hash.match(MODULE_RE);
  if (moduleMatch) {
    return {
      name: 'module',
      sectionId: moduleMatch[1],
      stageId: moduleMatch[2],
      moduleId: moduleMatch[3],
    };
  }

  // 旧 #/t/<topicId>：规格要求重定向到对应板块，不白屏
  const topicMatch = hash.match(TOPIC_RE);
  if (topicMatch) {
    const sec = sectionOfTopic(topicMatch[1]);
    return { name: 'redirect', to: sec ? `#/s/${sec.id}` : '#/' };
  }

  const cardMatch = hash.match(CARD_RE);
  if (cardMatch) {
    const hit = findItem(cardMatch[1]);
    return hit ? { name: 'card', item: hit.item, topic: hit.topic } : { name: 'notfound', hash };
  }

  const lessonMatch = hash.match(LESSON_RE);
  if (lessonMatch) {
    const hit = findItem(lessonMatch[1]);
    return hit ? { name: 'lesson', item: hit.item, topic: hit.topic } : { name: 'notfound', hash };
  }

  if (hash.match(WORKS_RE)) {
    return { name: 'works' };
  }

  if (hash.match(LIBRARY_RE)) {
    return { name: 'library' };
  }

  return { name: 'notfound', hash };
}

/* ---------- 路由渲染 ---------- */

function onChange(route) {
  speech.stop();

  switch (route.name) {
    case 'home':
      renderHome({ container: shell.main, store, prefs, speech, go: router.go });
      break;

    case 'map':
      renderMap({ container: shell.main, store, prefs, go: router.go });
      break;

    case 'parent':
      renderParent({ container: shell.main, store, prefs, go: router.go });
      break;

    case 'section':
      renderSection({
        container: shell.main,
        sectionId: route.sectionId,
        store,
        speech,
        go: router.go,
      });
      // 英语板块页顶部注入「英语绘本馆」入口（绘本馆是英语板块的延伸入口）
      if (route.sectionId === 'english') injectLibraryEntry(shell.main);
      break;

    case 'library':
      renderBookLibrary({ container: shell.main, store, speech, go: router.go });
      break;

    case 'works':
      renderWorks({ container: shell.main, store, go: router.go });
      break;

    case 'module':
      renderModuleMap({
        container: shell.main,
        sectionId: route.sectionId,
        stageId: route.stageId,
        moduleId: route.moduleId,
        store,
        speech,
        go: router.go,
      });
      break;

    case 'redirect':
      router.go(route.to);
      break;

    case 'card': {
      // 答完优先回到该知识点所在的模块地图（节点点亮并发奖），否则回板块
      const loc = locateItem(route.item.id);
      const backRoute = loc
        ? `#/m/${loc.section}/${loc.stage}/${loc.module}`
        : `#/s/${sectionIdOfTopic(route.topic.id)}`;
      renderCard({
        container: shell.main,
        item: route.item,
        topic: route.topic,
        store,
        speech,
        go: router.go,
        backRoute,
        openQuiz: (item) => {
          const cfg = {
            item,
            store,
            speech,
            onHome: () => router.go('#/'),
            onNext: () => router.go(backRoute),
          };
          // 多步题（排序/配对）失败后「再试一次」：重开同一题
          cfg.onRetry = () => openQuiz(cfg);
          openQuiz(cfg);
        },
      });
      break;
    }

    case 'lesson':
      renderLesson({
        container: shell.main,
        item: route.item,
        topic: route.topic,
        store,
        speech,
        go: router.go,
      });
      break;

    default:
      // 未知链接不白屏：给出可点的返回入口
      renderHome({ container: shell.main, store, prefs, speech, go: router.go });
      break;
  }
}

/** 领域 → 所属板块 id，找不到时退回首页（不该发生，但不该白屏） */
function sectionIdOfTopic(topicId) {
  const sec = sectionOfTopic(topicId);
  return sec ? sec.id : '';
}

/**
 * 在英语板块页顶部注入「英语绘本馆」入口横幅。
 * 绘本馆是独立路由 #/library，这里只放一个显眼的跳转卡。
 */
function injectLibraryEntry(mainEl) {
  const banner = h(
    'button',
    {
      class: 'lib-entry-banner',
      type: 'button',
      style: { '--accent': '#185FA5' },
      onClick: () => router.go('#/library'),
    },
    h('span', { class: 'lib-entry-body' },
      h('span', { class: 'lib-entry-title' }, '英语绘本馆'),
      h('span', { class: 'lib-entry-sub' }, '按级别选一本，点封面慢慢读，读完领星星'))
  );
  // 插在板块标题下方、tab 上方（用 sec-head 的父节点，避免引用节点层级不对）
  const head = mainEl.querySelector('.sec-head');
  if (head && head.parentNode) {
    head.parentNode.insertBefore(banner, head.nextSibling);
  } else {
    mainEl.appendChild(banner);
  }
}

/* ---------- 启动 ---------- */

router = createRouter({ resolve, onChange });

/* 级别变了要立刻反映到界面上：
 * 顶栏数字变了、当前页的内容也跟着换。
 * go() 传相同 hash 时会手动派发一次，正好用来强制重渲染。 */
prefs.subscribe(() => {
  updateStats();
  router.go(router.current());
});

updateStats();
router.start();

/* ---------- PWA 离线 ---------- */

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 离线能力不可用不影响主流程 */
    });
  });
}
