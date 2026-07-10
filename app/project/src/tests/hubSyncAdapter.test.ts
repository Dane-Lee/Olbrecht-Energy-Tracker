import { HubSyncAdapter } from '@/adapters/hub-sync.adapter';
import { MemoryOutboxStorage, SyncOutbox } from '@/adapters/sync-outbox';
import { createEnvelope } from '@/adapters/envelope-factory';
import { InternalSystem, ReadinessCategory, SourceApp, SyncPayloadType } from '@/domain';
import type { ReadinessSnapshotUpsertPayload } from '@/domain';
import { assertEqual, assertOk, test } from './testHarness';

function readinessPayload(): ReadinessSnapshotUpsertPayload {
  return {
    sharedAthleteId: '11111111-1111-4111-8111-111111111111',
    snapshotDate: '2026-07-07',
    timeZone: 'America/New_York',
    systemReadinessCategory: {
      [InternalSystem.Neurological]: ReadinessCategory.Green,
      [InternalSystem.Muscular]: ReadinessCategory.Green,
      [InternalSystem.Cardiovascular]: ReadinessCategory.Green,
    },
    globalReadinessCategory: ReadinessCategory.Green,
    createdAt: '2026-07-07T08:00:00.000Z',
  };
}

type FetchCall = { url: string; init?: RequestInit };

function fakeFetch(
  handler: (url: string, init?: RequestInit) => { status?: number; body: unknown },
): { impl: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const { status = 200, body } = handler(url, init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  }) as typeof fetch;
  return { impl, calls };
}

test('createEnvelope stamps source app, versions, and an idempotency key', () => {
  const envelope = createEnvelope(SyncPayloadType.ReadinessSnapshotUpsert, readinessPayload());

  assertEqual(envelope.sourceApp, SourceApp.OlbrechtSystem);
  assertEqual(envelope.payloadType, SyncPayloadType.ReadinessSnapshotUpsert);
  assertOk(envelope.idempotencyKey.length >= 36, 'idempotency key is a UUID');
  assertOk(envelope.syncSchemaVersion === '1.0.0', 'envelope schema version stamped');
  assertOk(envelope.payloadSchemaVersion === '1.0.0', 'payload schema version stamped');
});

test('push posts the envelope with the service key and returns the first result', async () => {
  const { impl, calls } = fakeFetch((url) => {
    assertOk(url.endsWith('/api/sync/push'), `unexpected URL ${url}`);
    return {
      body: {
        results: [{ idempotencyKey: 'k', accepted: true, conflictDetected: false }],
      },
    };
  });

  const adapter = new HubSyncAdapter({ hubUrl: 'http://hub.test/', serviceKey: 'sk', fetchImpl: impl });
  const envelope = createEnvelope(SyncPayloadType.ReadinessSnapshotUpsert, readinessPayload());
  const result = await adapter.push(envelope);

  assertEqual(result.accepted, true);
  const headers = calls[0].init?.headers as Record<string, string>;
  assertEqual(headers['x-service-key'], 'sk');
  assertEqual(calls[0].url, 'http://hub.test/api/sync/push');
});

test('pullSince follows the cursor until hasMore is false', async () => {
  let page = 0;
  const { impl, calls } = fakeFetch(() => {
    page += 1;
    return page === 1
      ? { body: { envelopes: [{ idempotencyKey: 'a' }], nextCursor: '10', hasMore: true } }
      : { body: { envelopes: [{ idempotencyKey: 'b' }], nextCursor: '20', hasMore: false } };
  });

  const adapter = new HubSyncAdapter({ hubUrl: 'http://hub.test', serviceKey: 'sk', fetchImpl: impl });
  const envelopes = await adapter.pullSince();

  assertEqual(envelopes.length, 2);
  assertEqual(calls.length, 2);
  assertOk(calls[1].url.includes('since=10'), 'second page passes the cursor');
});

test('outbox drain marks accepted entries sent and keeps the same idempotency key across retries', async () => {
  const storage = new MemoryOutboxStorage();
  const outbox = new SyncOutbox({ storage });
  const envelope = createEnvelope(SyncPayloadType.ReadinessSnapshotUpsert, readinessPayload());
  outbox.enqueue(envelope);
  outbox.enqueue(envelope); // duplicate enqueue is a no-op
  assertEqual(outbox.pending().length, 1);

  // First drain: transport failure — entry stays pending, key unchanged.
  const failing = new HubSyncAdapter({
    hubUrl: 'http://hub.test',
    serviceKey: 'sk',
    fetchImpl: (async () => {
      throw new Error('offline');
    }) as typeof fetch,
  });
  const failReport = await outbox.drain(failing);
  assertEqual(failReport.transportFailed, true);
  assertEqual(outbox.pending().length, 1);
  assertEqual(outbox.pending()[0].envelope.idempotencyKey, envelope.idempotencyKey);

  // Second drain: hub accepts.
  const { impl } = fakeFetch((_url, init) => {
    const body = JSON.parse(String(init?.body)) as { envelopes: { idempotencyKey: string }[] };
    assertEqual(body.envelopes[0].idempotencyKey, envelope.idempotencyKey);
    return {
      body: {
        results: body.envelopes.map((e) => ({
          idempotencyKey: e.idempotencyKey,
          accepted: true,
          conflictDetected: false,
        })),
      },
    };
  });
  const accepting = new HubSyncAdapter({ hubUrl: 'http://hub.test', serviceKey: 'sk', fetchImpl: impl });
  const report = await outbox.drain(accepting);

  assertEqual(report.accepted, 1);
  assertEqual(outbox.pending().length, 0);
  assertEqual(outbox.entryFor(envelope.idempotencyKey)?.status, 'sent');
});

test('linkSession registers on the hub and adopts the hub sharedObjectId', async () => {
  const { impl, calls } = fakeFetch((url) => {
    assertOk(url.endsWith('/api/registry/sessions'), `unexpected URL ${url}`);
    return {
      body: { sharedObjectId: '99999999-9999-4999-8999-999999999999', revision: 2, created: false },
    };
  });
  const adapter = new HubSyncAdapter({ hubUrl: 'http://hub.test', serviceKey: 'sk', fetchImpl: impl });

  await adapter.linkSession({
    sharedAthleteId: '11111111-1111-4111-8111-111111111111',
    sourceApp: SourceApp.OlbrechtSystem,
    sourceSessionId: 'session-1',
    sessionLinkType: 'plan' as never,
    sharedObjectId: '22222222-2222-4222-8222-222222222222',
    revision: 1,
    createdAt: '2026-07-09T10:00:00.000Z',
  });

  assertEqual(calls.length, 1);
  const sent = JSON.parse(String(calls[0].init?.body)) as { sourceSessionId: string };
  assertEqual(sent.sourceSessionId, 'session-1');
  // Hub answered with a different shared identity — local cache adopts it.
  assertEqual(
    adapter.getLocalSessionLink('session-1')?.sharedObjectId,
    '99999999-9999-4999-8999-999999999999',
  );
});

test('outbox event triggers drain on connectivity with rate limiting', async () => {
  const outbox = new SyncOutbox({ storage: new MemoryOutboxStorage() });
  outbox.enqueue(createEnvelope(SyncPayloadType.ReadinessSnapshotUpsert, readinessPayload()));

  const { impl } = fakeFetch((_url, init) => {
    const body = JSON.parse(String(init?.body)) as { envelopes: { idempotencyKey: string }[] };
    return {
      body: {
        results: body.envelopes.map((e) => ({
          idempotencyKey: e.idempotencyKey,
          accepted: true,
          conflictDetected: false,
        })),
      },
    };
  });
  const adapter = new HubSyncAdapter({ hubUrl: 'http://hub.test', serviceKey: 'sk', fetchImpl: impl });

  const listeners: Record<string, () => void> = {};
  const host = {
    addEventListener: (type: string, cb: () => void) => {
      listeners[type] = cb;
    },
    removeEventListener: () => undefined,
  };

  const detach = outbox.attachDrainTriggers(adapter, { online: host as never }, { minGapMs: 0, jitterMs: 0 });
  assertOk(typeof listeners.online === 'function', 'online listener attached');

  listeners.online();
  await new Promise((resolve) => setTimeout(resolve, 1_100));

  assertEqual(outbox.pending().length, 0);
  detach();
});

test('outbox drain records hub rejections and fails entries after max attempts', async () => {
  const outbox = new SyncOutbox({ storage: new MemoryOutboxStorage(), maxAttempts: 2 });
  const envelope = createEnvelope(SyncPayloadType.ReadinessSnapshotUpsert, readinessPayload());
  outbox.enqueue(envelope);

  const { impl } = fakeFetch((_url, init) => {
    const body = JSON.parse(String(init?.body)) as { envelopes: { idempotencyKey: string }[] };
    return {
      body: {
        results: body.envelopes.map((e) => ({
          idempotencyKey: e.idempotencyKey,
          accepted: false,
          conflictDetected: false,
          remoteTraceId: 'forbidden: wrong app',
        })),
      },
    };
  });
  const rejecting = new HubSyncAdapter({ hubUrl: 'http://hub.test', serviceKey: 'sk', fetchImpl: impl });

  const first = await outbox.drain(rejecting);
  assertEqual(first.rejected, 1);
  assertEqual(outbox.pending().length, 1);

  const second = await outbox.drain(rejecting);
  assertEqual(second.rejected, 1);
  assertEqual(outbox.pending().length, 0); // maxAttempts reached → failed
  assertEqual(outbox.entryFor(envelope.idempotencyKey)?.status, 'failed');
});
