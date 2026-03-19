import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureDeployEnv, env } from './utils/env.js';
import { getJavaScriptFiles } from './utils/loadFiles.js';
import { logger } from './utils/logger.js';

async function loadSlashCommands() {
  const rootDir = path.resolve('./SlashCommands');
  const files = await getJavaScriptFiles(rootDir);
  const commands = [];

  for (const file of files) {
    const module = await import(pathToFileURL(file).href);
    const command = module?.command;

    if (!command?.name) {
      logger.warn(`Slash command ignorée: ${path.relative(rootDir, file)}`);
      continue;
    }

    commands.push(command);
  }

  return commands;
}

async function main() {
  ensureDeployEnv();

  const commands = await loadSlashCommands();
  const rest = new REST({ version: '10' }).setToken(env.token);
  const isGuildDeploy = Boolean(env.guildId);
  const route = isGuildDeploy
    ? Routes.applicationGuildCommands(env.clientId, env.guildId)
    : Routes.applicationCommands(env.clientId);

  logger.info(`${commands.length} slash command(s) détectée(s).`);
  logger.info(`Mode de déploiement: ${isGuildDeploy ? `guild (${env.guildId})` : 'global'}.`);

  await rest.put(route, { body: commands });
  logger.info('Déploiement des slash commands terminé avec succès.');
}

main().catch((error) => {
  logger.error('Échec du déploiement des slash commands.', error);
  process.exitCode = 1;
});
