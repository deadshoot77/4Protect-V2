import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} from 'discord.js';
import { GiveawaysManager } from 'discord-giveaways';
import config from './config.json' with { type: 'json' };
import { ensureRuntimeEnv, env } from './utils/env.js';
import { logger } from './utils/logger.js';
import loadCommands from './Handler/Commands.js';
import loadSlashCommands from './Handler/slashCommands.js';
import loadEvents from './Handler/Events.js';
import registerProcessHandlers from './Handler/anticrash.js';
import { initDatabase } from './Events/loadDatabase.js';

async function bootstrap() {
  ensureRuntimeEnv();
  await initDatabase();

  const bot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.Reaction,
      Partials.User,
      Partials.GuildMember,
    ],
  });

  bot.commands = new Collection();
  bot.slashCommands = new Collection();
  bot.arrayOfSlashCommands = [];
  bot.setMaxListeners(70);

  registerProcessHandlers(bot);

  bot.giveawaysManager = new GiveawaysManager(bot, {
    storage: './giveaways.json',
    updateCountdownEvery: 5000,
    default: {
      botsCanWin: false,
      embedColor: config.color,
      reaction: '🎉',
    },
  });

  bot.giveawaysManager.on('giveawayEnded', async (giveaway, winners) => {
    try {
      const channel = await bot.channels.fetch(giveaway.channelId).catch(() => null);
      if (!channel?.isTextBased()) {
        return;
      }

      const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
      if (!message) {
        logger.warn(`Message de giveaway introuvable après la fin: ${giveaway.messageId}`);
        return;
      }

      const reaction = message.reactions.cache.get('🎉');
      let participantsCount = 0;

      if (reaction) {
        const users = await reaction.users.fetch().catch(() => null);
        participantsCount = users?.filter((user) => !user.bot).size ?? 0;
      }

      const hostedById = giveaway.hostedBy?.id ?? giveaway.hostedBy ?? 'Inconnu';
      const winnerList = winners?.length ? winners.map((winner) => `<@${winner.id}>`).join(', ') : 'Aucun';

      const embed = new EmbedBuilder()
        .setTitle(giveaway.prize)
        .setDescription(
          `Fin: <t:${Math.floor(giveaway.endAt / 1000)}:R> <t:${Math.floor(giveaway.endAt / 1000)}:F>\n`
          + `Organisé par: ${hostedById}\n`
          + `Participants: ${participantsCount}\n`
          + `Gagnant(s): ${winnerList}`,
        )
        .setColor(config.color);

      await message.edit({ embeds: [embed], components: [] }).catch((error) => {
        logger.warn(`Impossible de mettre à jour le giveaway ${giveaway.messageId}: ${error.message}`);
      });
    } catch (error) {
      logger.error('Erreur pendant le traitement de fin de giveaway.', error);
    }
  });

  const [commandCount, slashCount, eventCount] = await Promise.all([
    loadCommands(bot),
    loadSlashCommands(bot),
    loadEvents(bot),
  ]);

  logger.info(`Chargement terminé: ${commandCount} commande(s), ${slashCount} slash command(s), ${eventCount} event(s).`);

  await bot.login(env.token);
  return bot;
}

bootstrap().catch((error) => {
  logger.error('Le bot n\'a pas pu démarrer proprement.', error);
  process.exitCode = 1;
});
