/**
 * speech.js — 语音朗读与交互音效（本地音频优先，Web Speech 兜底）
 *
 * 为什么不再只依赖 Web Speech API：
 *   部分 Android WebView 没有内置 TTS 引擎，会提示「这台设备无法打开语音」。
 *   所以讲解、读题、单词、表扬鼓励都提前用统一的温柔女声录制成 mp3 打进安装包，
 *   离线、断网、无 TTS 引擎的设备上也一定能出声。
 *
 * 三级策略：
 *   1. 本地录音（src/audio/...）——首选，音色统一、离线可用
 *   2. Web Speech API ——某段录音还没制作时的兜底，保证功能不哑
 *   3. 静默降级 + 返回状态——连兜底也不可用时，由 UI 显示大播放按钮
 *
 * 交互音效（答对/答错/星星/金币/点击）用 WebAudio 现场合成：
 *   零体积、不侵权、不需要网络，且不和人声抢同一个音频通道。
 *
 * UI 只调用语义化方法（narrate / ask / sayWord / praise / sfx…），
 * 不关心声音到底来自录音还是 TTS。
 *
 * TODO(录音待重录)：PRAISE_TEXT / ENCOURAGE_TEXT 已定为过程性措辞
 *   （见 docs/工单-作品墙与成就卡与降级链-20260925.md §5.4），
 *   但 src/audio/voice/ 下 8 个 mp3 仍是旧内容（"你真聪明"）。
 *   录音重录并替换后，本文件才算真正生效。
 */

const AUDIO_BASE = 'src/audio';

const DEFAULT_OPTIONS = {
  lang: 'zh-CN',
  /** 语速：孩子听，比正常慢一点。0.85 ≈ 正常语速的 85% */
  rate: 0.88,
  /** 音高：略高一点，更接近儿童节目的听感 */
  pitch: 1.05,
  volume: 1,
};

/** 中文字符占比，用于自动判断该用中文还是英文语音 */
function looksChinese(text) {
  return /[一-龥]/.test(text);
}

/** 英语单词转成音频文件名（apple → apple；大小写、空格归一化） */
function wordKey(word) {
  return String(word).trim().toLowerCase().replace(/\s+/g, '-');
}

/** 绘本页文本：page0=名称+lead，page1-3=对应 fact */
export function bookPages(item) {
  const facts = item.facts || [];
  return [
    `${item.name}。${item.lead}`,
    facts[0] || '',
    facts[1] || '',
    facts[2] || '',
  ];
}

/* 固定表扬 / 鼓励语：优先播同名录音，缺录音时用 TTS 念这些句子 */
const PRAISE_CLIPS = ['praise1', 'praise2', 'praise3', 'praise4'];
const ENCOURAGE_CLIPS = ['encourage1', 'encourage2', 'encourage3', 'encourage4'];
const PRAISE_TEXT = [
  '答对啦！你真聪明，太棒了！',
  '好厉害呀，又学会了一个新知识！',
  '答对啦，给你点一个大大的赞！',
  '哇，你真是个小小科学家！',
];
const ENCOURAGE_TEXT = [
  '哎呀，差一点点哦，别着急，再试一次，你一定可以的！',
  '没关系，再想一想，你可以的！',
  '哎呀，差一点点哦，别着急，再试一次！',
  '没关系，错了也不怕，我们再听一遍！',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * @param {object} [options] 覆盖默认朗读参数
 * @returns {object} speech 实例
 */
export function createSpeech(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const ttsSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function';

  /** 语言 -> 已选中的 voice，避免每次朗读都遍历一遍 */
  const voiceCache = new Map();

  function pickVoice(lang) {
    if (!ttsSupported) return null;
    if (voiceCache.has(lang)) return voiceCache.get(lang);

    const voices = window.speechSynthesis.getVoices() || [];
    const prefix = lang.split('-')[0];
    const found =
      voices.find((v) => v.lang && v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix)) ||
      null;

    if (found || voices.length > 0) voiceCache.set(lang, found);
    return found;
  }

  if (ttsSupported && typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', () => voiceCache.clear());
  }

  /* ────────────── Web Speech 兜底 ────────────── */

  function ttsSpeak(text, opts = {}) {
    if (!ttsSupported || !text) return false;
    const lang = opts.lang || (looksChinese(text) ? 'zh-CN' : 'en-US');
    try {
      window.speechSynthesis.cancel();
      const utter = new window.SpeechSynthesisUtterance(String(text));
      utter.lang = lang;
      utter.rate = opts.rate ?? config.rate;
      utter.pitch = opts.pitch ?? config.pitch;
      utter.volume = opts.volume ?? config.volume;
      const voice = pickVoice(lang);
      if (voice) utter.voice = voice;
      window.speechSynthesis.speak(utter);
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ────────────── 本地人声播放 ────────────── */

  let voiceEl = null;
  let voiceState = 'idle'; // 'idle' | 'playing' | 'paused'
  let voiceKind = 'narr'; // 当前音轨来源：narr / quiz / word / voice
  const stateListeners = new Set();

  function getVoiceEl() {
    if (voiceEl === null && typeof Audio !== 'undefined') {
      voiceEl = new Audio();
      voiceEl.preload = 'auto';
      voiceEl.addEventListener('ended', () => setState('idle', voiceKind));
      voiceEl.addEventListener('pause', () => {
        if (voiceEl && !voiceEl.ended && voiceEl.currentTime > 0 && voiceState === 'playing') {
          setState('paused', voiceKind);
        }
      });
      voiceEl.addEventListener('play', () => setState('playing', voiceKind));
    }
    return voiceEl;
  }

  function setState(s, kind = voiceKind) {
    if (voiceState === s && kind === voiceKind) return;
    voiceState = s;
    voiceKind = kind;
    for (const fn of stateListeners) fn(s, kind);
  }

  function stopTts() {
    if (ttsSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        /* 忽略 */
      }
    }
  }

  /**
   * 播放一段本地录音；录音缺失或被自动播放策略拦截时兜底。
   * @returns {Promise<'clip'|'tts'|'blocked'|'none'>}
   *   clip 本地录音已播放；tts 已回退 TTS；blocked 被浏览器拦截需用户点播放；none 无法播放
   */
  function playClip(kind, key, fallbackText, opts = {}) {
    const el = getVoiceEl();
    if (!el) {
      return ttsSpeak(fallbackText, opts) ? Promise.resolve('tts') : Promise.resolve('none');
    }
    stopTts();
    voiceKind = kind;
    el.pause();
    const src = `${AUDIO_BASE}/${kind}/${key}.mp3`;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (r) => {
        if (settled) return;
        settled = true;
        el.onerror = null;
        resolve(r);
      };
      el.onerror = () => {
        // 录音文件不存在（开发期尚未制作）→ TTS 兜底，功能不中断
        el.removeAttribute('src');
        el.currentTime = 0;
        setState('idle');
        finish(ttsSpeak(fallbackText, opts) ? 'tts' : 'none');
      };
      el.src = src;
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(() => finish('clip')).catch(() => finish('blocked'));
      } else {
        finish('clip');
      }
    });
  }

  /* ────────────── WebAudio 交互音效（合成） ────────────── */

  let actx = null;
  let master = null;

  function getCtx() {
    if (actx === null && typeof window !== 'undefined') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        actx = new AC();
        master = actx.createGain();
        master.gain.value = 0.5;
        master.connect(actx.destination);
      }
    }
    if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }

  /** 单个音符 */
  function note(freq, start, dur, type = 'sine', vol = 0.3, slideTo = null) {
    if (!actx || !master) return;
    const t0 = actx.currentTime + start;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** 交互短音效。全部为现场合成，柔和不刺耳（答错也不吓孩子）。 */
  function sfx(name) {
    const ctx = getCtx();
    if (!ctx) return;
    switch (name) {
      case 'tap': // 点击：轻脆短音
        note(560, 0, 0.08, 'triangle', 0.18, 720);
        break;
      case 'pop': // 卡片弹出
        note(320, 0, 0.14, 'sine', 0.2, 640);
        break;
      case 'right': // 答对：明亮的上行琶音 C-E-G-C
        note(523.25, 0, 0.1, 'triangle', 0.26);
        note(659.25, 0.09, 0.1, 'triangle', 0.26);
        note(783.99, 0.18, 0.1, 'triangle', 0.26);
        note(1046.5, 0.27, 0.22, 'triangle', 0.28);
        break;
      case 'star': // 点亮一颗星：闪亮高音
        note(1318.5, 0, 0.16, 'sine', 0.22);
        note(1975.5, 0.02, 0.18, 'sine', 0.12);
        break;
      case 'coin': // 金币：两连叮
        note(987.77, 0, 0.07, 'square', 0.12);
        note(1318.5, 0.07, 0.16, 'square', 0.12);
        break;
      case 'wrong': // 答错：柔和下行，不刺耳、不否定
        note(392, 0, 0.12, 'sine', 0.16, 349);
        note(329.6, 0.12, 0.16, 'sine', 0.14, 311);
        break;
      case 'open': // 进入学习：轻快上扬
        note(440, 0, 0.1, 'triangle', 0.18, 660);
        break;
      default:
        break;
    }
  }

  const api = {
    /** 是否有任意一种发声能力（本地音频始终可用，故基本恒真） */
    supported: true,
    /** 设备 TTS 是否可用（仅供诊断，正常流程不依赖它） */
    ttsSupported,

    /* —— 兼容旧接口：直接念一段文本（走 TTS） —— */
    speak(text, opts = {}) {
      stopTts();
      const el = getVoiceEl();
      if (el) {
        el.pause();
        el.removeAttribute('src');
      }
      return ttsSpeak(text, opts);
    },

    /** 停止所有人声（讲解/读题/TTS）；短音效让它自然播完 */
    stop() {
      stopTts();
      const el = getVoiceEl();
      if (el) {
        el.pause();
        try {
          el.currentTime = 0;
        } catch (err) {
          /* 忽略 */
        }
      }
      setState('idle');
    },

    pause() {
      const el = getVoiceEl();
      if (el && voiceState === 'playing') el.pause();
      else stopTts();
    },

    resume() {
      const el = getVoiceEl();
      if (el && el.src && voiceState === 'paused') {
        el.play().catch(() => {});
      }
    },

    getState() {
      return voiceState;
    },
    onStateChange(fn) {
      stateListeners.add(fn);
      return () => stateListeners.delete(fn);
    },

    /* —— 语义化人声 —— */

    /** 知识点完整讲解（兼容旧接口，播整段合并录音） */
    narrate(item) {
      const fallback = [item.name, item.lead, ...(item.facts || [])].join(' ');
      return playClip('narr', item.id, fallback, { lang: 'zh-CN' });
    },

    /** 逐页讲解：播放 narr/<itemId>-<pageIndex>.mp3 */
    narratePage(item, pageIndex) {
      const pages = bookPages(item);
      const text = pages[pageIndex] || '';
      const key = `${item.id}-${pageIndex}`;
      return playClip('narr', key, text, { lang: 'zh-CN' });
    },

    /** 打开题目时读题（choice / order / match） */
    ask(item) {
      const fallback = item.quiz && item.quiz.q ? item.quiz.q : '';
      return playClip('quiz', item.id, fallback, { lang: 'zh-CN' });
    },

    /** 英语单词发音（听音选词） */
    sayWord(word) {
      return playClip('word', wordKey(word), word, { lang: 'en-US', rate: 0.78 });
    },

    /** 答对表扬（随机） */
    praise() {
      const i = Math.floor(Math.random() * PRAISE_CLIPS.length);
      return playClip('voice', PRAISE_CLIPS[i], pick(PRAISE_TEXT), { lang: 'zh-CN' });
    },

    /** 答错鼓励（随机，温和） */
    encourage() {
      const i = Math.floor(Math.random() * ENCOURAGE_CLIPS.length);
      return playClip('voice', ENCOURAGE_CLIPS[i], pick(ENCOURAGE_TEXT), { lang: 'zh-CN' });
    },

    /** 交互音效 */
    sfx,

    /** 在首次用户手势里调用，解锁 WebAudio 与媒体播放 */
    unlock() {
      getCtx();
    },
  };

  return api;
}
