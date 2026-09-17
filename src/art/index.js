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
  'science-water-cycle': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#E4F1FA"/><circle cx="150" cy="54" r="20" fill="#F5C542"/><path d="M150 22 v-9 M178 54 h9 M172 32 l7 -7 M128 32 l-7 -7" stroke="#F5C542" stroke-width="4" stroke-linecap="round"/><ellipse cx="88" cy="72" rx="36" ry="21" fill="#FFFFFF"/><ellipse cx="60" cy="80" rx="21" ry="15" fill="#FFFFFF"/><ellipse cx="118" cy="80" rx="23" ry="16" fill="#FFFFFF"/><path d="M72 100 l-4 13 M92 102 l-4 13 M112 100 l-4 13" stroke="#5AA9E6" stroke-width="5" stroke-linecap="round"/><path d="M12 152 q22 -12 44 0 t44 0 t44 0 t44 0 v36 h-176 z" fill="#5AA9E6"/><path d="M20 166 q20 -9 40 0 t40 0 t40 0" stroke="#3D8FC7" stroke-width="3" fill="none"/></svg>`,

  // 牙齿：牙冠 + 两个牙根
  'science-tooth': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#E6F4F1"/><rect x="52" y="36" width="96" height="78" rx="34" fill="#FFFFFF"/><rect x="62" y="96" width="30" height="54" rx="15" fill="#FFFFFF"/><rect x="108" y="96" width="30" height="54" rx="15" fill="#FFFFFF"/><path d="M76 62 q14 -11 32 -7" stroke="#D3E8E3" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M74 92 q26 -6 52 0" stroke="#EAF5F2" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,

  // 影子：太阳斜照，树影落在地面
  'science-shadow': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FFF8E6"/><circle cx="46" cy="46" r="22" fill="#F5C542"/><path d="M46 12 v-8 M80 46 h8 M72 20 l6 -6 M20 20 l-6 -6" stroke="#F5C542" stroke-width="4" stroke-linecap="round"/><ellipse cx="142" cy="164" rx="46" ry="12" fill="#CFC5AC"/><rect x="118" y="88" width="14" height="76" rx="7" fill="#A87B4A"/><circle cx="125" cy="74" r="28" fill="#6BAF6B"/><circle cx="108" cy="86" r="17" fill="#5A9E5A"/><circle cx="142" cy="86" r="17" fill="#5A9E5A"/><path d="M16 168 q42 -9 84 0 t84 0 v20 h-168 z" fill="#DCEBCB"/></svg>`,

  // 白天黑夜：地球被晨昏线分成明暗两半，左边太阳，右边星星
  'science-daynight': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EAF1F8"/><circle cx="100" cy="100" r="54" fill="#7FC0EA"/><path d="M100 46 a54 54 0 0 1 0 108 z" fill="#2F3E56"/><circle cx="46" cy="56" r="11" fill="#F5C542"/><path d="M46 32 v-7 M70 56 h7 M63 39 l5 -5 M29 39 l-5 -5" stroke="#F5C542" stroke-width="3.5" stroke-linecap="round"/><circle cx="134" cy="82" r="4" fill="#FFFFFF"/><circle cx="152" cy="108" r="3" fill="#FFFFFF"/><circle cx="126" cy="128" r="3.5" fill="#FFFFFF"/><circle cx="154" cy="136" r="2.5" fill="#FFFFFF"/></svg>`,

  // 彩虹：七色同心弧
  'science-rainbow': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EAF3FB"/><path d="M34 140 a66 66 0 0 1 132 0" stroke="#E24B4A" stroke-width="7" fill="none"/><path d="M42 140 a58 58 0 0 1 116 0" stroke="#F0A03C" stroke-width="7" fill="none"/><path d="M50 140 a50 50 0 0 1 100 0" stroke="#F5C542" stroke-width="7" fill="none"/><path d="M58 140 a42 42 0 0 1 84 0" stroke="#3FA96A" stroke-width="7" fill="none"/><path d="M66 140 a34 34 0 0 1 68 0" stroke="#5AA9E6" stroke-width="7" fill="none"/><path d="M74 140 a26 26 0 0 1 52 0" stroke="#4B5FA8" stroke-width="7" fill="none"/><path d="M82 140 a18 18 0 0 1 36 0" stroke="#8B7BD8" stroke-width="7" fill="none"/></svg>`,

  // 声音：喇叭 + 三层扩散声波
  'science-sound': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F2EEF8"/><path d="M44 84 h20 l26 -22 v76 l-26 -22 h-20 z" fill="#8B7BD8"/><path d="M92 78 a26 26 0 0 1 0 44" stroke="#B0A3E8" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M102 66 a40 40 0 0 1 0 68" stroke="#C4B5E0" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M112 54 a54 54 0 0 1 0 92" stroke="#D8CCE8" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,

  // 磁铁：马蹄形磁铁 + N/S 两极 + 被吸住的小铁件
  'science-magnet': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF0E8"/><path d="M62 134 V96 a38 38 0 0 1 76 0 V134" stroke="#C9542E" stroke-width="26" fill="none"/><rect x="49" y="124" width="26" height="14" rx="2" fill="#2F6FA8"/><rect x="125" y="124" width="26" height="14" rx="2" fill="#E24B4A"/><text x="62" y="135" font-size="13" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">N</text><text x="138" y="135" font-size="13" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">S</text><circle cx="76" cy="158" r="6" fill="#9AA5B1"/><circle cx="100" cy="164" r="6" fill="#9AA5B1"/><circle cx="124" cy="158" r="6" fill="#9AA5B1"/></svg>`,

  // 种子发芽：土里冒出的苗 + 两片叶 + 花
  'science-seed': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDF6EE"/><path d="M14 150 q43 -13 86 0 t86 0 v38 h-172 z" fill="#D8C6A8"/><ellipse cx="72" cy="152" rx="9" ry="6" fill="#A8895E"/><path d="M100 150 V92" stroke="#3FA96A" stroke-width="7" stroke-linecap="round"/><path d="M100 130 q-28 -4 -38 -24 q28 -4 38 24 z" fill="#6BAF6B"/><path d="M100 112 q28 -4 38 -24 q-28 -4 -38 24 z" fill="#6BAF6B"/><circle cx="100" cy="78" r="17" fill="#F5C542"/><circle cx="100" cy="78" r="7" fill="#E8A33D"/></svg>`,

  // 蜜蜂：条纹身体 + 头 + 触角 + 两片翅
  'science-bee': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FFF8E0"/><ellipse cx="112" cy="108" rx="42" ry="30" fill="#F5C542"/><ellipse cx="98" cy="108" rx="7" ry="29" fill="#3A3226"/><ellipse cx="118" cy="108" rx="7" ry="30" fill="#3A3226"/><ellipse cx="137" cy="108" rx="6" ry="25" fill="#3A3226"/><ellipse cx="116" cy="70" rx="25" ry="14" fill="#E8F2FA" transform="rotate(-22 116 70)"/><ellipse cx="140" cy="82" rx="19" ry="11" fill="#E8F2FA" transform="rotate(-32 140 82)"/><circle cx="58" cy="100" r="20" fill="#3A3226"/><path d="M48 84 q-8 -14 -2 -22 M68 84 q8 -14 2 -22" stroke="#3A3226" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="46" cy="60" r="4" fill="#3A3226"/><circle cx="70" cy="60" r="4" fill="#3A3226"/></svg>`,

  // 大熊猫：正面头部，黑耳黑眼圈
  'science-panda': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDF2F0"/><circle cx="64" cy="62" r="20" fill="#2D2A26"/><circle cx="136" cy="62" r="20" fill="#2D2A26"/><circle cx="100" cy="104" r="50" fill="#FFFFFF"/><ellipse cx="78" cy="96" rx="15" ry="17" fill="#2D2A26"/><ellipse cx="122" cy="96" rx="15" ry="17" fill="#2D2A26"/><circle cx="78" cy="97" r="6" fill="#FFFFFF"/><circle cx="122" cy="97" r="6" fill="#FFFFFF"/><ellipse cx="100" cy="122" rx="9" ry="7" fill="#2D2A26"/><path d="M100 129 q-12 12 -22 3" stroke="#2D2A26" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M100 129 q12 12 22 3" stroke="#2D2A26" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,

  /* ============ 地理军事 ============ */
  /* 注意：本领域不使用地图轮廓，改用具体地物元素。原因见文件头合规提示。 */

  // 长城：城墙 + 垛口 + 烽火台
  'geo-great-wall': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F5EDE0"/><rect x="24" y="112" width="152" height="36" fill="#C9A87C"/><rect x="36" y="94" width="18" height="18" fill="#C9A87C"/><rect x="70" y="94" width="18" height="18" fill="#C9A87C"/><rect x="112" y="94" width="18" height="18" fill="#C9A87C"/><rect x="146" y="94" width="18" height="18" fill="#C9A87C"/><rect x="82" y="64" width="36" height="48" fill="#B8935F"/><rect x="74" y="54" width="52" height="14" rx="4" fill="#A8845A"/><rect x="94" y="78" width="12" height="20" rx="5" fill="#7A5C3A"/><path d="M12 156 q44 -13 88 0 t88 0 v32 h-176 z" fill="#8FAE6B"/></svg>`,

  // 指南针：表盘 + 红蓝指针 + 刻度
  'geo-compass': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EAF2F8"/><circle cx="100" cy="100" r="62" fill="#FFFFFF" stroke="#B8C4D0" stroke-width="3"/><circle cx="100" cy="100" r="50" fill="none" stroke="#E4EBF0" stroke-width="2"/><path d="M100 42 v9 M158 100 h-9 M100 158 v-9 M42 100 h9" stroke="#8A9AA8" stroke-width="4" stroke-linecap="round"/><path d="M100 56 L112 100 L100 144 L88 100 Z" fill="#E8734A"/><path d="M100 56 L112 100 L100 100 Z" fill="#C9542E"/><circle cx="100" cy="100" r="9" fill="#2D2A26"/></svg>`,

  // 山与河：雪顶山峰 + 河流
  'geo-mountain': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#E8F2F8"/><path d="M12 142 L62 58 L96 118 L124 74 L188 142 Z" fill="#93AAB8"/><path d="M62 58 L80 88 L62 95 L46 86 Z" fill="#FFFFFF"/><path d="M124 74 L138 96 L124 101 L112 90 Z" fill="#FFFFFF"/><path d="M12 152 q30 -10 60 0 t60 0 t56 0 v36 h-176 z" fill="#5AA9E6"/></svg>`,

  // 沙漠：沙丘 + 太阳 + 仙人掌
  'geo-desert': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF3DC"/><circle cx="60" cy="54" r="19" fill="#F5A623"/><path d="M10 128 q34 -32 68 0 t68 0 t44 0 v60 h-180 z" fill="#E8C87A"/><path d="M10 148 q40 -26 80 0 t80 0 t20 0 v40 h-180 z" fill="#D9B463"/><rect x="128" y="80" width="13" height="62" rx="6" fill="#6BAF6B"/><rect x="110" y="96" width="20" height="11" rx="5" fill="#6BAF6B"/><rect x="139" y="106" width="20" height="11" rx="5" fill="#6BAF6B"/></svg>`,

  // 海洋：三层深浅水 + 小鱼 + 气泡
  'geo-ocean': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#DCEFFA"/><path d="M12 70 q22 -14 44 0 t44 0 t44 0 t44 0 v118 h-176 z" fill="#8FC9EC"/><path d="M12 108 q22 -14 44 0 t44 0 t44 0 t44 0 v80 h-176 z" fill="#5AA9E6"/><path d="M12 148 q22 -14 44 0 t44 0 t44 0 t44 0 v40 h-176 z" fill="#3D7FB8"/><ellipse cx="70" cy="94" rx="19" ry="12" fill="#F5A623"/><path d="M51 94 l-13 -9 v18 z" fill="#E8952A"/><circle cx="77" cy="90" r="3" fill="#2D2A26"/><circle cx="128" cy="136" r="4" fill="#FFFFFF" opacity="0.8"/><circle cx="146" cy="152" r="3" fill="#FFFFFF" opacity="0.8"/><circle cx="112" cy="160" r="2.5" fill="#FFFFFF" opacity="0.8"/></svg>`,

  // 火山：锥形山体 + 喷出的岩浆 + 顺坡流下
  'geo-volcano': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FBE9E4"/><path d="M18 152 L76 68 L96 96 L104 96 L124 68 L182 152 Z" fill="#8A7A72"/><path d="M76 68 L96 96 L104 96 L124 68 L110 58 L90 58 Z" fill="#5E5049"/><path d="M100 26 q12 18 5 32 q-5 10 -10 0 q-7 -14 5 -32 z" fill="#E24B4A"/><path d="M92 98 q-5 20 -13 32" stroke="#E24B4A" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M108 98 q5 18 11 28" stroke="#F5A623" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M10 152 h180 v34 h-180 z" fill="#6B8F5A"/></svg>`,

  // 四季：四格 + 每格不同颜色的树冠
  'geo-seasons': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EFF5E8"/><rect x="26" y="40" width="72" height="58" rx="9" fill="#DFF0D0"/><rect x="102" y="40" width="72" height="58" rx="9" fill="#F5E8B8"/><rect x="26" y="102" width="72" height="58" rx="9" fill="#F5D8B0"/><rect x="102" y="102" width="72" height="58" rx="9" fill="#DCE8F0"/><circle cx="62" cy="69" r="16" fill="#6BAF6B"/><circle cx="138" cy="69" r="16" fill="#F5C542"/><circle cx="62" cy="131" r="16" fill="#E8A33D"/><circle cx="138" cy="131" r="16" fill="#B8D4E8"/></svg>`,

  // 溶洞：洞顶钟乳石 + 地面石笋 + 地下河
  'geo-cave': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDE8F0"/><path d="M12 58 q44 -26 88 0 t88 0 v130 h-176 z" fill="#8A7E92"/><path d="M40 60 v22 l7 6 l7 -6 v-22 z" fill="#C4B8CC"/><path d="M76 56 v32 l7 7 l7 -7 v-32 z" fill="#D4C8DC"/><path d="M116 58 v26 l7 6 l7 -6 v-26 z" fill="#C4B8CC"/><path d="M152 64 v18 l7 6 l7 -6 v-18 z" fill="#D4C8DC"/><path d="M52 158 v-20 l7 -7 l7 7 v20 z" fill="#C4B8CC"/><path d="M96 160 v-30 l7 -7 l7 7 v30 z" fill="#D4C8DC"/><path d="M140 158 v-16 l7 -6 l7 6 v16 z" fill="#C4B8CC"/><path d="M12 170 q44 -12 88 0 t88 0 v18 h-176 z" fill="#5A8FA8"/></svg>`,

  // 烽火台：山脊上的方台 + 烟火
  'geo-signal': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F5EDE0"/><path d="M12 152 q40 -30 88 -14 t88 14 v36 h-176 z" fill="#B8A67C"/><rect x="76" y="104" width="48" height="48" fill="#C9A87C"/><path d="M70 104 h60 l-7 -14 h-46 z" fill="#A8845A"/><path d="M86 104 v-14 M100 104 v-14 M114 104 v-14" stroke="#8A6B44" stroke-width="4"/><path d="M100 84 q11 -16 4 -28 q-4 -8 -8 0 q-6 12 4 28 z" fill="#F5A623"/><circle cx="90" cy="48" r="7" fill="#D8D0C0"/><circle cx="110" cy="38" r="6" fill="#E0D8C8"/><circle cx="100" cy="26" r="5" fill="#E8E0D0"/></svg>`,

  // 灯塔：塔身红白条 + 顶部灯光向两侧照 + 海浪
  'geo-lighthouse': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#E4EFF8"/><path d="M12 150 q22 -12 44 0 t44 0 t44 0 t44 0 v38 h-176 z" fill="#5AA9E6"/><path d="M86 148 L92 62 h16 l6 86 z" fill="#F2F4F8"/><rect x="88" y="84" width="24" height="10" fill="#E24B4A"/><rect x="90" y="110" width="20" height="10" fill="#E24B4A"/><rect x="90" y="46" width="20" height="18" rx="3" fill="#F5C542"/><path d="M90 52 h-32 v-9 h32 z" fill="#FFE082" opacity="0.85"/><path d="M110 52 h32 v-9 h-32 z" fill="#FFE082" opacity="0.85"/><path d="M84 46 h32 l-4 -8 h-24 z" fill="#C9542E"/></svg>`,

  /* ============ 人文科技 ============ */

  // 电灯：灯泡 + 光晕 + 灯座
  'culture-bulb': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FFF6E0"/><path d="M100 32 v-12 M150 52 l8 -8 M50 52 l-8 -8 M162 100 h12 M26 100 h12" stroke="#F0C040" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="90" r="44" fill="#FFE082" stroke="#F0C040" stroke-width="2"/><path d="M86 94 q14 20 28 0" stroke="#E8A33D" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M88 106 q12 16 24 0" stroke="#E8A33D" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="84" y="132" width="32" height="11" rx="4" fill="#9AA5B1"/><rect x="84" y="147" width="32" height="11" rx="4" fill="#9AA5B1"/><rect x="84" y="162" width="32" height="11" rx="4" fill="#9AA5B1"/></svg>`,

  // 桥：单拱 + 栏杆
  'culture-bridge': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#E8F2F8"/><path d="M28 142 q72 -78 144 0" stroke="#C9773C" stroke-width="13" fill="none" stroke-linecap="round"/><rect x="20" y="128" width="160" height="16" rx="5" fill="#A85F2E"/><path d="M46 128 v-16 M76 128 v-27 M100 128 v-31 M124 128 v-27 M154 128 v-16" stroke="#C9773C" stroke-width="4" stroke-linecap="round"/><path d="M12 158 q22 -9 44 0 t44 0 t44 0 t44 0 v30 h-176 z" fill="#6FB3DE"/></svg>`,

  // 火箭：机身 + 舷窗 + 尾焰
  'culture-rocket': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDEAFB"/><path d="M74 120 l-18 34 h18 z" fill="#E8734A"/><path d="M126 120 l18 34 h-18 z" fill="#E8734A"/><path d="M100 28 q26 34 26 76 v34 h-52 v-34 q0 -42 26 -76 z" fill="#F2F4F8" stroke="#C8D0DA" stroke-width="2"/><path d="M100 28 q13 17 19 36 h-38 q6 -19 19 -36 z" fill="#E8734A"/><circle cx="100" cy="92" r="12" fill="#5AA9E6" stroke="#B8C4D0" stroke-width="2"/><path d="M100 144 q11 18 0 34 q-11 -16 0 -34 z" fill="#F5A623"/><path d="M100 148 q6 12 0 22 q-6 -10 0 -22 z" fill="#FFE082"/></svg>`,

  // 造纸术：两张纸叠放 + 纤维纹路
  'culture-paper': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F5F0E4"/><rect x="40" y="44" width="78" height="102" rx="4" fill="#FFFFFF" stroke="#D8D0C0" stroke-width="2"/><rect x="56" y="60" width="46" height="4" rx="2" fill="#D0C8B8"/><rect x="56" y="76" width="46" height="4" rx="2" fill="#D0C8B8"/><rect x="56" y="92" width="46" height="4" rx="2" fill="#D0C8B8"/><rect x="56" y="108" width="30" height="4" rx="2" fill="#D0C8B8"/><rect x="88" y="70" width="76" height="94" rx="4" fill="#FFFFFF" stroke="#C8C0B0" stroke-width="2"/><path d="M104 96 q16 -10 26 4 t-6 24" stroke="#C8C0B0" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M112 116 q14 -8 22 4 t-4 20" stroke="#D8D0C0" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,

  // 钟表：表盘 + 时分针 + 刻度
  'culture-clock': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDF1F7"/><circle cx="100" cy="100" r="62" fill="#FFFFFF" stroke="#8A9AA8" stroke-width="5"/><circle cx="100" cy="100" r="54" fill="none" stroke="#E4EBF0" stroke-width="2"/><path d="M100 52 v10 M148 100 h-10 M100 148 v-10 M52 100 h10" stroke="#5A6A78" stroke-width="6" stroke-linecap="round"/><path d="M100 100 V64" stroke="#2D2A26" stroke-width="6" stroke-linecap="round"/><path d="M100 100 h26" stroke="#2D2A26" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="100" r="8" fill="#E8734A"/></svg>`,

  // 轮子：两个咬合的齿轮
  'culture-wheel': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F2F0E8"/><circle cx="74" cy="90" r="36" fill="#C9A87C"/><circle cx="74" cy="90" r="12" fill="#F2F0E8"/><path d="M74 44 v-12 M74 136 v12 M28 90 h-12 M120 90 h12 M41 57 l-9 -9 M107 57 l9 -9 M41 123 l-9 9 M107 123 l9 9" stroke="#C9A87C" stroke-width="9" stroke-linecap="round"/><circle cx="140" cy="128" r="27" fill="#8AA8C4"/><circle cx="140" cy="128" r="9" fill="#F2F0E8"/><path d="M140 94 v-8 M140 162 v8 M106 128 h-8 M174 128 h8 M116 104 l-6 -6 M164 104 l6 -6 M116 152 l-6 6 M164 152 l6 6" stroke="#8AA8C4" stroke-width="7" stroke-linecap="round"/></svg>`,

  // 电话：听筒 + 两侧声波
  'culture-phone': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#E8F4F0"/><path d="M62 40 q-15 0 -17 15 q-4 35 21 63 t63 21 q15 -2 15 -17 v-12 q0 -8 -8 -10 l-18 -5 q-7 -2 -11 5 l-6 10 q-16 -8 -26 -26 l10 -6 q7 -4 5 -11 l-5 -18 q-2 -8 -10 -8 z" fill="#3D8F7A"/><path d="M132 60 q14 12 0 24" stroke="#5AA9E6" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M148 46 q24 22 0 46" stroke="#8FC9EC" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,

  // 飞机：机身 + 机翼 + 云
  'culture-plane': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#E4EFF8"/><ellipse cx="48" cy="152" rx="28" ry="14" fill="#FFFFFF"/><ellipse cx="76" cy="156" rx="20" ry="11" fill="#FFFFFF"/><ellipse cx="150" cy="46" rx="22" ry="11" fill="#FFFFFF"/><path d="M100 34 q9 20 9 44 v20 l44 24 v13 l-44 -13 v20 l15 11 v9 l-24 -7 l-24 7 v-9 l15 -11 v-20 l-44 13 v-13 l44 -24 v-20 q0 -24 9 -44 z" fill="#5A8FBF"/><circle cx="100" cy="62" r="6" fill="#DCEAF5"/></svg>`,

  // 潜水艇：艇身 + 潜望镜 + 螺旋桨 + 水
  'culture-submarine': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#DCEAF5"/><path d="M12 44 q22 -12 44 0 t44 0 t44 0 t44 0 v144 h-176 z" fill="#A8D4EE" opacity="0.55"/><ellipse cx="98" cy="122" rx="60" ry="25" fill="#F5C542"/><rect x="92" y="74" width="9" height="26" fill="#E8A33D"/><rect x="86" y="64" width="24" height="12" rx="3" fill="#E8A33D"/><circle cx="70" cy="122" r="7" fill="#8FC9EC"/><circle cx="98" cy="122" r="7" fill="#8FC9EC"/><circle cx="126" cy="122" r="7" fill="#8FC9EC"/><path d="M158 122 l16 -13 v26 z" fill="#E8A33D"/><path d="M38 122 l-16 -13 v26 z" fill="#E8A33D"/><path d="M12 168 q22 -10 44 0 t44 0 t44 0 t44 0 v32 h-176 z" fill="#8FC9EC"/></svg>`,

  // 计算机：芯片 + 引脚 + 0/1
  'culture-computer': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#E8F0F4"/><rect x="58" y="58" width="84" height="84" rx="10" fill="#3D5A6C"/><rect x="74" y="74" width="52" height="52" rx="6" fill="#8FD0E4"/><path d="M72 58 v-14 M92 58 v-14 M112 58 v-14 M128 58 v-14 M72 142 v14 M92 142 v14 M112 142 v14 M128 142 v14 M58 72 h-14 M58 92 h-14 M58 112 h-14 M58 128 h-14 M142 72 h14 M142 92 h14 M142 112 h14 M142 128 h14" stroke="#5A7A8C" stroke-width="5" stroke-linecap="round"/><text x="100" y="109" font-size="19" font-weight="700" fill="#2D4A5C" text-anchor="middle" font-family="system-ui,sans-serif">01</text></svg>`,

  /* ============ 逻辑思维 ============ */

  // 找规律：圆-方-圆 / 圆-?-圆，虚线框为待填
  'logic-pattern': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F0F4E8"/><circle cx="52" cy="62" r="17" fill="#6BAF6B"/><rect x="83" y="45" width="34" height="34" rx="6" fill="#E8A33D"/><circle cx="148" cy="62" r="17" fill="#6BAF6B"/><circle cx="52" cy="128" r="17" fill="#6BAF6B"/><rect x="83" y="111" width="34" height="34" rx="6" fill="none" stroke="#A8BC94" stroke-width="3" stroke-dasharray="6 5"/><text x="100" y="136" font-size="24" font-weight="500" fill="#8A9A78" text-anchor="middle" font-family="system-ui,sans-serif">?</text><circle cx="148" cy="128" r="17" fill="#6BAF6B"/></svg>`,

  // 大小比较：一大一小两个圆
  'logic-compare': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F5EEF8"/><circle cx="66" cy="84" r="38" fill="#9B7BD8"/><circle cx="140" cy="112" r="22" fill="#C4AEE8"/><path d="M40 152 h120" stroke="#D8CCE8" stroke-width="3" stroke-linecap="round"/></svg>`,

  // 数量：八个点，两色分组
  'logic-counting': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#E8F5EE"/><circle cx="58" cy="62" r="15" fill="#3FA96A"/><circle cx="100" cy="62" r="15" fill="#3FA96A"/><circle cx="142" cy="62" r="15" fill="#3FA96A"/><circle cx="58" cy="104" r="15" fill="#3FA96A"/><circle cx="100" cy="104" r="15" fill="#3FA96A"/><circle cx="58" cy="146" r="15" fill="#8FD4AC"/><circle cx="100" cy="146" r="15" fill="#8FD4AC"/><circle cx="142" cy="146" r="15" fill="#8FD4AC"/></svg>`,

  // 分类：两个方框，分别装着圆和方
  'logic-classify': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F0F4E8"/><rect x="26" y="52" width="66" height="96" rx="14" fill="#FFFFFF" stroke="#A8BC94" stroke-width="3"/><rect x="108" y="52" width="66" height="96" rx="14" fill="#FFFFFF" stroke="#A8BC94" stroke-width="3"/><circle cx="48" cy="82" r="10" fill="#6BAF6B"/><circle cx="74" cy="82" r="10" fill="#6BAF6B"/><circle cx="48" cy="116" r="10" fill="#6BAF6B"/><rect x="122" y="72" width="20" height="20" rx="4" fill="#E8A33D"/><rect x="148" y="72" width="20" height="20" rx="4" fill="#E8A33D"/><rect x="122" y="106" width="20" height="20" rx="4" fill="#E8A33D"/></svg>`,

  // 时间顺序：1-2-3 三步 + 箭头
  'logic-timeline': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EEF4F8"/><path d="M34 100 h126" stroke="#B8C4D0" stroke-width="4" stroke-linecap="round"/><path d="M176 100 l-14 -9 v18 z" fill="#8A9AA8"/><circle cx="52" cy="100" r="17" fill="#5AA9E6"/><text x="52" y="106" font-size="17" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">1</text><circle cx="100" cy="100" r="17" fill="#8FC4E8"/><text x="100" y="106" font-size="17" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">2</text><circle cx="148" cy="100" r="17" fill="#B8DCF0"/><text x="148" y="106" font-size="17" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">3</text></svg>`,

  // 一一对应：上排三个图形，下排三个搭档，虚线相连
  'logic-correspondence': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EAF4F0"/><rect x="44" y="42" width="30" height="34" rx="7" fill="#3FA96A"/><rect x="85" y="42" width="30" height="34" rx="7" fill="#E8A33D"/><rect x="126" y="42" width="30" height="34" rx="7" fill="#5AA9E6"/><path d="M59 80 v22 M100 80 v22 M141 80 v22" stroke="#B5C9C0" stroke-width="3" stroke-dasharray="6 5"/><rect x="40" y="106" width="38" height="13" rx="6" fill="#3FA96A"/><rect x="81" y="106" width="38" height="13" rx="6" fill="#E8A33D"/><rect x="122" y="106" width="38" height="13" rx="6" fill="#5AA9E6"/><rect x="40" y="134" width="120" height="30" rx="10" fill="none" stroke="#C8DCD4" stroke-width="3"/></svg>`,

  // 守恒：细高杯与矮宽杯装着「一样多」的水，中间虚线为界
  'logic-conservation': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F5EEF8"/><path d="M100 36 v128" stroke="#D8CCE8" stroke-width="2" stroke-dasharray="7 6"/><path d="M42 56 h32 v80 a16 16 0 0 1 -32 0 z" fill="none" stroke="#B0A3E8" stroke-width="4"/><path d="M46 92 h24 v44 a12 12 0 0 1 -24 0 z" fill="#8B7BD8"/><path d="M124 76 h52 v52 a26 26 0 0 1 -52 0 z" fill="none" stroke="#B0A3E8" stroke-width="4"/><path d="M128 98 h44 v30 a22 22 0 0 1 -44 0 z" fill="#8B7BD8"/></svg>`,

  // 包含：三层同心圆，从外到里是食物 / 水果 / 苹果
  'logic-include': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F2F5EC"/><circle cx="100" cy="104" r="64" fill="#D8E8C8"/><circle cx="100" cy="112" r="42" fill="#A8D08A"/><circle cx="100" cy="120" r="21" fill="#6BAF6B"/><path d="M100 106 q0 -9 6 -12" stroke="#3D7A3D" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M106 96 q9 -3 11 4 q-9 4 -11 -4 z" fill="#3D7A3D"/></svg>`,

  // 传递：三个人由高到矮
  'logic-transitive': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EEF2F8"/><circle cx="52" cy="60" r="13" fill="#5AA9E6"/><path d="M52 76 v34 M52 86 l-11 10 M52 86 l11 10 M52 110 l-9 20 M52 110 l9 20" stroke="#5AA9E6" stroke-width="7" stroke-linecap="round" fill="none"/><circle cx="100" cy="76" r="12" fill="#8FC4E8"/><path d="M100 90 v28 M100 98 l-10 9 M100 98 l10 9 M100 118 l-8 18 M100 118 l8 18" stroke="#8FC4E8" stroke-width="7" stroke-linecap="round" fill="none"/><circle cx="146" cy="94" r="11" fill="#B8DCF0"/><path d="M146 107 v22 M146 113 l-9 8 M146 113 l9 8 M146 129 l-7 16 M146 129 l7 16" stroke="#B8DCF0" stroke-width="6" stroke-linecap="round" fill="none"/></svg>`,

  // 找不同：三个绿圆 + 一个橙方
  'logic-odd-one-out': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F8F0EE"/><circle cx="60" cy="68" r="22" fill="#6BAF6B"/><circle cx="140" cy="68" r="22" fill="#6BAF6B"/><circle cx="60" cy="134" r="22" fill="#6BAF6B"/><rect x="118" y="112" width="44" height="44" rx="9" fill="#E8734A"/></svg>`,

  /* ============ 空间思维 ============ */

  // 立方体：等轴测三面
  'space-cube': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDF1F7"/><path d="M100 40 L158 74 L100 108 L42 74 Z" fill="#B5D4F4"/><path d="M42 74 L100 108 L100 164 L42 130 Z" fill="#85B7EB"/><path d="M158 74 L100 108 L100 164 L158 130 Z" fill="#5A96D6"/></svg>`,

  // 方位：中心点 + 四向箭头
  'space-directions': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EEF4F8"/><path d="M100 74 v-24 M100 126 v24 M74 100 h-24 M126 100 h24" stroke="#8FC4E8" stroke-width="9" stroke-linecap="round"/><path d="M100 36 l-11 15 h22 z" fill="#E8734A"/><path d="M100 164 l-11 -15 h22 z" fill="#5AA9E6"/><path d="M36 100 l15 -11 v22 z" fill="#5AA9E6"/><path d="M164 100 l-15 -11 v22 z" fill="#5AA9E6"/><circle cx="100" cy="100" r="14" fill="#8A9AA8"/></svg>`,

  // 对称：虚线中轴 + 左右镜像图形
  'space-symmetry': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F2EEF8"/><path d="M100 26 V174" stroke="#C4B5E0" stroke-width="3" stroke-dasharray="8 7"/><path d="M100 46 L64 78 L76 132 L100 154 Z" fill="#8B7BD8"/><path d="M100 46 L136 78 L124 132 L100 154 Z" fill="#B0A3E8"/></svg>`,

  // 圆与球：左边圆（标半径）+ 右边球（经纬线）
  'space-circle': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDF1F7"/><circle cx="60" cy="100" r="36" fill="#B5D4F4" stroke="#5A96D6" stroke-width="3"/><circle cx="60" cy="100" r="5" fill="#5A96D6"/><path d="M60 100 h36" stroke="#5A96D6" stroke-width="3" stroke-dasharray="5 4"/><circle cx="142" cy="100" r="36" fill="#85B7EB"/><ellipse cx="142" cy="100" rx="36" ry="13" fill="none" stroke="#4A86C6" stroke-width="2" opacity="0.55"/><ellipse cx="142" cy="100" rx="13" ry="36" fill="none" stroke="#4A86C6" stroke-width="2" opacity="0.55"/></svg>`,

  // 平面图：从正上方看到的房间布局
  'space-map': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EFF4F8"/><rect x="34" y="40" width="132" height="120" rx="6" fill="#FFFFFF" stroke="#8A9AA8" stroke-width="3"/><circle cx="68" cy="72" r="18" fill="#B5D4F4"/><rect x="106" y="52" width="46" height="12" rx="3" fill="#E8A33D"/><rect x="106" y="74" width="46" height="12" rx="3" fill="#E8A33D"/><rect x="52" y="112" width="96" height="14" rx="4" fill="#C4D4E0"/><rect x="52" y="136" width="58" height="12" rx="3" fill="#C4D4E0"/></svg>`,

  // 对折：两半纸 + 中间折痕 + 箭头
  'space-fold': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F2EEF8"/><rect x="30" y="56" width="68" height="88" rx="4" fill="#FFFFFF" stroke="#B0A3E8" stroke-width="3"/><rect x="102" y="56" width="68" height="88" rx="4" fill="#EDE8FA" stroke="#B0A3E8" stroke-width="3"/><path d="M100 46 V154" stroke="#8B7BD8" stroke-width="3" stroke-dasharray="8 7"/><path d="M44 100 h18 M56 92 l12 8 l-12 8" stroke="#8B7BD8" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // 镜像：中间镜面 + 左右两半（一边实色一边淡色）
  'space-mirror': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EEF4F8"/><path d="M92 34 q-46 24 -46 66 t46 66 z" fill="#F5C542"/><path d="M108 34 q46 24 46 66 t-46 66 z" fill="#B8D4E8"/><rect x="96" y="30" width="8" height="140" rx="4" fill="#8A9AA8"/><path d="M62 90 v24 M52 102 h20" stroke="#8A6B2A" stroke-width="4" stroke-linecap="round"/><path d="M138 90 v24 M128 102 h20" stroke="#5A7A94" stroke-width="4" stroke-linecap="round"/></svg>`,

  // 旋转：方形转 90 度，弧形箭头指示
  'space-rotate': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDF1F7"/><rect x="28" y="58" width="50" height="50" rx="4" fill="#B5D4F4"/><rect x="112" y="100" width="50" height="50" rx="4" fill="#5A96D6"/><path d="M88 92 q14 -30 46 -22" stroke="#8A9AA8" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M132 62 l6 12 l-13 1 z" fill="#8A9AA8"/><circle cx="100" cy="100" r="6" fill="#C4D4E0"/></svg>`,

  // 大小套嵌：三个由大到小的套娃
  'space-nest': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F5F0E4"/><path d="M52 158 q-5 -56 13 -79 q6 -9 13 0 q18 23 13 79 z" fill="#E8734A"/><path d="M98 158 q-4 -41 10 -58 q5 -7 10 0 q14 17 10 58 z" fill="#5AA9E6"/><path d="M134 158 q-3 -28 8 -40 q3 -5 7 0 q11 12 8 40 z" fill="#6BAF6B"/><circle cx="65" cy="98" r="5" fill="#FFFFFF"/><circle cx="108" cy="118" r="4" fill="#FFFFFF"/><circle cx="141" cy="132" r="3" fill="#FFFFFF"/></svg>`,

  // 走路线：方格纸 + 一条直路一条绕路
  'space-path': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EFF4F8"/><path d="M36 36 h128 M36 68 h128 M36 100 h128 M36 132 h128 M36 164 h128" stroke="#D8E4EC" stroke-width="2"/><path d="M36 36 v128 M68 36 v128 M100 36 v128 M132 36 v128 M164 36 v128" stroke="#D8E4EC" stroke-width="2"/><path d="M52 52 h64 v64" stroke="#6BAF6B" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M52 52 h32 v32 h32 v32" stroke="#E8734A" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="52" cy="52" r="8" fill="#5AA9E6"/><circle cx="116" cy="116" r="8" fill="#F5C542"/></svg>`,

  /* ============ 英语 ============ */

  // 字母：ABC 三张卡片
  'english-letters': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF0E8"/><rect x="28" y="50" width="44" height="54" rx="11" fill="#E8734A"/><text x="50" y="90" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">A</text><rect x="78" y="74" width="44" height="54" rx="11" fill="#F0A03C"/><text x="100" y="114" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">B</text><rect x="128" y="98" width="44" height="54" rx="11" fill="#F5C542"/><text x="150" y="138" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">C</text></svg>`,

  // 颜色：四色圆点
  'english-colors': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#F8F4F0"/><circle cx="72" cy="76" r="28" fill="#E24B4A"/><circle cx="128" cy="76" r="28" fill="#F5C542"/><circle cx="72" cy="132" r="28" fill="#5AA9E6"/><circle cx="128" cy="132" r="28" fill="#3FA96A"/></svg>`,

  // 数字：123 三张卡片
  'english-numbers': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EAF3F8"/><rect x="32" y="44" width="44" height="54" rx="11" fill="#2F7BAF"/><text x="54" y="84" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">1</text><rect x="78" y="68" width="44" height="54" rx="11" fill="#4E9BD1"/><text x="100" y="108" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">2</text><rect x="124" y="92" width="44" height="54" rx="11" fill="#85C4EE"/><text x="146" y="132" font-size="30" font-weight="500" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">3</text></svg>`,

  // 动物：猫脸 + 耳朵 + 胡须
  'english-animals': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FBF0E4"/><path d="M64 76 L60 36 L94 60 Z" fill="#D9903F"/><path d="M136 76 L140 36 L106 60 Z" fill="#D9903F"/><circle cx="100" cy="108" r="48" fill="#F0B75E"/><circle cx="83" cy="100" r="7" fill="#3A3226"/><circle cx="117" cy="100" r="7" fill="#3A3226"/><path d="M100 122 L93 114 h14 z" fill="#D2694A"/><path d="M100 122 q-11 13 -21 5" stroke="#3A3226" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M100 122 q11 13 21 5" stroke="#3A3226" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M46 104 H26 M48 118 H30 M154 104 h20 M152 118 h18" stroke="#C9B79E" stroke-width="3" stroke-linecap="round"/></svg>`,

  // 身体：头 + 躯干 + 四肢的简化人形
  'english-body': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EAF4F0"/><circle cx="100" cy="56" r="24" fill="#F0C9A8"/><rect x="92" y="80" width="16" height="50" rx="8" fill="#5AA9E6"/><path d="M100 90 L64 108 M100 90 L136 108" stroke="#5AA9E6" stroke-width="12" stroke-linecap="round"/><path d="M100 128 L79 166 M100 128 L121 166" stroke="#3D7FB8" stroke-width="12" stroke-linecap="round"/></svg>`,

  // 家人：两个大人 + 一个小孩
  'english-family': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF2EE"/><circle cx="58" cy="72" r="15" fill="#E8734A"/><path d="M58 92 v36 M58 102 l-13 12 M58 102 l13 12 M58 128 l-10 22 M58 128 l10 22" stroke="#E8734A" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="142" cy="72" r="15" fill="#C9773C"/><path d="M142 92 v36 M142 102 l-13 12 M142 102 l13 12 M142 128 l-10 22 M142 128 l10 22" stroke="#C9773C" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="100" cy="106" r="12" fill="#5AA9E6"/><path d="M100 122 v26 M100 130 l-11 10 M100 130 l11 10 M100 148 l-9 18 M100 148 l9 18" stroke="#5AA9E6" stroke-width="7" stroke-linecap="round" fill="none"/></svg>`,

  // 食物：盘子 + 面包 + 煎蛋
  'english-food': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FFF6E8"/><ellipse cx="100" cy="128" rx="64" ry="19" fill="#FFFFFF" stroke="#E8DCC8" stroke-width="3"/><path d="M44 108 q0 -22 26 -22 h20 q26 0 26 22 v14 h-72 z" fill="#E0A96D"/><path d="M54 96 q10 -8 24 -8" stroke="#C98F52" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="140" cy="104" rx="25" ry="19" fill="#FFFFFF" stroke="#E8DCC8" stroke-width="2"/><circle cx="140" cy="104" r="10" fill="#F5C542"/></svg>`,

  // 天气：太阳 + 云
  'english-weather': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EAF4FB"/><circle cx="64" cy="70" r="25" fill="#F5C542"/><path d="M64 30 v-8 M104 70 h8 M94 42 l6 -6 M34 42 l-6 -6 M24 70 h-8 M94 98 l6 6 M34 98 l-6 6" stroke="#F5C542" stroke-width="4" stroke-linecap="round"/><ellipse cx="128" cy="112" rx="34" ry="21" fill="#FFFFFF"/><ellipse cx="102" cy="120" rx="20" ry="15" fill="#FFFFFF"/><ellipse cx="154" cy="120" rx="20" ry="15" fill="#FFFFFF"/></svg>`,

  // 动作：奔跑的人形 + 速度线
  'english-actions': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDF6EE"/><path d="M36 84 h22 M28 102 h18 M40 120 h16" stroke="#8FD4AC" stroke-width="5" stroke-linecap="round"/><circle cx="112" cy="52" r="16" fill="#E8734A"/><path d="M112 70 v34" stroke="#E8734A" stroke-width="11" stroke-linecap="round"/><path d="M112 78 L84 62 M112 78 L142 92" stroke="#E8734A" stroke-width="10" stroke-linecap="round"/><path d="M112 104 L88 130 L74 162 M112 104 L134 132 L146 160" stroke="#C9542E" stroke-width="10" stroke-linecap="round" fill="none"/></svg>`,

  // 礼貌用语：两个对话气泡
  'english-greetings': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF3E8"/><rect x="36" y="46" width="104" height="66" rx="20" fill="#FFFFFF" stroke="#E8DCC8" stroke-width="3"/><path d="M62 112 l-4 22 l24 -22 z" fill="#FFFFFF" stroke="#E8DCC8" stroke-width="3" stroke-linejoin="round"/><text x="88" y="91" font-size="30" font-weight="500" fill="#E8734A" text-anchor="middle" font-family="system-ui,sans-serif">Hi</text><rect x="112" y="116" width="58" height="40" rx="15" fill="#5AA9E6"/><text x="141" y="144" font-size="24" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">!</text></svg>`,

  /* ───── 以下 5 张只服务 6-8 档 ─────
   * 配套的知识点 ageBands 也只写 ['6-8']。
   * 画法上刻意全部用「字母/词」当主体，和前面 10 张（靠图形认词）区分开。 */

  // 自然拼读：三行词卡，首字母不同、结尾都是 at
  'english-phonics': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF0E8"/><rect x="44" y="38" width="36" height="36" rx="10" fill="#E8734A"/><text x="62" y="63" font-size="23" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">c</text><rect x="86" y="38" width="70" height="36" rx="10" fill="#F7E4D3"/><text x="121" y="63" font-size="23" font-weight="500" fill="#C08A55" text-anchor="middle" font-family="system-ui,sans-serif">at</text><rect x="44" y="82" width="36" height="36" rx="10" fill="#F0A03C"/><text x="62" y="107" font-size="23" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">b</text><rect x="86" y="82" width="70" height="36" rx="10" fill="#F7E4D3"/><text x="121" y="107" font-size="23" font-weight="500" fill="#C08A55" text-anchor="middle" font-family="system-ui,sans-serif">at</text><rect x="44" y="126" width="36" height="36" rx="10" fill="#F5C542"/><text x="62" y="151" font-size="23" font-weight="600" fill="#FFFFFF" text-anchor="middle" font-family="system-ui,sans-serif">h</text><rect x="86" y="126" width="70" height="36" rx="10" fill="#F7E4D3"/><text x="121" y="151" font-size="23" font-weight="500" fill="#C08A55" text-anchor="middle" font-family="system-ui,sans-serif">at</text></svg>`,

  // 短句：一句话写在卡片里，下面三个点代表三个词
  'english-sentences': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EAF3F8"/><rect x="34" y="60" width="132" height="54" rx="17" fill="#FFFFFF" stroke="#CFE3F0" stroke-width="3"/><text x="100" y="95" font-size="21" font-weight="500" fill="#2F7BAF" text-anchor="middle" font-family="system-ui,sans-serif">I like apples.</text><circle cx="72" cy="138" r="9" fill="#5AA9E6"/><circle cx="100" cy="138" r="9" fill="#85C4EE"/><circle cx="128" cy="138" r="9" fill="#B8DCF5"/></svg>`,

  // 方位词：同一个球，在盒子上 / 里 / 下
  'english-prepositions': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EDF6EE"/><circle cx="100" cy="62" r="15" fill="#E8734A"/><rect x="52" y="78" width="96" height="48" rx="8" fill="#F4FBF6" stroke="#8FD4AC" stroke-width="3"/><circle cx="100" cy="102" r="14" fill="#F0A03C"/><circle cx="100" cy="140" r="15" fill="#5AA9E6"/></svg>`,

  // 疑问词：三个词竖排，左边各一个小圆点
  'english-questions': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#FDF2EE"/><circle cx="62" cy="60" r="7" fill="#E8734A"/><text x="80" y="67" font-size="19" font-weight="500" fill="#8A6A50" font-family="system-ui,sans-serif">what</text><circle cx="62" cy="100" r="7" fill="#F0A03C"/><text x="80" y="107" font-size="19" font-weight="500" fill="#8A6A50" font-family="system-ui,sans-serif">where</text><circle cx="62" cy="140" r="7" fill="#5AA9E6"/><text x="80" y="147" font-size="19" font-weight="500" fill="#8A6A50" font-family="system-ui,sans-serif">who</text></svg>`,

  // 时间词：太阳 + 月亮 + 时钟
  'english-time': `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="88" fill="#EAF4FB"/><circle cx="58" cy="62" r="18" fill="#F5C542"/><path d="M58 32 v-6 M58 92 v6 M28 62 h-6 M88 62 h6 M37 41 l-5 -5 M79 41 l5 -5 M37 83 l-5 5 M79 83 l5 5" stroke="#F5C542" stroke-width="4" stroke-linecap="round"/><circle cx="146" cy="62" r="20" fill="#3D5A80"/><circle cx="155" cy="55" r="17" fill="#EAF4FB"/><circle cx="100" cy="138" r="28" fill="#FFFFFF" stroke="#5AA9E6" stroke-width="4"/><path d="M100 138 V119 M100 138 L115 146" stroke="#2F7BAF" stroke-width="4" stroke-linecap="round"/></svg>`,
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
