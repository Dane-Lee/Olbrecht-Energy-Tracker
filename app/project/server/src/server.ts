import cors from '@fastify/cors';
import Fastify from 'fastify';

import { config } from './config';
import { migrate } from './db/migrate';
import { athleteRoutes } from './routes/athletes';
import { healthRoutes } from './routes/health';
import { ecosystemRoutes } from './routes/ecosystem';

async function main(): Promise<void> {
  migrate();

  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.corsOrigins });
  await app.register(healthRoutes);
  await app.register(athleteRoutes, { prefix: '/api/athletes' });
  await app.register(ecosystemRoutes, { prefix: '/api/ecosystem' });

  await app.listen({ port: config.port, host: config.host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
