/**
 * data/writing.js — 写字启蒙（新增原创板块）
 *
 * 同一套 item schema。握笔、坐姿、基本笔画、象形汉字，都是看得见、
 * 能动手模仿的内容，适合低龄。
 */

export default {
  id: 'writing',
  name: '写字启蒙',
  tagline: '学握笔写汉字',
  accent: '#B5774A',
  items: [
    {
      id: 'writing-hold',
      name: '正确握笔',
      pinyin: 'zhèng què wò bǐ',
      art: 'writing-hold',
      lead: '大拇指和食指捏住笔，中指在下面托住，笔靠在虎口上。',
      facts: [
        '笔杆斜斜靠在虎口那里，不要直直竖着。',
        '手指离笔尖大约一寸远，眼睛才看得清。',
        '握得太用力，手会很快酸。',
      ],
      quiz: {
        type: 'choice',
        q: '握笔时手指离笔尖大约多远？',
        opts: ['一寸', '一尺', '一拳头'],
        a: 0,
        why: '手指离笔尖一寸远，字才看得清楚。',
      },
    },
    {
      id: 'writing-pose',
      name: '写字坐姿',
      pinyin: 'xiě zì zuò zī',
      art: 'writing-pose',
      lead: '写字时背要挺直，胸口离桌子一拳远，眼睛离纸一尺远。',
      facts: [
        '胸口离桌子大约一拳，不会趴着写。',
        '眼睛离纸大约一尺，保护小眼睛。',
        '脚平平放在地上，不翘二郎腿。',
      ],
      quiz: {
        type: 'choice',
        q: '写字时胸口离桌子大约多远？',
        opts: ['一拳', '一厘米', '贴着桌子'],
        a: 0,
        why: '胸口离桌一拳、眼离纸一尺，才是正确坐姿。',
      },
    },
    {
      id: 'writing-dian',
      name: '笔画点',
      pinyin: 'bǐ huà diǎn',
      art: 'writing-dian',
      lead: '点是小小的一笔，像小雨滴从天上落下来。',
      facts: [
        '写点时从右上往左下轻轻一按。',
        '点要小小的、圆圆的。',
        '「斗」字的第一笔就是点。',
      ],
      quiz: {
        type: 'choice',
        q: '点的形状像什么？',
        opts: ['小雨滴', '小竹竿', '小山峰'],
        a: 0,
        why: '点圆圆的小小的，像一滴小雨点。',
      },
    },
    {
      id: 'writing-heng',
      name: '笔画横',
      pinyin: 'bǐ huà héng',
      art: 'writing-heng',
      lead: '横是从左写到右的一条平线，像一座小桥。',
      facts: [
        '写横要从左往右，左边低右边略高。',
        '横要写得平，像平放的小木板。',
        '「一」字就是长长的一横。',
      ],
      quiz: {
        type: 'choice',
        q: '「一」字是哪一种笔画？',
        opts: ['横', '竖', '点'],
        a: 0,
        why: '一字就是从左写到右的一横。',
      },
    },
    {
      id: 'writing-ri',
      name: '汉字「日」',
      pinyin: 'hàn zì rì',
      art: 'writing-ri',
      lead: '「日」字就是一个方方框里有一横，画的是太阳。',
      facts: [
        '日字外面一个方方框，里面一道横。',
        '圆圆的太阳变成了方方的字。',
        '「日月」两个字，日指太阳，月指月亮。',
      ],
      quiz: {
        type: 'choice',
        q: '「日」字画的是什么？',
        opts: ['太阳', '月亮', '大山'],
        a: 0,
        why: '日字画的是太阳，后来慢慢变成了方块字。',
      },
    },
    {
      id: 'writing-shan',
      name: '汉字「山」',
      pinyin: 'hàn zì shān',
      art: 'writing-shan',
      lead: '「山」字中间高、两边低，像三座山峰站在一起。',
      facts: [
        '中间一竖最高，像最高的那座山峰。',
        '两边的竖折下来，像旁边矮一点的山。',
        '古时候的山字，真的画成三座山峰。',
      ],
      quiz: {
        type: 'choice',
        q: '「山」字中间一竖代表什么？',
        opts: ['最高的山峰', '一条小河', '一棵树'],
        a: 0,
        why: '中间最高的一竖，就是最高的那座山峰。',
      },
    },
  ],
};
