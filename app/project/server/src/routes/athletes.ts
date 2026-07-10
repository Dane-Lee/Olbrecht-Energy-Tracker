import type { Athlete } from '@domain';
import type { FastifyInstance } from 'fastify';

import { athletesRepo } from '../repositories/athletes.repo';

export async function athleteRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => athletesRepo.list());

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const athlete = athletesRepo.getById(id);
    if (!athlete) return reply.code(404).send({ error: 'Athlete not found' });
    return athlete;
  });

  app.post('/', async (req, reply) => {
    const athlete = req.body as Athlete;
    if (!athlete?.id) {
      return reply.code(400).send({ error: 'Athlete.id is required' });
    }
    athletesRepo.upsert(athlete);
    return reply.code(201).send(athlete);
  });

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const athlete = req.body as Athlete;
    if (athlete?.id !== id) {
      return reply.code(400).send({ error: 'Body id must match URL id' });
    }
    athletesRepo.upsert(athlete);
    return athlete;
  });
}
