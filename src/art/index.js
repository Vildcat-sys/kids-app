/**
 * art/index.js — 插画资源库
 *
 * ─────────────────────────────────────────────────────────────
 * 为什么用内联 SVG，而不是图片文件
 * ─────────────────────────────────────────────────────────────
 *   1. 体积   单个 SVG 约 0.5 KB，18 个加起来不到 12 KB；等效果的 PNG 要几百 KB
 *   2. 清晰   矢量图在任何分辨率都不糊，平板高 DPI 屏上差别非常明显
 *   3. 可改   改配色只需改一个 hex，不用重出图，美术和开发可以并行
 *   4. 离线   不产生额外网络请求，PWA 缓存策略更简单
 *
 * ─────────────────────────────────────────────────────────────
 * 绘制约定
 * ─────────────────────────────────────────────────────────────
 *   - viewBox 统一为 `0 0 200 200`
 *   - 最外层先铺一个浅色圆 `<circle cx="100" cy="100" r="88">` 作为底
 *   - 主体控制在 r=88 的圆内，四周留白，避免在圆角卡片里被切
 *   - 数据层通过 art key 引用，不直接写 SVG
 *   - key 命名：`领域-主题`，全小写短横线
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 地图类素材合规提示（重要，请勿删除本段）
 * ─────────────────────────────────────────────────────────────
 *   本项目当前**不使用任何地图轮廓**，地理领域改用长城、指南针、山岳等
 *   具体元素承载知识点，从源头规避地图绘制风险。
 *
 *   如后续确需使用中国地图，必须遵守：
 *     1. 底图必须取自自然资源部标准地图服务（bzdt.ch.mnr.gov.cn）
 *     2. 完整表示中国版图，不得漏绘、错绘领土，不得裁切、变形
 *     3. 标注审图号，不得自行绘制或使用来源不明的轮廓
 *   违反以上任何一条都存在合规风险，请勿凭印象手绘国界。
 */

export const ART = {
  /* ============ 生活科普 ============ */

  // 水循环：太阳加热 → 云 → 降雨 → 汇入水面
  'science-water-cycle': `<img src="src/images/science/water-cycle.webp" alt="science-water-cycle" loading="lazy">`,

  // 牙齿：牙冠 + 两个牙根
  'science-tooth': `<img src="src/images/science/tooth.webp" alt="science-tooth" loading="lazy">`,

  // 影子：太阳斜照，树影落在地面
  'science-shadow': `<img src="src/images/science/shadow.webp" alt="science-shadow" loading="lazy">`,

  // 白天黑夜：地球被晨昏线分成明暗两半，左边太阳，右边星星
  'science-daynight': `<img src="src/images/science/daynight.webp" alt="science-daynight" loading="lazy">`,

  // 彩虹：七色同心弧
  'science-rainbow': `<img src="src/images/science/rainbow.webp" alt="science-rainbow" loading="lazy">`,

  // 声音：喇叭 + 三层扩散声波
  'science-sound': `<img src="src/images/science/sound.webp" alt="science-sound" loading="lazy">`,

  // 磁铁：马蹄形磁铁 + N/S 两极 + 被吸住的小铁件
  'science-magnet': `<img src="src/images/science/magnet.webp" alt="science-magnet" loading="lazy">`,

  // 种子发芽：土里冒出的苗 + 两片叶 + 花
  'science-seed': `<img src="src/images/science/seed.webp" alt="science-seed" loading="lazy">`,

  // 蜜蜂：条纹身体 + 头 + 触角 + 两片翅
  'science-bee': `<img src="src/images/science/bee.webp" alt="science-bee" loading="lazy">`,

  // 大熊猫：正面头部，黑耳黑眼圈
  'science-panda': `<img src="src/images/science/panda.webp" alt="science-panda" loading="lazy">`,

  
  'science-dinosaur': `<img src="src/images/science/dinosaur.webp" alt="science-dinosaur" loading="lazy">`,
  'science-insect': `<img src="src/images/science/insect.webp" alt="science-insect" loading="lazy">`,
  'science-bird': `<img src="src/images/science/bird.webp" alt="science-bird" loading="lazy">`,
  'science-fish': `<img src="src/images/science/fish.webp" alt="science-fish" loading="lazy">`,
  'science-plant': `<img src="src/images/science/plant.webp" alt="science-plant" loading="lazy">`,
  'science-heart': `<img src="src/images/science/heart.webp" alt="science-heart" loading="lazy">`,
  'science-five-senses': `<img src="src/images/science/five-senses.webp" alt="science-five-senses" loading="lazy">`,
  'science-gravity': `<img src="src/images/science/gravity.webp" alt="science-gravity" loading="lazy">`,
  'science-water-states': `<img src="src/images/science/water-states.webp" alt="science-water-states" loading="lazy">`,
  'science-solar-system': `<img src="src/images/science/solar-system.webp" alt="science-solar-system" loading="lazy">`,
/* ============ 地理军事 ============ */
  /* 注意：本领域不使用地图轮廓，改用具体地物元素。原因见文件头合规提示。 */

  // 长城：城墙 + 垛口 + 烽火台
  'geo-great-wall': `<img src="src/images/geo/great-wall.webp" alt="geo-great-wall" loading="lazy">`,

  // 指南针：表盘 + 红蓝指针 + 刻度
  'geo-compass': `<img src="src/images/geo/compass.webp" alt="geo-compass" loading="lazy">`,

  // 山与河：雪顶山峰 + 河流
  'geo-mountain': `<img src="src/images/geo/mountain.webp" alt="geo-mountain" loading="lazy">`,

  // 沙漠：沙丘 + 太阳 + 仙人掌
  'geo-desert': `<img src="src/images/geo/desert.webp" alt="geo-desert" loading="lazy">`,

  // 海洋：三层深浅水 + 小鱼 + 气泡
  'geo-ocean': `<img src="src/images/geo/ocean.webp" alt="geo-ocean" loading="lazy">`,

  // 火山：锥形山体 + 喷出的岩浆 + 顺坡流下
  'geo-volcano': `<img src="src/images/geo/volcano.webp" alt="geo-volcano" loading="lazy">`,

  // 四季：四格 + 每格不同颜色的树冠
  'geo-seasons': `<img src="src/images/geo/seasons.webp" alt="geo-seasons" loading="lazy">`,

  // 溶洞：洞顶钟乳石 + 地面石笋 + 地下河
  'geo-cave': `<img src="src/images/geo/cave.webp" alt="geo-cave" loading="lazy">`,

  // 烽火台：山脊上的方台 + 烟火
  'geo-signal': `<img src="src/images/geo/signal.webp" alt="geo-signal" loading="lazy">`,

  // 灯塔：塔身红白条 + 顶部灯光向两侧照 + 海浪
  'geo-lighthouse': `<img src="src/images/geo/lighthouse.webp" alt="geo-lighthouse" loading="lazy">`,

  
  'geo-river': `<img src="src/images/geo/river.webp" alt="geo-river" loading="lazy">`,
  'geo-lake': `<img src="src/images/geo/lake.webp" alt="geo-lake" loading="lazy">`,
  'geo-waterfall': `<img src="src/images/geo/waterfall.webp" alt="geo-waterfall" loading="lazy">`,
  'geo-forest': `<img src="src/images/geo/forest.webp" alt="geo-forest" loading="lazy">`,
  'geo-moon': `<img src="src/images/geo/moon.webp" alt="geo-moon" loading="lazy">`,
  'geo-sun': `<img src="src/images/geo/sun.webp" alt="geo-sun" loading="lazy">`,
  'geo-planets': `<img src="src/images/geo/planets.webp" alt="geo-planets" loading="lazy">`,
  'geo-canyon': `<img src="src/images/geo/canyon.webp" alt="geo-canyon" loading="lazy">`,
  'geo-polar': `<img src="src/images/geo/polar.webp" alt="geo-polar" loading="lazy">`,
  'geo-cloud': `<img src="src/images/geo/cloud.webp" alt="geo-cloud" loading="lazy">`,
/* ============ 人文科技 ============ */

  // 电灯：灯泡 + 光晕 + 灯座
  'culture-bulb': `<img src="src/images/culture/bulb.webp" alt="culture-bulb" loading="lazy">`,

  // 桥：单拱 + 栏杆
  'culture-bridge': `<img src="src/images/culture/bridge.webp" alt="culture-bridge" loading="lazy">`,

  // 火箭：机身 + 舷窗 + 尾焰
  'culture-rocket': `<img src="src/images/culture/rocket.webp" alt="culture-rocket" loading="lazy">`,

  // 造纸术：两张纸叠放 + 纤维纹路
  'culture-paper': `<img src="src/images/culture/paper.webp" alt="culture-paper" loading="lazy">`,

  // 钟表：表盘 + 时分针 + 刻度
  'culture-clock': `<img src="src/images/culture/clock.webp" alt="culture-clock" loading="lazy">`,

  // 轮子：两个咬合的齿轮
  'culture-wheel': `<img src="src/images/culture/wheel.webp" alt="culture-wheel" loading="lazy">`,

  // 电话：听筒 + 两侧声波
  'culture-phone': `<img src="src/images/culture/phone.webp" alt="culture-phone" loading="lazy">`,

  // 飞机：机身 + 机翼 + 云
  'culture-plane': `<img src="src/images/culture/plane.webp" alt="culture-plane" loading="lazy">`,

  // 潜水艇：艇身 + 潜望镜 + 螺旋桨 + 水
  'culture-submarine': `<img src="src/images/culture/submarine.webp" alt="culture-submarine" loading="lazy">`,

  // 计算机：芯片 + 引脚 + 0/1
  'culture-computer': `<img src="src/images/culture/computer.webp" alt="culture-computer" loading="lazy">`,

  
  'culture-gunpowder': `<img src="src/images/culture/gunpowder.webp" alt="culture-gunpowder" loading="lazy">`,
  'culture-pottery': `<img src="src/images/culture/pottery.webp" alt="culture-pottery" loading="lazy">`,
  'culture-bronze': `<img src="src/images/culture/bronze.webp" alt="culture-bronze" loading="lazy">`,
  'culture-money': `<img src="src/images/culture/money.webp" alt="culture-money" loading="lazy">`,
  'culture-music-instrument': `<img src="src/images/culture/music-instrument.webp" alt="culture-music-instrument" loading="lazy">`,
  'culture-house': `<img src="src/images/culture/house.webp" alt="culture-house" loading="lazy">`,
  'culture-boat': `<img src="src/images/culture/boat.webp" alt="culture-boat" loading="lazy">`,
  'culture-bicycle': `<img src="src/images/culture/bicycle.webp" alt="culture-bicycle" loading="lazy">`,
  'culture-car': `<img src="src/images/culture/car.webp" alt="culture-car" loading="lazy">`,
  'culture-camera': `<img src="src/images/culture/camera.webp" alt="culture-camera" loading="lazy">`,
/* ============ 逻辑思维 ============ */

  // 找规律：圆-方-圆 / 圆-?-圆，虚线框为待填
  'logic-pattern': `<img src="src/images/logic/pattern.webp" alt="logic-pattern" loading="lazy">`,

  // 大小比较：一大一小两个圆
  'logic-compare': `<img src="src/images/logic/compare.webp" alt="logic-compare" loading="lazy">`,

  // 数量：八个点，两色分组
  'logic-counting': `<img src="src/images/logic/counting.webp" alt="logic-counting" loading="lazy">`,

  // 分类：两个方框，分别装着圆和方
  'logic-classify': `<img src="src/images/logic/classify.webp" alt="logic-classify" loading="lazy">`,

  // 时间顺序：1-2-3 三步 + 箭头
  'logic-timeline': `<img src="src/images/logic/timeline.webp" alt="logic-timeline" loading="lazy">`,

  // 一一对应：上排三个图形，下排三个搭档，虚线相连
  'logic-correspondence': `<img src="src/images/logic/correspondence.webp" alt="logic-correspondence" loading="lazy">`,

  // 守恒：细高杯与矮宽杯装着「一样多」的水，中间虚线为界
  'logic-conservation': `<img src="src/images/logic/conservation.webp" alt="logic-conservation" loading="lazy">`,

  // 包含：三层同心圆，从外到里是食物 / 水果 / 苹果
  'logic-include': `<img src="src/images/logic/include.webp" alt="logic-include" loading="lazy">`,

  // 传递：三个人由高到矮
  'logic-transitive': `<img src="src/images/logic/transitive.webp" alt="logic-transitive" loading="lazy">`,

  // 找不同：三个绿圆 + 一个橙方
  'logic-odd-one-out': `<img src="src/images/logic/odd-one-out.webp" alt="logic-odd-one-out" loading="lazy">`,

  
  'logic-sorting': `<img src="src/images/logic/sorting.webp" alt="logic-sorting" loading="lazy">`,
  'logic-deduction': `<img src="src/images/logic/deduction.webp" alt="logic-deduction" loading="lazy">`,
  'logic-maze': `<img src="src/images/logic/maze.webp" alt="logic-maze" loading="lazy">`,
  'logic-tangram': `<img src="src/images/logic/tangram.webp" alt="logic-tangram" loading="lazy">`,
  'logic-estimation': `<img src="src/images/logic/estimation.webp" alt="logic-estimation" loading="lazy">`,
  'logic-probability': `<img src="src/images/logic/probability.webp" alt="logic-probability" loading="lazy">`,
  'logic-graph': `<img src="src/images/logic/graph.webp" alt="logic-graph" loading="lazy">`,
  'logic-code': `<img src="src/images/logic/code.webp" alt="logic-code" loading="lazy">`,
/* ============ 空间思维 ============ */

  // 立方体：等轴测三面
  'space-cube': `<img src="src/images/space/cube.webp" alt="space-cube" loading="lazy">`,

  // 方位：中心点 + 四向箭头
  'space-directions': `<img src="src/images/space/directions.webp" alt="space-directions" loading="lazy">`,

  // 对称：虚线中轴 + 左右镜像图形
  'space-symmetry': `<img src="src/images/space/symmetry.webp" alt="space-symmetry" loading="lazy">`,

  // 圆与球：左边圆（标半径）+ 右边球（经纬线）
  'space-circle': `<img src="src/images/space/circle.webp" alt="space-circle" loading="lazy">`,

  // 平面图：从正上方看到的房间布局
  'space-map': `<img src="src/images/space/map.webp" alt="space-map" loading="lazy">`,

  // 对折：两半纸 + 中间折痕 + 箭头
  'space-fold': `<img src="src/images/space/fold.webp" alt="space-fold" loading="lazy">`,

  // 镜像：中间镜面 + 左右两半（一边实色一边淡色）
  'space-mirror': `<img src="src/images/space/mirror.webp" alt="space-mirror" loading="lazy">`,

  // 旋转：方形转 90 度，弧形箭头指示
  'space-rotate': `<img src="src/images/space/rotate.webp" alt="space-rotate" loading="lazy">`,

  // 大小套嵌：三个由大到小的套娃
  'space-nest': `<img src="src/images/space/nest.webp" alt="space-nest" loading="lazy">`,

  // 走路线：方格纸 + 一条直路一条绕路
  'space-path': `<img src="src/images/space/path.webp" alt="space-path" loading="lazy">`,

  
  'space-triangle': `<img src="src/images/space/triangle.webp" alt="space-triangle" loading="lazy">`,
  'space-rectangle': `<img src="src/images/space/rectangle.webp" alt="space-rectangle" loading="lazy">`,
  'space-left-right': `<img src="src/images/space/left-right.webp" alt="space-left-right" loading="lazy">`,
  'space-front-back': `<img src="src/images/space/front-back.webp" alt="space-front-back" loading="lazy">`,
  'space-far-near': `<img src="src/images/space/far-near.webp" alt="space-far-near" loading="lazy">`,
  'space-blocks': `<img src="src/images/space/blocks.webp" alt="space-blocks" loading="lazy">`,
  'space-measurement': `<img src="src/images/space/measurement.webp" alt="space-measurement" loading="lazy">`,
  'space-coordinates': `<img src="src/images/space/coordinates.webp" alt="space-coordinates" loading="lazy">`,
/* ============ 英语 ============ */

  // 字母：ABC 三张卡片
  'english-letters': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF0E8"/><rect x="28" y="50" width="44" height="54" rx="11" fill="#E8734A"/><text x="50" y="90" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">A</text><rect x="78" y="74" width="44" height="54" rx="11" fill="#F0A03C"/><text x="100" y="114" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">B</text><rect x="128" y="98" width="44" height="54" rx="11" fill="#F5C542"/><text x="150" y="138" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">C</text></svg>`,

  // 颜色：四色圆点
  'english-colors': `<img src="src/images/english/colors/red.webp" alt="english-colors" loading="lazy">`,

  // 数字：123 三张卡片
  'english-numbers': `<img src="src/images/english/numbers/one.webp" alt="english-numbers" loading="lazy">`,

  // 动物：猫脸 + 耳朵 + 胡须
  'english-animals': `<img src="src/images/english/animals/cat.webp" alt="english-animals" loading="lazy">`,

  // 身体：头 + 躯干 + 四肢的简化人形
  'english-body': `<img src="src/images/english/body/head.webp" alt="english-body" loading="lazy">`,

  // 家人：两个大人 + 一个小孩
  'english-family': `<img src="src/images/english/family/family.webp" alt="english-family" loading="lazy">`,

  // 食物：盘子 + 面包 + 煎蛋
  'english-food': `<img src="src/images/english/food/cake.webp" alt="english-food" loading="lazy">`,

  // 天气：太阳 + 云
  'english-weather': `<img src="src/images/english/weather/rainbow.webp" alt="english-weather" loading="lazy">`,

  // 动作：奔跑的人形 + 速度线
  'english-actions': `<img src="src/images/english/actions/dance.webp" alt="english-actions" loading="lazy">`,

  // 礼貌用语：两个对话气泡
  'english-greetings': `<img src="src/images/english/sentences/hello.webp" alt="english-greetings" loading="lazy">`,

  /* ───── 以下 5 张只服务 6-8 档 ─────
   * 配套的知识点级别也都标在 S4 以上。
   * 画法上刻意全部用「字母/词」当主体，和前面 10 张（靠图形认词）区分开。 */

  // 自然拼读：三行词卡，首字母不同、结尾都是 at
  'english-phonics': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF0E8"/><rect x="44" y="38" width="36" height="36" rx="10" fill="#E8734A"/><text x="62" y="63" font-size="23" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">c</text><rect x="86" y="38" width="70" height="36" rx="10" fill="#F7E4D3"/><text x="121" y="63" font-size="23" font-weight="500" fill="#C08A55" text-anchor="middle" font-family="system-ui,sans-serif">at</text><rect x="44" y="82" width="36" height="36" rx="10" fill="#F0A03C"/><text x="62" y="107" font-size="23" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">b</text><rect x="86" y="82" width="70" height="36" rx="10" fill="#F7E4D3"/><text x="121" y="107" font-size="23" font-weight="500" fill="#C08A55" text-anchor="middle" font-family="system-ui,sans-serif">at</text><rect x="44" y="126" width="36" height="36" rx="10" fill="#F5C542"/><text x="62" y="151" font-size="23" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">h</text><rect x="86" y="126" width="70" height="36" rx="10" fill="#F7E4D3"/><text x="121" y="151" font-size="23" font-weight="500" fill="#C08A55" text-anchor="middle" font-family="system-ui,sans-serif">at</text></svg>`,

  // 短句：一句话写在卡片里，下面三个点代表三个词
  'english-sentences': `<img src="src/images/english/sentences/hello.webp" alt="english-sentences" loading="lazy">`,

  // 方位词：同一个球，在盒子上 / 里 / 下
  'english-prepositions': `<img src="src/images/english/prepositions/on.webp" alt="english-prepositions" loading="lazy">`,

  // 疑问词：三个词竖排，左边各一个小圆点
  'english-questions': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF2EE"/><circle cx="62" cy="60" r="7" fill="#E8734A"/><text x="80" y="67" font-size="19" font-weight="500" fill="#8A6A50" font-family="system-ui,sans-serif">what</text><circle cx="62" cy="100" r="7" fill="#F0A03C"/><text x="80" y="107" font-size="19" font-weight="500" fill="#8A6A50" font-family="system-ui,sans-serif">where</text><circle cx="62" cy="140" r="7" fill="#5AA9E6"/><text x="80" y="147" font-size="19" font-weight="500" fill="#8A6A50" font-family="system-ui,sans-serif">who</text></svg>`,

  // 时间词：太阳 + 月亮 + 时钟
  'english-time': `<img src="src/images/english/time/clock.webp" alt="english-time" loading="lazy">`,

  /* ============ 内容扩充（2026-09-17 第二批 · +23） ============ */

  // 雪：六角雪花
  'science-snow': `<img src="src/images/science/snow.webp" alt="science-snow" loading="lazy">`,

  // 风：三层风的曲线 + 飘叶
  'science-wind': `<img src="src/images/science/wind.webp" alt="science-wind" loading="lazy">`,

  // 星星：夜空中的一颗黄星 + 小星点
  'science-star': `<img src="src/images/science/star.webp" alt="science-star" loading="lazy">`,

  // 树：树干 + 树冠
  'science-tree': `<img src="src/images/science/tree.webp" alt="science-tree" loading="lazy">`,

  // 岛屿：水中一块绿地 + 小棕榈（不使用任何地图轮廓）
  'geo-island': `<img src="src/images/geo/island.webp" alt="geo-island" loading="lazy">`,

  // 草原：起伏绿丘 + 太阳
  'geo-grassland': `<img src="src/images/geo/grassland.webp" alt="geo-grassland" loading="lazy">`,

  // 地震：裂开的地块
  'geo-earthquake': `<img src="src/images/geo/earthquake.webp" alt="geo-earthquake" loading="lazy">`,

  // 冰川：两座蓝冰山
  'geo-glacier': `<img src="src/images/geo/glacier.webp" alt="geo-glacier" loading="lazy">`,

  // 火车：车头 + 车窗 + 轮子
  'culture-train': `<img src="src/images/culture/train.webp" alt="culture-train" loading="lazy">`,

  // 望远镜：斜筒 + 三脚架
  'culture-telescope': `<img src="src/images/culture/telescope.webp" alt="culture-telescope" loading="lazy">`,

  // 印刷术：印着「印」的字块 + 活字
  'culture-printing': `<img src="src/images/culture/printing.webp" alt="culture-printing" loading="lazy">`,

  // 蒸汽机：锅炉 + 烟囱冒汽
  'culture-steam': `<img src="src/images/culture/steam.webp" alt="culture-steam" loading="lazy">`,

  // 因果：云（因）→ 箭头 → 湿地（果）
  'logic-cause': `<img src="src/images/logic/cause.webp" alt="logic-cause" loading="lazy">`,

  // 类比：两组对应块 + 双箭头
  'logic-analogy': `<img src="src/images/logic/analogy.webp" alt="logic-analogy" loading="lazy">`,

  // 数物对应：数字 5 + 5 个计数点
  'logic-cardinal': `<img src="src/images/logic/cardinal.webp" alt="logic-cardinal" loading="lazy">`,

  // 部分整体：一个圆分成几块
  'logic-partwhole': `<img src="src/images/logic/partwhole.webp" alt="logic-partwhole" loading="lazy">`,

  // 圆柱与圆锥：并排两个立体
  'space-cylinder': `<img src="src/images/space/cylinder.webp" alt="space-cylinder" loading="lazy">`,

  // 拼图：两片 interlocking
  'space-jigsaw': `<img src="src/images/space/jigsaw.webp" alt="space-jigsaw" loading="lazy">`,

  // 网格：方格 + 标记点
  'space-grid': `<img src="src/images/space/grid.webp" alt="space-grid" loading="lazy">`,

  // 视角：杯子正面 + 俯视圆
  'space-viewpoint': `<img src="src/images/space/viewpoint.webp" alt="space-viewpoint" loading="lazy">`,

  // 衣服：T 恤
  'english-clothes': `<img src="src/images/english/clothes/dress.webp" alt="english-clothes" loading="lazy">`,

  // 玩具：球
  'english-toys': `<img src="src/images/english/toys/teddy_bear.webp" alt="english-toys" loading="lazy">`,

  // 学校：书 + 铅笔
  'english-school': `<img src="src/images/english/school/book.webp" alt="english-school" loading="lazy">`,
  'english-fruits': `<img src="src/images/english/fruits/apple.webp" alt="english-fruits" loading="lazy">`,
  'english-transport': `<img src="src/images/english/transport/bus.webp" alt="english-transport" loading="lazy">`,
  'english-jobs': `<img src="src/images/english/jobs/teacher.webp" alt="english-jobs" loading="lazy">`,
  'english-sports': `<img src="src/images/english/sports/football.webp" alt="english-sports" loading="lazy">`,
  'english-nature': `<img src="src/images/english/nature/flower.webp" alt="english-nature" loading="lazy">`,
  'english-adjectives': `<img src="src/images/english/adjectives/happy.webp" alt="english-adjectives" loading="lazy">`,
  'english-verbs': `<img src="src/images/english/verbs/get_up.webp" alt="english-verbs" loading="lazy">`,
  'english-festivals': `<img src="src/images/english/festivals/birthday.webp" alt="english-festivals" loading="lazy">`,


  /* ============ 新增：美术 / 写字 / 音乐（原创封面） ============ */
  'art-red': `<img src="src/images/art/art-red.webp" alt="art-red" loading="lazy">`,
  'art-blue': `<img src="src/images/art/art-blue.webp" alt="art-blue" loading="lazy">`,
  'art-yellow': `<img src="src/images/art/art-yellow.webp" alt="art-yellow" loading="lazy">`,
  'art-lines': `<img src="src/images/art/art-lines.webp" alt="art-lines" loading="lazy">`,
  'art-finger-paint': `<img src="src/images/art/art-finger-paint.webp" alt="art-finger-paint" loading="lazy">`,
  'art-color-mix': `<img src="src/images/art/art-color-mix.webp" alt="art-color-mix" loading="lazy">`,
  'writing-hold': `<img src="src/images/writing/writing-hold.webp" alt="writing-hold" loading="lazy">`,
  'writing-pose': `<img src="src/images/writing/writing-pose.webp" alt="writing-pose" loading="lazy">`,
  'writing-dian': `<img src="src/images/writing/writing-dian.webp" alt="writing-dian" loading="lazy">`,
  'writing-heng': `<img src="src/images/writing/writing-heng.webp" alt="writing-heng" loading="lazy">`,
  'writing-ri': `<img src="src/images/writing/writing-ri.webp" alt="writing-ri" loading="lazy">`,
  'writing-shan': `<img src="src/images/writing/writing-shan.webp" alt="writing-shan" loading="lazy">`,
  'music-loud-soft': `<img src="src/images/music/music-loud-soft.webp" alt="music-loud-soft" loading="lazy">`,
  'music-fast-slow': `<img src="src/images/music/music-fast-slow.webp" alt="music-fast-slow" loading="lazy">`,
  'music-drum': `<img src="src/images/music/music-drum.webp" alt="music-drum" loading="lazy">`,
  'music-song': `<img src="src/images/music/music-song.webp" alt="music-song" loading="lazy">`,
  'music-echo': `<img src="src/images/music/music-echo.webp" alt="music-echo" loading="lazy">`,
  'music-xylophone': `<img src="src/images/music/music-xylophone.webp" alt="music-xylophone" loading="lazy">`,
};

/** 取插画，未知 key 返回一个占位图而不是 undefined —— 避免整个页面因为一张图崩掉 */
export function getArt(key) {
  if (ART[key]) return ART[key];
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F0EDE8"/><text x="100" y="112" font-size="26" fill="#B5ACA1" text-anchor="middle" font-family="system-ui,sans-serif">?</text></svg>`;
}

/** 所有已登记的插画 key，供内容校验器检查引用是否存在 */
export function listArtKeys() {
  return Object.keys(ART);
}
