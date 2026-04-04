const { updateBuyer, getBuyer } = require('../services/firestore');
const { detectLanguage } = require('../services/gemini');
const { t, langName } = require('../services/i18n');

/**
 * Handle the /lang command - show language picker.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 */
async function handleLangCommand(bot, msg) {
  const chatId = msg.chat.id;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Bahasa Melayu', callback_data: 'lang_ms' },
          { text: 'English', callback_data: 'lang_en' },
          { text: '中文', callback_data: 'lang_zh' },
        ],
      ],
    },
  };

  // Use a neutral multilingual prompt
  await bot.sendMessage(
    chatId,
    'Sila pilih bahasa / Please select language / 请选择语言:',
    keyboard
  );
}

/**
 * Handle language selection callback.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} query - Callback query object
 */
async function handleLangCallback(bot, query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const lang = query.data.replace('lang_', '');

  if (!['ms', 'en', 'zh'].includes(lang)) return;

  try {
    const buyer = await getBuyer(userId);
    if (buyer) {
      await updateBuyer(userId, { language: lang });
    }

    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, t(lang, 'langChanged'));
  } catch (error) {
    console.error('Language change error:', error.message);
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, t('ms', 'errors.general'));
  }
}

/**
 * Auto-detect language from a user's first message and store it.
 * Returns the detected language code.
 *
 * @param {string} text - User's message text
 * @param {string} userId - Telegram user ID
 * @returns {Promise<string>} Detected language code
 */
async function autoDetectLanguage(text, userId) {
  try {
    const lang = await detectLanguage(text);
    const buyer = await getBuyer(userId);
    if (buyer && buyer.language !== lang) {
      await updateBuyer(userId, { language: lang });
    }
    return lang;
  } catch (error) {
    console.error('Auto-detect language error:', error.message);
    return 'ms';
  }
}

/**
 * Get the stored language for a user, defaulting to 'ms'.
 *
 * @param {string} userId - Telegram user ID
 * @returns {Promise<string>} Language code
 */
async function getUserLanguage(userId) {
  try {
    const buyer = await getBuyer(userId);
    return buyer?.language || 'ms';
  } catch {
    return 'ms';
  }
}

module.exports = {
  handleLangCommand,
  handleLangCallback,
  autoDetectLanguage,
  getUserLanguage,
};
