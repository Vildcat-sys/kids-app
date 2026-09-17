/**
 * util.js — 核心层通用工具
 *
 * 只放与业务无关的纯函数，便于单测覆盖。
 */

/**
 * 确定性洗牌：同一个 seed 永远得到同一个顺序。
 *
 * 为什么不用 Math.random：
 *   1. 同一道题每次呈现顺序一致，孩子不会因为「这次选项换了位置」而困惑
 *   2. 出问题时可以复现，测试也能断言
 *   3. 同时又与数据里写的正确顺序不同，不影响考察效果
 *
 * 实现：FNV-1a 把种子文本压成整数，再跑一遍 LCG 驱动的 Fisher–Yates。
 *
 * @param {any[]} list
 * @param {string} seedText
 * @returns {any[]} 新数组，不修改入参
 */
export function seededShuffle(list, seedText) {
  const arr = list.slice();
  if (arr.length < 2) return arr;

  let seed = 2166136261;
  const text = String(seedText || 'seed');
  for (let i = 0; i < text.length; i += 1) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }

  for (let i = arr.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const j = seed % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** 把数值限制在 [lo, hi] 区间内 */
export function clamp(value, lo, hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

/** 数组去重，保持首次出现顺序 */
export function unique(list) {
  return Array.from(new Set(list));
}
