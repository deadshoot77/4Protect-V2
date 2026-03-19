# 4Protect V2

Base Discord.js v14 orientée support / gestion, conservant l'architecture historique du dépôt (`Commands`, `SlashCommands`, `Events`, `Handler`) tout en modernisant le bootstrap, la sécurité et le déploiement.

## Stack
- Node.js 20.11+ recommandé
- ESM (`"type": "module"`)
- `discord.js` v14
- `discord-giveaways`
- `sqlite3`
- `@discordjs/rest`
- `discord-api-types`
- `date-fns`
- `ms`

## Installation
1. Copier l'exemple d'environnement :
   ```bash
   cp .env.example .env
   ```
2. Renseigner au minimum dans `.env` :
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID` si vous voulez déployer les slash commands uniquement sur une guilde de test
3. Vérifier `config.json` pour les réglages publics.
4. Installer les dépendances :
   ```bash
   npm install
   ```

## Configuration

### `.env`
Variables sensibles, **jamais** à mettre dans `config.json` :

```env
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=... # optionnel
```

### `config.json`
Conserve les réglages non sensibles, par exemple :
- `prefix`
- `color`
- `owners`
- textes tickets / captcha
- IDs publics nécessaires au fonctionnement de certaines commandes

## Déployer les slash commands
Déploiement guild si `GUILD_ID` est défini, sinon déploiement global.

```bash
npm run deploy
```

Le script lit automatiquement toutes les slash commands présentes dans `SlashCommands/`.

## Lancer le bot
```bash
npm start
```

Mode développement avec reload Node :
```bash
npm run dev
```

## Flux pris en charge
- Commandes préfixées conservées
- Slash commands conservées
- Tickets via menu select + bouton de fermeture
- Suggestions via modal
- Confessions via modal + stockage SQLite
- Captcha via bouton + attribution de rôle
- Giveaways via `discord-giveaways`
- Base SQLite initialisée automatiquement au démarrage

## Notes de déploiement
- Le bot exige les intents et permissions Discord adaptés à vos modules actifs.
- Si les tickets ou le captcha échouent, vérifiez la hiérarchie des rôles et permissions du bot.
- Pour un déploiement rapide en test, renseignez `GUILD_ID` avant `npm run deploy`.

## Scripts
```bash
npm start
npm run dev
npm run deploy
```

## Crédit
- 4wip
- Base modernisée sans casser l'esprit 4Protect V2
