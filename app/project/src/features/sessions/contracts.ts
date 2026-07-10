import {
  MismatchBand,
  ReadinessCategory,
  SessionClass,
} from '@/domain';
import type { Rfc3339Timestamp, UUID } from '@/domain';

export interface SessionsFeatureState {
  planIds: readonly UUID[];
  responseIds: readonly UUID[];
  derivedMetricsIds: readonly UUID[];
}

export interface SessionWorkspaceSummary {
  athleteId: UUID;
  sessionPlanId?: UUID;
  sessionResponseId?: UUID;
  intendedClass: SessionClass;
  achievedClass?: SessionClass;
  mismatchBand?: MismatchBand;
  globalReadinessCategory?: ReadinessCategory;
  updatedAt: Rfc3339Timestamp;
}
