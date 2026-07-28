/**
 * App-local connection settings for the Olbrecht Energy Tracker (milestone
 * eco-connection-settings; Control Center ratification 2026-07-11, decision
 * 3: hybrid pair→flow toggles with three states).
 *
 * The operator's per-flow switchboard: each outbound/inbound payload type can
 * be 'on' (default), 'pause' (keep queuing locally, stop transmitting), or
 * 'off' (stop queuing too). Storage is pluggable — MemoryConnectionSettingsStorage
 * for tests/engine use, LocalStorageConnectionSettingsStorage for the browser —
 * mirroring the OutboxStorage convention in ./sync-outbox.ts. Settings are
 * mirrored to the hub (PUT /api/ecosystem/connections, see
 * HubSyncAdapter.reportConnectionSettings) so a future Control Center panel
 * can render every app's switchboard from one place; enforcement is always
 * local and never depends on the hub being reachable (ecosystem rule 1).
 */
import {
  DEFAULT_CONNECTION_SETTINGS,
  parseConnectionSettings,
  type ConnectionSettings,
  type ConnectionState,
} from '@/ecosystem-contracts/connections';
import type { SyncPayloadType } from '@/domain';
import type { HubSyncAdapter } from './hub-sync.adapter';

export {
  inboundState,
  outboundState,
  shouldEnqueue,
  shouldTransmit,
} from '@/ecosystem-contracts/connections';
export type { ConnectionSettings, ConnectionState };

/** Reader shape SyncOutbox/HubSyncAdapter depend on — narrower than the full manager. */
export interface ConnectionSettingsReader {
  load(): ConnectionSettings;
}

export interface ConnectionSettingsStorage {
  load(): ConnectionSettings;
  save(settings: ConnectionSettings): void;
}

export class MemoryConnectionSettingsStorage implements ConnectionSettingsStorage {
  private settings: ConnectionSettings = DEFAULT_CONNECTION_SETTINGS;
  load(): ConnectionSettings {
    return this.settings;
  }
  save(settings: ConnectionSettings): void {
    this.settings = settings;
  }
}

const LOCAL_STORAGE_KEY = 'olbrecht.ecosystem.connectionSettings.v1';

export class LocalStorageConnectionSettingsStorage implements ConnectionSettingsStorage {
  load(): ConnectionSettings {
    try {
      const raw = globalThis.localStorage?.getItem(LOCAL_STORAGE_KEY);
      return raw ? parseConnectionSettings(raw) : DEFAULT_CONNECTION_SETTINGS;
    } catch {
      return DEFAULT_CONNECTION_SETTINGS;
    }
  }
  save(settings: ConnectionSettings): void {
    try {
      globalThis.localStorage?.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* Quota/serialization failures must never break the app. */
    }
  }
}

export interface ConnectionSettingsManagerOptions {
  storage?: ConnectionSettingsStorage;
}

/**
 * App-local switchboard manager. Defaults to an in-memory store (matching
 * SyncOutbox's MemoryOutboxStorage default) so engine/test contexts stay
 * dependency-free; the browser app wires a LocalStorageConnectionSettingsStorage
 * instance explicitly, same as it would for the outbox.
 */
export class ConnectionSettingsManager implements ConnectionSettingsReader {
  private readonly storage: ConnectionSettingsStorage;

  constructor(options: ConnectionSettingsManagerOptions = {}) {
    this.storage = options.storage ?? new MemoryConnectionSettingsStorage();
  }

  /** Reads current settings; anything missing or malformed = default-open. */
  load(): ConnectionSettings {
    try {
      return this.storage.load();
    } catch {
      return DEFAULT_CONNECTION_SETTINGS;
    }
  }

  /** Persists locally. Mirroring to the hub is a separate, explicit step (reportConnectionsToHub). */
  save(settings: ConnectionSettings): ConnectionSettings {
    const stamped: ConnectionSettings = { ...settings, updatedAt: new Date().toISOString() };
    try {
      this.storage.save(stamped);
    } catch {
      /* Storage unavailable — settings stay in-memory default-open, which only ever errs toward moving data. */
    }
    return stamped;
  }

  /** Control Center mutator: flip one flow and persist. */
  setConnectionState(
    direction: 'outbound' | 'inbound',
    payloadType: SyncPayloadType,
    state: ConnectionState,
  ): ConnectionSettings {
    const current = this.load();
    return this.save({
      ...current,
      [direction]: { ...current[direction], [payloadType]: state },
    });
  }
}

/**
 * Mirrors settings to the hub so the Control Center can render this app's
 * switchboard. Fire-and-forget: enforcement is always local (inside
 * SyncOutbox and HubSyncAdapter), so a failure here — hub down, unconfigured,
 * or reportConnectionSettings rejecting — costs nothing and never throws.
 */
export async function reportConnectionsToHub(
  adapter: Pick<HubSyncAdapter, 'reportConnectionSettings'>,
  settings: ConnectionSettings,
): Promise<void> {
  try {
    await adapter.reportConnectionSettings(settings);
  } catch {
    // Report is cosmetic (panel freshness); enforcement is local.
  }
}
