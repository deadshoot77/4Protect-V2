import { ActivityType } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'clientReady',
  once: true,
  async execute(bot) {
    logger.info(`${bot.user.tag} est connecté.`);
    logger.info(`Invite: https://discord.com/oauth2/authorize?client_id=${bot.user.id}&permissions=8&scope=bot%20applications.commands`);
    logger.info(`Slash commands en mémoire: ${bot.arrayOfSlashCommands?.length ?? 0}`);

    bot.user.setPresence({
      activities: [{
        name: '4Protect V2',
        type: ActivityType.Streaming,
        url: 'https://twitch.tv/4wipyk',
      }],
      status: 'online',
    });
  },
};
