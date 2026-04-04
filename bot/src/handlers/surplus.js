const { getBuyer, getBuyersByCrop } = require('../services/firestore');
const { normalizeCropName } = require('../services/gemini');
const { parseDemandText } = require('./demand');
const { getUserLanguage } = require('./language');
const { t } = require('../services/i18n');

/**
 * Handle the /surplus command - farmer notifies surplus availability.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 * @param {Map} sessions - Conversation state tracker
 */
async function handleSurplusCommand(bot, msg, sessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = await getUserLanguage(userId);

  try {
    const buyer = await getBuyer(userId);
    if (!buyer) {
      await bot.sendMessage(chatId, t(lang, 'noProfile'));
      return;
    }

    // Set session to surplus entry mode
    sessions.set(userId, {
      step: 'surplus_entry',
      language: buyer.language || lang,
      area: buyer.area || buyer.location?.area_name || '',
    });

    await bot.sendMessage(chatId, t(lang, 'surplusPrompt'));
  } catch (error) {
    console.error('Surplus command error:', error.message);
    await bot.sendMessage(chatId, t(lang, 'errors.general'));
  }
}

/**
 * Handle surplus text input after /surplus command.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 * @param {object} session - User's conversation session
 */
async function handleSurplusInput(bot, msg, session) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = session.language || 'ms';

  const parsed = parseDemandText(msg.text);
  if (!parsed) {
    await bot.sendMessage(chatId, t(lang, 'errors.invalidFormat'));
    return;
  }

  try {
    // Normalize crop name
    const normalizedCrop = await normalizeCropName(parsed.rawCrop, lang);
    const quantityStr = `${parsed.originalQuantity}${parsed.unit}`;

    // Find buyers in the same area who demand this crop
    const matchingBuyers = await getBuyersByCrop(session.area, normalizedCrop);

    // Filter out the surplus poster themselves
    const notifyBuyers = matchingBuyers.filter(
      (b) => String(b.telegramId) !== String(userId)
    );

    if (notifyBuyers.length === 0) {
      await bot.sendMessage(
        chatId,
        t(lang, 'surplusNoBuyers', { crop: normalizedCrop })
      );
    } else {
      // Notify each matching buyer
      let notifiedCount = 0;
      for (const buyer of notifyBuyers) {
        const buyerLang = buyer.language || 'ms';
        try {
          await bot.sendMessage(
            buyer.telegramId,
            t(buyerLang, 'surplusNotify', {
              area: session.area,
              crop: normalizedCrop,
              quantity: quantityStr,
            }),
            { parse_mode: 'Markdown' }
          );
          notifiedCount++;
        } catch (notifyError) {
          // Buyer may have blocked the bot or chat is unavailable
          console.error(
            `Failed to notify buyer ${buyer.telegramId}:`,
            notifyError.message
          );
        }
      }

      await bot.sendMessage(
        chatId,
        t(lang, 'surplusPosted', {
          count: String(notifiedCount),
          area: session.area,
        })
      );
    }
  } catch (error) {
    console.error('Surplus input error:', error.message);
    await bot.sendMessage(chatId, t(lang, 'errors.general'));
  }
}

module.exports = {
  handleSurplusCommand,
  handleSurplusInput,
};
