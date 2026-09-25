/**
 * curriculum.test.mjs — 课程矩阵（data/curriculum.js）测试
 *
 * 为什么这个文件必须存在
 * ──────────────────────
 * curriculum.js 是「7 板块 × S1–S6 × 模块」的**唯一事实来源**，
 * 10 个查询函数被首页、板块页、模块地图、家长端同时调用。
 * 它没有 UI，所以它出错时**界面上看不出哪里错了**：
 *
 *   · locateItem 反查错 → 孩子学完一个知识点，进度加到了别的模块头上
 *   · 一个 item 落进两个模块 → 进度分母重复计算，永远到不了 100%
 *   · 某阶段 modules 为空 → 那个阶段白屏（明令禁止）
 *   · listItemsInModule 返回内部数组而非副本 → 调用方一改就污染课程树
 *
 * validate-content.mjs 只查**结构**（字段齐不齐、142 个 id 落位没有）。
 * 上面这四条都是**语义**错误，结构完全合法。所以这里单独守。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listItems, findItem } from '../src/data/index.js';
import { LEVEL_IDS } from '../src/data/levels.js';
import {
  SECTIONS,
  CURRICULUM,
  listSections,
  getSection,
  listStages,
  listModules,
  listItemsInModule,
  locateItem,
  mappedItemIds,
  sectionStats,
  moduleProgress,
} from '../src/data/curriculum.js';

/** 把课程树整个拍平，方便做全局断言 */
function flatten() {
  const out = [];
  for (const sec of SECTIONS) {
    for (const stage of listStages(sec.id)) {
      for (const mod of stage.modules) {
        for (const itemId of mod.items) {
          out.push({ section: sec.id, stage: stage.id, module: mod.id, itemId });
        }
      }
    }
  }
  return out;
}

/* ─────────────── 板块 ─────────────── */

test('板块顺序是冻结的（首页按此顺序渲染）', () => {
  // 板块顺序是固定的。改了顺序首页就变了，所以钉死在这里。
  assert.deepEqual(
    listSections().map((s) => s.id),
    ['science', 'thinking', 'english', 'reading', 'art', 'writing', 'music']
  );
});

test('每个板块都有 id / name / accent / tagline', () => {
  for (const sec of SECTIONS) {
    assert.ok(sec.id, '有板块缺 id');
    assert.ok(sec.name, `板块 ${sec.id} 缺 name`);
    assert.ok(sec.tagline, `板块 ${sec.id} 缺 tagline`);
    assert.match(sec.accent || '', /^#[0-9A-Fa-f]{6}$/, `板块 ${sec.id} 的 accent 不合法`);
  }
});

test('getSection：找不到返回 null，不是 undefined', () => {
  assert.equal(getSection('science')?.id, 'science');
  assert.equal(getSection('不存在的板块'), null);
  assert.equal(getSection(undefined), null);
});

/* ─────────────── 阶段 ─────────────── */

test('每个板块都暴露完整的 S1–S6 六个阶段', () => {
  // 某阶段没内容时 tab 仍要显示，不能整个阶段消失。
  for (const sec of SECTIONS) {
    assert.deepEqual(
      listStages(sec.id).map((s) => s.id),
      LEVEL_IDS,
      `板块 ${sec.id} 的阶段不是完整的 S1–S6`
    );
  }
});

test('每个阶段都有 title 与 desc', () => {
  for (const sec of SECTIONS) {
    for (const st of listStages(sec.id)) {
      assert.ok(st.title, `板块 ${sec.id} 阶段 ${st.id} 缺 title`);
      assert.ok(st.desc, `板块 ${sec.id} 阶段 ${st.id} 缺 desc —— 板块页那句描述会空着`);
    }
  }
});

test('listStages：未知板块返回空数组，不抛异常', () => {
  assert.deepEqual(listStages('不存在的板块'), []);
});

/* ─────────────── 模块 ─────────────── */

test('每个模块都有 id / name / 恰好 3 条 goal', () => {
  for (const sec of SECTIONS) {
    for (const st of listStages(sec.id)) {
      for (const mod of st.modules) {
        assert.ok(mod.id, `板块 ${sec.id}/${st.id} 有模块缺 id`);
        assert.ok(mod.name, `模块 ${mod.id} 缺 name`);
        assert.equal(
          mod.goal.length,
          3,
          `模块 ${mod.id} 的 goal 是 ${mod.goal.length} 条，模块卡上正好要 3 行`
        );
      }
    }
  }
});

test('模块的 items 非空 —— 空模块会渲染成点不进去的卡片', () => {
  for (const sec of SECTIONS) {
    for (const st of listStages(sec.id)) {
      for (const mod of st.modules) {
        assert.ok(mod.items.length > 0, `板块 ${sec.id}/${st.id} 的模块 ${mod.id} 一个知识点都没有`);
      }
    }
  }
});

test('listItemsInModule 返回副本，改动它不会污染课程树', () => {
  // 曾经踩过：返回内部数组，调用方 push 一下，课程树就被改了。
  const first = flatten()[0];
  const before = listItemsInModule(first.section, first.stage, first.module).length;

  const got = listItemsInModule(first.section, first.stage, first.module);
  got.push('假数据');

  assert.equal(
    listItemsInModule(first.section, first.stage, first.module).length,
    before,
    '课程树被调用方改动了'
  );
});

test('listModules / listItemsInModule：未知入参返回空数组，不抛异常', () => {
  assert.deepEqual(listModules('不存在的板块', 'S1'), []);
  assert.deepEqual(listModules('science', 'S99'), []);
  assert.deepEqual(listItemsInModule('science', 'S1', '不存在的模块'), []);
});

/* ─────────────── 落位：一个知识点恰好在一个模块里 ─────────────── */

test('一个知识点只能落进一个模块（否则进度分母会重复算）', () => {
  const seen = new Map();
  const dup = [];
  for (const cell of flatten()) {
    if (seen.has(cell.itemId)) {
      dup.push(`${cell.itemId}：${seen.get(cell.itemId)} 与 ${cell.section}/${cell.stage}/${cell.module}`);
    }
    seen.set(cell.itemId, `${cell.section}/${cell.stage}/${cell.module}`);
  }
  assert.deepEqual(dup, [], `有知识点落在多个模块里：\n${dup.join('\n')}`);
});

test('mappedItemIds 覆盖全部注册知识点', () => {
  const mapped = mappedItemIds();
  const missing = listItems()
    .map(({ item }) => item.id)
    .filter((id) => !mapped.has(id));
  assert.deepEqual(missing, [], `这些知识点没落进任何模块：${missing.join(', ')}`);
});

test('课程树里引用的每个 id 都真实存在', () => {
  const ghost = [...mappedItemIds()].filter((id) => !findItem(id));
  assert.deepEqual(ghost, [], `课程树引用了不存在的知识点：${ghost.join(', ')}`);
});

test('locateItem 能往返：反查结果与拍平表一致', () => {
  // 这条是「学完一个知识点，进度加到哪个模块」的根据。
  // 反查错了不会报错，只会把进度记到别的模块头上。
  const flat = flatten();
  const index = new Map(flat.map((c) => [c.itemId, c]));

  for (const [itemId, cell] of index) {
    const hit = locateItem(itemId);
    assert.ok(hit, `locateItem('${itemId}') 返回 null`);
    assert.equal(hit.section, cell.section, `${itemId} 的板块反查错`);
    assert.equal(hit.stage, cell.stage, `${itemId} 的阶段反查错`);
    assert.equal(hit.module, cell.module, `${itemId} 的模块反查错`);
  }
});

test('locateItem：未知的字符串 id 返回 null', () => {
  assert.equal(locateItem('不存在的知识点'), null);
  assert.equal(locateItem(''), null);
  assert.equal(locateItem('science-'), null);
});

/* 非字符串入参不抛异常、返回 null（2026-09-23 已修：sectionOfItemId 开头加类型守卫）。
 * 路由参数缺失、store 里读出脏 id 时，查不到就返回 null，而不是整页崩。 */
test('locateItem：非字符串入参返回 null，不抛异常', () => {
  assert.equal(locateItem(undefined), null);
  assert.equal(locateItem(null), null);
  assert.equal(locateItem(42), null);
  assert.equal(locateItem({}), null);
});

/* ─────────────── 统计与进度 ─────────────── */

test('sectionStats 的 total 与实际落位数量一致', () => {
  const flat = flatten();
  for (const sec of SECTIONS) {
    const n = flat.filter((c) => c.section === sec.id).length;
    assert.equal(sectionStats(sec.id).total, n, `板块 ${sec.id} 的 total 对不上`);
  }
});

test('各板块 total 之和等于知识点总数', () => {
  const sum = SECTIONS.reduce((n, sec) => n + sectionStats(sec.id).total, 0);
  assert.equal(sum, listItems().length, '有知识点没被算进任何板块');
});

test('moduleProgress：不传 store 时 total 照算，done 为 0', () => {
  const cell = flatten()[0];
  const prog = moduleProgress(cell.section, cell.stage, cell.module);
  assert.equal(prog.done, 0);
  assert.ok(prog.total > 0);
});

test('moduleProgress：done 跟着 store.has 走', () => {
  const cell = flatten()[0];
  const items = listItemsInModule(cell.section, cell.stage, cell.module);

  // 只把前两个标为学过
  const learned = new Set(items.slice(0, 2));
  const store = { has: (id) => learned.has(id) };

  const prog = moduleProgress(cell.section, cell.stage, cell.module, store);
  assert.equal(prog.done, Math.min(2, items.length));
  assert.equal(prog.total, items.length);
});

test('moduleProgress：store.has 抛异常时会向外抛（当前行为，刻意记录）', () => {
  // 记录现状：moduleProgress 不吞 store 的异常。
  // 真实 store 的 has() 只读内存状态，不会抛；会抛的只有"storage 被禁用"这类极端情况，
  // 那时整页本来也渲染不出来，吞掉反而会掩盖问题。
  // 如果哪天决定改成容错（读不到就当没学过），把这里换成 assert.doesNotThrow 并写明理由。
  const cell = flatten()[0];
  const store = { has: () => { throw new Error('storage 被禁用'); } };
  assert.throws(() => moduleProgress(cell.section, cell.stage, cell.module, store));
});

/* ─────────────── ageBands 过滤已作废 ───────────────
 *  filterItemsByBand 已随年龄带一起删除（拍板 A）。筛选统一走 S1–S6 级别，
 *  课程矩阵层不再按 ageBand 过滤。这里不再保留对应用例。 */

/* ─────────────── CURRICULUM 原始结构 ─────────────── */

test('CURRICULUM 的 key 与 SECTIONS 一一对应', () => {
  assert.deepEqual(Object.keys(CURRICULUM).sort(), SECTIONS.map((s) => s.id).sort());
});
