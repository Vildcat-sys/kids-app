/**
 * data/english.js — 英语
 *
 * 内容编写注意：
 *   1. listen 题里 word 是会被朗读的单词，opts[a] 必须与 word 完全一致（校验器会强制检查）
 *   2. 干扰项要同主题、有区分度，不能是明显不相关的词，否则猜都能猜对
 *   3. why 里带一次音标，把「声音—拼写—含义」三者绑在一起
 *
 * 题型分布说明（为什么不是清一色 listen）：
 *   listen 6 题是主干 —— 英语启蒙的第一动作就是「听音辨词」，全部落在 3-5 档。
 *   另外配 match 4 / choice 3 / order 2，理由各不相同：
 *     - match（身体、动作、方位词、时间词）→ 词义对应关系，比听音更强调「懂没懂」
 *     - choice（天气、拼读、疑问词）       → 考概念辨析
 *     - order（问候语、短句）              → 这两组天然有先后顺序，用排序才考得出理解
 *   全部用 listen 会让「会读」和「会用」被混为一谈。
 *
 * 年龄分级（2026-09-17 加）：
 *   前 10 个是「第一批词」，靠听音就能学，3-5 档也适用。
 *   后 5 个（phonics / sentences / prepositions / questions / time）**只给 6-8 档** ——
 *   它们全都建立在「已经认字」之上，3-5 岁孩子连选项都读不出来，给了也是白给。
 *   这 5 个补上了原先「英语的 6-8 档和 3-5 档内容几乎一样」这个缺口。
 */

export default {
  id: 'english',
  name: '英语',
  tagline: '听一听，认一认',
  accent: '#185FA5',
  items: [
    {
      id: 'english-letters',
      name: '字母',
      pinyin: 'zì mǔ',
      art: 'english-letters',
      ageBands: ['3-5', '6-8'],
      lead: '英语有 26 个字母。每个字母有自己的名字，也有它在单词里发的音。',
      facts: [
        '26 个字母里有 5 个元音字母：a、e、i、o、u，其他都是辅音字母。',
        '字母 A 单独读作 /eɪ/，但在 apple 里读 /æ/，同一个字母可以有不同的音。',
        '英语里出现最多的字母是 e，最少的是 z。',
      ],
      quiz: {
        type: 'listen',
        q: '听一听，选出你听到的单词',
        word: 'apple',
        zh: '苹果',
        opts: ['apple', 'orange', 'banana'],
        a: 0,
        why: 'apple 读作 /ˈæpl/，意思是苹果。开头两个字母 pp 只读一个音。',
      },
    },
    {
      id: 'english-colors',
      name: '颜色',
      pinyin: 'yán sè',
      art: 'english-colors',
      ageBands: ['3-5', '6-8'],
      lead: '英语里最基本的颜色词有 red、yellow、blue、green、black、white。',
      facts: [
        '三原色是红、黄、蓝。把它们两两混起来，能得到橙、绿、紫。',
        '彩虹有 7 种颜色：红、橙、黄、绿、蓝、靛、紫。',
        '天空是蓝色的，因为阳光里的蓝光被空气散射得最厉害。',
      ],
      quiz: {
        type: 'listen',
        q: '听一听，选出你听到的单词',
        word: 'blue',
        zh: '蓝色',
        opts: ['blue', 'red', 'green'],
        a: 0,
        why: 'blue 读作 /bluː/，意思是蓝色。结尾的 e 不发音，只是让 u 读成它本来的名字。',
      },
    },
    {
      id: 'english-numbers',
      name: '数字',
      pinyin: 'shù zì',
      art: 'english-numbers',
      ageBands: ['3-5'],
      lead: '英语数字 one、two、three、four、five，是学数数的开始。',
      facts: [
        'one 到 ten 是最基础的 10 个数字词，记住它们就能用英语数到十。',
        'eleven 和 twelve 是特殊的，不像其他数字那样有规律，只能单独记。',
        '13 到 19 都以 -teen 结尾，所以 13 到 19 岁的人叫 teenager。',
      ],
      quiz: {
        type: 'listen',
        q: '听一听，选出你听到的单词',
        word: 'three',
        zh: '三',
        opts: ['three', 'two', 'four'],
        a: 0,
        why: 'three 读作 /θriː/，是数字 3。开头的 th 要轻轻咬着舌尖吹气，不要读成 s。',
      },
    },
    {
      id: 'english-animals',
      name: '动物',
      pinyin: 'dòng wù',
      art: 'english-animals',
      ageBands: ['3-5', '6-8'],
      lead: 'cat、dog、bird、fish 是最早学会的一批动物词，因为它们就在身边。',
      facts: [
        '英语里动物的叫声要单独记：狗是 woof，猫是 meow，和中文的「汪汪」「喵」完全不同。',
        'baby 加上动物名表示幼崽：小狗是 puppy，小猫是 kitten，小鸭是 duckling。',
        '有些动物的英文名就是模仿它的叫声造的，比如 cuckoo（布谷鸟）听起来像「咕咕」。',
      ],
      quiz: {
        type: 'listen',
        q: '听一听，选出你听到的单词',
        word: 'cat',
        zh: '猫',
        opts: ['cat', 'dog', 'bird'],
        a: 0,
        why: 'cat 读作 /kæt/，意思是猫。cat 和 cut 只差一个元音，读 cat 的时候嘴要张大一点。',
      },
    },
    {
      id: 'english-body',
      name: '身体',
      pinyin: 'shēn tǐ',
      art: 'english-body',
      ageBands: ['3-5', '6-8'],
      lead: 'head、hand、foot、eye、ear —— 指着自己的身体说一遍，比背单词表记得牢。',
      facts: [
        '英语里成对的东西要用复数：一只眼是 eye，两只眼要说 eyes。',
        'head 和 hand 只差一个字母，读音一个是 /hed/，一个是 /hænd/。',
        '儿歌《Head, Shoulders, Knees and Toes》把 8 个身体部位串成一句唱出来。',
      ],
      quiz: {
        type: 'match',
        q: '把英语单词和它对应的身体部位配成一对',
        pairs: [
          ['eye', '眼睛'],
          ['ear', '耳朵'],
          ['hand', '手'],
          ['foot', '脚'],
        ],
        why: 'eye 是眼睛，ear 是耳朵，hand 是手，foot 是脚。指着自己身上的地方说一遍，比只看字记得牢。',
      },
    },
    {
      id: 'english-family',
      name: '家人',
      pinyin: 'jiā rén',
      art: 'english-family',
      ageBands: ['3-5', '6-8'],
      lead: 'mom、dad、sister、brother —— 家里的人，是孩子最先想用英语说出来的词。',
      facts: [
        '英语里 sister 不分姐姐和妹妹，brother 也不分哥哥和弟弟，要说 big 或 little 才分得清。',
        'grandma 和 grandpa 同时指爷爷奶奶和外公外婆，英语不区分父方和母方。',
        '英语里孩子直接叫父母的名字很常见，不算没礼貌，但中文里这样叫就不合适。',
      ],
      quiz: {
        type: 'listen',
        q: '听一听，选出你听到的单词',
        word: 'mom',
        zh: '妈妈',
        opts: ['mom', 'dad', 'sister'],
        a: 0,
        why: 'mom 读作 /mɑːm/，意思是妈妈。英国常写成 mum，读作 /mʌm/，写法不同但指的是同一个人。',
      },
    },
    {
      id: 'english-food',
      name: '食物',
      pinyin: 'shí wù',
      art: 'english-food',
      ageBands: ['3-5', '6-8'],
      lead: 'milk、bread、rice、egg —— 餐桌上最常见的东西，也是最好用的第一批英语词。',
      facts: [
        'bread 是不可数名词，两片面包要说 two slices of bread，不能直接说 two breads。',
        'rice 也是不可数，一碗米饭是 a bowl of rice。',
        'breakfast（早餐）由 break 和 fast 组成，fast 在这里是「禁食」，合起来就是「打破一夜的禁食」。',
      ],
      quiz: {
        type: 'listen',
        q: '听一听，选出你听到的单词',
        word: 'milk',
        zh: '牛奶',
        opts: ['milk', 'bread', 'egg'],
        a: 0,
        why: 'milk 读作 /mɪlk/，意思是牛奶。结尾的 l 和 k 要连着读出来，不能只读 mi。',
      },
    },
    {
      id: 'english-weather',
      name: '天气',
      pinyin: 'tiān qì',
      art: 'english-weather',
      ageBands: ['3-5', '6-8'],
      lead: 'sunny、rainy、windy、snowy —— 出门前看看天，就有一个现成的英语话题。',
      facts: [
        '这些天气词大多以 -y 结尾：sun 加 y 变成 sunny，rain 加 y 变成 rainy。',
        '问天气说 How is the weather? 回答要用 It is sunny，不能说 I am sunny。',
        '英语里聊天气是最常见的开场话，因为它不涉及隐私，谁都能接一句。',
      ],
      quiz: {
        type: 'choice',
        q: '外面在下雨，出门要带伞。这句话里的「下雨」用哪个词？',
        opts: ['rainy', 'sunny', 'windy'],
        a: 0,
        why: 'rain 是雨，加上 -y 变成 rainy，表示「下雨的」。sunny 是晴天，windy 是刮风，三个词都是天气，但只有 rainy 要带伞。',
      },
    },
    {
      id: 'english-actions',
      name: '动作',
      pinyin: 'dòng zuò',
      art: 'english-actions',
      ageBands: ['3-5', '6-8'],
      lead: 'run、jump、eat、sleep —— 边说边做动作，孩子记住的是动作，不是单词表。',
      facts: [
        '这 4 个词都是动词，动词就是表示「做什么」的词。',
        '英语句子必须有动词，想说「我跑」不能只说 I，要说 I run。',
        '动词加上 -ing 表示「正在做」：run 变 running，jump 变 jumping，eat 变 eating。',
      ],
      quiz: {
        type: 'match',
        q: '把英语动作词和它对应的意思配成一对',
        pairs: [
          ['run', '跑'],
          ['jump', '跳'],
          ['eat', '吃'],
          ['sleep', '睡'],
        ],
        why: 'run 是跑，jump 是跳，eat 是吃，sleep 是睡。一边说一边把动作做出来，会记得更快。',
      },
    },
    {
      id: 'english-greetings',
      name: '问候',
      pinyin: 'wèn hòu',
      art: 'english-greetings',
      ageBands: ['3-5', '6-8'],
      lead: 'Hello、please、thank you、sorry —— 这 4 个词能让孩子说出第一句英语。',
      facts: [
        'please 放在句子末尾时要加逗号，写成 Can I have it, please?',
        'thank you 的回复是 You are welcome。说 No thank you 是拒绝的意思，不是道谢。',
        'Good morning 用在中午 12 点前，过了 12 点要说 Good afternoon。',
      ],
      quiz: {
        type: 'order',
        q: '按一天从早到晚的顺序，把这四句问候依次点一遍',
        seq: ['Good morning', 'Good afternoon', 'Good evening', 'Good night'],
        why: '早上说 Good morning，下午说 Good afternoon，傍晚说 Good evening，睡前说 Good night。这四句都是打招呼，但各自有固定的时间段。',
      },
    },

    /* ─────────── 以下 5 个只给 6-8 档 ───────────
     * 判据：它们都建立在「已经认字」之上。3-5 岁孩子连选项都读不出来，
     * 给了也是白给 —— 所以 ageBands 只写 ['6-8']，不写两档通用。 */

    {
      id: 'english-phonics',
      name: '自然拼读',
      pinyin: 'zì rán pīn dú',
      art: 'english-phonics',
      ageBands: ['6-8'],
      lead: '很多英语单词长得很像，读起来也像。抓住结尾那几个字母，就能猜出怎么读。',
      facts: [
        'cat、bat、hat、mat 结尾都是 -at，四个词读起来都押韵。',
        '英语 26 个字母里有 5 个元音字母：a、e、i、o、u，几乎每个单词里都有它们。',
        'sh 读 /ʃ/，ch 读 /tʃ/，th 读 /θ/ —— 两个字母合起来只发一个音。',
      ],
      quiz: {
        type: 'choice',
        q: '下面哪个单词和 cat 押韵？',
        opts: ['bat', 'dog', 'sun'],
        a: 0,
        why: 'cat 和 bat 结尾都是 -at，所以读起来押韵。dog 结尾是 -og，sun 结尾是 -un，都不押韵。',
      },
    },
    {
      id: 'english-sentences',
      name: '短句',
      pinyin: 'duǎn jù',
      art: 'english-sentences',
      ageBands: ['6-8'],
      lead: '把单词按顺序排好，就能说出一句话。英语句子先说「谁」，再说「做什么」。',
      facts: [
        '"I like apples." 只有 3 个词，但已经是一句完整的话。',
        '英语里的「我」永远写成大写 I，放在句子中间也大写。',
        '说「我喜欢苹果」，苹果超过一个就要加 s，写成 apples。',
      ],
      quiz: {
        type: 'order',
        q: '把这几个词排成一句话：「我喜欢红苹果」',
        seq: ['I', 'like', 'red', 'apples'],
        why: '先说「谁」（I），再说「做什么」（like），最后说「什么」（red apples）。词序换了，意思就乱了。',
      },
    },
    {
      id: 'english-prepositions',
      name: '方位词',
      pinyin: 'fāng wèi cí',
      art: 'english-prepositions',
      ageBands: ['6-8'],
      lead: 'in、on、under 告诉别人东西在哪里。它们是英语里最常用的小词。',
      facts: [
        'in 是「在里面」，on 是「在上面」，under 是「在下面」。',
        '"The cat is on the table." 说的是猫在桌子上面。',
        'behind 是「在后面」，next to 是「在旁边」，这两个也常常用到。',
      ],
      quiz: {
        type: 'match',
        q: '把方位词和它对应的意思配成一对',
        pairs: [
          ['in', '在里面'],
          ['on', '在上面'],
          ['under', '在下面'],
          ['behind', '在后面'],
        ],
        why: 'in 是在里面，on 是在上面，under 是在下面，behind 是在后面。四个词都是用来告诉别人东西在哪儿的。',
      },
    },
    {
      id: 'english-questions',
      name: '疑问词',
      pinyin: 'yí wèn cí',
      art: 'english-questions',
      ageBands: ['6-8'],
      lead: '想问问题，开头要用疑问词。what 问「什么」，where 问「哪里」，who 问「谁」。',
      facts: [
        'what 问东西，where 问地方，who 问人 —— 三个词分工很清楚。',
        '"What is this?" 就是「这是什么？」，是最常用的问句之一。',
        'how 问「怎么样」，"How are you?" 是见面时常说的一句。',
      ],
      quiz: {
        type: 'choice',
        q: '想问「在哪里」，应该用哪个词开头？',
        opts: ['what', 'where', 'who'],
        a: 1,
        why: 'where 专门用来问地方。what 问的是东西，who 问的是人，三个词各有各的用处。',
      },
    },
    {
      id: 'english-time',
      name: '时间词',
      pinyin: 'shí jiān cí',
      art: 'english-time',
      ageBands: ['6-8'],
      lead: '说清楚「什么时候」，要用时间词。today 是今天，tomorrow 是明天。',
      facts: [
        'morning 是早上，afternoon 是下午，night 是晚上。',
        'today 是今天，yesterday 是昨天，tomorrow 是明天。',
        '英语里时间词常放在句子末尾，比如 I read a book every night.',
      ],
      quiz: {
        type: 'match',
        q: '把英语时间词和它对应的意思配成一对',
        pairs: [
          ['today', '今天'],
          ['tomorrow', '明天'],
          ['yesterday', '昨天'],
          ['night', '晚上'],
        ],
        why: 'today 是今天，tomorrow 是明天，yesterday 是昨天，night 是晚上。说清楚「什么时候」，别人才知道你在讲哪一天。',
      },
    },
  ],
};
