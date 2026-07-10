import type { AnySyncEnvelope, Rfc3339Timestamp, UUID } from '@/domain';

export interface SyncQueueEntry {
  idempotencyKey: UUID;
  payloadType: AnySyncEnvelope['payloadType'];
  queuedAt: Rfc3339Timestamp;
  attempts: number;
}

export interface SyncFeatureState {
  pending: readonly SyncQueueEntry[];
  lastSuccessfulPushAt?: Rfc3339Timestamp;
  lastSuccessfulPullAt?: Rfc3339Timestamp;
}
