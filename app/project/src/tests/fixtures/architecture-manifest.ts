import {
  APP_NAME,
  FATIGUE_SCALE,
  INTERNAL_SYSTEMS,
  SESSION_CLASSES,
  SYNC_PAYLOAD_TYPES,
} from '@/domain';
import { CONFIG_VERSION, ENGINE_VERSION, LOCK_SPEC_CONFIG } from '@/engine';

export const architectureManifest = {
  appName: APP_NAME,
  engineVersion: ENGINE_VERSION,
  configVersion: CONFIG_VERSION,
  internalSystems: INTERNAL_SYSTEMS,
  fatigueScale: FATIGUE_SCALE,
  sessionClasses: SESSION_CLASSES,
  syncPayloadTypes: SYNC_PAYLOAD_TYPES,
  domainModelExports: [
    'Athlete',
    'AthleteState',
    'SessionPlan',
    'SessionResponse',
    'SessionDerivedMetrics',
    'SessionClassification',
    'MismatchResult',
    'ReadinessResult',
    'RecommendationResult',
    'LearningSnapshot',
    'RaceEvent',
    'RecoveryModalityLog',
    'SyncEnvelope',
    'SharedAthleteLink',
    'SharedSessionLink',
  ] as const,
  unresolvedConfigSlots: LOCK_SPEC_CONFIG.unresolvedLockedConfigSlots,
} as const;
