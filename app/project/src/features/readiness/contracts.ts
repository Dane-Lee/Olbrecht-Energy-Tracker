import { InternalSystem, ReadinessCategory } from '@/domain';
import type { SystemFatigueState, UUID } from '@/domain';

export interface ReadinessFeatureState {
  athleteId: UUID;
  systemFatigue: SystemFatigueState;
  systemReadinessCategory: Readonly<Record<InternalSystem, ReadinessCategory>>;
  globalReadinessCategory: ReadinessCategory;
  psychScore0to100?: number;
  psychVolatilityPercent?: number;
}
