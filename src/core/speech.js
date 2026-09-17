/**
 * speech.js — 语音朗读抽象层
 *
 * 设计意图：
 *   浏览器端用 Web Speech API，打包成 APK 后 Android WebView 对该 API 支持不稳定。
 *   所以这里做一层抽象：UI 只调用 speak()，将来换成 Capacitor 原生 TTS 插件时
 *   只需替换本文件的实现，UI 与题型引擎完全不用改。
 *
 * 关键设计点：
 *   1. 支持多语言（中文内容用 zh-CN，英语领域用 en-US）
 *   2. 连点不叠加 —— 每次 speak 先 cancel 上一条
 *   3. 不可用时静默降级并返回 false，由调用方决定是否提示，而不是抛异常
 */

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
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * @param {object} [options] 覆盖默认朗读参数
 * @returns {object} speech 实例
 */
export function createSpeech(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function';

  /** 语言 -> 已选中的 voice，避免每次朗读都遍历一遍 */
  const voiceCache = new Map();

  function pickVoice(lang) {
    if (!supported) return null;
    if (voiceCache.has(lang)) return voiceCache.get(lang);

    const voices = window.speechSynthesis.getVoices() || [];
    const prefix = lang.split('-')[0];
    const found =
      voices.find((v) => v.lang && v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix)) ||
      null;

    // 有些浏览器首次调用时 voices 为空，此时不缓存，等 voiceschanged 后再取
    if (found || voices.length > 0) voiceCache.set(lang, found);
    return found;
  }

  // 语音列表异步加载，加载完清空缓存重新选择
  if (supported && typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', () => voiceCache.clear());
  }

  return {
    supported,

    /**
     * 朗读一段文本。
     * @param {string} text
     * @param {object} [opts]
     * @param {string} [opts.lang] 指定语言，不传则按文本内容自动判断
     * @returns {boolean} 是否成功发起朗读
     */
    speak(text, opts = {}) {
      if (!supported || !text) return false;

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
    },

    /** 停止当前朗读 */
    stop() {
      if (!supported) return;
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        /* 忽略 */
      }
    },
  };
}
