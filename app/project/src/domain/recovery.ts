import type { Rfc3339Timestamp, UUID } from './common';

export interface RecoveryModalityLog {
  id: UUID;
  athleteId: UUID;
  recordedAt: Rfc3339Timestamp;
  modality: string;
  durationMinutes?: number;
  intensity?: string;
  notes?: string;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
}
