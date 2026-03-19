import { logger } from '../utils/logger.js';

export default function registerProcessHandlers(bot) {
  bot.on('error', (error) => logger.error('Erreur Discord client.', error));
  bot.rest.on('rateLimited', (info) => logger.warn(`Rate limit Discord REST: ${JSON.stringify(info)}`));

  process.on('unhandledRejection', (reason) => {
    logger.error('Promesse non gérée.', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Exception non capturée.', error);
  });

  process.on('uncaughtExceptionMonitor', (error, origin) => {
    logger.error(`uncaughtExceptionMonitor (${origin}).`, error);
  });
}
