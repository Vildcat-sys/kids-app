/**
 * prefs.js — 应用偏好存储
 *
 * ═══════════════════════════════════════════════════════════════
 * 分层纪律（重要）
 * ═══════════════════════════════════════════════════════════════
 * 本文件属于 core 层，**不允许 import 任何内容数据**。
 * 「有哪些合法档位」是内容侧的概念（定义在 data/index.js），
 * 由 main.js 装配时通过 `validBands` 注入进来。
 *
 * 为什么不图省事直接 import data：
 *   1. 方向反了 —— core 是被依赖的底座，不该反过来依赖上层
 *   2. core 会因此绑死在具体内容上，无法脱离这套数据复用
 * 见 docs/CODE-REVIEW.md 第二节「核心层变更」。
 *
 * ═══════════════════════════════════════════════════════════════
 * 为什么和 store.js 分开
 * ═══════════════════════════════════════════════════════════════
 * 两者看着都是「用户状态」，但生命周期不同：
 *   进度（store）—— 孩子学到了哪，家长重置进度时清空
 *   偏好（prefs）—— 这个应用怎么用，孩子的年龄不会因为重置进度而变回 3 岁
 * 混在一个 key 里迟早出现「重置进度顺手把年龄也清了」这种 bug。
 *
 * 数据形状（版本化，便于将来迁移）：
 *   {
 *     v: 1,
 *     ageBand:  string   当前年龄档位
 *     askedAge: boolean  是否已经走过首次「你几岁啦」引导
 *   }
 */

const STORAGE_KEY = 'kids-encyclopedia-prefs-v1';
const CURRENT_VERSION = 1;

/** 兜底默认档位。真实默认值应由调用方通过 defaultBand 注入。 */
const HARD_FALLBACK = 'all';

/**
 * @param {object} [options]
 * @param {Storage} [options.storage]   注入存储后端，便于测试时传入内存实现
 * @param {string[]} [options.validBands] 合法档位白名单，由调用方从数据层注入
 * @param {string} [options.defaultBand]  默认档位
 * @returns {object} prefs 实例
 */
export function createPrefs({ storage, validBands, defaultBand } = {}) {
  const backend = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  const listeners = new Set();

  /* 白名单没传时**不做校验**（宽松模式）。
     取舍：忘传参数的后果是「校验变松」，而不是「家长点了档位按钮却毫无反应」——
     后者更难排查，因为界面上看起来一切正常。
     内容侧的档位合法性由 tools/validate-content.mjs 独立把关。 */
  const whitelist =
    Array.isArray(validBands) && validBands.length > 0 ? new Set(validBands) : null;

  const FALLBACK = typeof defaultBand === 'string' && defaultBand ? defaultBand : HARD_FALLBACK;

  const isAllowed = (v) =>
    typeof v === 'string' && v.length > 0 && (whitelist === null || whitelist.has(v));

  /** 把任意输入规整成合法状态。坏数据一律降级为默认值，绝不让应用崩掉。 */
  function normalize(raw) {
    const safe = raw && typeof raw === 'object' ? raw : {};
    return {
      v: CURRENT_VERSION,
      ageBand: isAllowed(safe.ageBand) ? safe.ageBand : FALLBACK,
      askedAge: safe.askedAge === true,
    };
  }

  let state = normalize(read());

  function read() {
    if (!backend) return null;
    try {
      const raw = backend.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      // 存储被禁用或数据损坏时静默降级
      return null;
    }
  }

  function persist() {
    if (!backend) return;
    try {
      backend.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* 配额满或隐私模式，忽略 */
    }
  }

  function emit() {
    for (const fn of listeners) fn(state);
  }

  return {
    /** 当前档位 */
    ageBand() {
      return state.ageBand;
    },

    /** 切换档位。非法值直接忽略（不抛异常，UI 不该因为一个笔误白屏）。 */
    setAgeBand(band) {
      if (!isAllowed(band) || state.ageBand === band) return false;
      state.ageBand = band;
      persist();
      emit();
      return true;
    },

    /** 是否已经走过首次年龄引导 */
    hasAskedAge() {
      return state.askedAge;
    },

    /** 标记首次引导已完成。选过档位或点过「先看全部」都算。 */
    markAskedAge() {
      if (state.askedAge) return false;
      state.askedAge = true;
      persist();
      emit();
      return true;
    },

    /** 订阅变化，返回取消订阅函数 */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** 恢复默认偏好（家长设置里用） */
    reset() {
      state = normalize(null);
      persist();
      emit();
    },
  };
}

export const STORAGE_KEY_FOR_TEST = STORAGE_KEY;
