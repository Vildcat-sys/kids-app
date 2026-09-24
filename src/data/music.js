/**
 * data/music.js — 音乐启蒙（新增原创板块）
 *
 * 同一套 item schema。原有「乐器」(culture-music-instrument) 从 culture 板块
 * 迁入本板块的课程树（item 本身仍在 culture.js，id 不变），这里只放新增原创项。
 */

export default {
  id: 'music',
  name: '音乐启蒙',
  tagline: '听声音打节奏',
  accent: '#E8B53C',
  items: [
    {
      id: 'music-loud-soft',
      name: '声音有大有小',
      pinyin: 'shēng yīn yǒu dà yǒu xiǎo',
      art: 'music-loud-soft',
      lead: '有的声音很响，有的声音很轻，这就是声音的大小。',
      facts: [
        '打鼓用的力气大，声音就很响。',
        '轻轻拍手，声音就很小。',
        '对着耳朵小声说话，就是悄悄话。',
      ],
      quiz: {
        type: 'choice',
        q: '轻轻拍手，声音是大还是小？',
        opts: ['很小', '很响', '没有声音'],
        a: 0,
        why: '力气小声音就小，轻轻拍手就是小声。',
      },
    },
    {
      id: 'music-fast-slow',
      name: '快快慢慢',
      pinyin: 'kuài kuài màn màn',
      art: 'music-fast-slow',
      lead: '音乐有的快有的慢，跟着节奏拍手就能感觉出来。',
      facts: [
        '跑得快的音乐，拍手要快快的。',
        '摇篮曲很慢很慢，哄宝宝睡觉。',
        '用手打拍子，一下快一下慢就不一样。',
      ],
      quiz: {
        type: 'choice',
        q: '哄宝宝睡觉的摇篮曲是快还是慢？',
        opts: ['很慢', '很快', '一会儿快一会儿慢'],
        a: 0,
        why: '摇篮曲慢慢的，宝宝听着才容易睡着。',
      },
    },
    {
      id: 'music-drum',
      name: '小鼓咚咚',
      pinyin: 'xiǎo gǔ dōng dōng',
      art: 'music-drum',
      lead: '小鼓用鼓槌一敲，就发出咚咚咚的声音。',
      facts: [
        '鼓面是绷紧的皮，敲上去会震动发声。',
        '敲鼓中间声音低，敲边边声音高一点。',
        '咚咚的鼓点能让大家跳起舞来。',
      ],
      quiz: {
        type: 'choice',
        q: '小鼓敲起来发出什么声音？',
        opts: ['咚咚咚', '喵喵喵', '哗啦啦'],
        a: 0,
        why: '小鼓是咚咚咚，小猫才是喵喵喵。',
      },
    },
    {
      id: 'music-song',
      name: '一起唱歌',
      pinyin: 'yì qǐ chàng gē',
      art: 'music-song',
      lead: '用喉咙把好听的调子唱出来，就是歌声。',
      facts: [
        '唱歌要先吸一口气，声音才够长。',
        '跟着琴声唱，不容易跑调。',
        '大家一起合唱，声音更热闹。',
      ],
      quiz: {
        type: 'choice',
        q: '跟着什么唱不容易跑调？',
        opts: ['琴声', '敲桌子', '关门声'],
        a: 0,
        why: '有琴声带着，唱歌就不容易跑调。',
      },
    },
    {
      id: 'music-echo',
      name: '回声',
      pinyin: 'huí shēng',
      art: 'music-echo',
      lead: '在大山谷里喊一声，过一会山那边会把声音送回来，那就是回声。',
      facts: [
        '声音撞到山崖会弹回来，像皮球反弹。',
        '山谷越大、越安静，回声越清楚。',
        '在空的大屋子里拍手，也能听到回声。',
      ],
      quiz: {
        type: 'choice',
        q: '在山谷里喊一声，声音被什么弹了回来？',
        opts: ['山崖', '小鸟', '云朵'],
        a: 0,
        why: '声音撞到山崖反弹回来，就形成了回声。',
      },
    },
    {
      id: 'music-xylophone',
      name: '木琴',
      pinyin: 'mù qín',
      art: 'music-xylophone',
      lead: '木琴有一排长短不一样的木条，敲短的声音高，敲长的声音低。',
      facts: [
        '木条越短，敲出来的声音越高。',
        '木条越长，敲出来的声音越低。',
        '用两根小木槌轮流敲，就能弹出小曲子。',
      ],
      quiz: {
        type: 'choice',
        q: '木琴上短木条敲出来的声音是高还是低？',
        opts: ['高', '低', '不高不低'],
        a: 0,
        why: '短木条振动快，声音就高；长木条声音低。',
      },
    },
  ],
};
