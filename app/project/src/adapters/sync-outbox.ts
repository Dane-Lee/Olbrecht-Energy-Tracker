/**
 * Local outbox for hub-and-spoke sync (ratified INTEGRATION_PLAN.md Section
 * 3.2: "outbound envelopes go to a local outbox and are pushed
 * opportunistically with idempotency keys — hub down = app unaffected").
 *
 * Storage is pluggable: in-memory for tests/engine use, localStorage in the
 * browser. Envelopes keep their idempotencyKey across retries so the hub
 * deduplicates instead of double-ingesting.
 */
import type { AnySyncEnvelope, UUID } from '@/domain';
import type { HubSyncAdapter } from './hub-sync.adapter';

export interface OutboxEntry {
  envelope: AnySyncEnvelope;
  attempts: number;
  lastError?: string;
  queuedAt: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed';
}

export interface OutboxStorage {
  load(): OutboxEntry[];
  save(entries: OutboxEntry[]): void;
}

export class MemoryOutboxStorage implements OutboxStorage {
  private entries: OutboxEntry[] = [];
  load(): OutboxEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }
  save(entries: OutboxEntry[]): void {
    this.entries = entries.map((entry) => ({ ...entry }));
  }
}

const LOCAL_STORAGE_KEY = 'olbrecht.sync.outbox.v1';

export class LocalStorageOutboxStorage implements OutboxStorage {
  load(): OutboxEntry[] {
    try {
      const raw = globalThis.localStorage?.getItem(LOCAL_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
    } catch {
      return [];
    }
  }
  save(entries: OutboxEntry[]): void {
    try {
      globalThis.localStorage?.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      /* Quota/serialization failures must never break the app. */
    }
  }
}

export interface DrainReport {
  accepted: number;
  conflicts: number;
  rejected: number;
  /** True when the hub could not be reached at all (everything stays queued). */
  transportFailed: boolean;
}

export interface SyncOutboxOptions {
  storage?: OutboxStorage;
  maxAttempts?: number;
  /** Called after each drain — the SentiOS reporting hook. */
  onDrain?: (report: DrainReport) => void;
}

export class SyncOutbox {
  private readonly storage: OutboxStorage;
  private readonly maxAttempts: number;
  private readonly onDrain?: (report: DrainReport) => void;

  constructor(options: SyncOutboxOptions = {}) {
    this.storage = options.storage ?? new MemoryOutboxStorage();
    this.maxAttempts = options.maxAttempts ?? 10;
    this.onDrain = options.onDrain;
  }

  enqueue(envelope: AnySyncEnvelope): void {
    const entries = this.storage.load();
    if (entries.some((entry) => entry.envelope.idempotencyKey === envelope.idempotencyKey)) {
      return; // Already queued — idempotent enqueue.
    }
    entries.push({
      envelope,
      attempts: 0,
      queuedAt: new Date().toISOString(),
      status: 'pending',
    });
    this.storage.save(entries);
  }

  pending(): readonly OutboxEntry[] {
    return this.storage.load().filter((entry) => entry.status === 'pending');
  }

  entryFor(idempotencyKey: UUID): OutboxEntry | undefined {
    return this.storage.load().find((entry) => entry.envelope.idempotencyKey === idempotencyKey);
  }

  /**
   * Wires connectivity/visibility events to opportunistic drains (B1):
   * a returning laptop pushes within seconds instead of at the next timer
   * tick. Takes EventTarget-shaped hosts (window/document in the app; fakes
   * in tests) so this file stays DOM-free. Event drains are jittered and
   * rate-limited so a fleet of clients never stampedes the hub in lockstep.
   * Returns an unsubscribe function.
   */
  attachDrainTriggers(
    adapter: Pick<HubSyncAdapter, 'pushBatch'>,
    hosts: {
      online?: { addEventListener(type: 'online', cb: () => void): void; removeEventListener(type: 'online', cb: () => void): void };
      visibility?: {
        addEventListener(type: 'visibilitychange', cb: () => void): void;
        removeEventListener(type: 'visibilitychange', cb: () => void): void;
        visibilityState?: string;
      };
    },
    options: { minGapMs?: number; jitterMs?: number } = {},
  ): () => void {
    const minGapMs = options.minGapMs ?? 30_000;
    const jitterMs = options.jitterMs ?? 4_000;
    let lastFiredAt = 0;

    const fire = () => {
      const now = Date.now();
      if (now - lastFiredAt < minGapMs) return;
      lastFiredAt = now;
      setTimeout(() => void this.drain(adapter), 1_000 + Math.random() * jitterMs);
    };
    const onVisibility = () => {
      if (hosts.visibility?.visibilityState === 'visible') fire();
    };

    hosts.online?.addEventListener('online', fire);
    hosts.visibility?.addEventListener('visibilitychange', onVisibility);
    return () => {
      hosts.online?.removeEventListener('online', fire);
      hosts.visibility?.removeEventListener('visibilitychange', onVisibility);
    };
  }

  /**
   * Pushes all pending entries through the adapter in one batch. Failures
   * stay queued (bounded by maxAttempts); results are reported via onDrain.
   */
  async drain(adapter: Pick<HubSyncAdapter, 'pushBatch'>): Promise<DrainReport> {
    const entries = this.storage.load();
    const pendingEntries = entries.filter(
      (entry) => entry.status === 'pending' && entry.attempts < this.maxAttempts,
    );

    const report: DrainReport = { accepted: 0, conflicts: 0, rejected: 0, transportFailed: false };

    if (pendingEntries.length === 0) {
      return report;
    }

    let results;
    try {
      results = await adapter.pushBatch(pendingEntries.map((entry) => entry.envelope));
    } catch (error) {
      report.transportFailed = true;
      for (const entry of pendingEntries) {
        entry.attempts += 1;
        entry.lastError = error instanceof Error ? error.message : String(error);
        if (entry.attempts >= this.maxAttempts) entry.status = 'failed';
      }
      this.storage.save(entries);
      this.onDrain?.(report);
      return report;
    }

    pendingEntries.forEach((entry, index) => {
      const result = results[index];
      entry.attempts += 1;

      if (result?.accepted) {
        entry.status = 'sent';
        entry.sentAt = new Date().toISOString();
        entry.lastError = undefined;
        report.accepted += 1;
      } else if (result?.conflictDetected) {
        // Same idempotency key, different content — terminal; keep for audit.
        entry.status = 'sent';
        entry.sentAt = new Date().toISOString();
        entry.lastError = `conflict: ${result.remoteTraceId ?? 'same key, different content'}`;
        report.conflicts += 1;
      } else {
        entry.lastError = result?.remoteTraceId ?? 'rejected by hub';
        if (entry.attempts >= this.maxAttempts) entry.status = 'failed';
        report.rejected += 1;
      }
    });

    this.storage.save(entries);
    this.onDrain?.(report);
    return report;
  }
}
