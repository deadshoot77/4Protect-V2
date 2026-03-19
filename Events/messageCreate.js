import config from '../config.json' with { type: 'json' };
import { EmbedBuilder } from 'discord.js';
import db from './loadDatabase.js';
import { logger } from '../utils/logger.js';

const spamMap = new Map();

export default {
  name: 'messageCreate',
  async execute(message, bot) {
    if (!message.guild || message.author.bot) return;
    await al(message);
    await antiEveryone(message);
    await antispam(message);
    await handleCommands(message, bot);
  },
};

const bypass = async (userId) => new Promise((resolve) => {
  db.get('SELECT id FROM owner WHERE id = ?', [userId], (err, row) => {
    if (row) return resolve(true);
    db.get('SELECT id FROM whitelist WHERE id = ?', [userId], (err2, row2) => {
      resolve(!!row2);
    });
  });
});

const al = async (message) => {
  if (await bypass(message.author.id)) return;

  db.get('SELECT antilink, type FROM antiraid WHERE guild = ?', [message.guild.id], async (err, row) => {
    if (err) {
      logger.error('Erreur récupération anti-link.', err);
      return;
    }

    if (row?.antilink) {
      const patern = /(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*/gi;
      const bl = /(discord\.gg\/[^\s]+|discord(app)?\.com\/invite\/[^\s]+)/i;
      const gifPattern = /\.(gif)$/i;
      const wldom = /(tenor\.com|giphy\.com)/i;

      if (patern.test(message.content)) {
        const links = message.content.match(patern) || [];
        const isInvite = bl.test(message.content);
        const isGif = links.some((link) => gifPattern.test(link) || wldom.test(link));

        if (isGif) return;

        if ((isInvite && row.type === 'invite') || row.type === 'all') {
          message.delete().catch(console.error);

          const embed = new EmbedBuilder()
            .setColor(config.color)
            .setDescription(`Vous n'avez pas le droit d'envoyer des liens <@${message.author.id}>`);
          message.channel.send({ embeds: [embed] }).then((msg) => {
            setTimeout(() => {
              msg.delete().catch(console.error);
            }, 3000);
          }).catch(console.error);

          db.get('SELECT punition FROM punish WHERE guild = ? AND module = ?', [message.guild.id, 'antilink'], async (err2, punishRow) => {
            const sanction = punishRow?.punition || 'timeout';

            if (sanction === 'ban') {
              await message.member.ban({ reason: 'Antilink' });
            } else if (sanction === 'kick') {
              await message.member.kick('Antilink');
            } else if (sanction === 'derank') {
              await message.member.roles.set([], 'Antilink');
            } else {
              await message.member.timeout?.(60000, 'Antilink');
            }
          });
        }
      }
    }
  });
};

const antiEveryone = async (message) => {
  if (await bypass(message.author.id)) return;

  db.get('SELECT antieveryone FROM antiraid WHERE guild = ?', [message.guild.id], async (err, row) => {
    if (err || !row?.antieveryone) return;

    if (message.mentions.everyone) {
      try {
        await message.delete();

        const sanctionRow = await new Promise((resolve) => {
          db.get('SELECT punition FROM punish WHERE guild = ? AND module = ?', [message.guild.id, 'antieveryone'], (err2, row2) => {
            resolve(row2);
          });
        });
        const sanction = sanctionRow?.punition || 'timeout';

        const member = message.member;
        if (!member) return;

        if (sanction === 'ban') {
          await member.ban({ reason: 'AntiEveryone' });
        } else if (sanction === 'kick') {
          await member.kick('AntiEveryone');
        } else if (sanction === 'derank') {
          await member.roles.set([], 'AntiEveryone');
        } else {
          await member.timeout?.(60000, 'AntiEveryone');
        }
      } catch (error) {
        logger.error('Erreur AntiEveryone.', error);
      }
    }
  });
};

const antispam = async (message) => {
  if (await bypass(message.author.id)) return;

  db.get('SELECT antispam, nombremessage, sous, timeout FROM antiraid WHERE guild = ?', [message.guild.id], async (err, row) => {
    if (err) {
      logger.error('Erreur récupération antispam.', err);
      return;
    }
    if (!row?.antispam) {
      return;
    }

    const count = row.nombremessage;
    const sous = row.sous;
    const timeoutMs = row.timeout;

    const now = Date.now();
    if (!spamMap.has(message.guild.id)) {
      spamMap.set(message.guild.id, new Map());
    }
    const guildSpam = spamMap.get(message.guild.id);

    let userTimestamps = guildSpam.get(message.author.id) || [];
    userTimestamps = userTimestamps.filter((ts) => now - ts < sous);
    userTimestamps.push(now);
    guildSpam.set(message.author.id, userTimestamps);

    if (userTimestamps.length >= count) {
      db.get('SELECT punition FROM punish WHERE guild = ? AND module = ?', [message.guild.id, 'antispam'], async (err2, punishRow) => {
        if (err2) {
          logger.error('Erreur récupération punition antispam.', err2);
          return;
        }

        const sanction = punishRow?.punition || 'timeout';
        try {
          if (sanction === 'ban') {
            await message.member.ban({ reason: 'Antispam' });
            await message.channel.send(`<@${message.author.id}> a été banni pour spam.`);
          } else if (sanction === 'kick') {
            await message.member.kick('Antispam');
            await message.channel.send(`<@${message.author.id}> a été kick pour spam.`);
          } else if (sanction === 'derank') {
            await message.member.roles.set([], 'Antispam');
            await message.channel.send(`<@${message.author.id}> a été dérank pour spam.`);
          } else {
            await message.member.timeout(timeoutMs, 'Antispam');
            await message.channel.send(`<@${message.author.id}> a été timeout pour spam.`);
          }
          guildSpam.set(message.author.id, []);
        } catch (error) {
          logger.error('Erreur application sanction antispam.', error);
        }
      });
    }
  });
};

const handleCommands = async (message, bot) => {
  const prefixPing = () => message.reply({
    content: `Mon préfixe est \`${config.prefix}\`.`,
    allowedMentions: { repliedUser: false },
  });

  if (message.content.startsWith(`<@${bot.user.id}>`)) {
    const args = message.content.slice(`<@${bot.user.id}>`.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return prefixPing();

    const commandFile = bot.commands.get(commandName);
    if (!commandFile) return prefixPing();

    await commandFile.run(bot, message, args, config);
  } else if (message.content.startsWith(config.prefix)) {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    const commandFile = bot.commands.get(commandName);
    if (!commandFile) return;

    await commandFile.run(bot, message, args, config);
  }
};
