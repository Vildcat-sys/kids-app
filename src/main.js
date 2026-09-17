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

import { createShell } from './ui/shell.js';
import { renderHome } from './ui/home.js';
import { renderMap } from './ui/map.js';
import { renderTopic } from './ui/topic.js';
import { renderCard } from './ui/card.js';
import { openQuiz } from './ui/quiz.js';

import {
  findTopicForAge,
  findItem,
  getTopicsForAge,
  countItemsForAge,
  AGE_BAND_IDS,
  DEFAULT_AGE_BAND,
} from './data/index.js';

/* ---------- 基础设施 ---------- */

const store = createStore();

/* 合法档位白名单从数据层取出来注入 —— core/prefs.js 不允许 import 内容数据，
   它只认「一个字符串偏好项 + 一组允许的取值」。详见该文件头的分层说明。 */
const prefs = createPrefs({
  validBands: AGE_BAND_IDS,
  defaultBand: DEFAULT_AGE_BAND,
});

const speech = createSpeech();

let router;

const shell = createShell({
  onHome: () => router.go('#/'),
});

document.body.append(shell.header, shell.main);

/* ---------- 进度显示 ---------- */
/* 分母跟着年龄档位变。切到 3-5 档后是 "3 / 42" 而不是 "3 / 60" ——
 * 否则低龄档下进度条永远填不满，孩子会以为自己退步了。 */

function updateStats() {
  const band = prefs.ageBand();
  shell.setStats(`${countLearnedForAge(band)} / ${countItemsForAge(band)}`);
}

/** 当前档位下已掌握的知识点数 */
function countLearnedForAge(band) {
  let n = 0;
  for (const topic of getTopicsForAge(band)) {
    for (const item of topic.items) if (store.has(item.id)) n += 1;
  }
  return n;
}

store.subscribe(updateStats);

/* ---------- 路由解析 ---------- */
/* hash 规则：
 *   #/                  首页（六大领域）
 *   #/map               我的地图（按主题分组的进度总览）
 *   #/t/<topicId>       领域页
 *   #/c/<itemId>        知识点详情页
 *
 * 年龄过滤只作用在「列目录」的三处：首页、地图页与领域页。
 * 详情页刻意**不按档位过滤** —— 孩子正停在一个知识点上、家长切了档位，
 * 不该把内容从他眼前抽走。
 */

const TOPIC_RE = /^#\/t\/([a-z-]+)$/;
const CARD_RE = /^#\/c\/([a-z-]+)$/;

function resolve(hash) {
  if (hash === '#/' || hash === '' || hash === '#') return { name: 'home' };
  if (hash === '#/map') return { name: 'map' };

  const band = prefs.ageBand();

  const topicMatch = hash.match(TOPIC_RE);
  if (topicMatch) {
    const topic = findTopicForAge(topicMatch[1], band);
    return topic ? { name: 'topic', topic, band } : { name: 'notfound', hash };
  }

  const cardMatch = hash.match(CARD_RE);
  if (cardMatch) {
    const hit = findItem(cardMatch[1]);
    return hit ? { name: 'card', item: hit.item, topic: hit.topic } : { name: 'notfound', hash };
  }

  return { name: 'notfound', hash };
}

/* ---------- 路由渲染 ---------- */

function onChange(route) {
  speech.stop();

  switch (route.name) {
    case 'home':
      renderHome({ container: shell.main, store, prefs, go: router.go });
      break;

    case 'map':
      renderMap({ container: shell.main, store, prefs, go: router.go });
      break;

    case 'topic':
      renderTopic({
        container: shell.main,
        topic: route.topic,
        store,
        band: route.band,
        go: router.go,
      });
      break;

    case 'card':
      renderCard({
        container: shell.main,
        item: route.item,
        topic: route.topic,
        store,
        speech,
        go: router.go,
        openQuiz: (item) =>
          openQuiz({
            item,
            store,
            speech,
            onHome: () => router.go('#/'),
            onNext: () => router.go(`#/t/${route.topic.id}`),
          }),
      });
      break;

    default:
      // 未知链接不白屏：给出可点的返回入口
      renderHome({ container: shell.main, store, prefs, go: router.go });
      break;
  }
}

/* ---------- 启动 ---------- */

router = createRouter({ resolve, onChange });

/* 档位变了要立刻反映到界面上：
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
