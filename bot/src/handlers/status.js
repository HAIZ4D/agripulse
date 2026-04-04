const { getBuyer } = require('../services/firestore');
const { t, langName } = require('../services/i18n');
const { getUserLanguage } = require('./language');

/**
 * Handle the /status command - show user's profile and demands.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 */
async function handleStatusCommand(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = await getUserLanguage(userId);

  try {
    const buyer = await getBuyer(userId);
    if (!buyer) {
      await bot.sendMessage(chatId, t(lang, 'noProfile'));
      return;
    }

    const buyerLang = buyer.language || lang;

    // Format demands list
    let demandsStr = t(buyerLang, 'statusNoDemands');
    if (buyer.demands && buyer.demands.length > 0) {
      demandsStr = buyer.demands
        .map((d) => {
          const qty = d.originalQuantity || d.quantity_kg || d.quantityKg || 0
          const unit = d.unit || 'kg'
          return `  - ${d.crop}: ${qty}${unit}`
        })
        .join('\n');
    }

    // Format role and frequency
    const roleLabel = t(buyerLang, `roles.${buyer.role}`) || buyer.role;
    const freq = buyer.frequency || buyer.demands?.[0]?.frequency || 'weekly';
    const freqLabel = t(buyerLang, `frequencies.${freq}`) || freq;
    const languageLabel = langName(buyerLang);

    const statusMsg = t(buyerLang, 'statusReport', {
      role: roleLabel,
      area: buyer.area || buyer.location?.area_name || 'N/A',
      frequency: freqLabel,
      demands: demandsStr,
      language: languageLabel,
    });

    await bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Status command error:', error.message);
    await bot.sendMessage(chatId, t(lang, 'errors.general'));
  }
}

module.exports = {
  handleStatusCommand,
};
