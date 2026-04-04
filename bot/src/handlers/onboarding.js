const { createBuyer, getBuyer, updateDemandAggregates } = require('../services/firestore');
const { reverseGeocode, parseManualLocation } = require('../services/location');
const { detectLanguage } = require('../services/gemini');
const { t, langName } = require('../services/i18n');
const { handleDemandInput, handleDone } = require('./demand');

/**
 * Conversation states for the onboarding flow.
 */
const STEPS = {
  ROLE_SELECT: 'role_select',
  LOCATION: 'location',
  DEMANDS: 'demands',
  FREQUENCY: 'frequency',
};

/**
 * Handle the /start command - begin onboarding flow.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 * @param {Map} sessions - Conversation state tracker
 */
async function handleStartCommand(bot, msg, sessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Auto-detect language from user's Telegram language_code or first message
  let lang = 'ms';
  const tgLang = msg.from.language_code;
  if (tgLang) {
    if (tgLang.startsWith('zh')) lang = 'zh';
    else if (tgLang.startsWith('en')) lang = 'en';
    else if (tgLang.startsWith('ms') || tgLang.startsWith('id')) lang = 'ms';
  }

  // Check if already registered — allow re-registration
  try {
    const existing = await getBuyer(userId);
    if (existing) {
      lang = existing.language || lang;
    }
  } catch (error) {
    console.error('Check existing buyer error:', error.message);
  }

  // Initialize session
  sessions.set(userId, {
    step: STEPS.ROLE_SELECT,
    language: lang,
    role: null,
    area: null,
    latitude: null,
    longitude: null,
    demands: [],
    frequency: null,
  });

  // Send welcome message
  await bot.sendMessage(chatId, t(lang, 'welcome'));

  // Show role selection keyboard
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t(lang, 'roles.restaurant'), callback_data: 'role_restaurant' },
        ],
        [
          { text: t(lang, 'roles.home_cook'), callback_data: 'role_home_cook' },
        ],
        [
          { text: t(lang, 'roles.retailer'), callback_data: 'role_retailer' },
        ],
      ],
    },
  };

  await bot.sendMessage(chatId, t(lang, 'selectRole'), keyboard);
}

/**
 * Handle role selection callback during onboarding.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} query - Callback query object
 * @param {Map} sessions - Conversation state tracker
 */
async function handleRoleCallback(bot, query, sessions) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const session = sessions.get(userId);

  if (!session || session.step !== STEPS.ROLE_SELECT) return;

  const role = query.data.replace('role_', '');
  if (!['restaurant', 'home_cook', 'retailer'].includes(role)) return;

  session.role = role;
  session.step = STEPS.LOCATION;
  const lang = session.language;

  await bot.answerCallbackQuery(query.id);

  const roleLabel = t(lang, `roles.${role}`);
  await bot.sendMessage(
    chatId,
    t(lang, 'roleSelected', { role: roleLabel })
  );

  // Ask for location
  await bot.sendMessage(chatId, t(lang, 'shareLocation'), {
    reply_markup: {
      keyboard: [
        [{ text: '📍 Share Location', request_location: true }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

/**
 * Handle location input during onboarding (GPS share).
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message with location
 * @param {Map} sessions - Conversation state tracker
 */
async function handleOnboardingLocation(bot, msg, sessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = sessions.get(userId);

  if (!session || session.step !== STEPS.LOCATION) return false;

  const lang = session.language;

  try {
    const { latitude, longitude } = msg.location;
    session.latitude = latitude;
    session.longitude = longitude;

    // Reverse geocode to get area name
    const areaName = await reverseGeocode(latitude, longitude);
    session.area = areaName;

    await bot.sendMessage(
      chatId,
      t(lang, 'locationSaved', { area: areaName }),
      { reply_markup: { remove_keyboard: true } }
    );

    // Move to demands step
    session.step = STEPS.DEMANDS;
    await bot.sendMessage(chatId, t(lang, 'enterDemand'));

    return true;
  } catch (error) {
    console.error('Onboarding location error:', error.message);
    await bot.sendMessage(chatId, t(lang, 'errors.locationFailed'));
    return true; // Still handled, just errored
  }
}

/**
 * Handle manual text location input during onboarding.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 * @param {Map} sessions - Conversation state tracker
 * @returns {boolean} Whether the message was handled
 */
async function handleOnboardingTextLocation(bot, msg, sessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = sessions.get(userId);

  if (!session || session.step !== STEPS.LOCATION) return false;

  const lang = session.language;
  const areaName = parseManualLocation(msg.text);
  session.area = areaName;

  await bot.sendMessage(
    chatId,
    t(lang, 'locationSaved', { area: areaName }),
    { reply_markup: { remove_keyboard: true } }
  );

  // Move to demands step
  session.step = STEPS.DEMANDS;
  await bot.sendMessage(chatId, t(lang, 'enterDemand'));

  return true;
}

/**
 * Handle /done during onboarding - finalize demands and ask for frequency.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 * @param {Map} sessions - Conversation state tracker
 */
async function handleOnboardingDone(bot, msg, sessions) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const session = sessions.get(userId);

  if (!session) return;

  const lang = session.language;

  if (session.step === 'update_demands') {
    // Handle /done during update flow
    const doneOk = await handleDone(bot, msg, session);
    if (!doneOk) return;

    const { saveUpdatedDemands } = require('./demand');
    await saveUpdatedDemands(userId, session.demands, session.area);

    await bot.sendMessage(chatId, t(lang, 'updateSaved'));
    sessions.delete(userId);
    return;
  }

  if (session.step !== STEPS.DEMANDS) return;

  const doneOk = await handleDone(bot, msg, session);
  if (!doneOk) return;

  // Move to frequency selection
  session.step = STEPS.FREQUENCY;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t(lang, 'frequencyWeekly'), callback_data: 'freq_weekly' },
        ],
        [
          { text: t(lang, 'frequencyBiweekly'), callback_data: 'freq_biweekly' },
        ],
        [
          { text: t(lang, 'frequencyMonthly'), callback_data: 'freq_monthly' },
        ],
      ],
    },
  };

  await bot.sendMessage(chatId, t(lang, 'selectFrequency'), keyboard);
}

/**
 * Handle frequency selection callback during onboarding.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} query - Callback query object
 * @param {Map} sessions - Conversation state tracker
 */
async function handleFrequencyCallback(bot, query, sessions) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const session = sessions.get(userId);

  // Guard: ignore if no session or already processed
  if (!session || session.step !== STEPS.FREQUENCY) {
    try { await bot.answerCallbackQuery(query.id); } catch (_) {}
    return;
  }

  const frequency = query.data.replace('freq_', '');
  if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) return;

  // Mark as processing immediately to prevent duplicate fires
  session.step = 'saving';
  session.frequency = frequency;
  const lang = session.language;

  try { await bot.answerCallbackQuery(query.id); } catch (_) {}

  try {
    // Save to Firestore
    await createBuyer(userId, {
      role: session.role,
      area: session.area,
      latitude: session.latitude,
      longitude: session.longitude,
      demands: session.demands,
      frequency: session.frequency,
      language: session.language,
    });

    // Update demand aggregates for this area
    if (session.area) {
      await updateDemandAggregates(session.area, session.demands);
    }

    await bot.sendMessage(chatId, t(lang, 'profileSaved'));

    // Clean up session
    sessions.delete(userId);
  } catch (error) {
    console.error('Profile save error:', error);
    console.error('Stack:', error.stack);
    await bot.sendMessage(chatId, t(lang, 'errors.general'));
  }
}

/**
 * Handle text messages during onboarding demand entry.
 *
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {object} msg - Telegram message object
 * @param {Map} sessions - Conversation state tracker
 * @returns {boolean} Whether the message was handled
 */
async function handleOnboardingDemand(bot, msg, sessions) {
  const userId = msg.from.id;
  const session = sessions.get(userId);

  if (!session) return false;

  if (session.step === STEPS.DEMANDS || session.step === 'update_demands') {
    await handleDemandInput(bot, msg, session);
    return true;
  }

  return false;
}

module.exports = {
  STEPS,
  handleStartCommand,
  handleRoleCallback,
  handleOnboardingLocation,
  handleOnboardingTextLocation,
  handleOnboardingDone,
  handleFrequencyCallback,
  handleOnboardingDemand,
};
