import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { config } from '../config';

let instance: Database.Database | undefined;

export function getDb(): Database.Database {
  if (instance) return instance;

  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  instance = db;
  return db;
}
