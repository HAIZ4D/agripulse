const ms = require('../locales/ms.json');
const en = require('../locales/en.json');
const zh = require('../locales/zh.json');

const locales = { ms, en, zh };

/**
 * Get a translated message by key, with placeholder substitution.
 *
 * @param {string} lang - Language code (ms, en, zh)
 * @param {string} key - Dot-notation key (e.g. "errors.general")
 * @param {object} params - Key-value pairs for placeholder substitution
 * @returns {string} Translated message
 */
function t(lang, key, params = {}) {
  const locale = locales[lang] || locales.ms;

  // Support dot-notation keys like "errors.general"
  const keys = key.split('.');
  let value = locale;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to Malay
      value = locales.ms;
      for (const fk of keys) {
        if (value && typeof value === 'object' && fk in value) {
          value = value[fk];
        } else {
          return key; // Return key itself if not found
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Replace {placeholder} tokens
  let result = value;
  for (const [pKey, pValue] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pValue);
  }

  return result;
}

/**
 * Get the language name for display.
 *
 * @param {string} lang - Language code
 * @returns {string} Human-readable language name
 */
function langName(lang) {
  const names = {
    ms: 'Bahasa Melayu',
    en: 'English',
    zh: '中文',
  };
  return names[lang] || 'Bahasa Melayu';
}

module.exports = {
  t,
  langName,
};
