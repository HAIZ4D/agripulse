require('dotenv').config();
const fs = require('fs');
const log = (msg) => { fs.appendFileSync('bot_test.log', new Date().toISOString() + ' ' + msg + '\n'); };

process.on('uncaughtException', (err) => { log('UNCAUGHT: ' + err.stack); });
process.on('unhandledRejection', (err) => { log('UNHANDLED: ' + (err.stack || err)); });

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on('polling_error', (err) => { log('POLL_ERR: ' + err.message); });

bot.on('message', (msg) => {
  log('MSG from ' + msg.from.id + ': ' + (msg.text || '[location/other]'));
  bot.sendMessage(msg.chat.id, 'Echo: ' + (msg.text || 'received')).catch(e => log('SEND_ERR: ' + e.message));
});

bot.on('callback_query', (query) => {
  log('CALLBACK from ' + query.from.id + ': ' + query.data);
  bot.answerCallbackQuery(query.id).catch(e => log('ANSWER_ERR: ' + e.message));
});

log('Test bot started');
console.log('Test bot started - send a message to @agripulse_my_bot');
