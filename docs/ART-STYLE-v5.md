# v5 画风全库统一规格（手绘儿童绘本风）——素材生成唯一依据

目标：把全库 160 个知识点的所有插画统一重做为**水彩手绘儿童绘本风**，不留 3D/手绘混搭终态。
每个知识点 = 3 张绘本页（对应 lead/facts 台词，2048×1536）+ 1 张封面（2048×2048，不得复用内页）。

## 固定参考图（每张生图都要据此，禁止漂移）
- 画风参考（水彩手绘小白兔，暖纸质感）：D:\workspace\reference\v5-style\style-bunny.png
- 奇奇角色基准（手绘版）：D:\workspace\reference\v5-style\qiqi-handdrawn.png
  奇奇固定特征：圆脸蛋小狮子、蓬松橙黄鬃毛、戴绿色探险帽、背蓝色双肩书包、大圆眼、友好微笑。
- 质量/风格样张（认识蓝色三页）：同目录 sample-blue-sky.png / sample-blue-sea.png / sample-blue-berry.png

## 提示词硬规则
- 严禁出现 "Pixar-like"、"3D animated movie style"（旧 3D 后缀全部作废）。
- 每个提示词末尾**整段**固定追加：
  `children's book illustration, cute and friendly characters, soft rounded shapes, bright cheerful colors, simple clear compositions, hand-drawn warmth, storybook charm`
- 保留：`no text, no letters, no numbers, no watermark`。
- 画面必须与该页台词（lead 或 facts[i]）严格对应、图文一致；三页内容互不相同、md5 互不重复。
- 需要奇奇出场时，按上述固定特征描述，跨图脸型/绿帽/蓝书包/橙鬃毛保持一致。

## 落盘管线（铁律）
- 生图用项目可用的生图工具；下载用系统 `curl.exe -sL`（禁 Python urllib）。
- 转 webp 用 `ffmpeg -y -nostdin -i in out.webp`（必带 -nostdin，否则覆盖确认挂死）。
- 绘本页尺寸 2048×1536；封面 2048×2048。
- 每批 ≤6 张；生成一张立即落盘一张并用 ffprobe/文件大小校验；断点续跑——磁盘上已是合格图则跳过不重做。
- 全部原创，禁止从 参考产品* 目录拷任何文件。

## 文件映射（关键）
- 绘本内页：`src/images/book/<itemId>-1.webp`、`-2.webp`、`-3.webp`（-1..-3 对应 facts[0..2]）。
- 封面：每个 item 的 `art` 字段是 src/art/index.js 里的 key，解析出真实文件路径（形如 src/images/<domain>/<slug>.webp），**覆盖写同名文件**，不改路径、不改 art/index.js 注册。
- 旧 3D 图直接被新手绘 webp 覆盖。

## 留档
完成后在你负责的批次里，把「画风=children-book-style、参考图清单、日期 2026-09-24」写进本项目 docs（如新建 docs/ART-STYLE-v5.md），补齐新板块提示词样例。

## 数量目标（以磁盘实际为准）
book 480、封面 160、mascot 1、logo 全套（logo/mascot 由编排统一处理，素材批次不做）。

## 批次留档

### 2026-09-24 · 第一批：美术 / 写字 / 音乐（18 知识点，72 张）
- 画风 = children-book-style（水彩手绘儿童绘本风，2048×1536 内页 / 2048×2048 封面）。
- 参考图：`v5-style/style-bunny.png`、`v5-style/qiqi-handdrawn.png`、`v5-style/sample-blue-{sky,sea,berry}.png`。
- 范围：art 6 点（art-red/blue/yellow/lines/finger-paint/color-mix）、writing 6 点（writing-hold/pose/dian/heng/ri/shan）、music 6 点（music-loud-soft/fast-slow/drum/song/echo/xylophone）。
- 内页 `src/images/book/<id>-1..3.webp`、封面覆盖 `src/images/{art,writing,music}/<id>.webp`，路径与 art/index.js 注册完全一致；未改任何代码/音频。
- 提示词硬规则已执行：无 Pixar-like/3D 后缀；末尾固定追加 children's book illustration 文案；保留 no text/no watermark；生图后 curl.exe 下载、ffmpeg -y -nostdin 转 webp。
- 校验：72/72 尺寸正确；`npm run check:media` 全绿（绘本图 480/480、160 知识点齐全）。
- 新板块提示词样例（art-red-1）：「严格参考[img0]的水彩手绘儿童绘本画风……画面：一根棕色树枝上挂着两个苹果……」+ 固定句 `children's book illustration, cute and friendly characters, soft rounded shapes, bright cheerful colors, simple clear compositions, hand-drawn warmth, storybook charm, no text, no letters, no numbers, no watermark`。
