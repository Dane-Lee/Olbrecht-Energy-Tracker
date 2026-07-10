import type { SharedAthleteLink } from './sync';
import {
  InternalSystem,
  ReadinessCategory,
  SessionClass,
  SourceApp,
} from './enums';
import type {
  IanaTimeZone,
  LocalDate,
  Rfc3339Timestamp,
  SystemFatigueState,
  SystemLoadVector,
  UUID,
} from './common';

export interface SpeedAnchor {
  distanceMeters: number;
  timeSeconds: number;
  metersPerSecond: number;
  source: string;
  updatedAt: Rfc3339Timestamp;
}

export interface EventPaceAnchor {
  eventCode: string;
  distanceMeters: number;
  secondsPer100Meters: number;
  source: string;
  updatedAt: Rfc3339Timestamp;
}

export interface SprintAnchor {
  bestDistanceMeters: number;
  bestTimeSeconds: number;
  breakoutTimeSeconds?: number;
  updatedAt: Rfc3339Timestamp;
}

export interface HeartRateZoneBand {
  zoneLabel: string;
  minBpm: number;
  maxBpm: number;
}

export interface HeartRateZoneProfile {
  version: string;
  createdAt: Rfc3339Timestamp;
  updatedAt: Rfc3339Timestamp;
  zones: readonly HeartRateZoneBand[];
}

export interface SubjectiveBaseline {
  median: number;
  medianAbsoluteDeviation: number;
  sampleSize: number;
  lastUpdatedAt: Rfc3339Timestamp;
}

export interface HeartRateRecoveryBaseline {
  sessionClass: SessionClass;
  meanOneMinuteDrop: number;
  standardDeviationOneMinuteDrop: number;
  sampleSize: number;
  lastUpdatedAt: Rfc3339Timestamp;
}

export interface RhythmProfile {
  circadianPeakLocalTime: string;
  circadianAmplitudePercent: number;
  chronotypeOffsetMinutes?: number;
  infradianTrackingEnabled: boolean;
  rhythmDriftPercent?: number;
  lastUpdatedAt: Rfc3339Timestamp;
}

export type SystemCouplingMatrix = Readonly<
  Record<InternalSystem, Readonly<Record<InternalSystem, number>>>
>;

export interface LearningSnapshot {
  snapshotId: UUID;
  athleteId: UUID;
  learningEnabled: boolean;
  frozenReasons: readonly string[];
  minimumSessionsPerClass: number;
  decayHalfLifeDaysBySystem: Readonly<Record<InternalSystem, number>>;
  sensitivityWeightsByClass: Readonly<Record<SessionClass, SystemLoadVector>>;
  heartRateRecoveryBaselines: Readonly<
    Record<SessionClass, HeartRateRecoveryBaseline>
  >;
  subjectiveWellnessBaselines: Readonly<Record<string, SubjectiveBaseline>>;
  rhythmProfile: RhythmProfile;
  couplingWeights: SystemCouplingMatrix;
  volatilityBaselinePercent: number;
  baselineDrift: number;
  lastUpdatedAt: Rfc3339Timestamp;
}

export interface AthleteProfile {
  givenName: string;
  familyName: string;
  dateOfBirth?: LocalDate;
  sex?: string;
  primaryTeamId?: string;
  timezone: IanaTimeZone;
  criticalVelocityAnchor?: SpeedAnchor;
  sprintAnchor?: SprintAnchor;
  eventPaceAnchors: Readonly<Record<string, EventPaceAnchor>>;
  heartRateZones: HeartRateZoneProfile;
}

export interface AthleteState {
  systemFatigue: SystemFatigueState;
  systemReadinessCategory: Readonly<Record<InternalSystem, ReadinessCategory>>;
  globalReadinessCategory: ReadinessCategory;
  readinessScore0to100?: number;
  recoveryDebt: number;
  taperActive: boolean;
  illnessActive: boolean;
  latestSessionClass?: SessionClass;
  learningSnapshot: LearningSnapshot;
  lastUpdatedAt: Rfc3339Timestamp;
}

export interface Athlete {
  id: UUID;
  sourceApp: SourceApp;
  createdAt: Rfc3339Timestamp;
  updatedAt: Rfc3339Timestamp;
  externalStableKey?: string;
  profile: AthleteProfile;
  state: AthleteState;
  sharedAthleteLink?: SharedAthleteLink;
}
