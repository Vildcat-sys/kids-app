// extract_contract.mjs — 提取缺口音频的精确台词文本，供语音子任务使用
import { writeFileSync } from 'node:fs';
import { TOPICS } from '../src/data/index.js';

const items = new Map();
for (const t of TOPICS) for (const it of t.items) items.set(it.id, it);

// 审计出的真实缺口（排除 3-5 / 6-8 非知识点 id）
const NARR_MISSING = [
  'english-adjectives-1','english-adjectives-2','english-adjectives-3',
  'english-festivals-0','english-festivals-1','english-festivals-2','english-festivals-3',
  'english-jobs-0','english-jobs-1','english-jobs-2','english-jobs-3',
  'english-nature-0','english-nature-1','english-nature-2','english-nature-3',
  'english-sports-0','english-sports-1','english-sports-2','english-sports-3',
  'english-transport-3',
  'english-verbs-0','english-verbs-1','english-verbs-2','english-verbs-3',
];

const QUIZ_MISSING_IDS = [
  'english-actions','english-adjectives','english-animals','english-body','english-clothes','english-colors',
  'english-family','english-festivals','english-food','english-fruits','english-greetings','english-jobs',
  'english-letters','english-nature','english-numbers','english-phonics','english-prepositions','english-questions',
  'english-school','english-sentences','english-sports','english-time','english-toys','english-transport',
  'english-verbs','english-weather',
  'geo-canyon','geo-cloud','geo-earthquake','geo-forest','geo-glacier','geo-grassland','geo-island','geo-lake',
  'geo-lighthouse','geo-moon','geo-planets','geo-polar','geo-river','geo-sun','geo-waterfall',
  'logic-analogy','logic-cardinal','logic-cause','logic-code','logic-deduction','logic-estimation','logic-graph',
  'logic-include','logic-maze','logic-odd-one-out','logic-partwhole','logic-probability','logic-sorting',
  'logic-tangram','logic-transitive',
  'science-tree',
  'space-blocks','space-circle','space-coordinates','space-cube','space-cylinder','space-directions',
  'space-far-near','space-fold','space-front-back','space-grid','space-jigsaw','space-left-right','space-map',
  'space-measurement','space-mirror','space-nest','space-path','space-rectangle','space-rotate','space-symmetry',
  'space-triangle','space-viewpoint',
];

const GUIDE = { choice: '请你选一选', order: '按顺序排一排', match: '把它们连一连' };

const out = [];
out.push('===== NARR 缺口（24 段）=====');
for (const key of NARR_MISSING) {
  const [id, p] = key.split(/-(\d)$/);
  const it = items.get(id);
  if (!it) { out.push(`!! 找不到知识点 ${id}`); continue; }
  const facts = it.facts || [];
  const pages = [`${it.name}。${it.lead}`, facts[0]||'', facts[1]||'', facts[2]||''];
  out.push(`\n--- narr/${key}.mp3 ---`);
  out.push(`TEXT: ${pages[+p]}`);
}

out.push('\n\n===== QUIZ 缺口（按 type 分流）=====');
const quizToDo = [];
const listenWords = [];
for (const id of QUIZ_MISSING_IDS) {
  const it = items.get(id);
  if (!it) { out.push(`!! 找不到知识点 ${id}`); continue; }
  const q = it.quiz || {};
  if (q.type === 'listen') {
    const w = (q.word||'').trim().toLowerCase().replace(/\s+/g,'-');
    listenWords.push({ id, word: q.word, key: w, zh: q.zh });
    out.push(`[LISTEN 跳过quiz] ${id} word=${q.word} -> word/${w}.mp3`);
  } else {
    const guide = GUIDE[q.type] || '请你听题';
    const script = `${q.q}。${guide}`;
    quizToDo.push({ id, type: q.type, script });
    out.push(`[QUIZ ${q.type}] quiz/${id}.mp3`);
    out.push(`  TEXT: ${script}`);
  }
}

out.push('\n\n===== 汇总 =====');
out.push(`NARR 待做: ${NARR_MISSING.length}`);
out.push(`QUIZ 待做(choice/order/match): ${quizToDo.length}`);
out.push(`LISTEN 跳过 quiz 共 ${listenWords.length} 个，需 word 音频: ${listenWords.map(w=>w.key).join(', ')}`);

writeFileSync('D:/Wordbuddy-Demo/kids-app/tools/_audio_contract.txt', out.join('\n'), 'utf8');
console.log(out.join('\n'));
