/**
 * quiz-types/index.js — 题型注册表与接口契约
 *
 * ─────────────────────────────────────────────────────────────
 * 题型模块契约
 * ─────────────────────────────────────────────────────────────
 * 每个题型模块必须 default 导出一个对象：
 *
 *   {
 *     id:       string                    题型标识，与内容数据里的 type 对应
 *     name:     string                    中文名，用于文档与报错
 *     validate(quiz, ctx): string[]       校验题目数据，返回错误信息数组；空数组 = 合法
 *     create(quiz, api): { el, destroy? } 渲染题目，返回根元素与可选清理函数
 *   }
 *
 * api 由答题容器注入：
 *
 *   {
 *     speak(text, opts): boolean          朗读（英语题用 en-US，其余自动判断）
 *     onAnswer({ correct, detail }): void 上报作答结果，反馈 UI 与进度由容器统一处理
 *     item: object                        当前知识点，题型可按需读取（一般不用）
 *   }
 *
 * ─────────────────────────────────────────────────────────────
 * 为什么要有 validate
 * ─────────────────────────────────────────────────────────────
 * 这个项目最大的风险不是代码写错，而是内容写错：选项少一个、答案下标越界、
 * 解释漏写。这类问题在运行时表现为「点了没反应」或「答对却判错」，
 * 极难排查。所以每个题型自带校验规则，由 tools/validate-content.mjs 在
 * 提交前统一跑一遍，把内容错误挡在发布之前。
 *
 * 新增题型只需三步：
 *   1. 在 quiz-types/ 下新建模块，实现上面的契约
 *   2. 在下方 import 并注册进 QUIZ_TYPES
 *   3. 在 docs/CONTRIBUTING.md 的题型表里补一行
 * 不需要改动 UI 层任何代码。
 */

import choice from './choice.js';
import listen from './listen.js';
import order from './order.js';
import match from './match.js';
import egg from './egg.js';
import trace from './trace.js';
import coloring from './coloring.js';
import mole from './mole.js';
import branch from './branch.js';

export const QUIZ_TYPES = {
  choice,
  listen,
  order,
  match,
  egg,
  trace,
  coloring,
  mole,
  branch,
};

/** 取题型实现，未知类型返回 null（调用方负责降级） */
export function getQuizType(id) {
  return Object.prototype.hasOwnProperty.call(QUIZ_TYPES, id) ? QUIZ_TYPES[id] : null;
}

/** 所有已注册题型 id，供校验器枚举 */
export function listQuizTypeIds() {
  return Object.keys(QUIZ_TYPES);
}

// seededShuffle 实现已移至 core/util.js：
// 题型模块与 UI 层都需要它，放在注册表里会造成 quiz-types ↔ core 的循环依赖。
export { seededShuffle } from '../core/util.js';
