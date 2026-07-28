import { SyncPayloadType } from '@/domain';
import { DEFAULT_CONNECTION_SETTINGS, parseConnectionSettings } from '@/ecosystem-contracts/connections';
import {
  ConnectionSettingsManager,
  MemoryConnectionSettingsStorage,
  inboundState,
  outboundState,
  shouldEnqueue,
  shouldTransmit,
  type ConnectionSettings,
  type ConnectionSettingsStorage,
} from '@/adapters/connection-settings.adapter';
import { assertEqual, assertOk, test } from './testHarness';

test('defaults to open (on) for every flow when nothing is stored', () => {
  const manager = new ConnectionSettingsManager({ storage: new MemoryConnectionSettingsStorage() });
  const settings = manager.load();
  assertEqual(outboundState(settings, SyncPayloadType.ReadinessSnapshotUpsert), 'on');
  assertEqual(inboundState(settings, SyncPayloadType.ReadinessSnapshotUpsert), 'on');
});

test('round-trips a flipped state through storage', () => {
  const manager = new ConnectionSettingsManager({ storage: new MemoryConnectionSettingsStorage() });
  manager.setConnectionState('outbound', SyncPayloadType.SessionResponseUpsert, 'pause');

  const reloaded = manager.load();
  assertEqual(outboundState(reloaded, SyncPayloadType.SessionResponseUpsert), 'pause');
  // Untouched flows stay default-open.
  assertEqual(inboundState(reloaded, SyncPayloadType.ReadinessSnapshotUpsert), 'on');
  assertEqual(outboundState(reloaded, SyncPayloadType.SessionPlanUpsert), 'on');
});

test('pause keeps queuing but stops transmission; off stops both', () => {
  assertEqual(shouldEnqueue('pause'), true);
  assertEqual(shouldTransmit('pause'), false);
  assertEqual(shouldEnqueue('off'), false);
  assertEqual(shouldTransmit('off'), false);
  assertEqual(shouldEnqueue('on'), true);
  assertEqual(shouldTransmit('on'), true);
});

test('storage failures degrade to default-open instead of throwing', () => {
  const throwingStorage: ConnectionSettingsStorage = {
    load(): ConnectionSettings {
      throw new Error('storage unavailable');
    },
    save(): void {
      throw new Error('storage unavailable');
    },
  };
  const manager = new ConnectionSettingsManager({ storage: throwingStorage });

  const loaded = manager.load();
  assertEqual(outboundState(loaded, SyncPayloadType.ReadinessSnapshotUpsert), 'on');

  // save() must not throw even though the backing storage rejects the write.
  const saved = manager.save(DEFAULT_CONNECTION_SETTINGS);
  assertOk(saved.updatedAt.length > 0, 'save still returns stamped settings on storage failure');
});

test('drops unknown payload types and invalid states on parse', () => {
  const parsed = parseConnectionSettings(
    JSON.stringify({
      version: 1,
      outbound: { madeUpFlow: 'off', readinessSnapshotUpsert: 'sideways' },
      inbound: { sessionResponseUpsert: 'off' },
      updatedAt: '2026-07-11T00:00:00.000Z',
    }),
  );

  assertOk(!Object.keys(parsed.outbound).includes('madeUpFlow'), 'unknown payload type dropped');
  // Invalid state value normalizes to 'on'.
  assertEqual(outboundState(parsed, SyncPayloadType.ReadinessSnapshotUpsert), 'on');
  assertEqual(inboundState(parsed, SyncPayloadType.SessionResponseUpsert), 'off');
});

test('degrades malformed stored JSON to default-open instead of throwing', () => {
  const settings = parseConnectionSettings('{not json');
  assertEqual(outboundState(settings, SyncPayloadType.ReadinessSnapshotUpsert), 'on');
});

test('stamps updatedAt on save', () => {
  const manager = new ConnectionSettingsManager({ storage: new MemoryConnectionSettingsStorage() });
  const before = new Date().toISOString();
  const saved = manager.save(manager.load());
  assertOk(saved.updatedAt >= before, 'updatedAt reflects the save time');
});
