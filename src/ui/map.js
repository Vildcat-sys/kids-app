/**
 * ui/map.js — 「我的地图」
 *
 * 对标点：参考产品的知识图谱圆环（见 docs/ARCHITECTURE）。
 * 参考产品用一张圆环图说明「知识之间有关系」，我们用一条条小路说明「知识有先后」——
 * 同一条路上的驿站按数据文件里的顺序排列，走完一个点亮一个。
 *
 * ═══════════════════════════════════════════════════════════════
 * 几个取舍
 * ═══════════════════════════════════════════════════════════════
 *
 * 为什么每个领域一张小岛，而不是 65 个点铺一张大地图
 *   65 个点铺开，在手机上每个点只剩十几像素，点不准也看不清。
 *   分成 6 张小岛后，每张最多 6 个点一行，在 360px 宽的屏幕上
 *   驿站直径仍有 30px 以上，孩子用指头点得中。
 *
 * 为什么驿站位置是算出来的，不是手写的坐标表
 *   手写坐标意味着每加一个知识点都要重新摆一次版面，迟早摆乱。
 *   现在按数量自动蛇形排布，加内容零维护。
 *
 * 为什么小路用折线而不是平滑曲线
 *   平滑曲线（Catmull-Rom）在蛇形折返处会向外甩出画布，
 *   要额外做边界裁剪。折线加圆角既稳又像真正的石板路。
 *
 * 为什么整页 SVG 是字符串，不走 h() 逐个建节点
 *   document.createElement('svg') 建出来的是 HTMLUnknownElement，
 *   不会渲染。要正确渲染得用 createElementNS，65 个驿站写起来极其啰嗦。
 *   所以图形走字符串、名称一律 esc() 转义，交互用事件委托补回来。
 */

import { h, render, scrollTop } from '../core/dom.js';
import { SECTIONS, topicsOfSection, LEVEL_ALL } from '../data/index.js';
import { renderLevelBar } from './level-bar.js';

/* ---------- 版面常量 ---------- */

const DOT_R = 15; // 驿站半径
const GAP = 44; // 相邻驿站中心距（半径 15 时留出 14px 空隙）
const MAX_COLS = 6; // 每行最多几个驿站：6 个刚好在 360px 屏上不缩得太小
const PAD = 30; // 岛内边距

/* ---------- 小工具 ---------- */

/** SVG 文本转义。名称来自数据文件，仍然转义——防线不因为"应该安全"就撤掉。 */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** 保留一位小数，避免 SVG 里出现一长串浮点 */
function f(n) {
  return Math.round(n * 10) / 10;
}

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** 从 from 朝 to 方向走 len 距离后的点 */
function stepTo(from, to, len) {
  const d = dist(from, to) || 1;
  return { x: from.x + ((to.x - from.x) / d) * len, y: from.y + ((to.y - from.y) / d) * len };
}

/**
 * 蛇形网格布点。奇数行反向，让路线折回来而不是跳回行首。
 *
 * 导出是为了能在 tests/map.test.mjs 里直接验算版面 ——
 * 这类"算出来对不对"的逻辑，靠肉眼看截图是看不出边界溢出的。
 *
 * @param {number} n 驿站数量
 */
export function layoutDots(n) {
  const cols = Math.min(MAX_COLS, Math.max(1, n));
  const rows = Math.ceil(n / cols);
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const r = Math.floor(i / cols);
    const cInRow = i % cols;
    // 该行不满时居中，避免最后一排塌在左边
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const offset = Math.floor((cols - inRow) / 2);
    const c = r % 2 === 1 ? cols - 1 - (cInRow + offset) : cInRow + offset;
    pts.push({ x: PAD + c * GAP, y: PAD + r * GAP });
  }
  return {
    pts,
    w: PAD * 2 + (cols - 1) * GAP,
    h: PAD * 2 + (rows - 1) * GAP,
  };
}

/**
 * 折线转带圆角的路径。
 * @param {{x:number,y:number}[]} pts
 * @param {number} r 转角半径
 */
export function trailPath(pts, r = 16) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${f(pts[0].x)} ${f(pts[0].y)}`;

  let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const rr = Math.min(r, dist(a, b) / 2, dist(b, c) / 2);
    const enter = stepTo(b, a, rr);
    const exit = stepTo(b, c, rr);
    d += ` L ${f(enter.x)} ${f(enter.y)} Q ${f(b.x)} ${f(b.y)} ${f(exit.x)} ${f(exit.y)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${f(last.x)} ${f(last.y)}`;
}

/**
 * 岛屿地形装饰 —— 2 个小元素，让岛看起来不像框。
 * —— 类型由 topic.id hash 决定（不同领域风景不同，但**稳定**），
 *   位置固定在岛的四角（远离驿站，不抢视觉）。
 * —— 透明度压到 0.22-0.32，必须比驿站淡，否则视觉噪音。
 *
 * 选用 3 种：
 *   0  小石头  — 圆点
 *   1  小山    — 三角
 *   2  小树    — 圆 + 短杆
 */
function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * @param {string} accent 领域色
 * @param {number} w viewBox 宽
 * @param {number} h viewBox 高
 * @param {string} seed 用于决定类型的稳定种子（如 topic.id）
 */
export function terrain(accent, w, h, seed) {
  const r = hashSeed(seed);
  /* 位置故意挑在驿站的「死区」—— 两排驿站 (y≈30 和 y≈74) 之间的小路已经占满，
     顶部 (y≈14) 和底部 (y≈h-10) 各放一个最安全。 */
  const slots = [
    { x: 16, y: 14 },
    { x: w - 18, y: h - 11 },
  ];
  return slots
    .map((slot, i) => {
      const type = (r >> (i * 3)) % 3;
      const { x, y } = slot;
      if (type === 0) {
        return `<circle cx="${x}" cy="${y}" r="4" fill="${accent}" fill-opacity="0.3"/>`;
      }
      if (type === 1) {
        return `<path d="M${x - 6} ${y + 5} L${x} ${y - 5} L${x + 6} ${y + 5} Z" fill="${accent}" fill-opacity="0.22"/>`;
      }
      // 树冠 + 树干
      return (
        `<circle cx="${x}" cy="${y - 1}" r="4" fill="${accent}" fill-opacity="0.32"/>` +
        `<line x1="${x}" y1="${y + 3}" x2="${x}" y2="${y + 8}" stroke="${accent}" stroke-width="1.4" stroke-opacity="0.32"/>`
      );
    })
    .join('');
}

/* ---------- 单个驿站 ---------- */

/** 对勾，画在已点亮的驿站里 */
const CHECK = `<path d="M-5.5 0.5 L-1.5 5 L6 -4" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;

/**
 * 四种状态：done 已点亮 / review 该温习 / next 下一个建议去 / todo 还没去
 *   review 是已点亮但超过 7 天的，用「半满」视觉（空心粗描边 + 领域色勾）
 *   暗示「学过但有点忘了」。
 *   next 单独拎出来，是为了让孩子一眼知道「下面该点哪儿」——
 *   65 个灰点里挑一个是负担，给一个高亮的就够。
 */
/* 导出是为了 tests/map.test.mjs 能直接断言 SVG attribute 是否落到 <g> 上。
   这是上一版的真实 bug：transform 算对了却忘了拼到 <g>，截图全空，64 条测试全过。 */
export function dotSvg(pt, state, name, accent, index) {
  // 上一版写好这个字符串却忘了塞进下面的 <g>，6 个驿站画到 (0,0) 叠在一起，
  // 截图全空、测试还全过 —— 因为布局算法用绝对坐标测的不受 SVG transform 影响。
  // 教训：模板字符串里插入的局部变量必须在 return 前 grep 一遍。
  const common = `transform="translate(${f(pt.x)} ${f(pt.y)})"`;
  const label = esc(name);
  const aria =
    state === 'done'
      ? `${label}，已经认识`
      : state === 'review'
        ? `${label}，该温习了`
        : state === 'next'
          ? `${label}，推荐下一个`
          : label;

  let inner;
  if (state === 'done') {
    inner = `<circle r="${DOT_R}" fill="${accent}"/>${CHECK}`;
  } else if (state === 'review') {
    // 半满：白底 + 领域色虚线描边 + 领域色勾。
    // —— 虚线描边在 SVG attribute 上写（CSS 优先级低于 SVG presentation attribute，
    //    写了也没用），styles.css 里那份 CSS 只是兜底。
    inner =
      `<circle r="${DOT_R}" fill="#FFFFFF" stroke="${accent}" stroke-width="3" stroke-dasharray="4 3"/>` +
      `<path d="M-5.5 0.5 L-1.5 5 L6 -4" fill="none" stroke="${accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (state === 'next') {
    inner =
      `<circle r="${DOT_R}" fill="#FFFFFF" stroke="${accent}" stroke-width="3"/>` +
      `<circle r="4.5" fill="${accent}"/>`;
  } else {
    inner =
      `<circle r="${DOT_R}" fill="#FFFFFF" stroke="#DCD5C6" stroke-width="2.2"/>` +
      `<circle r="3.5" fill="#DCD5C6"/>`;
  }

  return (
    `<g ${common} class="map-dot map-dot-${state}" data-item="${esc(index)}" role="button" tabindex="0" ` +
    `aria-label="${aria}"><title>${aria}</title>${inner}</g>`
  );
}

/* ---------- 一张岛 ---------- */

/**
 * 生成一个领域的岛屿 SVG。
 * @param {object} topic 领域（已按档位过滤）
 * @param {object} store
 */
export function isleSvg(topic, store) {
  const items = topic.items;
  const { pts, w, h } = layoutDots(items.length);
  const accent = topic.accent || '#888888';

  // 第一个还没掌握的，就是「下一个」
  let nextIdx = -1;
  for (let i = 0; i < items.length; i += 1) {
    if (!store.has(items[i].id)) {
      nextIdx = i;
      break;
    }
  }

  const trail = `<path d="${trailPath(pts)}" fill="none" stroke="${accent}" stroke-opacity="0.32" stroke-width="4" stroke-linecap="round" stroke-dasharray="7 7"/>`;

  const dots = items
    .map((item, i) => {
      let state;
      if (store.has(item.id)) {
        // 已点亮 → 看是否过了复习间隔（store.needsReview，注入式时钟便于测试）
        state = store.needsReview(item.id) ? 'review' : 'done';
      } else {
        state = i === nextIdx ? 'next' : 'todo';
      }
      return dotSvg(pts[i], state, item.name, accent, item.id);
    })
    .join('');

  return (
    `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" ` +
    `aria-label="${esc(topic.name)}的地图">` +
    /* 地形装饰画在底层（rect 之后、trail 之前），让它在驿站下面不抢眼 */
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="26" fill="${accent}" fill-opacity="0.06" stroke="${accent}" stroke-opacity="0.28" stroke-width="1.6" stroke-dasharray="5 5"/>` +
    terrain(accent, w, h, topic.id) +
    trail +
    dots +
    `</svg>`
  );
}

/* ---------- 整页 ---------- */

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.container 主内容容器
 * @param {object} ctx.store
 * @param {object} ctx.prefs
 * @param {(hash: string) => void} ctx.go
 */
export function renderMap({ container, store, prefs, go }) {
  const level = prefs.level();

  /* 地图按**板块**分组（原来按 4 个主题分组）。
     规划中的板块没有内容，不在地图上占位 —— 地图是进度视图，
     没有进度可看的位置只会让人以为加载失败。 */
  const groups = SECTIONS.map((sec) => ({
    ...sec,
    topics: topicsOfSection(sec.id, level),
  })).filter((g) => g.topics.length > 0);

  /* 总览。分母跟着级别走，与首页、顶栏保持一致。 */
  const total = groups.reduce((s, g) => s + g.topics.reduce((n, t) => n + t.items.length, 0), 0);
  const done = groups.reduce(
    (s, g) => s + g.topics.reduce((n, t) => n + t.items.filter((i) => store.has(i.id)).length, 0),
    0
  );
  // 复习计数 —— 按当前级别过滤，只算在当前级别下看得到的已点亮项
  const visibleLearned = groups.flatMap((g) => g.topics.flatMap((t) => t.items)).filter((i) => store.has(i.id));
  const reviewCount = visibleLearned.filter((i) => store.needsReview(i.id)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const headline =
    total === 0
      ? '这个级别还没有内容'
      : done === 0
        ? '地图上还没有点亮的地方'
        : done >= total
          ? '整张地图都亮啦！'
          : `点亮了 ${done} 个地方`;

  const overview = h(
    'div',
    { class: 'map-overview' },
    h(
      'div',
      { class: 'map-overview-top' },
      h('h1', {}, '我的地图'),
      h('span', { class: 'map-overview-num' }, `${done} / ${total}`)
    ),
    h(
      'div',
      { class: 'map-bar' },
      h('span', { class: 'map-bar-fill', style: { width: `${pct}%` } })
    ),
    h('p', { class: 'map-overview-sub' }, headline),
    reviewCount > 0
      ? h(
          'p',
          { class: 'map-overview-review' },
          `有 ${reviewCount} 个该温习了 —— 找到路上那些半空的圆点`
        )
      : null
  );

  const blocks = groups.map((group) => {
    const gTotal = group.topics.reduce((n, t) => n + t.items.length, 0);
    const gDone = group.topics.reduce(
      (n, t) => n + t.items.filter((i) => store.has(i.id)).length,
      0
    );

    return h(
      'section',
      { class: 'map-group', style: { '--group': group.accent } },
      h(
        'header',
        { class: 'map-group-head' },
        h(
          'div',
          { class: 'map-group-text' },
          h('h2', {}, group.name),
          h('span', {}, group.tagline)
        ),
        h('span', { class: 'map-group-count' }, `${gDone}/${gTotal}`)
      ),
      h(
        'div',
        { class: 'map-isles' },
        group.topics.map((topic) => {
          const tDone = topic.items.filter((i) => store.has(i.id)).length;
          const tTotal = topic.items.length;
          return h(
            'div',
            {
              class: `map-isle${tDone === tTotal && tTotal > 0 ? ' done' : ''}`,
              style: { '--accent': topic.accent },
              dataset: { topic: topic.id },
            },
            h(
              'div',
              { class: 'map-isle-head' },
              h('span', { class: 'map-isle-name' }, topic.name),
              tDone === tTotal && tTotal > 0
                ? h('span', { class: 'map-isle-badge' }, '全部点亮')
                : h('span', { class: 'map-isle-count' }, `${tDone}/${tTotal}`)
            ),
            h('div', { class: 'map-isle-svg', html: isleSvg(topic, store) })
          );
        })
      )
    );
  });

  const hint = h(
    'p',
    { class: 'map-hint' },
    '点一下路上的小圆点，就直接去那个地方。点小岛的名字，可以看整个领域。'
  );

  const root = h(
    'div',
    { class: 'wrap' },
    renderLevelBar({ current: level, onPick: (lv) => prefs.setLevel(lv) }),
    overview,
    blocks.length
      ? blocks
      : h(
          'p',
          { class: 'map-hint' },
          h(
            'button',
            {
              class: 'lv-empty-btn',
              type: 'button',
              onClick: () => prefs.setLevel(LEVEL_ALL),
            },
            '这个级别下没有内容，看全部级别'
          )
        ),
    hint
  );

  /* 事件委托：SVG 是字符串拼的，没法逐个绑监听。
     监听器挂在这次新建的 root 上，随页面切换一起被丢弃，不会累积。 */
  root.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-item]');
    if (dot) {
      go(`#/c/${dot.dataset.item}`);
      return;
    }
    const isle = e.target.closest('[data-topic]');
    if (isle) go(`#/t/${isle.dataset.topic}`);
  });

  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const dot = e.target.closest('[data-item]');
    if (dot) {
      e.preventDefault();
      go(`#/c/${dot.dataset.item}`);
    }
  });

  render(container, root);
  scrollTop();
}
