#!/usr/bin/env node
/**
 * check-style.mjs — 画风统一闸（第六条）
 *
 * 用法：node tools/check-style.mjs   （0=通过；1=有用户可见图仍是旧 3D 风）
 *
 * ═══════════════════════════════════════════════════════════════
 * 为什么需要这一闸
 * ═══════════════════════════════════════════════════════════════
 * 前五条闸都不管「图画的是不是同一代风格」：
 *   validate / test / check-reach / check-media / check-art
 *   ——它们查字段、行为、可达性、文件存在、分辨率、唯一性，但不查画风代际。
 *
 * 本项目经历过两代素材：
 *   v4 旧风  = Pixar-like / 3D animated movie style，光滑毛绒、影棚暖光。
 *   v5 新风  = children's book illustration 水彩手绘绘本风（2026-09-24 起）。
 *
 * 目标：**用户可见界面不残留旧风**。判定口径很具体——
 *   凡是「被代码引用」的图（art 注册表封面 + src/**\/*.js 里硬编码/模板拼出的路径），
 *   其文件 mtime 都必须 >= v5 切换日；否则说明有一张用户能看见的图还是旧 3D 风。
 *
 * 注意：本闸**只约束被引用图**。磁盘上存在但无任何代码引用的图（孤儿素材，
 *   约 487 张 src/images/english/<类别>/<词>.webp，源自未接线的单词卡素材库）
 *   不影响用户所见，按工单要求不重画、不删除，只在报告里列出处置建议。
 *   一旦某张孤儿日后被接进代码，它会立刻落入「被引用」集合，本闸就会要求它也是新图。
 *
 * 画风来源（避免代际漂移，勿擅自改）：
 *   风格词：children's book illustration, cute and friendly characters,
 *           soft rounded shapes, bright cheerful colors, simple clear compositions,
 *           hand-drawn warmth, storybook charm, soft watercolor wash；
 *           显式排除 "Pixar-like"、"3D animated movie style"；
 *           约束 no text / no letters / no numbers / no watermark。
 *   角色/画风基准：src/images/mascot/lion-wave.webp、
 *           src/images/book/science-dinosaur-1.webp、src/images/book/art-blue-1.webp、
 *           src/images/english/animals/cat.webp。
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getArt, listArtKeys } from '../src/art/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const abs = (r) => join(ROOT, r);
const IMG_EXT = /\.(webp|png|jpe?g)$/i;

/* v5 水彩切换日：被引用图的 mtime 不得早于此。 */
const STYLE_CUTOFF = new Date('2026-09-24T00:00:00');

function walkJs(dir) {
  const out = [];
  for (const e of readdirSync(abs(dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walkJs(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/* ── 收集所有「被代码引用」的图片 glob/字面量 ── */
const refGlobs = new Set();
for (const js of walkJs('src')) {
  const src = readFileSync(abs(js), 'utf8');
  const consts = [...src.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*'([^']*)'/g)].map((m) => [
    m[1], m[2],
  ]);
  for (const line of src.split('\n')) {
    for (const m of line.matchAll(/(['"`])((?:[^'"`\\]|\\.)*)\1/g)) {
      let raw = m[2];
      for (const [n, v] of consts) raw = raw.replaceAll('${' + n + '}', v);
      const g = raw.replace(/\$\{[^}]*\}/g, '*');
      if (!/^src\/images\//.test(g)) continue;
      if (!g.includes('*') && !IMG_EXT.test(g)) continue; // 目录常量，略过
      refGlobs.add(g);
    }
  }
}
/* art 注册表封面 */
for (const k of listArtKeys()) {
  const h = getArt(k);
  const m = /src="([^"]+)"/.exec(h);
  if (m) refGlobs.add(m[1]);
}

/* ── 全库图片清单 ── */
const allImages = [];
(function walk(dir) {
  for (const e of readdirSync(abs(dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if (IMG_EXT.test(e.name)) allImages.push(p);
  }
})('src/images');
const allSet = new Set(allImages);

/* ── 展开 glob，收集被引用图的实际路径 ── */
const referenced = new Set();
for (const g of refGlobs) {
  if (g.includes('*')) {
    const re = new RegExp(
      '^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$'
    );
    for (const f of allImages) if (re.test(f)) referenced.add(f);
  } else if (allSet.has(g)) {
    referenced.add(g);
  }
}

/* ── ① 被引用但仍是旧风（mtime < 切换日）→ 硬失败 ── */
const oldReferenced = [];
for (const f of referenced) {
  const st = statSync(abs(f));
  if (st.mtime < STYLE_CUTOFF) {
    oldReferenced.push(`${f}   (mtime ${st.mtime.toISOString().slice(0, 16)})`);
  }
}

/* ── ② 孤儿素材：磁盘有、但无任何代码引用 → 仅报告，不失败 ── */
const orphans = allImages.filter((f) => !referenced.has(f));
const orphanOld = orphans.filter((f) => statSync(abs(f)).mtime < STYLE_CUTOFF);

/* ── 报告 ── */
console.log('画风统一 · 小小百科');
console.log('─'.repeat(58));
console.log(`v5 水彩切换日      ${STYLE_CUTOFF.toISOString().slice(0, 10)}`);
console.log(`被代码引用图       ${referenced.size}`);
console.log(`其中旧风(未重画)   ${oldReferenced.length}`);
console.log(`孤儿素材(不引用)   ${orphans.length}（其中旧风 ${orphanOld.length}，仅报告）`);
console.log('─'.repeat(58));

if (oldReferenced.length) {
  console.log(`\n✗ 以下用户可见图仍是旧 3D 风，必须重画为水彩：`);
  oldReferenced.sort().forEach((x) => console.log('  · ' + x));
  console.log('\n处置：用 image_edit 以 watercolor 基准图重画，覆盖原路径（文件名/扩展名不变）。');
  process.exit(1);
}

console.log('✓ 全部用户可见图已是 v5 水彩手绘风。');
if (orphanOld.length) {
  const byDir = {};
  for (const f of orphanOld) {
    const d = f.split('/').slice(0, 3).join('/');
    byDir[d] = (byDir[d] || 0) + 1;
  }
  console.log(`\n孤儿旧图（不被引用、用户不可见，按工单不重画不删除）：`);
  for (const [d, n] of Object.entries(byDir).sort((a, b) => b[1] - a[1])) {
    console.log(`  · ${d}/  …… ${n} 张`);
  }
  console.log('  处置建议：若将来上线「单词卡/单词翻牌」玩法再接线重画；否则可在');
  console.log('  后续瘦身工单中连同打包一起剔除以减小 APK。当前保留不动。');
}
console.log('');
process.exit(0);
