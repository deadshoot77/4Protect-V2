import path from 'node:path';
import sqlite3Module from 'sqlite3';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const sqlite3 = sqlite3Module.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../database.sqlite3');

const schema = [
  `CREATE TABLE IF NOT EXISTS whitelist (id TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS owner (id TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS blacklist (id TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS ghostping (guild TEXT PRIMARY KEY, channels TEXT)`,
  `CREATE TABLE IF NOT EXISTS soutien (guild TEXT PRIMARY KEY, id TEXT, texte TEXT)`,
  `CREATE TABLE IF NOT EXISTS public (statut TEXT, guild TEXT, PRIMARY KEY (statut, guild))`,
  `CREATE TABLE IF NOT EXISTS permissions (perm TEXT, id TEXT, guild TEXT, PRIMARY KEY (perm, id, guild))`,
  `CREATE TABLE IF NOT EXISTS cmdperm (perm TEXT, command TEXT, guild TEXT, PRIMARY KEY (perm, command, guild))`,
  `CREATE TABLE IF NOT EXISTS sanctions (id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT, raison TEXT, date TEXT, guild TEXT)`,
  `CREATE TABLE IF NOT EXISTS logs (guild TEXT PRIMARY KEY, channels TEXT)`,
  `CREATE TABLE IF NOT EXISTS punish (guild TEXT, module TEXT, punition TEXT, PRIMARY KEY (guild, module))`,
  `CREATE TABLE IF NOT EXISTS tempvoc (guildId TEXT PRIMARY KEY, channel TEXT, category TEXT)`,
  `CREATE TABLE IF NOT EXISTS Confess (guildId TEXT PRIMARY KEY, channel TEXT)`,
  `CREATE TABLE IF NOT EXISTS confesslogs (id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT, userId TEXT, message TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS Suggest (guildId TEXT PRIMARY KEY, channel TEXT)`,
  `CREATE TABLE IF NOT EXISTS joinsettings (guildId TEXT PRIMARY KEY, channel TEXT, message TEXT)`,
  `CREATE TABLE IF NOT EXISTS piconly_channels (guild TEXT NOT NULL, channel_id TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS captcha (guild TEXT PRIMARY KEY, id TEXT)`,
  `CREATE TABLE IF NOT EXISTS vouch (guild TEXT PRIMARY KEY, total INTEGER DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS tempvoc_channels (channelId TEXT PRIMARY KEY, guildId TEXT)`,
  `CREATE TABLE IF NOT EXISTS ticket (guild TEXT PRIMARY KEY, category TEXT)`,
  `CREATE TABLE IF NOT EXISTS ticketchannel (channelId TEXT PRIMARY KEY, guildId TEXT, userId TEXT, topic TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS antiraid (
    guild TEXT PRIMARY KEY,
    antilink INTEGER DEFAULT 0,
    type TEXT DEFAULT 'all',
    antispam INTEGER DEFAULT 0,
    nombremessage INTEGER DEFAULT 3,
    sous INTEGER DEFAULT 10,
    timeout INTEGER DEFAULT 60000,
    antichannel INTEGER DEFAULT 0,
    antivanity INTEGER DEFAULT 0,
    antiwebhook INTEGER DEFAULT 0,
    antibot INTEGER DEFAULT 0,
    antieveryone INTEGER DEFAULT 0,
    antirole INTEGER DEFAULT 0,
    antiban INTEGER DEFAULT 0,
    antiupdate INTEGER DEFAULT 0
  )`
];

const db = new sqlite3.Database(dbPath);
let initialized = false;

export function initDatabase() {
  if (initialized) {
    return Promise.resolve(db);
  }

  initialized = true;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA foreign_keys = ON');

      for (const query of schema) {
        db.run(query, (error) => {
          if (error) {
            logger.error('Erreur lors de l\'initialisation SQLite.', error);
            reject(error);
          }
        });
      }

      db.run(
        `ALTER TABLE ticketchannel ADD COLUMN guildId TEXT`,
        (error) => {
          if (error && !String(error.message).includes('duplicate column name')) {
            logger.warn(`Migration SQLite ignorée: ${error.message}`);
          }
        }
      );

      db.run(
        `ALTER TABLE ticketchannel ADD COLUMN userId TEXT`,
        (error) => {
          if (error && !String(error.message).includes('duplicate column name')) {
            logger.warn(`Migration SQLite ignorée: ${error.message}`);
          }
        }
      );

      db.run(
        `ALTER TABLE ticketchannel ADD COLUMN topic TEXT`,
        (error) => {
          if (error && !String(error.message).includes('duplicate column name')) {
            logger.warn(`Migration SQLite ignorée: ${error.message}`);
          }
        }
      );

      db.run('SELECT 1', (error) => {
        if (error) {
          reject(error);
          return;
        }

        logger.info(`Base SQLite prête: ${dbPath}`);
        resolve(db);
      });
    });
  });
}

export const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
});

export const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
});

export const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(error) {
    if (error) {
      reject(error);
      return;
    }

    resolve(this);
  });
});

export default db;
