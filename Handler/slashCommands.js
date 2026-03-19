import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getJavaScriptFiles } from '../utils/loadFiles.js';
import { logger } from '../utils/logger.js';

export default async function loadSlashCommands(bot) {
  const rootDir = path.resolve('./SlashCommands');
  const files = await getJavaScriptFiles(rootDir);
  const slashCommands = [];

  for (const file of files) {
    try {
      const module = await import(pathToFileURL(file).href);
      const props = module?.command;

      if (!props?.name || typeof props.run !== 'function') {
        logger.warn(`Slash command ignorée (export invalide): ${path.relative(rootDir, file)}`);
        continue;
      }

      bot.slashCommands.set(props.name, props);
      slashCommands.push(props);
      logger.info(`Slash command chargée: ${path.relative(rootDir, file)}`);
    } catch (error) {
      logger.error(`Impossible de charger la slash command ${path.relative(rootDir, file)}.`, error);
    }
  }

  bot.arrayOfSlashCommands = slashCommands;
  return slashCommands.length;
}
