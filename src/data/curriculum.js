/**
 * data/curriculum.js — 「7 板块 × S1–S6 × 模块」课程矩阵（唯一来源）
 *
 * ═══════════════════════════════════════════════════════════════
 * 为什么这个文件存在
 * ═══════════════════════════════════════════════════════════════
 * item 本身仍在原 science/geo/culture/... 文件里，字段一字未改。
 * 本文件只做两件事：
 *   1. 把 142 个现有知识点 + 18 个新增知识点，按「板块 / 模块」归属；
 *   2. 用 levels.js 的人工分级（S1–S6）决定每个知识点落在哪个阶段。
 *
 * 阶段（stage）为什么不在这里重新定
 *   levels.js 的 ITEM_LEVELS 已经对 142 个现有知识点做过一次成体系的人工标定
 *   （S1 感知 → S6 迁移，判据见 levels.js 头注）。这里直接复用 levelOf()，
 *   不另起一套分级，避免两个地方对同一个知识点给出不同阶段。
 *   新增的 18 个知识点在 levels.js 里补了对应级别。
 *
 * 现有知识点 → 板块归属（逐点）
 *   科学 science = science.* + geo.*            （48）
 *   思维 thinking = logic.* + space.*          （44）
 *   英语 english = english.*                   （26）
 *   阅读 reading = culture.* 除乐器            （23）
 *   音乐 music = culture-music-instrument + music.*（1+6）
 *   美术 art = art.*                           （6）
 *   写字 writing = writing.*                   （6）
 *   合计 160 = 142 现有 + 18 新增。
 *
 * 特殊归属：culture-music-instrument「乐器」
 *   它的 item 文件仍在 culture.js（id、TTS、绘本图一律不变），
 *   但在课程树里挂到「音乐」板块·「乐器朋友」模块 —— 这是规格唯一要求的跨板块搬家。
 *
 * 空阶段处理
 *   每个板块都暴露 S1–S6 六个阶段 tab。某阶段没有知识点时，该阶段 modules 为空，
 *   UI 渲染「准备中」，绝不白屏。
 */

import { LEVELS, levelOf } from './levels.js';

/* ═══════════════════════════════════════════════════════════════
 * 板块元数据（顺序即首页顺序）
 * ═══════════════════════════════════════════════════════════════ */

export const SECTIONS = [
  { id: 'science',  name: '科学', accent: '#3D8FC7', tagline: '认识身边的世界',   icon: 'science' },
  { id: 'thinking', name: '思维', accent: '#7C5CBF', tagline: '找规律想明白',     icon: 'thinking' },
  { id: 'english',  name: '英语', accent: '#2E9BC7', tagline: '学另一种说法',     icon: 'english' },
  { id: 'reading',  name: '阅读', accent: '#E8843C', tagline: '读懂一个故事',     icon: 'reading' },
  { id: 'art',      name: '美术', accent: '#E86A8A', tagline: '把想法画出来',     icon: 'art' },
  { id: 'writing',  name: '写字', accent: '#B5774A', tagline: '一笔一划写清楚',   icon: 'writing' },
  { id: 'music',    name: '音乐', accent: '#E8B53C', tagline: '听见节奏旋律',     icon: 'music' },
];

/* ═══════════════════════════════════════════════════════════════
 * 模块骨架。goal 每条 ≤20 字，直接上模块卡。
 * ═══════════════════════════════════════════════════════════════ */

const MODULES = {
  /* ── 科学 ── */
  phenom:  { name: '自然现象',   goal: ['认出常见天气和光', '知道身边的小实验', '说出现象的缘由'] },
  life:    { name: '动物植物',   goal: ['认识常见动植物', '知道它们住在哪', '观察生长变化'] },
  body:    { name: '身体与生命', goal: ['了解自己的身体', '知道感官的用处', '养成护牙护眼习惯'] },
  earth:   { name: '地球与地貌', goal: ['认得山川海洋', '了解地图和方位', '听说地质灾害'] },
  cosmos:  { name: '太空与宇宙', goal: ['认识太阳月亮星星', '知道行星绕太阳', '对宇宙产生好奇'] },

  /* ── 思维 ── */
  number:  { name: '数感与运算', goal: ['数数和比多少', '理解一一对应', '尝试简单估算'] },
  shape:   { name: '图形与空间', goal: ['认出基本形状', '辨别方位和对称', '在脑中旋转物体'] },
  logic:   { name: '逻辑与规律', goal: ['发现排列规律', '学会分类排序', '做简单推理'] },
  practice:{ name: '生活与实践', goal: ['分清前后左右', '看懂简单图表', '按时间顺序做事'] },
  puzzle:  { name: '动手与益智', goal: ['走迷宫拼图', '玩七巧板积木', '破解小密码'] },
  memory:  { name: '视听与记忆', goal: ['找出不同之处', '记住看到的细节', '锻炼观察力'] },

  /* ── 英语 ── */
  alpha:   { name: '字母与拼读', goal: ['认字母发音', '尝试自然拼读', '见字能读个大概'] },
  vocab:   { name: '日常词汇',   goal: ['说身边的单词', '听懂常用词', '积累听说量'] },
  sentence:{ name: '句子与表达', goal: ['学说简单短句', '会打招呼提问', '用英语表达想法'] },

  /* ── 阅读 ── */
  invention:{ name: '伟大发明',  goal: ['认识改变生活的发明', '知道谁发明了什么', '体会发明的用处'] },
  craft:    { name: '工艺与文明', goal: ['认识陶瓷青铜', '了解四大发明', '感受古人的智慧'] },
  story:    { name: '身边的故事', goal: ['认识日常物品', '知道它们的由来', '看懂生活里的发明'] },

  /* ── 美术 ── */
  color:   { name: '认识颜色',   goal: ['认出常见颜色', '知道颜色会变化', '大胆用色'] },
  line:    { name: '线条与形状', goal: ['画直直弯弯的线', '用线条画东西', '感受线条变化'] },
  doodle:  { name: '涂鸦与创作', goal: ['开心地涂涂画画', '用手指印画画', '画出自己的想象'] },

  /* ── 写字 ── */
  grip:    { name: '握笔与姿势', goal: ['学会正确握笔', '坐直了写字', '在田字格里练习'] },
  stroke:  { name: '基本笔画',   goal: ['会写点和横', '看清笔画方向', '把笔画写端正'] },
  hanzi:   { name: '认识汉字',   goal: ['看懂象形字', '会认日和月', '感受汉字的样子'] },

  /* ── 音乐 ── */
  sound:   { name: '认识声音',   goal: ['分辨声音大小', '感受声音快慢', '听说回声现象'] },
  instrument:{ name: '乐器朋友', goal: ['认识常见乐器', '会敲小鼓木琴', '听出乐器的声音'] },
  rhythm:  { name: '节奏与儿歌', goal: ['跟着节奏拍手', '学唱简单儿歌', '感受音乐的快慢'] },
};

/* ═══════════════════════════════════════════════════════════════
 * 知识点 → 模块。板块归属由前缀推导，这里只标模块。
 * ═══════════════════════════════════════════════════════════════ */

const ITEM_MODULE = {
  /* 科学 · 自然现象 */
  'science-shadow': 'phenom', 'science-rainbow': 'phenom', 'science-snow': 'phenom',
  'science-water-cycle': 'phenom', 'science-magnet': 'phenom', 'science-wind': 'phenom',
  'science-daynight': 'phenom', 'science-sound': 'phenom', 'science-water-states': 'phenom',
  'science-gravity': 'phenom', 'geo-seasons': 'phenom', 'geo-cloud': 'phenom',
  /* 科学 · 动物植物 */
  'science-seed': 'life', 'science-bee': 'life', 'science-panda': 'life', 'science-tree': 'life',
  'science-dinosaur': 'life', 'science-insect': 'life', 'science-bird': 'life',
  'science-fish': 'life', 'science-plant': 'life',
  /* 科学 · 身体与生命 */
  'science-tooth': 'body', 'science-five-senses': 'body', 'science-heart': 'body',
  /* 科学 · 地球与地貌 */
  'geo-mountain': 'earth', 'geo-desert': 'earth', 'geo-ocean': 'earth', 'geo-island': 'earth',
  'geo-river': 'earth', 'geo-lake': 'earth', 'geo-forest': 'earth', 'geo-lighthouse': 'earth',
  'geo-waterfall': 'earth', 'geo-compass': 'earth', 'geo-volcano': 'earth', 'geo-cave': 'earth',
  'geo-grassland': 'earth', 'geo-signal': 'earth', 'geo-earthquake': 'earth',
  'geo-glacier': 'earth', 'geo-canyon': 'earth', 'geo-polar': 'earth', 'geo-great-wall': 'earth',
  /* 科学 · 太空与宇宙 */
  'science-star': 'cosmos', 'science-solar-system': 'cosmos', 'geo-moon': 'cosmos',
  'geo-sun': 'cosmos', 'geo-planets': 'cosmos',

  /* 思维 · 数感与运算 */
  'logic-compare': 'number', 'logic-counting': 'number', 'logic-correspondence': 'number',
  'logic-conservation': 'number', 'logic-cardinal': 'number', 'logic-partwhole': 'number',
  'logic-estimation': 'number', 'space-measurement': 'number',
  /* 思维 · 图形与空间 */
  'space-cube': 'shape', 'space-symmetry': 'shape', 'space-circle': 'shape', 'space-fold': 'shape',
  'space-mirror': 'shape', 'space-rotate': 'shape', 'space-nest': 'shape', 'space-cylinder': 'shape',
  'space-grid': 'shape', 'space-viewpoint': 'shape', 'space-triangle': 'shape',
  'space-rectangle': 'shape', 'space-coordinates': 'shape',
  /* 思维 · 逻辑与规律 */
  'logic-pattern': 'logic', 'logic-classify': 'logic', 'logic-include': 'logic',
  'logic-transitive': 'logic', 'logic-cause': 'logic', 'logic-analogy': 'logic',
  'logic-sorting': 'logic', 'logic-deduction': 'logic', 'logic-probability': 'logic',
  /* 思维 · 生活与实践 */
  'logic-timeline': 'practice', 'logic-graph': 'practice', 'space-directions': 'practice',
  'space-map': 'practice', 'space-left-right': 'practice', 'space-front-back': 'practice',
  'space-far-near': 'practice',
  /* 思维 · 动手与益智 */
  'logic-maze': 'puzzle', 'logic-tangram': 'puzzle', 'logic-code': 'puzzle',
  'space-path': 'puzzle', 'space-jigsaw': 'puzzle', 'space-blocks': 'puzzle',
  /* 思维 · 视听与记忆 */
  'logic-odd-one-out': 'memory',

  /* 英语 · 字母与拼读 */
  'english-letters': 'alpha', 'english-phonics': 'alpha',
  /* 英语 · 日常词汇 */
  'english-colors': 'vocab', 'english-numbers': 'vocab', 'english-animals': 'vocab',
  'english-body': 'vocab', 'english-family': 'vocab', 'english-food': 'vocab',
  'english-weather': 'vocab', 'english-actions': 'vocab', 'english-greetings': 'vocab',
  'english-clothes': 'vocab', 'english-toys': 'vocab', 'english-school': 'vocab',
  'english-fruits': 'vocab', 'english-transport': 'vocab', 'english-jobs': 'vocab',
  'english-sports': 'vocab', 'english-nature': 'vocab',
  /* 英语 · 句子与表达 */
  'english-sentences': 'sentence', 'english-prepositions': 'sentence',
  'english-questions': 'sentence', 'english-time': 'sentence', 'english-adjectives': 'sentence',
  'english-verbs': 'sentence', 'english-festivals': 'sentence',

  /* 阅读 · 伟大发明 */
  'culture-bulb': 'invention', 'culture-wheel': 'invention', 'culture-phone': 'invention',
  'culture-plane': 'invention', 'culture-computer': 'invention', 'culture-train': 'invention',
  'culture-telescope': 'invention', 'culture-rocket': 'invention', 'culture-steam': 'invention',
  'culture-submarine': 'invention',
  /* 阅读 · 工艺与文明 */
  'culture-bridge': 'craft', 'culture-paper': 'craft', 'culture-clock': 'craft',
  'culture-printing': 'craft', 'culture-gunpowder': 'craft', 'culture-pottery': 'craft',
  'culture-bronze': 'craft', 'culture-money': 'craft',
  /* 阅读 · 身边的故事 */
  'culture-house': 'story', 'culture-boat': 'story', 'culture-bicycle': 'story',
  'culture-car': 'story', 'culture-camera': 'story',

  /* 音乐（含从文化板块迁入的「乐器」） */
  'culture-music-instrument': 'instrument', 'music-drum': 'instrument', 'music-xylophone': 'instrument',
  'music-loud-soft': 'sound', 'music-echo': 'sound',
  'music-fast-slow': 'rhythm', 'music-song': 'rhythm',

  /* 美术 */
  'art-red': 'color', 'art-blue': 'color', 'art-yellow': 'color', 'art-color-mix': 'color',
  'art-lines': 'line', 'art-finger-paint': 'doodle',

  /* 写字 */
  'writing-hold': 'grip', 'writing-pose': 'grip', 'writing-dian': 'stroke', 'writing-heng': 'stroke',
  'writing-ri': 'hanzi', 'writing-shan': 'hanzi',
};

/** 板块 → 该板块的知识点 id 列表（读起来不用关心前缀规则）。 */
function sectionItemIds(sectionId) {
  const ids = Object.keys(ITEM_MODULE).filter((id) => sectionOfItemId(id) === sectionId);
  return ids.sort();
}

/** 知识点属于哪个板块。前缀推导 + 乐器唯一特例。非字符串入参一律返回 null（不抛）。 */
function sectionOfItemId(itemId) {
  if (typeof itemId !== 'string' || itemId.length === 0) return null;
  if (itemId === 'culture-music-instrument') return 'music'; // 规格唯一的跨板块搬家
  if (itemId.startsWith('science-') || itemId.startsWith('geo-')) return 'science';
  if (itemId.startsWith('logic-') || itemId.startsWith('space-')) return 'thinking';
  if (itemId.startsWith('english-')) return 'english';
  if (itemId.startsWith('culture-')) return 'reading';
  if (itemId.startsWith('music-')) return 'music';
  if (itemId.startsWith('art-')) return 'art';
  if (itemId.startsWith('writing-')) return 'writing';
  return null;
}

/* ═══════════════════════════════════════════════════════════════
 * 由上面的映射物化出 CURRICULUM 树
 * ═══════════════════════════════════════════════════════════════ */

/** 阶段标题与描述（每个板块共用一套，按级别名展开）。 */
function stageTitle(stageId, index) {
  const lv = LEVELS[index];
  return {
    id: stageId,
    title: `${stageId} · ${lv.name}`,
    desc: lv.desc,
  };
}

function buildTree() {
  const tree = {};
  for (const section of SECTIONS) {
    const ids = sectionItemIds(section.id);
    const stages = LEVELS.map((lv, i) => {
      const base = stageTitle(lv.id, i);
      // 该阶段里、按模块归组
      const byModule = new Map();
      for (const id of ids) {
        if (levelOf(id) !== lv.id) continue;
        const modId = ITEM_MODULE[id];
        if (!byModule.has(modId)) byModule.set(modId, []);
        byModule.get(modId).push(id);
      }
      const modules = [...byModule.entries()].map(([modId, mitems]) => ({
        id: modId,
        name: MODULES[modId].name,
        goal: MODULES[modId].goal,
        items: mitems,
      }));
      return { ...base, modules };
    });
    tree[section.id] = { stages };
  }
  return tree;
}

export const CURRICULUM = buildTree();

/* ═══════════════════════════════════════════════════════════════
 * 查询 API（签名冻结）
 * ═══════════════════════════════════════════════════════════════ */

export function listSections() {
  return SECTIONS;
}

export function getSection(sectionId) {
  return SECTIONS.find((s) => s.id === sectionId) || null;
}

export function listStages(sectionId) {
  const sec = CURRICULUM[sectionId];
  return sec ? sec.stages : [];
}

export function listModules(sectionId, stageId) {
  const stage = listStages(sectionId).find((s) => s.id === stageId);
  return stage ? stage.modules : [];
}

export function listItemsInModule(sectionId, stageId, moduleId) {
  const mod = listModules(sectionId, stageId).find((m) => m.id === moduleId);
  return mod ? mod.items.slice() : [];
}

/** 反查一个知识点落在哪：{section, stage, module} 或 null。 */
export function locateItem(itemId) {
  const sectionId = sectionOfItemId(itemId);
  if (!sectionId) return null;
  for (const stage of CURRICULUM[sectionId].stages) {
    for (const mod of stage.modules) {
      if (mod.items.includes(itemId)) {
        return { section: sectionId, stage: stage.id, module: mod.id };
      }
    }
  }
  return null;
}

/** 全部已落位知识点 id（Set）。 */
export function mappedItemIds() {
  return new Set(Object.keys(ITEM_MODULE));
}

/**
 * 板块统计。learned 由 store.has(itemId) 判断（只读，不依赖任何 UI）。
 */
export function sectionStats(sectionId) {
  const ids = sectionItemIds(sectionId);
  return { total: ids.length, ids };
}

/**
 * 模块进度。store 只做只读读取：有 has(itemId) 就算学过。
 * 不传 store 时 total 照常算，done 为 0。
 */
export function moduleProgress(sectionId, stageId, moduleId, store) {
  const items = listItemsInModule(sectionId, stageId, moduleId);
  const total = items.length;
  let done = 0;
  if (store && typeof store.has === 'function') {
    for (const id of items) if (store.has(id)) done += 1;
  }
  return { done, total };
}
