import { ReadinessCategory } from '@/domain';
import type { Rfc3339Timestamp, UUID } from '@/domain';

export interface AthletesFeatureState {
  currentAthleteId?: UUID;
  athleteIds: readonly UUID[];
  lastSyncAt?: Rfc3339Timestamp;
}

export interface AthleteWorkspaceSummary {
  athleteId: UUID;
  displayName: string;
  globalReadinessCategory: ReadinessCategory;
  taperActive: boolean;
  recoveryDebt: number;
  updatedAt: Rfc3339Timestamp;
}
