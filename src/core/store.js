/**
 * store.js — 学习进度存储
 *
 * 设计意图：
 *   全应用只有这一处持有"孩子学到了哪"的状态，UI 层只读不写。
 *   写入即持久化，避免出现"内存里对、刷新后丢"的经典 bug。
 *
 * 数据形状（版本化，便于将来迁移）：
 *   {
 *     v: 4,
 *     learned:   string[]                已掌握的知识点 id
 *     learnedAt: { [id]: number }       掌握时刻（毫秒），用于「多久前该温习」
 *     attempts:  { [id]: number }       每个知识点的作答次数
 *     correct:   { [id]: number }       每个知识点的答对次数
 *     stars:     { [id]: 0..3 }          每个知识点历史最好星数（只升不降）
 *     coins:     number                  累计金币
 *     coinsToday: number                 今天已发金币（受每日上限约束）
 *     coinsDay:  string                  coinsToday 所属的本地日 YYYY-MM-DD
 *     lastDay:   string                  最近学习日 YYYY-MM-DD（本地时区）
 *     streak:    number                  连续打卡天数
 *     badges:    string[]                已解锁的本地成就徽章 id
 *   }
 *
 * 关于 STORAGE_KEY：
 *   名字里的 v2 是历史遗留，**换 key = 用户进度清零，所以永不换 key**。
 *   数据格式版本看 state.v 字段，每次不兼容升级都在 normalize 里做迁移。
 *
 * 关于迁移（v3 → v4）：
 *   v4 新增 stars / coins / lastDay / streak 四个游戏化字段。老用户已点亮的
 *   知识点进度（learned / learnedAt / attempts / correct）**全部保留**，新字段
 *   给安全默认值（stars 全 0、coins 0、lastDay 空、streak 0）—— 老用户不必重学，
 *   下次再玩某个知识点时自然开始攒星。STORAGE_KEY 永不换，只升 state.v。
 */

const STORAGE_KEY = 'kids-encyclopedia-progress-v2'; // 见上方「永不换 key」
const CURRENT_VERSION = 4;

/* 每日金币上限：防止连刷刷爆奖励，到顶后 addCoins 返回 0、UI 弹「今日已达上限」。
 * 选 100 是因为一次标准测验约发 10–30 金币，孩子一天正常学 3–5 次正好够用。 */
export const DAILY_COIN_CAP = 100;

/* 本地成就徽章目录：纯派生（根据已学数量/连续天数判断），只存已解锁的 id。
 * 不做上报、不做账号绑定 —— 换设备就没了，本就是给孩子当下的正反馈。 */
export const BADGE_DEFS = [
  { id: 'first-light', name: '初次点亮', desc: '学会第一个小知识', test: (v) => v.learned >= 1 },
  { id: 'light-5', name: '小小学者', desc: '学会 5 个小知识', test: (v) => v.learned >= 5 },
  { id: 'light-10', name: '探索新星', desc: '学会 10 个小知识', test: (v) => v.learned >= 10 },
  { id: 'streak-3', name: '连续三天', desc: '连续三天都来学习', test: (v) => v.streak >= 3 },
];
const DEFAULT_REVIEW_DAYS = 7;

/**
 * 把某个毫秒时刻转成本地时区的 YYYY-MM-DD。
 * 用本地 getFullYear/getMonth/getDate，保证「今天」的判定和孩子所处时区一致。
 */
function dayStr(offsetDays = 0, ts = Date.now()) {
  const d = new Date(ts);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

  /* stars 只接受「知识点 id → 0..3 整数」，非法值丢弃。 */
  const starsSrc = safe.stars && typeof safe.stars === 'object' ? safe.stars : {};
  const stars = {};
  for (const [id, v] of Object.entries(starsSrc)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      stars[id] = Math.max(0, Math.min(3, Math.round(v)));
    }
  }

  /* coins / lastDay / streak：坏值给安全默认，绝不让游戏化栏因脏数据崩掉。 */
  const coins =
    typeof safe.coins === 'number' && Number.isFinite(safe.coins) && safe.coins >= 0
      ? Math.round(safe.coins)
      : 0;
  const lastDay = typeof safe.lastDay === 'string' ? safe.lastDay : '';
  const streak =
    typeof safe.streak === 'number' && Number.isFinite(safe.streak) && safe.streak >= 0
      ? Math.round(safe.streak)
      : 0;

  /* coinsToday / coinsDay：每日金币计数，跨天自动清零。坏值降级为 0。 */
  const coinsToday =
    typeof safe.coinsToday === 'number' && Number.isFinite(safe.coinsToday) && safe.coinsToday >= 0
      ? Math.round(safe.coinsToday)
      : 0;
  const coinsDay = typeof safe.coinsDay === 'string' ? safe.coinsDay : '';

  /* badges：只接受字符串 id 列表，去重。 */
  const badges = Array.isArray(safe.badges)
    ? [...new Set(safe.badges.filter((x) => typeof x === 'string'))]
    : [];

  return {
    v: CURRENT_VERSION,
    learned,
    learnedAt,
    attempts: safe.attempts && typeof safe.attempts === 'object' ? { ...safe.attempts } : {},
    correct: safe.correct && typeof safe.correct === 'object' ? { ...safe.correct } : {},
    stars,
    coins,
    coinsToday,
    coinsDay,
    lastDay,
    streak,
    badges,
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

  /**
   * 刷新连续打卡（在「完成一个新知识点、领取金币」时调用）。
   * 规则（规格 §4）：
   *   - lastDay 已是今天 → 今天已打过卡，不变；
   *   - lastDay 是昨天   → 连续，streak + 1；
   *   - 其他（首次 / 断签）→ streak = 1。
   * 用注入的 clock() 取「今天」，保证可测。
   */
  function refreshStreak() {
    const today = dayStr(0, clock());
    if (state.lastDay === today) return;
    const yesterday = dayStr(-1, clock());
    state.streak = state.lastDay === yesterday ? (state.streak || 0) + 1 : 1;
    state.lastDay = today;
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

    /** 某个知识点的作答次数（未作答为 0） */
    attemptsOf(itemId) {
      return state.attempts[itemId] || 0;
    },

    /** 某个知识点的答对次数（未作答为 0） */
    correctOf(itemId) {
      return state.correct[itemId] || 0;
    },

    /* ─────────────── 游戏化字段（v4） ─────────────── */

    /** 某个知识点的历史最好星数（0..3，未得过为 0） */
    getStars(itemId) {
      return state.stars[itemId] || 0;
    },

    /**
     * 记录星数 —— 只升不降。新星数比旧值大才写盘，否则忽略。
     * @param {string} itemId
     * @param {number} n 0..3，越界会被夹到合法范围
     */
    setStars(itemId, n) {
      if (!itemId) return;
      const v = Math.max(0, Math.min(3, Math.round(n)));
      const cur = state.stars[itemId] || 0;
      if (v <= cur) return;
      state.stars[itemId] = v;
      persist();
      emit();
    },

    /**
     * 增加金币，并刷新连续打卡（规格：每次完成新知识点发 +10 金币）。
     *
     * 每日上限：当天累计发币数达到 DAILY_COIN_CAP 后，超出部分不再累加。
     * @param {number} n 金币数，负数/NaN 按 0 处理
     * @returns {number} 实际入账金币（到顶后返回 0，UI 据此弹「今日已达上限」）
     */
    addCoins(n) {
      const amt = Math.max(0, Math.round(n || 0));
      const today = dayStr(0, clock());
      if (state.coinsDay !== today) {
        state.coinsDay = today;
        state.coinsToday = 0;
      }
      const room = Math.max(0, DAILY_COIN_CAP - (state.coinsToday || 0));
      const credited = Math.min(amt, room);
      if (credited > 0) {
        state.coins = (state.coins || 0) + credited;
        state.coinsToday = (state.coinsToday || 0) + credited;
      }
      refreshStreak();
      persist();
      emit();
      return credited;
    },

    /** 当前累计金币 */
    getCoins() {
      return state.coins || 0;
    },

    /** 今天已入账金币（受每日上限约束） */
    coinsToday() {
      return state.coinsToday || 0;
    },

    /** 每日金币上限值，供 UI 显示「今天还能得 X 枚」 */
    dailyCoinCap() {
      return DAILY_COIN_CAP;
    },

    /** 已解锁的徽章 id 列表（副本） */
    badgeIds() {
      return (state.badges || []).slice();
    },

    /** 是否已解锁某徽章 */
    hasBadge(id) {
      return (state.badges || []).includes(id);
    },

    /**
     * 按 BADGE_DEFS 重新评估成就，解锁新达成的徽章并写盘。
     * @returns {Array<{id:string,name:string,desc:string}>} 本次新解锁的徽章（空数组=无新成就）
     */
    evaluateBadges() {
      const have = new Set(state.badges || []);
      const view = { learned: state.learned.length, streak: this.getStreak() };
      const newly = [];
      for (const def of BADGE_DEFS) {
        if (have.has(def.id)) continue;
        if (def.test(view)) {
          state.badges = (state.badges || []).concat(def.id);
          have.add(def.id);
          newly.push({ id: def.id, name: def.name, desc: def.desc });
        }
      }
      if (newly.length > 0) {
        persist();
        emit();
      }
      return newly;
    },

    /**
     * 当前连续打卡天数（结合今天/昨天计算，用于火焰显示）：
     *   - lastDay 是今天或昨天 → streak 仍有效，返回 streak；
     *   - 否则（已断签 / 从未学）→ 返回 0。
     */
    getStreak() {
      const today = dayStr(0, clock());
      if (state.lastDay === today) return state.streak || 0;
      const yesterday = dayStr(-1, clock());
      if (state.lastDay === yesterday) return state.streak || 0;
      return 0;
    },

    /** 星星瓶：所有知识点星数求和 */
    totalStars() {
      return Object.values(state.stars).reduce((a, b) => a + (b || 0), 0);
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