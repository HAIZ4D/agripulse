const { normalizeCropName } = require('../services/gemini');
const { updateBuyer, getBuyer, updateDemandAggregates } = require('../services/firestore');
const { t } = require('../services/i18n');
const { getUserLanguage } = require('./language');

/**
 * Parse a demand string like "Kangkung 50kg" or "cili padi 20 kg".
 * Returns { rawCrop, quantityKg } or null if unparseable.
 *
 * @param {string} text - Raw demand text
 * @returns {{ rawCrop: string, quantityKg: number, unit: string } | null}
 */
function parseDemandText(text) {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  // Pattern: one or more words followed by a number with optional unit
  // Supports: "Kangkung 50kg", "cili padi 20 kg", "Bayam 5.5 kg", "Tomato 100"
  const match = trimmed.match(
    /^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:(kg|g|tan|unit|bunch|ikat|biji|pcs))?$/i
  );

  if (!match) return null;

  const rawCrop = match[1].trim();
  const quantity = parseFloat(match[2]);
  const unit = (match[3] || 'kg').toLowerCase();

  if (isNaN(quantity) || quantity <= 0) return null;

  // Normalize to kg for storage
  let quantityKg = quantity;
  if (unit === 'g') {
    quantityKg = quantity / 1000;
  }

  return {
    rawCrop,
    quantityKg,
    unit,
    originalQuantity: quantity,
  };
}

/**
 * Handle a demand text message during onboarding or update flow.
 * Parses the text, normalizes the crop name via Gemini, and adds to the accumulator.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 * @param {object} session - User's conversation session
 */
async function handleDemandInput(bot, msg, session) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = session.language || 'ms';

  const parsed = parseDemandText(msg.text);
  if (!parsed) {
    await bot.sendMessage(chatId, t(lang, 'demandAddedError'));
    return;
  }

  try {
    // Normalize the crop name using Gemini
    const normalizedCrop = await normalizeCropName(parsed.rawCrop, lang);

    const demand = {
      crop: normalizedCrop,
      quantityKg: parsed.quantityKg,
      unit: parsed.unit,
      originalQuantity: parsed.originalQuantity,
      originalInput: msg.text.trim(),
    };

    // Add to session accumulator
    if (!session.demands) {
      session.demands = [];
    }
    session.demands.push(demand);

    const quantityStr = `${parsed.originalQuantity}${parsed.unit}`;
    await bot.sendMessage(
      chatId,
      t(lang, 'demandAdded', { crop: normalizedCrop, quantity: quantityStr })
    );
  } catch (error) {
    console.error('Demand input error:', error.message);
    await bot.sendMessage(chatId, t(lang, 'errors.general'));
  }
}

/**
 * Handle /done command to finalize demand entry.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 * @param {object} session - User's conversation session
 * @returns {boolean} Whether demands were successfully finalized
 */
async function handleDone(bot, msg, session) {
  const chatId = msg.chat.id;
  const lang = session.language || 'ms';

  if (!session.demands || session.demands.length === 0) {
    await bot.sendMessage(chatId, t(lang, 'noDemands'));
    return false;
  }

  return true;
}

/**
 * Handle /update command to modify existing demands.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 * @param {Map} sessions - All user sessions
 */
async function handleUpdateCommand(bot, msg, sessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = await getUserLanguage(userId);

  try {
    const buyer = await getBuyer(userId);
    if (!buyer) {
      await bot.sendMessage(chatId, t(lang, 'noProfile'));
      return;
    }

    // Start update flow
    sessions.set(userId, {
      step: 'update_demands',
      language: buyer.language || lang,
      demands: [],
      area: buyer.area || buyer.location?.area_name || '',
    });

    await bot.sendMessage(chatId, t(lang, 'updatePrompt'));
  } catch (error) {
    console.error('Update command error:', error.message);
    await bot.sendMessage(chatId, t(lang, 'errors.general'));
  }
}

/**
 * Save updated demands to Firestore and recalculate aggregates.
 *
 * @param {string} userId - Telegram user ID
 * @param {Array} demands - Array of demand objects
 * @param {string} area - User's area
 */
async function saveUpdatedDemands(userId, demands, area) {
  // Normalize field names before saving
  const normalized = demands.map((d) => ({
    crop: d.crop,
    quantity_kg: d.quantityKg || d.quantity_kg || 0,
    frequency: d.frequency || 'weekly',
  }));
  await updateBuyer(userId, { demands: normalized });
  if (area) {
    await updateDemandAggregates(area, normalized);
  }
}

module.exports = {
  parseDemandText,
  handleDemandInput,
  handleDone,
  handleUpdateCommand,
  saveUpdatedDemands,
};
