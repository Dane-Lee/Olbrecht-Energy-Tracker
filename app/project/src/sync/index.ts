/**
 * Ecosystem sync entry point for the Olbrecht Energy Tracker.
 *
 * The outbound outbox drain loop and inbound pull wiring are reusable
 * building blocks today (see adapters/sync-outbox.ts and
 * adapters/hub-sync.adapter.ts) but are not yet assembled into a running
 * app-level loop — milestone oet-publish-session-envelopes is in progress.
 * This entry point currently only mirrors the connection-settings
 * switchboard to the hub (milestone eco-connection-settings) so a future
 * Control Center panel can render this app's flows. Enforcement of those
 * settings already happens locally inside SyncOutbox.enqueue/drain and
 * HubSyncAdapter.pullPage regardless of whether this mirror call — or the
 * hub itself — is reachable (ecosystem rule 1).
 */
import type { HubSyncAdapter } from '@/adapters/hub-sync.adapter';
import { ConnectionSettingsManager, reportConnectionsToHub } from '@/adapters/connection-settings.adapter';

export * from '@/domain/sync';
export * from './payload-schemas';
export {
  ConnectionSettingsManager,
  MemoryConnectionSettingsStorage,
  LocalStorageConnectionSettingsStorage,
  reportConnectionsToHub,
  inboundState,
  outboundState,
  shouldEnqueue,
  shouldTransmit,
} from '@/adapters/connection-settings.adapter';
export type {
  ConnectionSettings,
  ConnectionState,
  ConnectionSettingsStorage,
  ConnectionSettingsReader,
} from '@/adapters/connection-settings.adapter';

export interface StartEcosystemSyncOptions {
  /** Only the reporting call is used here; narrowed so tests can fake it. */
  hubAdapter: Pick<HubSyncAdapter, 'reportConnectionSettings'>;
  connectionSettings: ConnectionSettingsManager;
}

/**
 * Mirrors this app's connection switchboard to the hub. Fire-and-forget and
 * safe to call unconditionally — reportConnectionsToHub never throws, so a
 * missing/unreachable hub costs nothing. Extend this function as the rest of
 * the sync bootstrap (outbox drain scheduling, inbound pull polling) lands.
 */
export function startEcosystemSync(options: StartEcosystemSyncOptions): void {
  void reportConnectionsToHub(options.hubAdapter, options.connectionSettings.load());
}
