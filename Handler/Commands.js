import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getJavaScriptFiles } from '../utils/loadFiles.js';
import { logger } from '../utils/logger.js';

export default async function loadCommands(bot) {
  const rootDir = path.resolve('./Commands');
  const files = await getJavaScriptFiles(rootDir);
  let loaded = 0;

  for (const file of files) {
    try {
      const module = await import(pathToFileURL(file).href);
      const props = module?.command;

      if (!props?.name || typeof props.run !== 'function') {
        logger.warn(`Commande ignorée (export invalide): ${path.relative(rootDir, file)}`);
        continue;
      }

      bot.commands.set(props.name, props);

      if (Array.isArray(props.aliases)) {
        for (const alias of props.aliases.filter(Boolean)) {
          bot.commands.set(alias, props);
        }
      }

      loaded += 1;
      logger.info(`Commande chargée: ${path.relative(rootDir, file)}`);
    } catch (error) {
      logger.error(`Impossible de charger la commande ${path.relative(rootDir, file)}.`, error);
    }
  }

  return loaded;
}
