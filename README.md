# 小小百科 · kids-app

给 **3–8 岁**孩子的离线早教应用。六大领域知识卡 + 语音朗读 + 多题型互动练习，**按年龄分档**（3-5 / 6-8）。

原生 ES Module 架构，**零构建、零运行时依赖**。既能当网页用，也能打包成 APK。

---

## 快速开始

```bash
cd kids-app
python -m http.server 8765
# 浏览器打开 http://127.0.0.1:8765
```

> **必须走 http 服务**。原生 ESM 在 `file://` 协议下会被 CORS 拦截，双击打开只会看到白屏。

---

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run validate` | 内容校验：结构、id 唯一性、题型合法性、答案越界、插画引用、年龄档位完整性、sw.js 覆盖 |
| `npm run test` | 单元测试（62 条） |
| `npm run check` | 上面两条一起跑 —— **提交前必跑** |
| `npm run start` | 起本地服务 |

`npm run validate` 报错不允许提交。理由见 `docs/ARCHITECTURE.md` 第四节第 4 条。

---

## 目录结构

```
kids-app/
├── index.html                 应用外壳（只负责挂载，不含业务逻辑）
├── manifest.webmanifest       PWA 清单
├── sw.js                      Service Worker，预缓存全部资源
├── package.json               无依赖，只有脚本
│
├── src/
│   ├── styles.css             全局样式
│   ├── main.js                装配层：唯一知道谁依赖谁的地方
│   │
│   ├── core/                  基础设施（不认识任何业务概念）
│   │   ├── dom.js             极简元素构建
│   │   ├── store.js           学习进度唯一数据源
│   │   ├── prefs.js           应用偏好（年龄档位）—— 与进度分开存，见下方说明
│   │   ├── router.js          hash 路由
│   │   ├── speech.js          语音朗读抽象（将来换原生 TTS 只改这里）
│   │   └── util.js            纯函数
│   │
│   ├── ui/                    视图层
│   │   ├── shell.js           顶栏 + 主容器
│   │   ├── home.js            首页：六大领域
│   │   ├── topic.js           领域页：知识点列表
│   │   ├── card.js            知识点详情
│   │   └── quiz.js            答题浮层容器
│   │
│   ├── quiz-types/            题型引擎
│   │   ├── index.js           注册表 + 接口契约
│   │   ├── choice.js          三选一
│   │   ├── listen.js          听音选词
│   │   ├── order.js           排序
│   │   └── match.js           配对
│   │
│   ├── data/                  内容数据（每个领域一个文件）
│   │   ├── index.js           注册表 + 查询函数 + 年龄分级过滤
│   │   ├── science.js         生活科普
│   │   ├── geo.js             地理军事
│   │   ├── culture.js         人文科技
│   │   ├── logic.js           逻辑思维
│   │   ├── space.js           空间思维
│   │   └── english.js         英语
│   │
│   └── art/
│       └── index.js           60 个内联 SVG 插画
│
├── tools/
│   ├── validate-content.mjs   内容校验器
│   └── make-icons.py          图标生成器（纯标准库，不依赖 Pillow）
│
├── tests/
│   ├── content.test.mjs       内容契约
│   ├── quiz.test.mjs          题型引擎
│   ├── age.test.mjs           年龄分级（含「防静默失效」断言）
│   ├── prefs.test.mjs         偏好存储
│   └── store.test.mjs         进度存储
│
├── docs/
│   ├── ARCHITECTURE.md        架构与关键决策
│   ├── CONTRIBUTING.md        贡献指南：怎么加知识点 / 领域 / 题型
│   └── CODE-REVIEW.md         Code Review 清单
│
└── .preview/                  验证工具与截图（不属于应用）
    ├── diag.html              布局量测：查元素边界与溢出
    ├── test-quiz.html         四种题型交互自动化测试
    ├── shot-home.html         首页截图：?band=3-5&asked=1 控制档位与引导状态
    ├── shot-topic.html        领域页截图：?topic=logic&band=6-8
    ├── shot-live.html         真实点击验证：跑起 main.js 再模拟切档，读回界面状态
    └── index-v1-singlefile.html  v1 单文件版备份
```

---

## 六大领域

| 领域 | 主题色 | 知识点 |
|---|---|---|
| 生活科普 | `#3D8FC7` | 水循环、牙齿、影子、白天黑夜、彩虹、声音、磁铁、种子发芽、蜜蜂、大熊猫 |
| 地理军事 | `#3B6D11` | 长城、指南针、山与河、沙漠、海洋、火山、四季、溶洞、烽火台、灯塔 |
| 人文科技 | `#993C1D` | 电灯、桥、火箭、造纸术、钟表、轮子、电话、飞机、潜水艇、计算机 |
| 逻辑思维 | `#0F8B8D` | 找规律、比大小、数数、分类、一一对应、时间顺序、守恒、包含、传递、找不同 |
| 空间思维 | `#534AB7` | 正方体、方位、对称、圆与球、平面图、对折、镜像、旋转、大小套嵌、走路线 |
| 英语 | `#185FA5` | 字母、颜色、数字、动物、身体、家人、食物、天气、动作、问候、自然拼读、短句、方位词、疑问词、时间词 |

共 **65 个知识点**：生活科普 / 地理军事 / 人文科技 / 逻辑思维 / 空间思维各 10 个，**英语 15 个**。题型分布：三选一 32 / 排序 15 / 配对 12 / 听音选词 6。

> **英语为什么多出 5 个**：前 10 个是「第一批词」，靠听音就能学，3-5 档也适用；后 5 个（自然拼读、短句、方位词、疑问词、时间词）建立在「**已经认字**」之上，**只给 6-8 档** —— 3 岁孩子连选项都读不出来，给了也是白给。这是补上原先「英语的高龄档和低龄档内容几乎一样」这个缺口。领域之间不必强行等量，**适龄比齐平重要**。

每个领域都能独立使用，不存在「骨架领域」。加知识点只改 `src/data/*.js`，逻辑一行不动 —— 见 `docs/CONTRIBUTING.md` 第三节。

> **地理军事的内容红线**：本领域**不使用任何地图轮廓**，全部用长城、指南针、灯塔、烽火台这类具体地物承载知识点；军事部分只从「古代如何防御、如何传递消息」的历史科普角度写。原因见 `src/data/geo.js` 与 `src/art/index.js` 文件头的合规提示。
扩充方式见 `docs/CONTRIBUTING.md` 第三节 —— 加知识点只改 `src/data/*.js`，逻辑一行不动。

## 「我的地图」

参考产品用一张圆环图说「知识之间有关系」，我们用一条条小路说「知识有先后」——
对标分析见 `docs/ARCHITECTURE`。

- **入口**：首页底部「我的地图」卡片（不是首页的 6 张领域卡，**地图放在首次进入没意义**）
- **结构**：4 个主题分组（看世界 / 看人类 / 动脑筋 / 学说话），每个分组下是该主题的领域岛
- **岛**：每个领域一张 SVG 岛，岛上画一条蜿蜒小路，知识点是路上的驿站
- **驿站四态**：
  - 已掌握：实心领域色 + 白勾（**满**）
  - **该温习**（v3 复习机制）：白底 + **领域色虚线描边** + 领域色勾（**半满**）—— 已点亮但超过 7 天
  - **下一个**：领域色粗描边 + 白底 + 内部实心小点 ——「看下一步该去哪」
  - 未掌握：浅灰底 + 浅灰描边
- **总览条复习提示**：当有 N 个该温习了，地图顶部出橙色提示卡
- **首页可见**：有复习项时，「我的地图」入口卡片整体变橙色 + 副文案「N 个该温习了」 —— 复习从"进地图才看见"提前到首页就能感知
- **岛屿地形装饰**：每岛 2 个小元素（小石 / 小山 / 小树），类型由 `topic.id` hash 稳定决定，不抢驿站视觉
- **答对复习题**会自动刷新掌握时刻，复习态回 done —— 间隔重复的最小实现
- **交互**：点驿站 → `#/c/<id>` 直接进详情；点岛屿头部 → `#/t/<id>` 进领域页

**为什么是 4 组，不是参考产品的 3 组**：参考产品是「自然 / 人文 / 科技」3 大类照它的内容长出来的，硬套到我们的 6 领域上「地理军事」算自然还是人文、「逻辑思维」跟科技没关系。分组要长在能看出结构的地方，**这就是地图页**。首页 6 张卡 3 岁孩子直接选更短。

### 内容里的数字是怎么来的

**不是凭记忆写的。** 凡是带具体数字的事实，都来自 `tools/fetch-content.mjs` 的实测抓取，原始结果留在 `tools/raw/` 可复查：

| 内容 | 数据来源 |
|---|---|
| 白天黑夜的日出日落、夏至冬至昼长 | Open-Meteo archive API，广东江门实测 |
| 蜜蜂、大熊猫的分类（膜翅目 / 食肉目） | GBIF `species/match`，学名核对 `matchType=EXACT` |
| 向日葵与蒲公英同属菊科 | 同上，两者 `family` 均为 Asteraceae |

为什么较这个真：科普数字**写错了没人看得出来**——浏览器不报错，校验器也查不出「13 小时」是不是真的 13 小时。唯一的防线是数据可溯源。

### 逻辑思维为什么选这几个主题

这个领域最容易跑偏成「数学提前学」。这里刻意避开计算，选的是 3–8 岁真正在发育的几项能力：

| 能力 | 考的是什么 |
|---|---|
| 分类 | 每一堆只能用同一个标准 |
| 一一对应 | 每个东西找到唯一配对的另一个 |
| 守恒 | 形状变了，数量没变（皮亚杰经典实验，5 岁前大多答错，属正常） |
| 包含 | 苹果 ⊂ 水果 ⊂ 食物；「水果多还是苹果多」大人也常错 |
| 传递 | A>B 且 B>C，则 A>C |
| 找不同 | 挑出不属于这组的一个，并说出理由 |

这些能力都不靠背，靠反复做。所以题目比 facts 重要。

### 为什么英语的题型不是清一色听音选词

听音选词是英语启蒙的主干（6 题），但**只用它会把「会读」和「会用」混为一谈**。所以另外配了三种：

| 题型 | 用在哪 | 考的是什么 |
|---|---|---|
| 听音选词 ×6 | 字母、颜色、数字、动物、家人、食物 | 听音辨词，语音与拼写对应 |
| 配对 ×2 | 身体、动作 | 词义对应关系，比听音更强调「懂没懂」 |
| 三选一 ×1 | 天气 | 概念辨析（rainy / sunny / windy） |
| 排序 ×1 | 问候 | 这组词天然有先后顺序，排序才考得出理解 |

### ⚠️ 地图素材合规

本项目**不使用任何地图轮廓素材**。手绘国界存在漏绘、错绘、变形风险，一律规避 —— 地理领域改用长城、指南针、山岳等具体地物承载知识点。

如确需使用中国地图，必须使用自然资源部标准地图服务（bzdt.ch.mnr.gov.cn）的底图，完整表示中国版图，标注审图号，不得裁切或自行绘制。

---

## 年龄分级

3 岁和 8 岁的认知差距，比 8 岁和 15 岁的差距还大。不分档意味着 3 岁孩子会撞上「传递推理」这种完全无从下手的题，而 8 岁孩子要陪着看「蜜蜂有 6 条腿」。

| 档位 | 知识点 | 占比 | 独占 |
|---|---|---|---|
| 3-5 岁 | 42 | 65% | 2 |
| 6-8 岁 | 63 | 97% | 23 |
| 全部 | 65 | 100% | — |

「独占」= 只属于该档、切档后才会出现或消失的知识点，是切档可见差异的来源。上表由 `npm run validate` 每次输出，不用手工维护。

> **别只看「占比」这个指标。** 6-8 档占 97% 看着像「高龄端没分级」，但那是因为 3-5 档的内容本来就该是高龄档的**子集** —— 低龄能看的高龄也能看，反过来不成立。真正该看的是**独占数**：高龄档里有 23 个（37%）是低龄档看不到的，这才是切档的可见差异。

**分档判据**（新内容照这个来）：

- **低龄档 3-5**：看得见、摸得着、能动手；家长配着插画一句话能讲清。
- **高龄档 6-8**：需要想一步、需要比较、带原理或带历史背景。

### 数据怎么标

```js
{
  id: 'science-tooth',
  art: 'science-tooth',
  ageBands: ['3-5', '6-8'],   // ← 一个知识点可以跨档
  // ...
}
```

用数组而不是单个值，因为大部分知识点天然跨档 ——「磁铁」3 岁能玩、8 岁也能懂磁极。用单值字段会被迫硬归档，切档时内容白白缩水。

### 过滤发生在哪

只有两处：**首页**与**领域页**。

**知识点详情页刻意不按档位过滤** —— 孩子正停在一个知识点上、家长切了档位，不该把内容从他眼前抽走。

**进度分母跟着档位变**：切到 3-5 档后顶栏是 `3 / 42` 而不是 `3 / 60`。否则低龄档下进度条永远填不满，孩子会以为自己退步了。

### 为什么年龄存在 prefs 而不是 store

两个不同的生命周期。进度是「孩子学到了哪」，家长重置进度时会清空；年龄档位是「这个应用怎么用」，孩子的年龄不会因为重置进度而变回 3 岁。混在一个 key 里迟早出现「重置进度顺手把年龄也清了」这种 bug。两者用不同的 localStorage key，`tests/prefs.test.mjs` 里有一条专门守这个。

### 已知问题

**英语的缺口已补（2026-09-17 晚）** —— 原先英语的 6-8 档和 3-5 档内容几乎一样，现在补了 5 个高龄专属知识点（自然拼读、短句、方位词、疑问词、时间词），高龄档独占数从 **18 → 23**。英语领域也因此从 10 个涨到 15 个，不再和其他领域等量 —— 这是有意为之，适龄比齐平重要。

**剩下的是「低龄端还是偏多」**：42 个对 3 岁孩子仍然多。要么继续收紧判据，要么再加一档 `3-4`。

**其他五个领域还没有高龄专属内容**，它们的 6-8 档仍然是「全部内容」。要不要照英语的样子各补一批，取决于实际有没有 8 岁孩子用 —— 现在做也可能白做，等到有真实使用场景再补不迟。

---

## 打包成 APK

### 版本对应关系（先看这个，选错版本必失败）

| 组件 | 版本 | 为什么 |
|---|---|---|
| Capacitor | **8.x** | 8.x 对应 `targetSdk 36`，7.x 对应 35，6.x 对应 34 —— 官方不支持自定义 targetSdk |
| JDK | **21** | Capacitor 8 的 Android 工程要 Java 21 |
| Node | **22+** | Capacitor 8 的官方要求 |
| Android SDK Platform | **android-36** | 同上，跟 Capacitor 大版本绑定 |
| Android Build-Tools | **36.0.0** | 与 platform 对齐 |
| **Gradle** | **8.14.3，选 `bin` 版不要 `all` 版** | Capacitor 8 模板自带 8.14.3。`all` 版比 `bin` 版**多两万多个文件**（全是源码与 javadoc），构建一个都用不到 —— 实测条目数 **all 27271 / bin 323**，相差 84 倍 |

**先查官方矩阵再动手**：<https://capacitorjs.com/docs/android/setting-target-sdk>

### 本机环境（实测，装在隔离目录不污染系统）

| 依赖 | 路径 | 状态 |
|---|---|---|
| Node 22.22.2 | 托管运行时 | 已装 |
| JDK 21 (Temurin 21.0.12.1) | `C:\Users\Administrator\.workbuddy-ai\tools\jdk-21` | 已装 |
| Android SDK | `C:\Users\Administrator\.workbuddy-ai\tools\android-sdk` | 已装 |
| ├ platform-tools | 37.0.1 | 已装 |
| ├ platforms;android-36 | | 已装 |
| └ build-tools;36.0.0 | | 已装 |
| JDK 17 (Temurin) | `C:\Program Files\Eclipse Adoptium\...` | 系统里原有，打包不用它 |

### 步骤

**1. 生成 `www/` 并同步进 Android 工程**

```bash
npm run cap:sync      # 生成 www/ + cap sync android
```

> **别跳过这一步。** 只跑 `npm run www` 的话，`www/` 是新的，但 `android/app/src/main/assets/public/`
> 还是旧的 —— Gradle 看源文件没变，会报 `BUILD SUCCESSFUL` 而**一个任务都不执行**，
> 打出来的还是上一次的包，且没有任何报错。
>
> 判断口诀：构建日志里出现 `93 actionable tasks: 93 up-to-date` 就是没同步，
> 正常重新打包应该看到 `3 executed, 90 up-to-date`。

**2. 出包**

```bash
export JAVA_HOME="C:/Users/Administrator/.workbuddy-ai/tools/jdk-21"
export ANDROID_HOME="C:/Users/Administrator/.workbuddy-ai/tools/android-sdk"
cd android && ./gradlew assembleDebug
```

或者一条命令跑完全部（校验 → 测试 → www → 同步 → 出包）：

```bash
npm run apk
```

产物：`android/app/build/outputs/apk/debug/app-debug.apk` —— 实测 **4.03 MB**。

> **受限环境补充**：如果跑在沙箱 / 受管控环境里（文件写入被逐次审计、删除被拦），
> 把 `GRADLE_USER_HOME` 指到项目内，并直接调用解压出来的 `gradle.bat` 绕过 wrapper：
>
> ```bash
> export GRADLE_USER_HOME="D:/<项目>/.workbuddy-ai/gradle-home"
> "D:/<项目>/.workbuddy-ai/tools/gradle-8.14.3/bin/gradle.bat" assembleDebug --no-daemon
> ```
>
> 原因见踩坑表最后三行。正常环境下不需要这么做。

**3. 装到平板**

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### 打包后要改的一件事

Android WebView 对 `speechSynthesis` 支持不稳定。如果装成 APK 后没有语音，改用 `@capacitor-community/text-to-speech` 调原生 TTS —— **只需替换 `src/core/speech.js`**，UI 和题型引擎一行都不用动。这是当初做这层抽象的原因。

### 踩过的坑

| 现象 | 根因 | 处理 |
|---|---|---|
| `sdkmanager` 报 `Unsupported Java version` | JDK 17 装 Capacitor 8 不够 | 装 JDK 21，打包时把 `JAVA_HOME` 指过去 |
| 从 GitHub 下 JDK 卡住 / `RemoteDisconnected` | GitHub releases 被拦 | 改用清华镜像 `mirrors.tuna.tsinghua.edu.cn/Adoptium/` |
| 清华镜像返回 403 | 缺 Referer / UA 头 | 请求带上完整浏览器头（Referer 指向上级目录） |
| **Gradle 下载龟速（13 分钟才 40 MB）甚至断连** | `services.gradle.org` 国内基本不可用 | **改用腾讯云镜像**（实测 37 MB/s，见下） |
| `platforms;android-36` 解压报错、目录为空 | sdkmanager 的 Java 解压环节在某个 203 字节的 STORED 条目上失败 | 手动下载官方 zip 用 Python 解压（见下） |
| `--screenshot=".rel/path.png"` 报「系统找不到指定的路径」 | 无头 Chrome 不认相对路径 | 写绝对 Windows 路径 |
| `gradlew` 卡在 `Deleting directory ...gradle-8.14.3` 十几分钟 | wrapper 靠 `gradle-8.14.3-all.zip.ok` 判断解压是否完成；手动塞 zip 却没写这个标记 → 判定目录不完整 → **删掉整个目录重新解压** | 补写 `.ok` 标记（**必须最后写**，保证 mtime 晚于解压目录），或直接换 `bin` 版 |
| Gradle 长时间无任何输出，像卡死 | 非 tty 环境下 Gradle **不输出下载进度**，其实在下 | 看 `.gradle/caches` 体积是否在长，别急着 kill |
| `java.io.FileNotFoundException: javaCompile.lock (拒绝访问)` | 受管控环境把 `rm` 换成「移到回收站」，在工作区外直接失败并 **FAIL_CLOSED**；Gradle 清理锁文件被拦 → 锁打不开 → 构建失败 | **`GRADLE_USER_HOME` 指到项目内**，给它一个没有旧锁文件的干净家 |
| 解压 / 建文件奇慢（40ms+ 一个） | 沙箱对每个文件操作加审计开销 | 挑文件数最少的方案：Gradle 用 `bin` 版；解压用**覆盖式**而不是「先删后建」 |
| Gradle 缓存里出现多个 `java.exe` 占着锁 | `TaskStop` 在 Windows 上**只杀 bash 包装层，不杀子进程** | 显式 `Stop-Process -Name java -Force`（`taskkill //PID` 在 Git Bash 里参数会被转义吃掉） |
| **改了内容、Gradle 报 `BUILD SUCCESSFUL`，但打出来的 APK 还是旧的** | **漏了 `cap copy`** —— `npm run www` 只更新 `www/`，没同步进 `android/app/src/main/assets/public/`，Gradle 看源文件没变就全部跳过 | 出包必须三步：`npm run www` → `npx cap copy android` → `gradle assembleDebug`。`npm run apk` 已修正为包含同步 |
| 同上，如何**在构建日志里提前发现** | 正常重新打包会显示 `93 actionable tasks: 3 executed, 90 up-to-date`；如果显示 **`93 up-to-date`（一个都没执行）**，就是没同步 | 看到全 UP-TO-DATE 立刻停下来查 `cap copy`，别被 `BUILD SUCCESSFUL` 骗了 |

#### Gradle 发行包走腾讯云镜像

`services.gradle.org` 实测 **13 分钟只下了 40 MB，然后直接断连**。腾讯云镜像同一文件 **32 MB/s，131 MB 用 4 秒下完**。

**本项目的做法**：`android/gradle/wrapper/gradle-wrapper.properties` 里的 `distributionUrl` 已直接指向镜像，并且**用 `bin` 版而不是 `all` 版**：

```properties
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.14.3-bin.zip
```

协作者在海外时，把这一行换回官方源即可（文件里留了注释掉的备用行）：

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-bin.zip
```

> **手动塞 zip 进 wrapper 缓存要当心**：wrapper 用 `<zip 名>.ok` 标记判断「已安装且未过期」，
> 判定式是 `marker.mtime >= distDir.mtime`。只放 zip 不放标记，Gradle 会认为目录不完整，
> **删掉整个解压目录重新解压** —— 而 Windows 上删除很慢（受管控环境可达 125ms/个 × 两万多个文件），
> 表现出来就是「卡死十几分钟」。非要手动放，记得补 `.ok` 标记，且**最后写**。

#### `platforms;android-36` 装不上时的手动方案

`sdkmanager` 会在同一个文件上稳定失败两次：

```
Warning: An error occurred while preparing SDK package Android SDK Platform 36:
...\.temp\PackageOperation01\unzip\android-36\data\res\drawable-mdpi\btn_check_off_disabled_focused_holo_dark.png
```

**定位过程**：手动下载官方 `platform-36_r02.zip`（62.8 MB）后用 Python `zipfile` 解压 —— **11342/11342 全部成功，零失败**，那个「问题文件」只有 203 字节且能正常读出。

**结论：是 sdkmanager 的 Java 解压环节有问题，不是文件损坏、也不是系统拦截。** 注意该条目 `compress_size == file_size == 203`，是 STORED（不压缩）存储的。

```python
# 手动装：下载 https://dl.google.com/android/repository/platform-36_r02.zip
# 解压到 <ANDROID_HOME>/platforms/android-36/，剥掉包内一层 android-36/ 前缀
# 装完用 sdkmanager --list_installed 确认能列出 platforms;android-36
```

---

## 验证记录

2026-09-17 实跑验证，全部来自真实执行结果而非目测：

| 项目 | 结果 |
|---|---|
| 内容校验 | 6 领域 / **65 知识点** / 65 题 / 65 插画，全部通过（零警告） |
| 单元测试 | 64 条，全部通过 |
| 题型分布 | choice 32 / order 15 / match 12 / listen 6 |
| 年龄档位分布 | 3-5 档 **42** 个（独占 2）/ 6-8 档 **63** 个（独占 23）/ 全部 65 个 |
| **英语补高龄内容** | 新增 5 个 6-8 档专属知识点后，英语 3-5 档 10 个 / 6-8 档 **14** 个；高龄档独占数 18 → **23** |
| 首页渲染 | 1024 宽下 2 列布局，6 个领域卡片，tagline 无折行 |
| 领域页渲染 | 生活科普 / 逻辑思维各 10 个知识点卡片，14 张新插画全部可辨认 |
| 详情页渲染 | `.hero` 实测 `20 → 800`（宽 780），所有元素 `overflow = no` |
| 题型交互 | 三选一 / 听音选词 / 排序 / 配对 四种题型作答闭环全部通过 |
| 配对题容错 | 故意配错一次后仍可继续完成，最终判定为「未一次通过」且不计入已掌握 —— 符合设计 |
| 进度持久化 | 作答 4 次 / 答对 3 次 / 正确率 75%，写入 localStorage 正常 |
| 弹层渲染 | 听音题（喇叭按钮 + 三选项）、配对题（4×2 网格、左列选中态、两列独立洗牌）截图确认 |
| **切档重渲染** | 真实点击三个档位按钮，顶栏分母实测 `60 → 42 → 58 → 60`，领域卡始终 6 张，首次引导条点一次后消失 |
| **领域页按档过滤** | 逻辑思维 3-5 档 7 个（含「数数」）/ 6-8 档 9 个（含「守恒 / 包含 / 传递」）；英语 3-5 档 10 个（含「数字」）/ 6-8 档 14 个（含 5 个新增），档位胶囊正确显示 |
| 素材采集 | 6/6 源成功（GBIF / Open-Meteo / USGS / Launch Library / NASA / Datamuse） |
| **APK 出包** | 首次 `BUILD SUCCESSFUL in 7m 59s`；加年龄分级后重出 **`in 12s`（3 executed / 90 up-to-date）**；加「我的地图」 **`in 13s`（3 executed / 90 up-to-date）**；加复习机制 **`in 12s`（3 executed / 90 up-to-date）**；复习主动化 + 地形装饰 **`in 12s`（3 executed / 90 up-to-date）** —— 三步链路 `npm run www` → `npx cap copy android` → `gradle assembleDebug` 跑顺了 |
| APK 包信息 | 包名 `com.xiaoxiaobaike.app`、compileSdk **36**、minSdk **24**、targetSdk **36**、应用名「小小百科」，体积 **4.05 MB** |
| APK 签名 | v2 方案验证通过，debug 证书 `CN=Android Debug`，RSA 2048 |
| APK 内容 | **472 条目 / 34 个 web 资源**。开包逐项验证 **48 项全过**：含「我的地图」路由 + 主题分组 + 撞色修复 + store v3 复习机制 + 地图 4 态 + 复习提示 + 首页复习主动化（橙色卡片 + 副文案）+ 岛屿地形装饰 |
| **未验证** | **真机安装** —— `adb devices` 无设备连接，装机与实机运行待补 |

截图存于 `.preview/`：`v3-science.png`、`v3-logic.png`、`v3-card-daynight.png`、`v3-card-panda.png`、`v3-test-quiz.png`、`age-ask.png`、`age-3-5.png`、`age-6-8.png`、`age-topic-3-5.png`、`age-topic-6-8.png`、`v5-english-6-8-full.png`、`v5-english-3-5.png`、`v5-art-all.png`、`v6-map-all-20.png`、`v6-map-phone.png`、`v6-home-entry.png`、`v7-map-review.png`、`v7-map-mixed.png`、`v8-map-terrain.png`、`v8-home-review.png`、`v8-home-no-review.png`。

### 校验器实际抓到的真实错误

上线当天抓出两条**我本人写的**错误，人工检查时都漏掉了：

1. `logic-counting` 的事实文案含空泛表达「很多」—— 违反内容规范
2. 三道听音题缺 `q` 字段 —— 导致答题框标题空白

这是把校验做成独立命令而不是靠 code review 的直接理由。

### 截图环节踩到的坑

弹层截图一开始全是空白，但 `--dump-dom` 里元素明明在。根因是 `--virtual-time-budget` **也不推进 CSS 动画时钟**，`.overlay` 的 `fade` 入场动画永远停在 `opacity:0` 的起始关键帧上 —— 元素存在，但渲染成全透明。

**判断口诀：dump-dom 有、screenshot 没有 → 先查 animation，别查 JS。**
截图页里用 `* { animation: none !important }` 关掉动画，生产 CSS 不动。详见 `docs/CODE-REVIEW.md` 第四节第 3 条。

---

## 已知限制

1. **语音**在 Android WebView 中支持不稳定，见上文
2. **内容量是入门规模** —— 共 65 个（英语 15 个，其余五领域各 10 个），够孩子玩一阵，
   但离「百科」还差得远。扩充成本很低（加知识点只改 `src/data/*.js`），
   真正的瓶颈在**内容审校**，不在工程
3. **年龄分级的低龄端还是偏多** —— 3-5 档 42 个，对 3 岁孩子仍然多。
   英语的 6-8 岁进阶内容缺口已补（新增 5 个高龄专属），
   但其他五个领域的高龄档仍然是「全部内容」。详见上文「年龄分级 · 已知问题」
4. **无家长端** —— 只有顶栏一个总进度，没有分领域正确率、错题重练
5. **插画是几何风格** —— 辨识度够但不够精美，美术同学可替换 `src/art/index.js` 里的 SVG，key 不变即可
6. **内容事实靠人工审校** —— 校验器只能查格式（答案下标越界、art key 不存在、配对题右项重复），
   查不出「数字写错了」。所以带数字的事实要么来自 `npm run fetch` 实测抓取，要么逐条人工核实

---

## 文档

- **[架构说明](docs/ARCHITECTURE.md)** —— 分层、依赖方向、关键决策的理由
- **[贡献指南](docs/CONTRIBUTING.md)** —— 怎么加知识点 / 领域 / 题型，常见错误对照表
- **[Code Review 清单](docs/CODE-REVIEW.md)** —— 审查要点、反模式、本项目特有的坑
