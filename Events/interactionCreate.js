import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import config from '../config.json' with { type: 'json' };
import db, { dbGet, dbRun } from './loadDatabase.js';
import { logger } from '../utils/logger.js';

const buildEphemeralPayload = (content) => ({ content, flags: MessageFlags.Ephemeral });

const buildSuggestButtonRow = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('suggest_open')
    .setLabel('Faire une suggestion')
    .setStyle(ButtonStyle.Primary),
);

const buildConfessButtonRow = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('confess_open')
    .setLabel('Se confesser')
    .setStyle(ButtonStyle.Primary),
);

const buildTicketCloseRow = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('ticket_close')
    .setLabel('Fermer le ticket')
    .setStyle(ButtonStyle.Danger),
);

async function ensurePreviousPromptWithoutButton(channel, botUserId) {
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const lastBotMessage = messages?.find((message) => message.author.id === botUserId && message.components.length > 0);

  if (lastBotMessage) {
    await lastBotMessage.edit({ components: [] }).catch(() => {});
  }
}

async function handleSlashCommand(interaction, bot) {
  const cmd = bot.slashCommands.get(interaction.commandName);
  if (!cmd) {
    await interaction.reply(buildEphemeralPayload('Cette slash command est introuvable en mémoire.'));
    return;
  }

  try {
    await cmd.run(bot, interaction, [], config);
  } catch (error) {
    logger.error(`Erreur slash command ${interaction.commandName}.`, error);

    const payload = buildEphemeralPayload('Une erreur est survenue pendant l\'exécution de la commande.');
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

async function handleCaptcha(interaction) {
  const row = await dbGet('SELECT id FROM captcha WHERE guild = ?', [interaction.guild.id]).catch((error) => {
    logger.error('Erreur lecture captcha.', error);
    return null;
  });

  if (!row?.id) {
    await interaction.reply(buildEphemeralPayload('Le captcha n\'est pas configuré sur ce serveur.'));
    return;
  }

  const role = interaction.guild.roles.cache.get(row.id);
  if (!role) {
    await interaction.reply(buildEphemeralPayload('Le rôle captcha configuré est introuvable. Merci de reconfigurer le captcha.'));
    return;
  }

  try {
    await interaction.member.roles.add(role, 'Validation captcha');
    await interaction.reply(buildEphemeralPayload(`Vérification réussie, le rôle ${role} vous a été attribué.`));
  } catch (error) {
    logger.error('Erreur attribution rôle captcha.', error);
    await interaction.reply(buildEphemeralPayload('Impossible d\'ajouter le rôle captcha. Vérifiez la hiérarchie des rôles et les permissions du bot.'));
  }
}

async function handleSuggestionModal(interaction) {
  const suggestion = interaction.fields.getTextInputValue('suggest_text').trim();
  const row = await dbGet('SELECT channel FROM Suggest WHERE guildId = ?', [interaction.guild.id]).catch((error) => {
    logger.error('Erreur lecture Suggest.', error);
    return null;
  });

  if (!row?.channel || row.channel === 'off') {
    await interaction.reply(buildEphemeralPayload("Le salon de suggestion n'est pas configuré."));
    return;
  }

  const suggestChannel = interaction.guild.channels.cache.get(row.channel);
  if (!suggestChannel?.isTextBased()) {
    await interaction.reply(buildEphemeralPayload('Le salon de suggestion configuré est introuvable ou non textuel.'));
    return;
  }

  await ensurePreviousPromptWithoutButton(suggestChannel, interaction.client.user.id);

  const embed = new EmbedBuilder()
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
    .setTitle('Suggestion')
    .setDescription(suggestion)
    .setColor(config.color)
    .setTimestamp();

  const sentMessage = await suggestChannel.send({ embeds: [embed], components: [buildSuggestButtonRow()] });
  await sentMessage.react('✅').catch(() => {});
  await sentMessage.react('❌').catch(() => {});

  await interaction.reply(buildEphemeralPayload('Votre suggestion a bien été envoyée.'));
}

async function handleConfessModal(interaction) {
  const confession = interaction.fields.getTextInputValue('confess_text').trim();
  const row = await dbGet('SELECT channel FROM Confess WHERE guildId = ?', [interaction.guild.id]).catch((error) => {
    logger.error('Erreur lecture Confess.', error);
    return null;
  });

  if (!row?.channel || row.channel === 'off') {
    await interaction.reply(buildEphemeralPayload("Le salon de confession n'est pas configuré."));
    return;
  }

  const confessChannel = interaction.guild.channels.cache.get(row.channel);
  if (!confessChannel?.isTextBased()) {
    await interaction.reply(buildEphemeralPayload('Le salon de confession configuré est introuvable ou non textuel.'));
    return;
  }

  const insertResult = await dbRun('INSERT INTO confesslogs (guildId, userId, message) VALUES (?, ?, ?)', [interaction.guild.id, interaction.user.id, confession]).catch((error) => {
    logger.error('Erreur insertion confesslogs.', error);
    return null;
  });

  if (!insertResult) {
    await interaction.reply(buildEphemeralPayload("Impossible d'enregistrer votre confession pour le moment."));
    return;
  }

  await ensurePreviousPromptWithoutButton(confessChannel, interaction.client.user.id);

  const embed = new EmbedBuilder()
    .setTitle(`Confession #${insertResult.lastID}`)
    .setDescription(confession)
    .setColor(config.color)
    .setTimestamp();

  await confessChannel.send({ embeds: [embed], components: [buildConfessButtonRow()] });
  await interaction.reply(buildEphemeralPayload(`Votre confession #${insertResult.lastID} a bien été envoyée.`));
}

async function handleGiveawayAction(interaction, bot) {
  const [, action, messageId] = interaction.customId.split('_');
  if (!messageId) {
    await interaction.reply(buildEphemeralPayload('Identifiant de giveaway invalide.'));
    return;
  }

  try {
    if (action === 'reroll') {
      await bot.giveawaysManager.reroll(messageId);
      await interaction.reply(buildEphemeralPayload('Le giveaway a bien été reroll.'));
      return;
    }

    if (action === 'end') {
      await bot.giveawaysManager.end(messageId);
      await interaction.reply(buildEphemeralPayload('Le giveaway a bien été terminé.'));
      return;
    }

    await interaction.reply(buildEphemeralPayload('Action de giveaway inconnue.'));
  } catch (error) {
    logger.error(`Erreur action giveaway ${action}.`, error);
    await interaction.reply(buildEphemeralPayload('Impossible de traiter cette action de giveaway. Le message est peut-être déjà terminé ou introuvable.'));
  }
}

async function handleTicketCreate(interaction) {
  const selectedKey = interaction.values[0];
  const optionText = config[selectedKey] || 'Ticket';

  const existingTicket = await dbGet(
    'SELECT channelId FROM ticketchannel WHERE guildId = ? AND userId = ?',
    [interaction.guild.id, interaction.user.id],
  ).catch((error) => {
    logger.error('Erreur lecture ticketchannel.', error);
    return null;
  });

  if (existingTicket?.channelId) {
    const existingChannel = interaction.guild.channels.cache.get(existingTicket.channelId);
    if (existingChannel) {
      await interaction.reply(buildEphemeralPayload(`Vous avez déjà un ticket ouvert: ${existingChannel}.`));
      return;
    }

    await dbRun('DELETE FROM ticketchannel WHERE channelId = ?', [existingTicket.channelId]).catch(() => {});
  }

  const ticketRow = await dbGet('SELECT category FROM ticket WHERE guild = ?', [interaction.guild.id]).catch((error) => {
    logger.error('Erreur lecture ticket.', error);
    return null;
  });

  if (!ticketRow?.category) {
    await interaction.reply(buildEphemeralPayload("Le système de tickets n'est pas configuré sur ce serveur."));
    return;
  }

  const category = interaction.guild.channels.cache.get(ticketRow.category);
  if (!category || category.type !== ChannelType.GuildCategory) {
    await interaction.reply(buildEphemeralPayload('La catégorie des tickets est introuvable. Merci de reconfigurer la commande ticket.'));
    return;
  }

  const everyoneRole = interaction.guild.roles.everyone;
  const channelName = `ticket-${interaction.user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .slice(0, 90);
  const topic = `${optionText} - ${interaction.user.id}`;

  const permissionOverwrites = [
    {
      id: everyoneRole.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  const staffOverwrites = category.permissionOverwrites.cache
    .filter((overwrite) => overwrite.id !== everyoneRole.id)
    .map((overwrite) => ({
      id: overwrite.id,
      allow: overwrite.allow.toArray(),
      deny: overwrite.deny.toArray(),
      type: overwrite.type,
    }));

  permissionOverwrites.push(...staffOverwrites);

  try {
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName || `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      topic,
      parent: category.id,
      permissionOverwrites,
    });

    await dbRun(
      'INSERT OR REPLACE INTO ticketchannel (channelId, guildId, userId, topic) VALUES (?, ?, ?, ?)',
      [ticketChannel.id, interaction.guild.id, interaction.user.id, topic],
    );

    await interaction.reply(buildEphemeralPayload(`Votre ticket a été créé: ${ticketChannel}.`));

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [
        new EmbedBuilder()
          .setTitle(`Ticket - ${optionText}`)
          .setDescription('Expliquez votre problème, un membre du staff va vous répondre.\n\nPour fermer le ticket, cliquez sur le bouton ci-dessous.')
          .setColor(config.color)
          .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setThumbnail(interaction.user.displayAvatarURL())
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp(),
      ],
      components: [buildTicketCloseRow()],
    });
  } catch (error) {
    logger.error('Erreur création ticket.', error);
    await interaction.reply(buildEphemeralPayload('Impossible de créer le ticket. Vérifiez la catégorie configurée et les permissions du bot.'));
  }
}

async function handleTicketClose(interaction) {
  await dbRun('DELETE FROM ticketchannel WHERE channelId = ?', [interaction.channel.id]).catch((error) => {
    logger.error('Erreur suppression ticketchannel.', error);
  });

  await interaction.reply(buildEphemeralPayload('Le ticket va être fermé.'));
  await interaction.channel.delete().catch((error) => {
    logger.error('Erreur suppression salon ticket.', error);
  });
}

export default {
  name: 'interactionCreate',
  async execute(interaction, bot) {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction, bot);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'confess_open') {
        const modal = new ModalBuilder()
          .setCustomId('confess_modal')
          .setTitle('Faire une confession')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('confess_text')
                .setLabel('Ta confession')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(2000),
            ),
          );

        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === 'suggest_open') {
        const modal = new ModalBuilder()
          .setCustomId('suggest_modal')
          .setTitle('Faire une suggestion')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('suggest_text')
                .setLabel('Ta suggestion')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(2000),
            ),
          );

        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === 'cbutton') {
        await handleCaptcha(interaction);
        return;
      }

      if (interaction.customId === 'ticket_close') {
        await handleTicketClose(interaction);
        return;
      }

      if (interaction.customId.startsWith('giveaway_')) {
        await handleGiveawayAction(interaction, bot);
      }

      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
      await handleTicketCreate(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'suggest_modal') {
        await handleSuggestionModal(interaction);
        return;
      }

      if (interaction.customId === 'confess_modal') {
        await handleConfessModal(interaction);
      }
    }
  },
};
