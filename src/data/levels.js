/**
 * data/levels.js — S1–S6 六级认知台阶
 *
 * 六级台阶，判据必须写得出来 —— 定得对不对可以争，
 * 但不能是"感觉这个该放 S3"。下面这套判据就是为此定的。
 *
 * ═══════════════════════════════════════════════════════════════
 * 判据：一级加一个认知动作
 * ═══════════════════════════════════════════════════════════════
 * 每往上一级，孩子要多做一件事。这样定级的好处是可验证：
 * 说得出"这个知识点比那个多做了什么"，就说得出它该在哪级。
 *
 *   S1 感知 —— 认出单个事物。看得见、摸得着，不需要比较。
 *                （牙齿、彩虹、圆形、字母）
 *   S2 辨认 —— 在两个事物之间配对、比较、归类。
 *                （鸟和鱼有什么不同、哪个大、把红色的挑出来）
 *   S3 关联 —— 一个原因引起一个结果，能讲出先后。
 *                （种子为什么会发芽、影子为什么会变）
 *   S4 理解 —— 需要想一步，背后有一条简单原理。
 *                （磁铁为什么吸铁、水为什么会循环）
 *   S5 推理 —— 多步推理，或需要处理看不见的东西。
 *                （传递推理、行星为什么绕太阳、旋转后的样子）
 *   S6 迁移 —— 跨领域综合，或需要背景知识才能理解。
 *                （印刷术为什么改变世界、概率、坐标）
 *
 * ═══════════════════════════════════════════════════════════════
 * 和原来的 3-5 / 6-8 档位是什么关系
 * ═══════════════════════════════════════════════════════════════
 * 旧档位是**年龄**轴（这个内容适合几岁），新级别是**认知**轴（这个内容
 * 要求孩子会做什么）。两者相关但不等价：一个 5 岁孩子可能已经在 S4，
 * 一个 7 岁孩子也可能卡在 S2。
 *
 * 换轴的理由：按年龄筛内容，家长的实际问题是"我孩子能不能看懂"，
 * 而年龄只是这个问题的粗略代理。按认知台阶筛，家长可以直接对着
 * "他现在会不会比较大小"来判断，判据离问题更近。
 *
 * 代价要说清楚：**160 个知识点的级别是这一轮人工标的，不是实测出来的。**
 * 标完的分布是 S1 31 / S2 39 / S3 32 / S4 25 / S5 20 / S6 13，
 * 底部重、顶部轻 —— 这和我们的内容实际相符（3-8 岁产品，本来就偏基础），
 * 不是配平出来的数字。哪个知识点标错了，改 ITEM_LEVELS 里那一行即可。
 */

/** 级别定义。顺序即 UI 上从低到高的展示顺序。 */
export const LEVELS = [
  { id: 'S1', name: '感知', desc: '认出单个事物，看得见摸得着' },
  { id: 'S2', name: '辨认', desc: '在两者之间比较、配对、归类' },
  { id: 'S3', name: '关联', desc: '讲出一件事怎么引起另一件事' },
  { id: 'S4', name: '理解', desc: '想一步，说出背后的简单原理' },
  { id: 'S5', name: '推理', desc: '多步推理，或处理看不见的东西' },
  { id: 'S6', name: '迁移', desc: '跨领域综合，需要背景知识' },
];

export const LEVEL_IDS = LEVELS.map((l) => l.id);

/** 最低 / 最高级别，UI 用来画阶梯 */
export const FIRST_LEVEL = LEVEL_IDS[0];
export const LAST_LEVEL = LEVEL_IDS[LEVEL_IDS.length - 1];

/**
 * 知识点 → 级别。键是知识点 id，值是 S1–S6。
 *
 * 为什么不把 level 写进各领域文件：
 *   分级是**跨领域**的一件事 —— 判断"影子该在 S2"要同时知道英语和逻辑里
 *   什么内容在 S2。集中在一处才能横向比对，散进 6 个文件就比不了了。
 *   领域文件管内容（讲什么），这里管难度（多难），两件事分开。
 *
 * 新增知识点时**必须**在这里补一行，否则校验器会报错
 * （漏了不会崩，但那个知识点会从所有级别视图里消失）。
 */
export const ITEM_LEVELS = {
  /* ── 生活科普 ── */
  'science-tooth': 'S1',
  'science-rainbow': 'S1',
  'science-panda': 'S1',
  'science-snow': 'S1',
  'science-star': 'S1',
  'science-five-senses': 'S1',
  'science-shadow': 'S2',
  'science-bee': 'S2',
  'science-tree': 'S2',
  'science-bird': 'S2',
  'science-fish': 'S2',
  'science-seed': 'S3',
  'science-dinosaur': 'S3',
  'science-insect': 'S3',
  'science-plant': 'S3',
  'science-water-cycle': 'S4',
  'science-magnet': 'S4',
  'science-wind': 'S4',
  'science-daynight': 'S5',
  'science-sound': 'S5',
  'science-heart': 'S5',
  'science-water-states': 'S5',
  'science-gravity': 'S6',
  'science-solar-system': 'S6',

  /* ── 地理军事 ── */
  'geo-mountain': 'S1',
  'geo-moon': 'S1',
  'geo-sun': 'S1',
  'geo-great-wall': 'S2',
  'geo-desert': 'S2',
  'geo-ocean': 'S2',
  'geo-island': 'S2',
  'geo-river': 'S2',
  'geo-lake': 'S2',
  'geo-forest': 'S2',
  'geo-lighthouse': 'S3',
  'geo-waterfall': 'S3',
  'geo-cloud': 'S3',
  'geo-compass': 'S4',
  'geo-volcano': 'S4',
  'geo-seasons': 'S4',
  'geo-cave': 'S4',
  'geo-grassland': 'S4',
  'geo-signal': 'S5',
  'geo-earthquake': 'S5',
  'geo-glacier': 'S5',
  'geo-planets': 'S5',
  'geo-canyon': 'S5',
  'geo-polar': 'S6',

  /* ── 人文科技 ── */
  'culture-music-instrument': 'S1',
  'culture-house': 'S2',
  'culture-boat': 'S2',
  'culture-bulb': 'S3',
  'culture-bridge': 'S3',
  'culture-wheel': 'S3',
  'culture-phone': 'S3',
  'culture-submarine': 'S3',
  'culture-train': 'S3',
  'culture-pottery': 'S3',
  'culture-money': 'S3',
  'culture-bicycle': 'S3',
  'culture-car': 'S3',
  'culture-paper': 'S4',
  'culture-clock': 'S4',
  'culture-plane': 'S4',
  'culture-telescope': 'S4',
  'culture-camera': 'S4',
  'culture-rocket': 'S5',
  'culture-computer': 'S5',
  'culture-printing': 'S6',
  'culture-steam': 'S6',
  'culture-gunpowder': 'S6',
  'culture-bronze': 'S6',

  /* ── 逻辑思维 ── */
  'logic-counting': 'S1',
  'logic-cardinal': 'S1',
  'logic-compare': 'S2',
  'logic-classify': 'S2',
  'logic-correspondence': 'S2',
  'logic-odd-one-out': 'S2',
  'logic-pattern': 'S3',
  'logic-timeline': 'S3',
  'logic-sorting': 'S3',
  'logic-maze': 'S3',
  'logic-tangram': 'S3',
  'logic-conservation': 'S4',
  'logic-cause': 'S4',
  'logic-partwhole': 'S4',
  'logic-estimation': 'S4',
  'logic-include': 'S5',
  'logic-analogy': 'S5',
  'logic-graph': 'S5',
  'logic-transitive': 'S6',
  'logic-deduction': 'S6',
  'logic-probability': 'S6',
  'logic-code': 'S6',

  /* ── 空间思维 ── */
  'space-circle': 'S1',
  'space-triangle': 'S1',
  'space-rectangle': 'S1',
  'space-left-right': 'S1',
  'space-cube': 'S2',
  'space-directions': 'S2',
  'space-nest': 'S2',
  'space-path': 'S2',
  'space-cylinder': 'S2',
  'space-front-back': 'S2',
  'space-far-near': 'S2',
  'space-blocks': 'S2',
  'space-symmetry': 'S3',
  'space-fold': 'S3',
  'space-mirror': 'S3',
  'space-map': 'S4',
  'space-jigsaw': 'S4',
  'space-viewpoint': 'S4',
  'space-rotate': 'S5',
  'space-grid': 'S5',
  'space-measurement': 'S5',
  'space-coordinates': 'S6',

  /* ── 英语 ── */
  'english-letters': 'S1',
  'english-colors': 'S1',
  'english-numbers': 'S1',
  'english-animals': 'S1',
  'english-body': 'S1',
  'english-family': 'S1',
  'english-fruits': 'S1',
  'english-food': 'S2',
  'english-weather': 'S2',
  'english-actions': 'S2',
  'english-greetings': 'S2',
  'english-clothes': 'S2',
  'english-toys': 'S2',
  'english-nature': 'S2',
  'english-school': 'S3',
  'english-transport': 'S3',
  'english-jobs': 'S3',
  'english-sports': 'S3',
  'english-phonics': 'S4',
  'english-sentences': 'S4',
  'english-prepositions': 'S4',
  'english-questions': 'S4',
  'english-time': 'S5',
  'english-adjectives': 'S5',
  'english-verbs': 'S5',
  'english-festivals': 'S6',

  /* ── 美术（新增原创） ── */
  'art-red': 'S1',
  'art-blue': 'S1',
  'art-yellow': 'S1',
  'art-lines': 'S2',
  'art-finger-paint': 'S2',
  'art-color-mix': 'S3',

  /* ── 写字（新增原创） ── */
  'writing-hold': 'S1',
  'writing-pose': 'S1',
  'writing-dian': 'S1',
  'writing-heng': 'S2',
  'writing-ri': 'S2',
  'writing-shan': 'S3',

  /* ── 音乐（新增原创；culture-music-instrument 已在 S1） ── */
  'music-loud-soft': 'S1',
  'music-drum': 'S1',
  'music-fast-slow': 'S2',
  'music-song': 'S2',
  'music-xylophone': 'S3',
  'music-echo': 'S4',
};

/** 级别是否合法 */
export function isValidLevel(level) {
  return LEVEL_IDS.includes(level);
}

/** 级别的展示名，取不到就原样返回 id，不要显示 undefined */
export function levelName(level) {
  const hit = LEVELS.find((l) => l.id === level);
  return hit ? hit.name : level;
}

/** 级别的完整标签，如「S1 感知」 */
export function levelLabel(level) {
  const hit = LEVELS.find((l) => l.id === level);
  return hit ? `${hit.id} ${hit.name}` : level;
}

/** 取某个知识点的级别，没标过返回 null（校验器会拦） */
export function levelOf(itemId) {
  return ITEM_LEVELS[itemId] || null;
}

/** 级别在阶梯上的序号，S1=0 … S6=5。用于排序与进度计算 */
export function levelIndex(level) {
  return LEVEL_IDS.indexOf(level);
}
