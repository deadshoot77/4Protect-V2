# Migration notes - 4Protect V2

## Changements réalisés
- Suppression de la lecture du token dans `config.json`, remplacée par `.env` avec `dotenv`.
- Bootstrap `index.js` nettoyé avec intents explicites, logs plus lisibles et handlers d'erreurs modernes.
- Chargement des commandes / slash commands / events fiabilisé avec garde sur les exports invalides.
- Ajout d'un vrai script `deploy-commands.js` pour publier les slash commands en mode global ou guild.
- Réécriture du flux `interactionCreate` pour éviter les doubles réponses et sécuriser boutons, menus et modals.
- Centralisation de la création des tables SQLite dans `Events/loadDatabase.js`.
- Correction du flux ticket :
  - anti-doublon par utilisateur,
  - validation de la catégorie,
  - permissions explicites,
  - une seule réponse interaction.
- Correction du flux captcha :
  - rôle introuvable géré,
  - succès/échec confirmé à l'utilisateur.
- Correction du flux suggestion :
  - validation du salon,
  - accusé utilisateur,
  - réactions ✅ / ❌ conservées.
- Correction du flux confess :
  - insertion SQLite confirmée,
  - numéro basé sur l'`AUTOINCREMENT`,
  - confirmation éphémère côté utilisateur.
- Sécurisation de la fin de giveaway pour éviter les crashs si le message ou la réaction n'existe plus.

## Audit rapide des problèmes trouvés avant correction
- `index.js` utilisait un intent numérique magique et lisait le token dans `config.json`.
- `clientReady` redéployait implicitement les slash commands au démarrage.
- `Handler/Events.js` essayait de charger `loadDatabase.js` et `sendlog.js` comme des events.
- `interactionCreate.js` mélangeait plusieurs styles d'API et pouvait répondre deux fois à une même interaction.
- Le flux ticket envoyait deux réponses, ne vérifiait pas proprement la catégorie et stockait trop peu d'informations.
- Certaines commandes recréaient des tables SQLite localement alors qu'elles doivent être centralisées.
- `package.json` contenait `fs` en dépendance alors que c'est un module natif Node.js.
- La doc n'expliquait pas clairement le déploiement slash ni la séparation `.env` / `config.json`.

## Points à surveiller encore
- Plusieurs commandes historiques du dépôt répètent la logique de permission ; elles restent fonctionnelles mais pourraient être factorisées plus tard.
- Les modules antiraid et logs dépendent fortement des permissions Discord réelles du bot sur le serveur.
- Les tests complets tickets / captcha / modal / giveaway nécessitent un vrai serveur Discord et un bot configuré.
- Certaines commandes anciennes peuvent encore utiliser des patterns v14 perfectibles sans être bloquants au démarrage.
