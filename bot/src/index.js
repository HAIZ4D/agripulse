require('dotenv').config();

const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '..', 'bot.log');
const origLog = console.log;
const origErr = console.error;
console.log = (...args) => { const msg = args.map(String).join(' ') + '\n'; fs.appendFileSync(logFile, `[LOG] ${msg}`); origLog(...args); };
console.error = (...args) => { const msg = args.map(a => a instanceof Error ? a.stack || a.message : String(a)).join(' ') + '\n'; fs.appendFileSync(logFile, `[ERR] ${msg}`); origErr(...args); };

const TelegramBot = require('node-telegram-bot-api');
const { initFirestore } = require('./services/firestore');
const { initGemini } = require('./services/gemini');
const {
  handleStartCommand,
  handleRoleCallback,
  handleOnboardingLocation,
  handleOnboardingTextLocation,
  handleOnboardingDone,
  handleFrequencyCallback,
  handleOnboardingDemand,
  STEPS,
} = require('./handlers/onboarding');
const { handleUpdateCommand } = require('./handlers/demand');
const { handleStatusCommand } = require('./handlers/status');
const { handleSurplusCommand, handleSurplusInput } = require('./handlers/surplus');
const {
  handleLangCommand,
  handleLangCallback,
  autoDetectLanguage,
} = require('./handlers/language');
const { reverseGeocode } = require('./services/location');

// ─── Validate Environment ───

const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'FIREBASE_PROJECT_ID',
  'GEMINI_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// ─── Initialize Services ───

initFirestore();
initGemini();

// ─── Initialize Bot ───

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: {
    autoStart: true,
    params: { timeout: 30 },
  },
  request: {
    agentOptions: { keepAlive: true, family: 4 },
  },
});

// Conversation state per user: Map<userId, sessionObject>
const sessions = new Map();

// Track whether we've auto-detected language for a user in this session
const languageDetected = new Set();

console.log('AgriPulse Bot is running...');

// ─── Command Handlers ───

bot.onText(/\/start/, (msg) => {
  handleStartCommand(bot, msg, sessions).catch((err) => {
    console.error('/start error:', err.message);
  });
});

bot.onText(/\/done/, (msg) => {
  handleOnboardingDone(bot, msg, sessions).catch((err) => {
    console.error('/done error:', err.message);
  });
});

bot.onText(/\/status/, (msg) => {
  handleStatusCommand(bot, msg).catch((err) => {
    console.error('/status error:', err.message);
  });
});

bot.onText(/\/update/, (msg) => {
  handleUpdateCommand(bot, msg, sessions).catch((err) => {
    console.error('/update error:', err.message);
  });
});

bot.onText(/\/surplus/, (msg) => {
  handleSurplusCommand(bot, msg, sessions).catch((err) => {
    console.error('/surplus error:', err.message);
  });
});

bot.onText(/\/lang/, (msg) => {
  handleLangCommand(bot, msg).catch((err) => {
    console.error('/lang error:', err.message);
  });
});

// ─── Callback Query Handler ───

bot.on('callback_query', (query) => {
  const data = query.data;

  const handler = async () => {
    try {
      if (data.startsWith('role_')) {
        await handleRoleCallback(bot, query, sessions);
      } else if (data.startsWith('freq_')) {
        await handleFrequencyCallback(bot, query, sessions);
      } else if (data.startsWith('lang_')) {
        await handleLangCallback(bot, query);
      }
    } catch (err) {
      console.error(`Callback error [${data}]:`, err);
      console.error('Stack:', err.stack);
      try {
        await bot.answerCallbackQuery(query.id);
      } catch (_) { /* ignore */ }
    }
  };

  handler();
});

// ─── Location Handler ───

bot.on('location', (msg) => {
  const userId = msg.from.id;
  const session = sessions.get(userId);

  if (session && session.step === STEPS.LOCATION) {
    handleOnboardingLocation(bot, msg, sessions).catch((err) => {
      console.error('Location handler error:', err.message);
    });
  }
});

// ─── Text Message Router ───

bot.on('message', (msg) => {
  // Handle location messages here too (backup for location event)
  if (msg.location) {
    const userId = msg.from.id;
    const session = sessions.get(userId);
    if (session && session.step === STEPS.LOCATION) {
      handleOnboardingLocation(bot, msg, sessions).catch((err) => {
        console.error('Location handler (message) error:', err.message);
      });
    }
    return;
  }

  // Skip commands - they're handled by onText
  if (!msg.text || msg.text.startsWith('/')) return;

  const userId = msg.from.id;
  const session = sessions.get(userId);

  (async () => {
    try {
      // Auto-detect language on the user's first non-command message
      if (!languageDetected.has(userId)) {
        languageDetected.add(userId);
        const detectedLang = await autoDetectLanguage(msg.text, userId);
        if (session) {
          session.language = detectedLang;
        }
      }

      if (!session) return;

      // Route based on conversation state
      switch (session.step) {
        case STEPS.LOCATION:
          // Manual text location during onboarding
          await handleOnboardingTextLocation(bot, msg, sessions);
          break;

        case STEPS.DEMANDS:
        case 'update_demands':
          // Demand text input during onboarding or update
          await handleOnboardingDemand(bot, msg, sessions);
          break;

        case 'surplus_entry':
          // Surplus text input
          await handleSurplusInput(bot, msg, session);
          // Clear surplus session after one entry
          sessions.delete(userId);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Message handling error:', error.message);
    }
  })();
});

// ─── Error Handling ───

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code, error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('SIGINT', () => {
  console.log('Shutting down AgriPulse Bot...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down AgriPulse Bot...');
  bot.stopPolling();
  process.exit(0);
});

module.exports = { bot, sessions };
