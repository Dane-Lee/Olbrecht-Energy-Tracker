import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '127.0.0.1',
  dbPath: process.env.DB_PATH ?? path.resolve(here, '../data/olbrecht.sqlite'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  athleteOsHubUrl: process.env.ATHLETEOS_HUB_URL?.replace(/\/$/, ''),
  athleteOsServiceKey: process.env.ATHLETEOS_SERVICE_KEY,
} as const;
