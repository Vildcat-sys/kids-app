/**
 * branch.test.mjs — 实验分支题型测试
 *
 * 只测纯函数：
 *   1. validate() 对合法/非法数据返回正确错误数组
 *   2. createBranchState(steps) 的状态转移：pick / reselect / goNext / goBack / done
 * 不碰 DOM（create() 不调用）。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import impl, { createBranchState } from '../src/quiz-types/branch.js';

/* ─────────────── validate ─────────────── */

const LEGAL = {
  type: 'branch',
  q: '第一步先怎么做？',
  steps: [
    {
      prompt: '把玩具放在桌上。',
      choices: [
        { label: '手电筒从正面照', result: '影子出现在玩具背面。', tip: '光过不去的地方留下暗区。', next: 0 },
        { label: '手电筒举高', result: '影子变长了。', tip: '光越斜影子越长。' },
      ],
    },
  ],
  why: '光从哪边照，影子就在对面。',
};

test('validate：契约示例合法数据通过', () => {
  assert.deepEqual(impl.validate(LEGAL), []);
});

test('validate：缺 q 必须报错', () => {
  const bad = { ...LEGAL, q: '' };
  assert.ok(impl.validate(bad).some((e) => e.includes('缺少 q')));
});

test('validate：steps 非数组/为空必须报错', () => {
  assert.ok(impl.validate({ ...LEGAL, steps: undefined }).some((e) => e.includes('steps')));
  assert.ok(impl.validate({ ...LEGAL, steps: [] }).some((e) => e.includes('steps')));
});

test('validate：缺 prompt 必须报错', () => {
  const bad = {
    ...LEGAL,
    steps: [{ choices: [{ label: '甲', result: '结果甲' }] }],
  };
  assert.ok(impl.validate(bad).some((e) => e.includes('prompt')));
});

test('validate：choice 缺 label/result 必须报错', () => {
  const bad = {
    ...LEGAL,
    steps: [{ prompt: 'P', choices: [{ label: '甲' }, { result: '只有结果' }] }],
  };
  const errs = impl.validate(bad);
  assert.ok(errs.some((e) => e.includes('label')), `应缺 label：${errs.join(' / ')}`);
  assert.ok(errs.some((e) => e.includes('result')), `应缺 result：${errs.join(' / ')}`);
});

test('validate：choice.next 越界必须报错，省略则走线性前进', () => {
  const bad = {
    ...LEGAL,
    steps: [
      { prompt: 'P', choices: [{ label: '甲', result: 'R', next: 5 }] },
    ],
  };
  assert.ok(impl.validate(bad).some((e) => e.includes('next=5 越界')));

  // next 省略（合法）
  const ok = {
    ...LEGAL,
    steps: [{ prompt: 'P', choices: [{ label: '甲', result: 'R' }] }],
  };
  assert.deepEqual(impl.validate(ok), []);
});

test('validate：缺 why 必须报错', () => {
  assert.ok(impl.validate({ ...LEGAL, why: '' }).some((e) => e.includes('why')));
});

/* ─────────────── 状态机：初始 ─────────────── */

test('初始态：stepIndex=0 / chosen=null / done=false / 不可回退', () => {
  const s = createBranchState(LEGAL.steps);
  assert.equal(s.stepIndex, 0);
  assert.equal(s.chosen, null);
  assert.equal(s.done, false);
  assert.equal(s.canGoBack, false);
  assert.deepEqual(s.path, []);
});

test('空 steps：done 保持 false，但 pick/goNext 不崩', () => {
  const s = createBranchState([]);
  s.pick(0);
  assert.equal(s.chosen, null);
  s.goNext();
  assert.equal(s.done, false);
  assert.equal(s.stepIndex, 0);
});

/* ─────────────── 状态机：pick / reselect ─────────────── */

test('pick：选中后 chosen=下标；越界下标被忽略', () => {
  const s = createBranchState(LEGAL.steps);
  s.pick(1);
  assert.equal(s.chosen, 1);
  s.pick(99);
  assert.equal(s.chosen, 1, '越界 pick 不应改变 chosen');
  s.pick(-1);
  assert.equal(s.chosen, 1);
});

test('reselect：清空 chosen 回到选项态（重选无代价）', () => {
  const s = createBranchState(LEGAL.steps);
  s.pick(0);
  assert.equal(s.chosen, 0);
  s.reselect();
  assert.equal(s.chosen, null);
  assert.equal(s.done, false, '重选不应完成');
});

test('goNext：未 pick 时被忽略', () => {
  const s = createBranchState(LEGAL.steps);
  s.goNext();
  assert.equal(s.stepIndex, 0);
  assert.equal(s.done, false);
});

/* ─────────────── 状态机：单步 + 自环 next（契约示例）完成 ─────────────── */

test('契约示例：单步且 choice.next=当前步 → pick 后 goNext 即完成', () => {
  const s = createBranchState(LEGAL.steps); // 两步选择 next 都指向 0（自环）
  s.pick(0);
  assert.equal(s.willFinish, true, '自环应被视为完成');
  s.goNext();
  assert.equal(s.done, true);
});

test('完成后 pick / goNext / goBack 全部冻结', () => {
  const s = createBranchState(LEGAL.steps);
  s.pick(1);
  s.goNext();
  assert.equal(s.done, true);
  const idxBefore = s.stepIndex;
  s.pick(0);
  s.goNext();
  s.goBack();
  s.reselect();
  assert.equal(s.stepIndex, idxBefore);
  assert.equal(s.chosen, null);
  assert.equal(s.done, true);
});

/* ─────────────── 状态机：多步线性 + 回退 ─────────────── */

const LINEAR = [
  { prompt: '第一步', choices: [
    { label: '甲', result: '结果甲', tip: '提示甲' },
  ]},
  { prompt: '第二步', choices: [
    { label: '乙', result: '结果乙', tip: '提示乙' },
  ]},
  { prompt: '第三步', choices: [
    { label: '丙', result: '结果丙' },
  ]},
];

test('线性前进：pick→goNext 逐步进，path 记录来路', () => {
  const s = createBranchState(LINEAR);
  s.pick(0);
  s.goNext();
  assert.equal(s.stepIndex, 1);
  assert.equal(s.chosen, null, '前进后应回到该步选项态');
  assert.deepEqual(s.path, [0]);
  assert.equal(s.canGoBack, true);

  s.pick(0);
  s.goNext();
  assert.equal(s.stepIndex, 2);
  assert.deepEqual(s.path, [0, 1]);
});

test('线性走完最后一步 → done=true', () => {
  const s = createBranchState(LINEAR);
  s.pick(0); s.goNext();
  s.pick(0); s.goNext();
  assert.equal(s.stepIndex, 2);
  s.pick(0);
  assert.equal(s.willFinish, true, '最后一步未显式 next，应视为将完成');
  s.goNext();
  assert.equal(s.done, true);
});

test('goBack：沿 path 回退，回退到的步骤可重选；回退到头不再回', () => {
  const s = createBranchState(LINEAR);
  s.pick(0); s.goNext();        // → step1, path=[0]
  s.pick(0); s.goNext();        // → step2, path=[0,1]
  assert.equal(s.stepIndex, 2);

  s.goBack();
  assert.equal(s.stepIndex, 1);
  assert.equal(s.chosen, null, '回退应回到选项态');
  assert.deepEqual(s.path, [0]);

  s.goBack();
  assert.equal(s.stepIndex, 0);
  assert.deepEqual(s.path, []);
  assert.equal(s.canGoBack, false);

  s.goBack(); // 无路可退，忽略
  assert.equal(s.stepIndex, 0);
});

test('回退后重新走一遍：path 重新记录，不残留旧路径', () => {
  const s = createBranchState(LINEAR);
  s.pick(0); s.goNext();        // → step1
  s.goBack();                    // → step0
  assert.deepEqual(s.path, []);
  s.pick(0); s.goNext();        // 再走
  assert.equal(s.stepIndex, 1);
  assert.deepEqual(s.path, [0]);
});

/* ─────────────── 状态机：分支跳转（choice.next 指向别步） ─────────────── */

test('choice.next：跳转到指定步骤并压栈可回退', () => {
  const branched = [
    { prompt: 'S0', choices: [
      { label: '直行', result: 'R0直' },          // 线性 → S1
      { label: '跳跃', result: 'R0跳', next: 2 }, // 跳 → S2
    ]},
    { prompt: 'S1', choices: [{ label: 'x', result: 'R1' }] },
    { prompt: 'S2', choices: [{ label: 'y', result: 'R2' }] },
  ];
  const s = createBranchState(branched);
  s.pick(1); // 跳跃 → next:2
  s.goNext();
  assert.equal(s.stepIndex, 2, '应跳到 S2');
  assert.deepEqual(s.path, [0]);
  s.goBack();
  assert.equal(s.stepIndex, 0, '回退应回到来路 S0');
});

test('choice.next：与线性路径并存——选不同 choice 走不同分支', () => {
  const branched = [
    { prompt: 'S0', choices: [
      { label: '线性', result: 'R0a' },
      { label: '跳步', result: 'R0b', next: 2 },
    ]},
    { prompt: 'S1', choices: [{ label: 'x', result: 'R1' }] },
    { prompt: 'S2', choices: [{ label: 'y', result: 'R2' }] },
  ];
  const a = createBranchState(branched);
  a.pick(0); a.goNext();
  assert.equal(a.stepIndex, 1);

  const b = createBranchState(branched);
  b.pick(1); b.goNext();
  assert.equal(b.stepIndex, 2);
});
