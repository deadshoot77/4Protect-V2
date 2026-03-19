import 'dotenv/config';

const trim = (value) => (typeof value === 'string' ? value.trim() : '');

export const env = {
  token: trim(process.env.DISCORD_TOKEN),
  clientId: trim(process.env.CLIENT_ID),
  guildId: trim(process.env.GUILD_ID),
};

export function ensureRuntimeEnv() {
  if (!env.token) {
    throw new Error('Variable manquante: DISCORD_TOKEN. Ajoutez votre token dans le fichier .env avant de lancer le bot.');
  }
}

export function ensureDeployEnv() {
  if (!env.token) {
    throw new Error('Variable manquante: DISCORD_TOKEN. Ajoutez votre token dans le fichier .env avant de lancer le déploiement des slash commands.');
  }

  if (!env.clientId) {
    throw new Error('Variable manquante: CLIENT_ID. Ajoutez l\'identifiant de votre application dans le fichier .env avant de lancer le déploiement.');
  }
}
