/**
 * data/sections.js — 七大内容板块
 *
 * 七大板块：科学 / 思维 / 英语 / 阅读 / 美术 / 写字 / 音乐。
 *
 * ═══════════════════════════════════════════════════════════════
 * 板块 → 领域归属
 * ═══════════════════════════════════════════════════════════════
 *   科学 science   = science.js + geo.js
 *   思维 thinking  = logic.js + space.js
 *   英语 english   = english.js
 *   阅读 reading   = culture.js（人文/发明/工艺故事）
 *   美术 art       = art.js（新增原创）
 *   写字 writing   = writing.js（新增原创）
 *   音乐 music     = music.js（新增原创）
 *
 * 唯一例外：culture-music-instrument「乐器」这个 item 仍住在 culture.js，
 * 但在课程树（curriculum.js）里挂到「音乐」板块·「乐器朋友」模块。
 * 这里的 topics 是**领域级**归属，item 级搬家由 curriculum.js 负责。
 */

/**
 * 板块定义。顺序即首页展示顺序（规格：科学/思维/英语/阅读/美术/写字/音乐）。
 * topics 存领域 id 而非对象 —— 避免和 TOPICS 形成循环引用。
 */
export const SECTIONS = [
  {
    id: 'science',
    name: '科学',
    tagline: '认识身边的世界',
    accent: '#3D8FC7',
    topics: ['science', 'geo'],
  },
  {
    id: 'thinking',
    name: '思维',
    tagline: '找规律，想明白',
    accent: '#7C5CBF',
    topics: ['logic', 'space'],
  },
  {
    id: 'english',
    name: '英语',
    tagline: '学会另一种说法',
    accent: '#2E9BC7',
    topics: ['english'],
  },
  {
    id: 'reading',
    name: '阅读',
    tagline: '读懂一个故事',
    accent: '#E8843C',
    topics: ['culture'],
  },
  {
    id: 'art',
    name: '美术',
    tagline: '把想法画出来',
    accent: '#E86A8A',
    topics: ['art'],
  },
  {
    id: 'writing',
    name: '写字',
    tagline: '一笔一划写清楚',
    accent: '#B5774A',
    topics: ['writing'],
  },
  {
    id: 'music',
    name: '音乐',
    tagline: '听见节奏和旋律',
    accent: '#E8B53C',
    topics: ['music'],
  },
];

/**
 * 空板块的统一文案（保留接口，当前 7 个板块均已上线）。
 */
export const PLANNED_COPY = {
  title: '正在做，敬请期待',
  body: '这个方向我们还在准备内容。做好之前不会放半成品进来。',
};

/** 按 id 找板块 */
export function findSection(sectionId) {
  return SECTIONS.find((s) => s.id === sectionId) || null;
}

/** 有内容的板块 */
export function activeSections() {
  return SECTIONS.filter((s) => !s.planned && s.topics.length > 0);
}

/** 规划中的板块 */
export function plannedSections() {
  return SECTIONS.filter((s) => s.planned);
}

/** 板块是否规划中 */
export function isPlanned(sectionId) {
  const s = findSection(sectionId);
  return Boolean(s && s.planned);
}
