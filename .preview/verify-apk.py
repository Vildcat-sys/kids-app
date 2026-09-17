"""验证 APK 里的 web 资源确实是本次构建的新版本，而不是旧缓存。

背景：这一轮踩了一个不报错的坑 —— 只跑 `npm run www` 不跑 `cap copy`，
Gradle 会报 BUILD SUCCESSFUL 但 93 个任务全 UP-TO-DATE，打出来的还是旧包。
所以「构建成功」不等于「内容更新」，必须开包验。
"""
import zipfile

APK = r'D:\Wordbuddy-Demo\kids-app\android\app\build\outputs\apk\debug\app-debug.apk'

# (压缩包内路径, 必须包含的字符串, 说明)
CHECKS = [
    ('assets/public/src/core/prefs.js', b'validBands', '年龄偏好模块已打包（注入式白名单）'),
    ('assets/public/src/data/index.js', b'getTopicsForAge', '年龄过滤查询函数'),
    ('assets/public/src/data/index.js', b'AGE_BAND_IDS', '档位白名单导出'),
    ('assets/public/src/data/science.js', b"ageBands: ['6-8']", '生活科普：单档知识点'),
    ('assets/public/src/data/science.js', b"ageBands: ['3-5', '6-8']", '生活科普：跨档知识点'),
    ('assets/public/src/data/geo.js', b'ageBands', '地理军事：档位字段'),
    ('assets/public/src/data/culture.js', b'ageBands', '人文科技：档位字段'),
    ('assets/public/src/data/logic.js', b'ageBands', '逻辑思维：档位字段'),
    ('assets/public/src/data/space.js', b'ageBands', '空间思维：档位字段'),
    ('assets/public/src/data/english.js', b'ageBands', '英语：档位字段'),
    ('assets/public/src/data/english.js', b"id: 'english-phonics'", '英语新增：自然拼读'),
    ('assets/public/src/data/english.js', b"id: 'english-sentences'", '英语新增：短句'),
    ('assets/public/src/data/english.js', b"id: 'english-prepositions'", '英语新增：方位词'),
    ('assets/public/src/data/english.js', b"id: 'english-questions'", '英语新增：疑问词'),
    ('assets/public/src/data/english.js', b"id: 'english-time'", '英语新增：时间词'),
    ('assets/public/src/art/index.js', b"'english-phonics'", '新增插画：自然拼读'),
    ('assets/public/src/art/index.js', b"'english-time'", '新增插画：时间词'),
    ('assets/public/src/ui/age-bar.js', b'age-chips', '档位按钮容器（独立模块后实际位置）'),
    ('assets/public/src/ui/age-bar.js', b'age-bar-ask', '首次年龄引导样式'),
    ('assets/public/src/ui/topic.js', b'topic-head-band', '领域页档位胶囊'),
    ('assets/public/src/main.js', b'AGE_BAND_IDS', '装配层注入白名单'),
    ('assets/public/src/styles.css', b'.age-chip', '档位按钮样式'),
    ('assets/public/src/data/index.js', b'getGroupsForAge', '主题分组函数'),
    ('assets/public/src/data/index.js', b"id: 'world'", '主题分组：看世界'),
    ('assets/public/src/data/index.js', b"id: 'mind'", '主题分组：动脑筋'),
    ('assets/public/src/data/logic.js', b'#0F8B8D', '撞色修复：逻辑思维换青绿'),
    ('assets/public/src/main.js', b"'#/map'", '地图页 hash 路由'),
    ('assets/public/src/ui/map.js', b'renderMap', '地图页主函数'),
    ('assets/public/src/ui/map.js', b'export function layoutDots', '布点算法（可测导出）'),
    ('assets/public/src/ui/map.js', b'transform="translate(', '驿站 transform 已应用（修复上一版漏拼 bug）'),
    ('assets/public/src/ui/age-bar.js', b'renderAgeBar', '档位条独立模块'),
    ('assets/public/src/ui/home.js', b'MAP_ICON', '地图入口图标'),
    ('assets/public/src/ui/home.js', b'map-entry', '地图入口样式钩子'),
    ('assets/public/src/styles.css', b'.map-isle', '地图页：岛屿样式'),
    ('assets/public/src/styles.css', b'.map-overview', '地图页：总览条样式'),
    ('assets/public/src/core/store.js', b'learnedAt', '复习机制：掌握时间戳'),
    ('assets/public/src/core/store.js', b'needsReview', '复习机制：温习判定'),
    ('assets/public/src/core/store.js', b'touchLearned', '复习机制：复习后刷新时刻'),
    ('assets/public/src/core/store.js', b'CURRENT_VERSION = 3', 'store 数据版本升级'),
    ('assets/public/src/ui/map.js', b"state === 'review'", '地图：复习态渲染'),
    ('assets/public/src/ui/map.js', b'map-overview-review', '地图：复习提示样式钩子'),
    ('assets/public/src/styles.css', b'.map-overview-review', '复习提示卡片样式'),
    ('assets/public/src/ui/home.js', b'reviewCount', '首页：复习计数'),
    ('assets/public/src/ui/home.js', b'has-review', '首页：复习态卡片样式钩子'),
    ('assets/public/src/styles.css', b'.map-entry.has-review', '首页：复习态卡片橙色描边'),
    ('assets/public/src/ui/map.js', b'export function terrain', '岛屿地形装饰'),
    ('assets/public/sw.js', b'kids-encyclopedia-v6', None),  # sw.js 不进 APK，下面单独判
]

with zipfile.ZipFile(APK) as z:
    names = z.namelist()
    web = [n for n in names if n.startswith('assets/public/')]

    print(f'APK 条目总数   {len(names)}')
    print(f'web 资源       {len(web)} 个')
    print(f'APK 体积       {len(open(APK, "rb").read()) / 1024 / 1024:.2f} MB')
    print('─' * 58)

    ok = fail = 0
    for path, needle, desc in CHECKS:
        if desc is None:
            continue
        if path not in names:
            print(f'  缺失  {path}')
            fail += 1
            continue
        blob = z.read(path)
        if needle in blob:
            print(f'  ✓     {desc}')
            ok += 1
        else:
            print(f'  ✗     {desc}  —— 未在 {path} 里找到 {needle!r}')
            fail += 1

    # 单独确认：core/prefs.js 不该出现 AGE_BAND 常量（分层纪律）
    src = z.read('assets/public/src/core/prefs.js').decode('utf-8')
    if 'AGE_BAND' in src:
        print('  ✗     core/prefs.js 里出现了 AGE_BAND 常量，分层纪律被破坏')
        fail += 1
    else:
        print('  ✓     core/prefs.js 未硬编码档位常量（分层纪律保持）')
        ok += 1

    # sw.js 会被 build-www 排除（原生包不需要 service worker），确认它确实不在
    if 'assets/public/sw.js' in names:
        print('  !     sw.js 出现在 APK 里 —— build-www 的排除规则可能失效了')
    else:
        print('  ✓     sw.js 已按设计排除（原生包不用 service worker）')
        ok += 1

print('─' * 58)
print(f'通过 {ok} 项，失败 {fail} 项')
raise SystemExit(1 if fail else 0)
