import type { FastifyInstance, FastifyReply } from 'fastify';

import { config } from '../config';

function configured(): boolean {
  return Boolean(config.athleteOsHubUrl && config.athleteOsServiceKey);
}

async function forward(
  reply: FastifyReply,
  method: 'GET' | 'PUT',
  path: string,
  body?: unknown,
) {
  if (!configured()) {
    return reply.code(503).send({
      error:
        'AthleteOS hub is not configured. Set ATHLETEOS_HUB_URL and ATHLETEOS_SERVICE_KEY on the local Olbrecht server.',
    });
  }

  try {
    const response = await fetch(`${config.athleteOsHubUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': config.athleteOsServiceKey ?? '',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return reply
      .code(response.status)
      .header('Content-Type', response.headers.get('content-type') ?? 'application/json')
      .send(text);
  } catch (error) {
    return reply.code(502).send({
      error: `AthleteOS hub is unreachable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

export async function ecosystemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/status', async (_request, reply) =>
    forward(reply, 'GET', '/api/ecosystem/status'),
  );

  app.put('/connections', async (request, reply) =>
    forward(
      reply,
      'PUT',
      '/api/ecosystem/connections',
      request.body,
    ),
  );
}
