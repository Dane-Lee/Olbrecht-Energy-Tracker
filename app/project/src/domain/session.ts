import {
  CalibrationMode,
  EnergySystemFocus,
  IntensityDomain,
  InternalSystem,
  PaceAnchorType,
  PoolCourse,
  SessionClass,
  WarningCode,
} from './enums';
import type {
  CoachFocusTag,
  IanaTimeZone,
  IntensityDomainDistribution,
  Rfc3339Timestamp,
  SessionClassDistribution,
  UUID,
} from './common';

export type SessionRpeScaleType = string;
export type SessionResponseDataSource = string;

export interface SessionRpeEntry {
  value: number;
  scaleType: SessionRpeScaleType;
}

export interface ReadinessInputs {
  readinessScore: number;
  focusScore: number;
  intensityPerception: number;
  fatigueIndicators: Readonly<Record<InternalSystem, number>>;
}

export interface HooperInputs {
  sleepQuality: number;
  stress: number;
  fatigue: number;
  muscleSoreness: number;
}

export interface HeartRateSummary {
  averageBpm?: number;
  peakBpm?: number;
  zoneDistribution?: Readonly<Record<string, number>>;
}

export interface PostMainSetHeartRateRecovery {
  hrAtEndMainSet: number;
  hrAfter1Min?: number;
  hrAfter3Min?: number;
  hrAfter5Min?: number;
  recoveryDrop: {
    oneMinute?: number;
    threeMinute?: number;
    fiveMinute?: number;
  };
}

export interface StrokeMetrics {
  distancePerStroke?: number;
  strokeLengthPerCycle?: number;
  strokeIndex?: number;
  swolf?: number;
  strokeRate?: number;
  strokeIndexSeries?: readonly number[];
  swolfSeries?: readonly number[];
}

export interface IntervalTimeEntry {
  setIndex: number;
  repeatIndex: number;
  distanceMeters: number;
  seconds: number;
  restSeconds?: number;
  stroke?: string;
  techniqueTag?: string;
  heartRateBpm?: number;
}

export interface IntervalSet {
  setIndex: number;
  setLabel: string;
  primaryStroke: string;
  equipmentTags: readonly string[];
  repeatDistanceMeters: number;
  repeatCount: number;
  targetPaceSeconds: number;
  targetPaceAnchorType: PaceAnchorType | null;
  restSeconds: number;
  blockRestSeconds: number | null;
  drillTag: string | null;
  intensityDomain: IntensityDomain;
}

export interface SessionPlan {
  id: UUID;
  athleteId: UUID;
  planRevision: number;
  startTimestamp: Rfc3339Timestamp;
  timeZone: IanaTimeZone;
  poolCourse: PoolCourse;
  sessionLabel: string;
  coachFocusTag: CoachFocusTag;
  plannedTotalDistanceMeters: number;
  plannedDurationMinutes: number;
  intendedSessionClass: SessionClass;
  intendedEnergySystemFocus: EnergySystemFocus;
  intervalSets: readonly IntervalSet[];
  notes?: string;
  plannedLactateTargetMmol?: number;
  plannedHeartRateZoneTarget?: string;
  competitionPrepFlag?: boolean;
  intendedClassDistribution?: SessionClassDistribution;
  plannedIntensityDomainDistribution?: IntensityDomainDistribution;
  createdAt: Rfc3339Timestamp;
  updatedAt: Rfc3339Timestamp;
}

export interface SessionResponse {
  id: UUID;
  athleteId: UUID;
  responseRevision: number;
  linkedPlanId?: UUID;
  startTimestamp: Rfc3339Timestamp;
  timeZone: IanaTimeZone;
  actualTotalDistanceMeters: number;
  actualDurationMinutes: number;
  sessionRPE: SessionRpeEntry;
  readinessInputs: ReadinessInputs;
  hooperInputs?: HooperInputs;
  heartRateSummary?: HeartRateSummary;
  postMainSetHeartRateRecovery?: PostMainSetHeartRateRecovery;
  strokeMetrics?: StrokeMetrics;
  intervalTimes?: readonly IntervalTimeEntry[];
  dataSource: SessionResponseDataSource;
  supersededByResponseId?: UUID;
  notes?: string;
  createdAt: Rfc3339Timestamp;
  updatedAt: Rfc3339Timestamp;
}

export interface ClassificationEvidence {
  metric: string;
  value: string | number | boolean;
  unit?: string;
  source: 'plan' | 'response' | 'derived';
}

export interface SessionClassification {
  intendedClass: SessionClass;
  achievedClassTop: SessionClass;
  classifierPriorityOrder: readonly SessionClass[];
  intendedClassDistribution?: SessionClassDistribution;
  achievedClassDistribution: SessionClassDistribution;
  plannedIntensityDomainDistribution?: IntensityDomainDistribution;
  achievedIntensityDomainDistribution?: IntensityDomainDistribution;
  classifierTemperature: number;
  calibrationMode: CalibrationMode;
  primaryEvidence: readonly ClassificationEvidence[];
  warnings: readonly WarningCode[];
}
