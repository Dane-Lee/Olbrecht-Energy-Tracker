import type { FastifyInstance } from 'fastify';

import { getDb } from '../db/connection';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    const row = getDb().prepare('SELECT 1 AS ok').get() as { ok: number };
    return {
      status: 'ok',
      db: row.ok === 1,
      time: new Date().toISOString(),
    };
  });
}
