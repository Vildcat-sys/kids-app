// extract_full.mjs — 全量重做契约：输出 narr/quiz/word/voice 全部待做段
import { writeFileSync } from 'node:fs';
import { TOPICS } from '../src/data/index.js';

const items = [];
for (const t of TOPICS) for (const it of t.items) items.push(it);

// 已通过确认包、不重做
const DONE_NARR = new Set(['english-festivals-0','english-festivals-1','english-festivals-2','english-festivals-3',
  'science-dinosaur-0','science-dinosaur-1','science-dinosaur-2','science-dinosaur-3']);
const DONE_QUIZ = new Set(['english-festivals']);
const DONE_WORD = new Set(['cat']);
const DONE_VOICE = new Set(['praise1']);

const GUIDE = { choice:'请你选一选', order:'按顺序排一排', match:'把它们连一连' };
const hasEN = s => /[A-Za-z]/.test(s);

let narr=[];   // {path, text, en}
let quiz=[];   // {path, text, en}
let words=[];  // {path, word}
let voice=[];  // {path, text}

for (const it of items) {
  const facts = it.facts || [];
  const pages = [`${it.name}。${it.lead}`, facts[0]||'', facts[1]||'', facts[2]||''];
  for (let p=0;p<4;p++){
    const key = `${it.id}-${p}`;
    if (DONE_NARR.has(key)) continue;
    narr.push({path:`src/audio/narr/${key}.mp3`, text:pages[p], en:hasEN(pages[p])});
  }
  const q = it.quiz||{};
  if (q.type && q.type!=='listen') {
    if (DONE_QUIZ.has(it.id)) continue;
    const script = `${q.q}。${GUIDE[q.type]||'请你听题'}`;
    quiz.push({path:`src/audio/quiz/${it.id}.mp3`, text:script, en:hasEN(script)});
  }
}

// word：汇总所有 listen 题的 word（去重）
const wordSet = new Map();
for (const it of items){
  const q=it.quiz||{};
  if (q.type==='listen' && q.word){
    const w=String(q.word).trim();
    const key=w.toLowerCase().replace(/\s+/g,'-');
    if (!wordSet.has(key)) wordSet.set(key,w);
  }
}
for (const [key,w] of wordSet){
  if (DONE_WORD.has(key)) continue;
  words.push({path:`src/audio/word/${key}.mp3`, word:w});
}

// voice
const PRAISE=['答对啦！你真聪明，太棒了！','好厉害呀，又学会了一个新知识！','答对啦，给你点一个大大的赞！','哇，你真是个小小科学家！'];
const ENCOURAGE=['哎呀，差一点点哦，别着急，再试一次，你一定可以的！','没关系，再想一想，你可以的！','哎呀，差一点点哦，别着急，再试一次！','没关系，错了也不怕，我们再听一遍！'];
PRAISE.forEach((t,i)=>{ const f=`praise${i+1}`; if(!DONE_VOICE.has(f)) voice.push({path:`src/audio/voice/${f}.mp3`, text:t}); });
ENCOURAGE.forEach((t,i)=>{ const f=`encourage${i+1}`; if(!DONE_VOICE.has(f)) voice.push({path:`src/audio/voice/${f}.mp3`, text:t}); });

console.log(`narr=${narr.length} quiz=${quiz.length} word=${words.length} voice=${voice.length} total=${narr.length+quiz.length+words.length+voice.length}`);

// 按主题分组 narr，便于切片
function topicOf(path){ return path.split('/').pop().split('-').slice(0,-1).join('-').replace(/-\d+$/,''); }
// 实际用 itemId 前缀
const byTopic = {};
for (const n of narr){
  const id = n.path.match(/narr\/(.+)-\d\.mp3$/)[1];
  const top = id.split('-')[0]; // science/geo/culture/logic/space/english
  (byTopic[top]=byTopic[top]||[]).push(n);
}
console.log('narr by topic:', Object.fromEntries(Object.entries(byTopic).map(([k,v])=>[k,v.length])));

// 写三个契约文件：
// A: narr science+geo+culture
// B: narr logic+space+english
// C: quiz all + word + voice
function fmt(rows, isWord=false){
  return rows.map(r=>{
    const tag = r.en ? 'EN' : 'ZH';
    if (isWord) return `WORD\t${r.path}\t${r.word}`;
    return `${tag}\t${r.path}\t${r.text}`;
  }).join('\n');
}
const A = byTopic['science'].concat(byTopic['geo'], byTopic['culture']);
const B = byTopic['logic'].concat(byTopic['space'], byTopic['english']);
writeFileSync('D:/Wordbuddy-Demo/kids-app/tools/_full_A.txt', fmt(A),'utf8');
writeFileSync('D:/Wordbuddy-Demo/kids-app/tools/_full_B.txt', fmt(B),'utf8');
const C = quiz.map(r=>`${r.en?'EN':'ZH'}\t${r.path}\t${r.text}`).join('\n') + '\n'
  + words.map(w=>`WORD\t${w.path}\t${w.word}`).join('\n') + '\n'
  + voice.map(v=>`ZH\t${v.path}\t${v.text}`).join('\n');
writeFileSync('D:/Wordbuddy-Demo/kids-app/tools/_full_C.txt', C, 'utf8');
console.log(`A(narr sci+geo+culture)=${A.length}  B(narr logic+space+english)=${B.length}  C(quiz+word+voice)=${quiz.length+words.length+voice.length}`);
