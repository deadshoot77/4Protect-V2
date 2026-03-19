import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getJavaScriptFiles } from '../utils/loadFiles.js';
import { logger } from '../utils/logger.js';

const ignoredFiles = new Set(['loadDatabase.js', 'sendlog.js']);

export default async function loadEvents(bot) {
  const rootDir = path.resolve('./Events');
  const files = (await getJavaScriptFiles(rootDir)).filter((file) => !ignoredFiles.has(path.basename(file)));
  let loaded = 0;

  for (const file of files) {
    try {
      const module = await import(pathToFileURL(file).href);
      const event = module?.default;

      if (!event?.name || typeof event.execute !== 'function') {
        logger.warn(`Event ignoré (export invalide): ${path.relative(rootDir, file)}`);
        continue;
      }

      const runner = (...args) => Promise.resolve(event.execute(...args, bot)).catch((error) => {
        logger.error(`Erreur dans l'event ${event.name}.`, error);
      });

      if (event.once) {
        bot.once(event.name, runner);
      } else {
        bot.on(event.name, runner);
      }

      loaded += 1;
      logger.info(`Event chargé: ${path.relative(rootDir, file)}`);
    } catch (error) {
      logger.error(`Impossible de charger l'event ${path.relative(rootDir, file)}.`, error);
    }
  }

  return loaded;
}
