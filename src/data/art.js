/**
 * data/art.js — 美术启蒙（新增原创板块）
 *
 * 与现有领域同一套 item schema：
 *   { id, name, pinyin, art, lead, facts[3], quiz }
 * （ageBands 年龄带字段已作废，统一由 levels.js 的 S1-S6 认知级别筛选。）
 * 内容写作规范同 science.js：lead 一句话、facts 带具体事物、不写空话。
 */

export default {
  id: 'art',
  name: '美术启蒙',
  tagline: '涂涂画画认颜色',
  accent: '#E86A8A',
  items: [
    {
      id: 'art-red',
      name: '认识红色',
      pinyin: 'rèn shí hóng sè',
      art: 'art-red',
      lead: '红色像苹果和太阳，是眼睛最先认出来的颜色。',
      facts: [
        '成熟的苹果是红色的，生的时候是绿色的。',
        '小猴子的屁股也是红红的。',
        '红绿灯里红色的灯亮，表示要停下来。',
      ],
      quiz: {
        type: 'choice',
        q: '红绿灯里亮哪盏灯要停下来？',
        opts: ['红灯', '绿灯', '黄灯'],
        a: 0,
        why: '红色灯表示停，绿灯表示可以走。',
      },
    },
    {
      id: 'art-blue',
      name: '认识蓝色',
      pinyin: 'rèn shí lán sè',
      art: 'art-blue',
      lead: '蓝色是天空和大海的颜色，看着很凉快。',
      facts: [
        '晴天抬头看，天空是蓝蓝的。',
        '大海远远看也是蓝色的。',
        '蓝莓是小小的蓝色果子。',
      ],
      quiz: {
        type: 'choice',
        q: '抬头看晴天的天空是什么颜色？',
        opts: ['蓝色', '红色', '黄色'],
        a: 0,
        why: '晴天的天空蓝蓝的，大海也是蓝色。',
      },
    },
    {
      id: 'art-yellow',
      name: '认识黄色',
      pinyin: 'rèn shí huáng sè',
      art: 'art-yellow',
      lead: '黄色像小鸭子和香蕉，亮亮的很温暖。',
      facts: [
        '香蕉熟了是黄黄的。',
        '小鸭子的绒毛是黄色的。',
        '向日葵的花盘周围是黄色的花瓣。',
      ],
      quiz: {
        type: 'choice',
        q: '小鸭子的绒毛是什么颜色？',
        opts: ['黄色', '黑色', '绿色'],
        a: 0,
        why: '小鸭子毛茸茸的黄色，香蕉也是黄的。',
      },
    },
    {
      id: 'art-lines',
      name: '会变的线条',
      pinyin: 'huì biàn de xiàn tiáo',
      art: 'art-lines',
      lead: '用蜡笔画画，直直的线、弯弯的线能变成不同的东西。',
      facts: [
        '直直的线像一根小竹竿。',
        '弯弯的线像小蛇在爬。',
        '画一圈圈的线，可以变成大蜗牛的壳。',
      ],
      quiz: {
        type: 'choice',
        q: '弯弯的线像什么在爬？',
        opts: ['小蛇', '小竹竿', '小房子'],
        a: 0,
        why: '弯弯扭扭的线很像小蛇在地上爬。',
      },
    },
    {
      id: 'art-finger-paint',
      name: '手指画',
      pinyin: 'shǒu zhǐ huà',
      art: 'art-finger-paint',
      lead: '用蘸了颜料的手指头在纸上点一点，就能印出小花。',
      facts: [
        '食指蘸一蘸颜料，按一下就是一个圆点点。',
        '五个手指一起按，能印出一只小手。',
        '印完要马上用肥皂把手洗干净。',
      ],
      quiz: {
        type: 'choice',
        q: '手指印画完以后要做什么？',
        opts: ['用肥皂洗手', '继续揉眼睛', '把颜料吃掉'],
        a: 0,
        why: '颜料不能吃也不能揉眼睛，画完要立刻洗手。',
      },
    },
    {
      id: 'art-color-mix',
      name: '颜色变变变',
      pinyin: 'yán sè biàn biàn biàn',
      art: 'art-color-mix',
      lead: '把两种颜色的颜料混在一起，会变成一种新颜色。',
      facts: [
        '红色加黄色，会变成橙色。',
        '黄色加蓝色，会变成绿色。',
        '红色加蓝色，会变成紫色。',
      ],
      quiz: {
        type: 'choice',
        q: '红色加黄色会变成什么颜色？',
        opts: ['橙色', '绿色', '黑色'],
        a: 0,
        why: '红加黄变成橙色，就像橙子的颜色。',
      },
    },
  ],
};
