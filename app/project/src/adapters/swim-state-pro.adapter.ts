import type {
  AnySyncEnvelope,
  Rfc3339Timestamp,
  SharedAthleteLink,
  SharedSessionLink,
  UUID,
} from '@/domain';

export interface SyncPushResult {
  idempotencyKey: UUID;
  accepted: boolean;
  conflictDetected: boolean;
  remoteTraceId?: string;
}

export interface SwimStateProSyncAdapter {
  push(envelope: AnySyncEnvelope): Promise<SyncPushResult>;
  pullSince(timestamp?: Rfc3339Timestamp): Promise<readonly AnySyncEnvelope[]>;
  linkAthlete(link: SharedAthleteLink): Promise<void>;
  linkSession(link: SharedSessionLink): Promise<void>;
}
