/**
 * check-reach.mjs — 死代码与离线清单闸
 *
 * 查两件机器能查、人眼查不出来的事：
 *
 *   1. **入口可达性**：从 `index.html` + `src/main.js` 出发，遍历 import 图，
 *      找出「磁盘上有、但没人 import」的源文件。
 *      这类文件不会报错、不会白屏，只会一直躺在那里被人改、被人读、被人当成活的。
 *
 *   2. **sw.js 的 ASSETS 双向核对**：
 *        · 登记 → 存在   登记的路径在磁盘上还在吗？
 *        · 存在 → 登记   每个 src 文件都登记了吗？（漏了 = 离线时拿不到）
 *      只查单向会漏 —— 删文件忘摘 ASSETS 时，单向检查全绿，
 *      而运行时 `cache.add()` 失败又被 `.catch(() => null)` 吞掉。
 *
 * 退出码：0 = 干净；1 = 有发现。
 *
 * 用法：npm run check:reach
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (rel) => path.join(ROOT, rel);
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

/* ─────────────── 收集 src 下的全部 .js ─────────────── */

const srcFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) srcFiles.push(rel(p));
  }
})(at('src'));
srcFiles.sort();

/* ─────────────── 入口 ─────────────── */

const entries = [];
if (fs.existsSync(at('src/main.js'))) entries.push('src/main.js');

const html = fs.readFileSync(at('index.html'), 'utf8');
for (const m of html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)) {
  entries.push(m[1].replace(/^\.\//, ''));
}

/* index.html 里往往就是引 src/main.js，会和上面那条重复 —— 去重，否则报告里会出现两次 */
const uniq = [...new Set(entries)];

if (uniq.length === 0) {
  console.error('找不到任何入口（index.html 里没有 <script src>，也没有 src/main.js）');
  process.exit(1);
}

/* ─────────────── 遍历 import 图 ─────────────── */

const seen = new Set();   // 可达的文件（相对根路径）
const missing = new Set(); // 被 import 但不存在

const queue = [...uniq];
while (queue.length) {
  const f = queue.pop();
  if (!f || seen.has(f) || missing.has(f)) continue;
  if (!fs.existsSync(at(f))) {
    missing.add(f);
    continue;
  }
  seen.add(f);

  const src = fs.readFileSync(at(f), 'utf8');
  const dir = path.posix.dirname(f);
  // 只跟相对路径；裸模块名（本项目为零依赖，理论上不该有）跳过
  for (const m of src.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) {
    queue.push(path.posix.normalize(path.posix.join(dir, m[1])));
  }
}

const unreachable = srcFiles.filter((f) => !seen.has(f));

/* ─────────────── sw.js 的 ASSETS 双向核对 ─────────────── */

const swPath = at('sw.js');
let swRegistered = [];   // ASSETS 里的全部条目（含 ./ index.html manifest 图标等）
let swSrcJs = [];        // 其中 src 下的 .js，用于反向核对
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8');
  const block = /const\s+ASSETS\s*=\s*\[([\s\S]*?)\]/.exec(sw);
  if (block) {
    for (const m of block[1].matchAll(/['"]([^'"]+)['"]/g)) {
      const p = m[1].replace(/^\.\//, '');
      if (p === '' || p === '.') continue;   // './' 就是站点根，不是文件
      swRegistered.push(p);
    }
  }
}
swRegistered = [...new Set(swRegistered)];
swSrcJs = swRegistered.filter((r) => r.startsWith('src/') && r.endsWith('.js'));

// 登记 → 存在：全条目都查（png / html / manifest 一样会丢）
const registeredButMissing = swRegistered.filter((r) => !fs.existsSync(at(r)));
// 存在 → 登记：只对 src 下的 .js 做（css 由 index.html 引入，另有约定）
const jsNotRegistered = srcFiles.filter(
  (f) => !swSrcJs.includes(f) && !unreachable.includes(f)
);

/* ─────────────── 报告 ─────────────── */

console.log('离线与死代码 · 小小百科');
console.log('─'.repeat(58));
console.log(`入口              ${uniq.join('  ')}`);
console.log(`src 源文件        ${srcFiles.length}`);
console.log(`可达              ${seen.size}`);
console.log(`sw.js 登记条目    ${swRegistered.length}（其中 src/*.js ${swSrcJs.length}）`);
console.log('─'.repeat(58));

let bad = 0;

console.log(`\n死代码（磁盘上有、没人 import）${unreachable.length} 个`);
if (unreachable.length) {
  bad += unreachable.length;
  for (const f of unreachable) {
    const lines = fs.readFileSync(at(f), 'utf8').split('\n').length;
    console.log(`  · ${f}   ${lines} 行`);
  }
  console.log('  → 要么接进调用链，要么删掉。留着会被后来者当成活的。');
} else {
  console.log('  无');
}

console.log(`\nsw.js 登记了但磁盘上没有 ${registeredButMissing.length} 个`);
if (registeredButMissing.length) {
  bad += registeredButMissing.length;
  for (const r of registeredButMissing) console.log(`  · ${r}`);
  console.log('  → 删文件时忘摘 ASSETS。运行时 cache.add() 失败会被 .catch(() => null) 吞掉，不报错。');
} else {
  console.log('  无');
}

console.log(`\nsrc 源文件没登记进 sw.js ${jsNotRegistered.length} 个`);
if (jsNotRegistered.length) {
  bad += jsNotRegistered.length;
  for (const r of jsNotRegistered) console.log(`  · ${r}`);
  console.log('  → 离线状态下这个文件拿不到，首次打开可能白屏。');
} else {
  console.log('  无');
}

if (missing.size) {
  console.log(`\n被 import 但文件不存在 ${missing.size} 个`);
  bad += missing.size;
  for (const m of missing) console.log(`  · ${m}`);
}

console.log('');
if (bad === 0) {
  console.log('全部通过。');
  process.exit(0);
}
console.log(`合计发现 ${bad} 条。`);
process.exit(1);
