#!/usr/bin/env node
/**
 * build-www.mjs — 生成 Capacitor 用的 www/ 目录
 *
 * ─────────────────────────────────────────────────────────────
 * 为什么需要这一步
 * ─────────────────────────────────────────────────────────────
 * Capacitor 的 webDir 不接受项目根目录（会报 "webDir cannot be the project root"），
 * 必须指向一个独立的子目录。而本项目**没有构建步骤**——源码就是产物。
 *
 * 所以这里不做转译、不打包、不压缩，只做一件事：把该进 APK 的文件复制进 www/。
 * 换句话说，这个脚本是「文件清单」，不是「构建管线」。
 *
 * 与 PWA 的区别：
 *   打包成 APK 时，sw.js 和 manifest.webmanifest **不复制**。
 *   原生 App 的资源本来就在本地，Service Worker 没有意义，
 *   而且注册 SW 反而可能干扰 WebView 的资源加载。
 *   PWA 与 APK 共用同一份源码，但入口清单不同 —— 这是两套清单各自的职责。
 *
 * 用法：
 *   node tools/build-www.mjs
 */

import { cpSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'www');

/** 需要进 APK 的文件与目录（相对项目根） */
const INCLUDE = [
  'index.html',
  'src',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
];

/* 1. 清空重建 —— 避免上次的残留文件被打进包 */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* 2. 复制 */
let fileCount = 0;
let totalBytes = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else {
      fileCount += 1;
      totalBytes += statSync(p).size;
    }
  }
}

for (const rel of INCLUDE) {
  const src = join(ROOT, rel);
  if (!existsSync(src)) {
    console.error(`✗ 缺少文件：${rel}`);
    process.exit(1);
  }
  cpSync(src, join(OUT, rel), { recursive: true });
}

walk(OUT);

/* 3. 自检：源文件有没有漏进 www/ —— 漏一个就是运行时 404 */
const srcFiles = [];
(function collect(dir, base = '') {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) collect(join(dir, entry.name), rel);
    else srcFiles.push(`src/${rel}`.split(sep).join('/'));
  }
})('src');

const missing = srcFiles.filter((f) => !existsSync(join(OUT, f)));
if (missing.length) {
  console.error(`✗ 以下源文件没有被复制进 www/：\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

console.log(`
打包目录已生成
──────────────────────────────────────────────────────────
输出目录      www/
文件数量      ${fileCount} 个（其中 src/ 源文件 ${srcFiles.length} 个）
总体积        ${(totalBytes / 1024).toFixed(1)} KB
已排除        sw.js、manifest.webmanifest（原生包不需要，见文件头说明）
──────────────────────────────────────────────────────────
`);
