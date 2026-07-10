import type { DerivedMetricsUpsertPayload, SyncEnvelope } from './sync';
import {
  InternalSystem,
  MismatchBand,
  MismatchComponent,
  ReadinessCategory,
  RecommendationCode,
  RecommendationConstraint,
  SessionClass,
  WarningCode,
} from './enums';
import type {
  Rfc3339Timestamp,
  SessionClassDistribution,
  SystemFatigueState,
  SystemLoadVector,
  UUID,
} from './common';
import type { SessionClassification } from './session';

export interface MismatchResult {
  severity0to100: number;
  band: MismatchBand;
  components0to1: Readonly<Record<MismatchComponent, number>>;
  weights: Readonly<Record<MismatchComponent, number>>;
  missingComponents: readonly MismatchComponent[];
  intentType: 'single' | 'mixed';
}

export interface ReadinessModifierSnapshot {
  mismatchPenalty?: number;
  rhythmMisalignmentPercent?: number;
  sleepDeviationScore?: number;
  baselineDrift?: number;
  autonomicRecoveryPenalty?: number;
}

export interface ReadinessResult {
  systemFatigue: SystemFatigueState;
  systemReadinessCategory: Readonly<Record<InternalSystem, ReadinessCategory>>;
  globalReadinessCategory: ReadinessCategory;
  psychScore0to100?: number;
  psychVolatilityPercent?: number;
  sleepScore?: number;
  recoveryDebt: number;
  modifiers: ReadinessModifierSnapshot;
}

export interface RecommendationAction {
  code: RecommendationCode;
  summary: string;
  targetClass?: SessionClass;
  affectedSystem?: InternalSystem;
  horizonHours?: number;
}

export interface RecommendationDetail {
  summary: string;
  rationale: readonly string[];
  actions: readonly RecommendationAction[];
  constraints: readonly RecommendationConstraint[];
  dataQualityScore: number;
  missingDataDirectives: readonly string[];
}

export interface RecommendationResult {
  code: RecommendationCode;
  detail: RecommendationDetail;
}

export interface SessionDerivedMetrics {
  id: UUID;
  athleteId: UUID;
  linkedPlanId?: UUID;
  linkedResponseId: UUID;
  engineVersion: string;
  configVersion: string;
  inputHash: string;
  classifiedSessionType: SessionClass;
  classification: SessionClassification;
  sessionIntentVector: SessionClassDistribution;
  mismatch: MismatchResult;
  readiness: ReadinessResult;
  systemLoadRaw: SystemLoadVector;
  fatigueStateAfterDecay: SystemFatigueState;
  fatigueStateAfterCoupling: SystemFatigueState;
  fatigueStateAfterAccumulation: SystemFatigueState;
  recoveryDebt: number;
  warnings: readonly WarningCode[];
  recommendation: RecommendationResult;
  createdAt: Rfc3339Timestamp;
  syncSafeExportObject: SyncEnvelope;
  syncPayload: DerivedMetricsUpsertPayload;
}
