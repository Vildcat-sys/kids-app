/**
 * store.js — 学习进度存储
 *
 * 设计意图：
 *   全应用只有这一处持有"孩子学到了哪"的状态，UI 层只读不写。
 *   写入即持久化，避免出现"内存里对、刷新后丢"的经典 bug。
 *
 * 数据形状（版本化，便于将来迁移）：
 *   {
 *     v: 3,
 *     learned:   string[]                已掌握的知识点 id
 *     learnedAt: { [id]: number }       掌握时刻（毫秒），用于「多久前该温习」
 *     attempts:  { [id]: number }       每个知识点的作答次数
 *     correct:   { [id]: number }       每个知识点的答对次数
 *   }
 *
 * 关于 STORAGE_KEY：
 *   名字里的 v2 是历史遗留，**换 key = 用户进度清零，所以永不换 key**。
 *   数据格式版本看 state.v 字段，每次不兼容升级都在 normalize 里做迁移。
 *
 * 关于迁移（v2 → v3）：
 *   老数据没有 learnedAt。如果给所有已点亮项填 0（= 1970），升级后
 *   地图上 65 个驿站会**立刻全部**变成「需要温习」状态，孩子会困惑。
 *   策略：迁移时刻 = 升级时刻。也就是升级后**再过 7 天**才进入温习期。
 *   用户感知是「升级前点亮的，从升级那天起算 7 天」—— 顺其自然。
 */

const STORAGE_KEY = 'kids-encyclopedia-progress-v2'; // 见上方「永不换 key」
const CURRENT_VERSION = 3;
const DEFAULT_REVIEW_DAYS = 7;

/** 把任意输入规整成合法状态，坏数据一律降级为空，绝不让应用因为脏数据崩掉 */
function normalize(raw, now = Date.now()) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const learned = Array.isArray(safe.learned)
    ? safe.learned.filter((x) => typeof x === 'string')
    : [];

  /* learnedAt 只接受「数字、> 0」的时间戳，其他一律降级为 now。
     老数据（v2）整个 learnedAt 字段缺失 → 全部按 now 填充，详见文件头说明。 */
  const src = safe.learnedAt && typeof safe.learnedAt === 'object' ? safe.learnedAt : {};
  const learnedAt = {};
  for (const id of learned) {
    const t = src[id];
    learnedAt[id] = typeof t === 'number' && t > 0 ? t : now;
  }

  return {
    v: CURRENT_VERSION,
    learned,
    learnedAt,
    attempts: safe.attempts && typeof safe.attempts === 'object' ? { ...safe.attempts } : {},
    correct: safe.correct && typeof safe.correct === 'object' ? { ...safe.correct } : {},
  };
}

/**
 * @param {object} [options]
 * @param {Storage} [options.storage] 注入存储后端，便于测试时传入内存实现
 * @param {() => number} [options.now]  注入时钟，便于测试时控制「7 天」的判定
 * @returns {object} store 实例
 */
export function createStore({ storage, now } = {}) {
  const backend = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  const clock = typeof now === 'function' ? now : () => Date.now();
  const listeners = new Set();

  let state = normalize(read(), clock());

  function read() {
    if (!backend) return null;
    try {
      const raw = backend.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      // 存储被禁用或数据损坏时静默降级，不影响应用可用性
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
    /** 是否已掌握某知识点 */
    has(itemId) {
      return state.learned.includes(itemId);
    },

    /** 掌握时刻（毫秒），未掌握则 null */
    learnedAt(itemId) {
      return state.learnedAt[itemId] || null;
    },

    /**
     * 是否需要温习。
     * @param {string} itemId
     * @param {number} [days] 间隔天数，默认 7
     */
    needsReview(itemId, days = DEFAULT_REVIEW_DAYS) {
      const t = state.learnedAt[itemId];
      if (!t) return false;
      return clock() - t >= days * 24 * 60 * 60 * 1000;
    },

    /** 标记为已掌握。重复调用无副作用（幂等）。 */
    markLearned(itemId) {
      if (!itemId || state.learned.includes(itemId)) return false;
      state.learned.push(itemId);
      state.learnedAt[itemId] = clock();
      persist();
      emit();
      return true;
    },

    /**
     * 复习时答对了，刷新掌握时刻（不算新点亮，状态变回「done」）。
     * —— 不存在「未掌握但答对」的情况；本方法只是复习判定用，
     *    不会让未掌握的项变成已掌握。
     */
    touchLearned(itemId) {
      if (!itemId || !state.learned.includes(itemId)) return false;
      state.learnedAt[itemId] = clock();
      persist();
      emit();
      return true;
    },

    /**
     * 记录一次作答。
     * @param {string} itemId
     * @param {boolean} isCorrect
     */
    recordAttempt(itemId, isCorrect) {
      if (!itemId) return;
      state.attempts[itemId] = (state.attempts[itemId] || 0) + 1;
      if (isCorrect) {
        state.correct[itemId] = (state.correct[itemId] || 0) + 1;
      }
      persist();
      emit();
    },

    /** 汇总统计，供首页与家长页使用 */
    stats() {
      const attempts = Object.values(state.attempts).reduce((a, b) => a + b, 0);
      const correct = Object.values(state.correct).reduce((a, b) => a + b, 0);
      return {
        learnedCount: state.learned.length,
        attempts,
        correct,
        accuracy: attempts === 0 ? null : Math.round((correct / attempts) * 100),
      };
    },

    /**
     * 需要温习的知识点 id 列表。
     * —— UI 层用它画「该温习 N 个」提示。
     */
    reviewIds(days = DEFAULT_REVIEW_DAYS) {
      const cutoff = days * 24 * 60 * 60 * 1000;
      return state.learned.filter((id) => {
        const t = state.learnedAt[id];
        return t && clock() - t >= cutoff;
      });
    },

    /** 订阅状态变化，返回取消订阅函数 */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** 清空进度（家长重置用） */
    reset() {
      state = normalize(null, clock());
      persist();
      emit();
    },
  };
}

export const STORAGE_KEY_FOR_TEST = STORAGE_KEY;
export const CURRENT_VERSION_FOR_TEST = CURRENT_VERSION;
export const DEFAULT_REVIEW_DAYS_FOR_TEST = DEFAULT_REVIEW_DAYS;