/**
 * map.test.mjs — 「我的地图」测试
 *
 * 这个页面最容易出的两类问题，都**看不出来**：
 *
 *   1. 领域漏登记进 GROUPS —— 不报错，只是从地图上静默消失。
 *      上次是校验器兜住的，这里再断言一次（校验器是提交门禁，测试是回归网）。
 *   2. 布点算法溢出画布 —— 驿站画到边界外被裁掉，截图上只看到"少了一个点"，
 *      很难联想到是坐标算错了。所以这里直接验算坐标范围。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TOPICS, GROUPS, getGroupsForAge, AGE_ALL } from '../src/data/index.js';
import { layoutDots, trailPath, terrain, dotSvg, isleSvg } from '../src/ui/map.js';

/* ─────────────── 主题分组 ─────────────── */

test('每个领域都登记进了主题分组', () => {
  const grouped = new Set(GROUPS.flatMap((g) => g.topics));
  for (const topic of TOPICS) {
    assert.ok(grouped.has(topic.id), `领域「${topic.name}」没进分组，会从地图页消失`);
  }
});

test('分组里不引用不存在的领域', () => {
  const known = new Set(TOPICS.map((t) => t.id));
  for (const g of GROUPS) {
    for (const id of g.topics) {
      assert.ok(known.has(id), `分组「${g.name}」引用了不存在的领域 ${id}`);
    }
  }
});

test('领域色不撞车', () => {
  // 2026-09-17 抓到过：geo 与 logic 都是 #3B6D11，首页两张卡一模一样
  const seen = new Map();
  for (const topic of TOPICS) {
    const key = String(topic.accent || '').toLowerCase();
    assert.ok(key, `领域「${topic.name}」缺 accent`);
    assert.equal(seen.has(key), false, `${topic.name} 与 ${seen.get(key)} 撞色：${key}`);
    seen.set(key, topic.name);
  }
});

test('分组过滤后不留空组，且知识点总数与全量一致', () => {
  for (const band of [AGE_ALL, '3-5', '6-8']) {
    const groups = getGroupsForAge(band);
    for (const g of groups) {
      assert.ok(g.topics.length > 0, `档位 ${band} 下分组「${g.name}」是空的`);
      for (const t of g.topics) {
        assert.ok(t.items.length > 0, `档位 ${band} 下领域「${t.name}」没有知识点`);
      }
    }
  }

  // 全量档下，分组里的知识点总数必须等于知识点总数 —— 一个都不能少
  const inGroups = getGroupsForAge(AGE_ALL).reduce(
    (n, g) => n + g.topics.reduce((m, t) => m + t.items.length, 0),
    0
  );
  const inTopics = TOPICS.reduce((n, t) => n + t.items.length, 0);
  assert.equal(inGroups, inTopics, '有知识点被分组漏掉了');
});

/* ─────────────── 布点算法 ─────────────── */

test('布点数量正确，且全部落在画布内', () => {
  for (let n = 1; n <= 20; n += 1) {
    const { pts, w, h } = layoutDots(n);
    assert.equal(pts.length, n, `${n} 个知识点应该布 ${n} 个点`);

    for (const p of pts) {
      // 驿站半径 15，留 1px 余量。超出就会被 SVG viewBox 裁掉
      assert.ok(p.x >= 15 - 1 && p.x <= w - 15 + 1, `n=${n} 时 x=${p.x} 超出宽度 ${w}`);
      assert.ok(p.y >= 15 - 1 && p.y <= h - 15 + 1, `n=${n} 时 y=${p.y} 超出高度 ${h}`);
    }
  }
});

test('每行最多 6 个点，保证手机上点得中', () => {
  for (let n = 1; n <= 20; n += 1) {
    const { pts } = layoutDots(n);
    const rows = new Set(pts.map((p) => p.y));
    for (const y of rows) {
      const inRow = pts.filter((p) => p.y === y).length;
      assert.ok(inRow <= 6, `n=${n} 时有一行排了 ${inRow} 个点，超过 6 个`);
    }
  }
});

test('同一个领域的点不会重叠', () => {
  for (let n = 2; n <= 20; n += 1) {
    const { pts } = layoutDots(n);
    for (let i = 0; i < pts.length; i += 1) {
      for (let j = i + 1; j < pts.length; j += 1) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        assert.ok(d > 15, `n=${n} 时第 ${i} 与第 ${j} 个点距离只有 ${d}，会叠在一起`);
      }
    }
  }
});

test('空领域不炸', () => {
  const { pts } = layoutDots(0);
  assert.equal(pts.length, 0);
  assert.equal(trailPath(pts), '');
});

/* ─────────────── 小路 ─────────────── */

test('小路路径合法：以 M 开头、不含 NaN', () => {
  for (let n = 1; n <= 20; n += 1) {
    const { pts } = layoutDots(n);
    const d = trailPath(pts);
    assert.ok(d.startsWith('M '), `n=${n} 的路径没有起点`);
    assert.equal(d.includes('NaN'), false, `n=${n} 的路径出现 NaN`);
    assert.equal(d.includes('undefined'), false, `n=${n} 的路径出现 undefined`);
  }
});

test('只有一个点时路径不画多余的线', () => {
  const { pts } = layoutDots(1);
  assert.equal(trailPath(pts), `M ${pts[0].x} ${pts[0].y}`);
});

/* ─────────────── 驿站渲染 ─────────────── */

/* 上一版的真实 bug：transform 算对了却忘了塞进 <g>，所有驿站叠到 (0,0)，
   截图一片空白。layoutDots 测试用的是绝对坐标，全过；唯独没人在意
   transform attribute 是否真的写进了 SVG 字符串。 */

test('驿站 <g> 上有正确的 transform，与布点坐标一致', () => {
  for (let n = 1; n <= 6; n += 1) {
    const { pts } = layoutDots(n);
    for (let i = 0; i < pts.length; i += 1) {
      const html = dotSvg(pts[i], 'done', `name${i}`, '#000000', `id${i}`);
      const expected = `transform="translate(${pts[i].x} ${pts[i].y})"`;
      assert.ok(html.includes(expected), `第 ${i} 个驿站缺 transform：${html.slice(0, 100)}`);
    }
  }
});

test('不同驿站的位置互不相同', () => {
  const { pts } = layoutDots(6);
  const transforms = pts.map((p) => `translate(${p.x} ${p.y})`);
  assert.equal(new Set(transforms).size, pts.length, '驿站 transform 重复了');
});

test('island SVG 包含与知识点数量一致的驿站', () => {
  const topic = {
    id: 'test',
    name: '测试',
    accent: '#3D8FC7',
    items: Array.from({ length: 5 }, (_, i) => ({ id: `test-${i}`, name: `t${i}` })),
  };
  const store = { has: () => false };
  const svg = isleSvg(topic, store);
  // 一半是 todo + 1 个 next
  const dots = svg.match(/class="map-dot map-dot-/g) || [];
  assert.equal(dots.length, 5, '驿站数量应等于知识点数量');
  const nexts = svg.match(/map-dot-next/g) || [];
  assert.equal(nexts.length, 1, '应当恰好 1 个「next」');
  assert.equal(svg.includes('<rect'), true, '岛背景应有 rect');
  assert.equal(svg.includes('<path d="M'), true, '岛应有小路');
});

/* ─────────────── 4 态（含复习） ─────────────── */

/* 复习态 review 是地图新增的第四种视觉状态。它的核心断言：
   - 标记为「已掌握」但 needsReview 返回 true → 必须走 review 分支（不能与 done 同色同形状）
   - 视觉上 review 与 done / next 都能区分
   - needsReview 返回 false 时回到 done 分支 */

test('已掌握但 needsReview=true 的驿站渲染为 review', () => {
  const topic = {
    id: 'test',
    name: '测试',
    accent: '#3D8FC7',
    items: [
      { id: 'a', name: 'a' },
      { id: 'b', name: 'b' },
    ],
  };
  // a 已点亮且需要温习；b 已点亮但不需要温习
  const store = {
    has: (id) => id === 'a' || id === 'b',
    needsReview: (id) => id === 'a',
  };
  const svg = isleSvg(topic, store);
  assert.equal(svg.includes('map-dot-review'), true, 'review 态驿站应存在');
  assert.equal(svg.includes('map-dot-done'), true, 'done 态驿站应同时存在');
  // review 内部用领域色勾（半满），done 用白色勾（满）。两个都不能丢
  assert.equal((svg.match(/stroke="#3D8FC7"/g) || []).length >= 2, true,
    'review 用领域色勾，至少出现 2 次（描边 + 勾）');
});

test('没复习项时 SVG 不含 review 类名', () => {
  const topic = {
    id: 'test',
    name: '测试',
    accent: '#3D8FC7',
    items: [{ id: 'a', name: 'a' }],
  };
  const store = { has: () => true, needsReview: () => false };
  const svg = isleSvg(topic, store);
  assert.equal(svg.includes('map-dot-review'), false, '没人需要温习时不该有 review 类');
});

/* ─────────────── 地形装饰 ─────────────── */

/* terrain 给每个岛画 2 个小装饰（石头/山/树），类型由 topic.id 决定。
   验收三条：
   1) 同一 id 多次调用结果稳定（hashSeed 决定，不允许随机）
   2) 必须含领域色 accent，不允许颜色串台
   3) 装饰透明度 ≤ 0.32，驿站不会被它抢眼 */

test('terrain 输出 SVG 字符串，含 accent 色', () => {
  const svg = terrain('#3B8FC7', 280, 104, 'science');
  assert.ok(svg.includes('#3B8FC7'), '必须含领域色');
  assert.ok(svg.length > 0, '不能空');
});

test('terrain 同一种子结果稳定', () => {
  const a = terrain('#3B8FC7', 280, 104, 'culture');
  const b = terrain('#3B8FC7', 280, 104, 'culture');
  assert.equal(a, b, '同一 id 必须产生完全相同的装饰 —— hash 不能有随机因素');
});

test('terrain 不同种子产生不同结果', () => {
  const a = terrain('#3B8FC7', 280, 104, 'culture');
  const b = terrain('#3B8FC7', 280, 104, 'space');
  assert.notEqual(a, b, '不同领域至少大多数情况下装饰不同（hash 决定）');
});

test('island SVG 含地形元素', () => {
  const topic = {
    id: 'science',
    name: '科学',
    accent: '#3D8FC7',
    items: [{ id: 'a', name: 'a' }],
  };
  const store = { has: () => false };
  const svg = isleSvg(topic, store);
  /* 地形装饰在 rect 之后、trail 之前渲染 —— 检查 rect 后第一个 path 是 terrain 的三角
     （type=1 时才有 path），或者至少 island 包含 accent 色不止 rect 一处 */
  const accentCount = (svg.match(/#3D8FC7/g) || []).length;
  assert.ok(accentCount >= 4, '装饰至少额外加几条 accent 引用');
});
