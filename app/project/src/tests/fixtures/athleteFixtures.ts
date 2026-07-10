import {
  InternalSystem,
  ReadinessCategory,
  SessionClass,
  SourceApp,
  type Athlete,
  type HeartRateRecoveryBaseline,
  type HeartRateZoneProfile,
  type LearningSnapshot,
  type SubjectiveBaseline,
  type SystemCouplingMatrix,
  type SystemLoadVector,
} from '@/domain';
import { LOCK_SPEC_CONFIG } from '@/engine';

export type AthleteArchetypeName =
  | 'sprintSwimmer'
  | 'midDistanceSwimmer'
  | 'distanceSwimmer';

export interface AthleteArchetypeFixture {
  readonly athlete: Athlete;
  readonly displayName: string;
  readonly age: number;
  readonly strokeSpecialty: string;
  readonly primaryEvents: readonly string[];
  readonly maxHeartRate: number;
  readonly restingHeartRate: number;
  readonly criticalVelocityMetersPerSecond: number;
  readonly sprintAnchor50PaceSeconds: number;
  readonly pace100Seconds: number;
  readonly pace200Seconds: number;
  readonly pace400Seconds: number;
  readonly baselineStrokeEfficiency: number;
  readonly baselineIntervalConsistencyPercent: number;
  readonly timezone: Athlete['profile']['timezone'];
  readonly circadianPeakHourLocal: number;
  readonly infradianCycleLengthDays: number;
}

interface AthleteFixtureDefinition {
  readonly name: AthleteArchetypeName;
  readonly id: Athlete['id'];
  readonly givenName: string;
  readonly familyName: string;
  readonly dateOfBirth: NonNullable<Athlete['profile']['dateOfBirth']>;
  readonly age: number;
  readonly strokeSpecialty: string;
  readonly primaryEvents: readonly string[];
  readonly maxHeartRate: number;
  readonly restingHeartRate: number;
  readonly criticalVelocityMetersPerSecond: number;
  readonly sprintAnchor50PaceSeconds: number;
  readonly pace100Seconds: number;
  readonly pace200Seconds: number;
  readonly pace400Seconds: number;
  readonly baselineStrokeEfficiency: number;
  readonly baselineIntervalConsistencyPercent: number;
  readonly timezone: Athlete['profile']['timezone'];
  readonly circadianPeakHourLocal: number;
  readonly infradianCycleLengthDays: number;
  readonly volatilityBaselinePercent: number;
  readonly latestSessionClass: SessionClass;
}

const FIXTURE_CREATED_AT = '2026-03-14T08:00:00-04:00';
const SUBJECTIVE_BASELINE_SAMPLE_SIZE = 28;
const LEARNING_SAMPLE_SIZE = 24;

export const engineTestHalfLives: Readonly<Record<InternalSystem, number>> = {
  [InternalSystem.Neurological]: 2,
  [InternalSystem.Muscular]: 3,
  [InternalSystem.Cardiovascular]: 2.5,
};

const defaultSensitivityWeightsByClass: Readonly<Record<SessionClass, SystemLoadVector>> = {
  [SessionClass.NeuralSprint]:
    LOCK_SPEC_CONFIG.loadModel.defaultLoadAllocationByClass[SessionClass.NeuralSprint]
      .loadFractions,
  [SessionClass.MusclePowerEndurance]:
    LOCK_SPEC_CONFIG.loadModel.defaultLoadAllocationByClass[
      SessionClass.MusclePowerEndurance
    ].loadFractions,
  [SessionClass.AnaerobicCapacity]:
    LOCK_SPEC_CONFIG.loadModel.defaultLoadAllocationByClass[
      SessionClass.AnaerobicCapacity
    ].loadFractions,
  [SessionClass.RacePace]:
    LOCK_SPEC_CONFIG.loadModel.defaultLoadAllocationByClass[SessionClass.RacePace]
      .loadFractions,
  [SessionClass.AerobicBase]:
    LOCK_SPEC_CONFIG.loadModel.defaultLoadAllocationByClass[SessionClass.AerobicBase]
      .loadFractions,
  [SessionClass.ThresholdAerobicPower]:
    LOCK_SPEC_CONFIG.loadModel.defaultLoadAllocationByClass[
      SessionClass.ThresholdAerobicPower
    ].loadFractions,
  [SessionClass.RecoveryTechnique]:
    LOCK_SPEC_CONFIG.loadModel.defaultLoadAllocationByClass[
      SessionClass.RecoveryTechnique
    ].loadFractions,
};

export const engineTestCouplingMatrix: SystemCouplingMatrix = {
  [InternalSystem.Neurological]: {
    [InternalSystem.Neurological]: 1,
    [InternalSystem.Muscular]: 0.1,
    [InternalSystem.Cardiovascular]: 0.1,
  },
  [InternalSystem.Muscular]: {
    [InternalSystem.Neurological]: 0.1,
    [InternalSystem.Muscular]: 1,
    [InternalSystem.Cardiovascular]: 0.15,
  },
  [InternalSystem.Cardiovascular]: {
    [InternalSystem.Neurological]: 0.1,
    [InternalSystem.Muscular]: 0.15,
    [InternalSystem.Cardiovascular]: 1,
  },
};

const formatLocalHour = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

const secondsForDistance = (
  distanceMeters: number,
  metersPerSecond: number,
): number => Number((distanceMeters / metersPerSecond).toFixed(1));

const createHeartRateZones = (
  maxHeartRate: number,
  restingHeartRate: number,
): HeartRateZoneProfile => {
  const reserve = maxHeartRate - restingHeartRate;
  const z1Min = restingHeartRate + 20;
  const z1Max = Math.round(restingHeartRate + reserve * 0.55);
  const z2Max = Math.round(restingHeartRate + reserve * 0.7);
  const z3Max = Math.round(restingHeartRate + reserve * 0.82);
  const z4Max = Math.round(restingHeartRate + reserve * 0.92);

  return {
    version: 'fixture-v1',
    createdAt: FIXTURE_CREATED_AT,
    updatedAt: FIXTURE_CREATED_AT,
    zones: [
      { zoneLabel: 'z1', minBpm: z1Min, maxBpm: z1Max },
      { zoneLabel: 'z2', minBpm: z1Max + 1, maxBpm: z2Max },
      { zoneLabel: 'z3', minBpm: z2Max + 1, maxBpm: z3Max },
      { zoneLabel: 'z4', minBpm: z3Max + 1, maxBpm: z4Max },
      { zoneLabel: 'z5', minBpm: z4Max + 1, maxBpm: maxHeartRate },
    ],
  };
};

const createSubjectiveBaselines = (
  updatedAt: string,
): Readonly<Record<string, SubjectiveBaseline>> => ({
  sleepQuality: {
    median: 4,
    medianAbsoluteDeviation: 1,
    sampleSize: SUBJECTIVE_BASELINE_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
  stress: {
    median: 2,
    medianAbsoluteDeviation: 1,
    sampleSize: SUBJECTIVE_BASELINE_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
  fatigue: {
    median: 2,
    medianAbsoluteDeviation: 1,
    sampleSize: SUBJECTIVE_BASELINE_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
  muscleSoreness: {
    median: 2,
    medianAbsoluteDeviation: 1,
    sampleSize: SUBJECTIVE_BASELINE_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
});

const createHeartRateRecoveryBaselines = (
  updatedAt: string,
  offset: number,
): Readonly<Record<SessionClass, HeartRateRecoveryBaseline>> => ({
  [SessionClass.NeuralSprint]: {
    sessionClass: SessionClass.NeuralSprint,
    meanOneMinuteDrop: 29 + offset,
    standardDeviationOneMinuteDrop: 3,
    sampleSize: LEARNING_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
  [SessionClass.MusclePowerEndurance]: {
    sessionClass: SessionClass.MusclePowerEndurance,
    meanOneMinuteDrop: 25 + offset,
    standardDeviationOneMinuteDrop: 4,
    sampleSize: LEARNING_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
  [SessionClass.AnaerobicCapacity]: {
    sessionClass: SessionClass.AnaerobicCapacity,
    meanOneMinuteDrop: 22 + offset,
    standardDeviationOneMinuteDrop: 4,
    sampleSize: LEARNING_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
  [SessionClass.RacePace]: {
    sessionClass: SessionClass.RacePace,
    meanOneMinuteDrop: 25 + offset,
    standardDeviationOneMinuteDrop: 3,
    sampleSize: LEARNING_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
  [SessionClass.AerobicBase]: {
    sessionClass: SessionClass.AerobicBase,
    meanOneMinuteDrop: 31 + offset,
    standardDeviationOneMinuteDrop: 3,
    sampleSize: LEARNING_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
  [SessionClass.ThresholdAerobicPower]: {
    sessionClass: SessionClass.ThresholdAerobicPower,
    meanOneMinuteDrop: 27 + offset,
    standardDeviationOneMinuteDrop: 3,
    sampleSize: LEARNING_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
  [SessionClass.RecoveryTechnique]: {
    sessionClass: SessionClass.RecoveryTechnique,
    meanOneMinuteDrop: 34 + offset,
    standardDeviationOneMinuteDrop: 2,
    sampleSize: LEARNING_SAMPLE_SIZE,
    lastUpdatedAt: updatedAt,
  },
});

const createLearningSnapshot = (
  athleteId: Athlete['id'],
  circadianPeakHourLocal: number,
  volatilityBaselinePercent: number,
  recoveryOffset: number,
): LearningSnapshot => ({
  snapshotId: `${athleteId}-learning`,
  athleteId,
  learningEnabled: true,
  frozenReasons: [],
  minimumSessionsPerClass: LOCK_SPEC_CONFIG.adaptiveLearning.minimumSameClassSessions,
  decayHalfLifeDaysBySystem: engineTestHalfLives,
  sensitivityWeightsByClass: defaultSensitivityWeightsByClass,
  heartRateRecoveryBaselines: createHeartRateRecoveryBaselines(
    FIXTURE_CREATED_AT,
    recoveryOffset,
  ),
  subjectiveWellnessBaselines: createSubjectiveBaselines(FIXTURE_CREATED_AT),
  rhythmProfile: {
    circadianPeakLocalTime: formatLocalHour(circadianPeakHourLocal),
    circadianAmplitudePercent: LOCK_SPEC_CONFIG.rhythm.circadianAmplitudePercent,
    infradianTrackingEnabled: true,
    rhythmDriftPercent: 0,
    lastUpdatedAt: FIXTURE_CREATED_AT,
  },
  couplingWeights: engineTestCouplingMatrix,
  volatilityBaselinePercent,
  baselineDrift: 0,
  lastUpdatedAt: FIXTURE_CREATED_AT,
});

const createAthleteFixture = (
  definition: AthleteFixtureDefinition,
): AthleteArchetypeFixture => {
  const displayName = `${definition.givenName} ${definition.familyName}`;
  const athlete: Athlete = {
    id: definition.id,
    sourceApp: SourceApp.OlbrechtSystem,
    createdAt: FIXTURE_CREATED_AT,
    updatedAt: FIXTURE_CREATED_AT,
    externalStableKey: `fixture:${definition.name}`,
    profile: {
      givenName: definition.givenName,
      familyName: definition.familyName,
      dateOfBirth: definition.dateOfBirth,
      timezone: definition.timezone,
      criticalVelocityAnchor: {
        distanceMeters: 400,
        timeSeconds: secondsForDistance(
          400,
          definition.criticalVelocityMetersPerSecond,
        ),
        metersPerSecond: definition.criticalVelocityMetersPerSecond,
        source: 'fixture',
        updatedAt: FIXTURE_CREATED_AT,
      },
      sprintAnchor: {
        bestDistanceMeters: 50,
        bestTimeSeconds: definition.sprintAnchor50PaceSeconds,
        updatedAt: FIXTURE_CREATED_AT,
      },
      eventPaceAnchors: {
        freestyle100: {
          eventCode: 'freestyle100',
          distanceMeters: 100,
          secondsPer100Meters: definition.pace100Seconds,
          source: 'fixture',
          updatedAt: FIXTURE_CREATED_AT,
        },
        freestyle200: {
          eventCode: 'freestyle200',
          distanceMeters: 200,
          secondsPer100Meters: definition.pace200Seconds / 2,
          source: 'fixture',
          updatedAt: FIXTURE_CREATED_AT,
        },
        freestyle400: {
          eventCode: 'freestyle400',
          distanceMeters: 400,
          secondsPer100Meters: definition.pace400Seconds / 4,
          source: 'fixture',
          updatedAt: FIXTURE_CREATED_AT,
        },
      },
      heartRateZones: createHeartRateZones(
        definition.maxHeartRate,
        definition.restingHeartRate,
      ),
    },
    state: {
      systemFatigue: {
        [InternalSystem.Neurological]: 0,
        [InternalSystem.Muscular]: 0,
        [InternalSystem.Cardiovascular]: 0,
      },
      systemReadinessCategory: {
        [InternalSystem.Neurological]: ReadinessCategory.Green,
        [InternalSystem.Muscular]: ReadinessCategory.Green,
        [InternalSystem.Cardiovascular]: ReadinessCategory.Green,
      },
      globalReadinessCategory: ReadinessCategory.Green,
      readinessScore0to100: 82,
      recoveryDebt: 0,
      taperActive: false,
      illnessActive: false,
      latestSessionClass: definition.latestSessionClass,
      learningSnapshot: createLearningSnapshot(
        definition.id,
        definition.circadianPeakHourLocal,
        definition.volatilityBaselinePercent,
        definition.name === 'distanceSwimmer' ? 1 : 0,
      ),
      lastUpdatedAt: FIXTURE_CREATED_AT,
    },
  };

  return {
    athlete,
    displayName,
    age: definition.age,
    strokeSpecialty: definition.strokeSpecialty,
    primaryEvents: definition.primaryEvents,
    maxHeartRate: definition.maxHeartRate,
    restingHeartRate: definition.restingHeartRate,
    criticalVelocityMetersPerSecond: definition.criticalVelocityMetersPerSecond,
    sprintAnchor50PaceSeconds: definition.sprintAnchor50PaceSeconds,
    pace100Seconds: definition.pace100Seconds,
    pace200Seconds: definition.pace200Seconds,
    pace400Seconds: definition.pace400Seconds,
    baselineStrokeEfficiency: definition.baselineStrokeEfficiency,
    baselineIntervalConsistencyPercent:
      definition.baselineIntervalConsistencyPercent,
    timezone: definition.timezone,
    circadianPeakHourLocal: definition.circadianPeakHourLocal,
    infradianCycleLengthDays: definition.infradianCycleLengthDays,
  };
};

export const sprintSwimmer = createAthleteFixture({
  name: 'sprintSwimmer',
  id: '11111111-1111-1111-1111-111111111111',
  givenName: 'Avery',
  familyName: 'Lane',
  dateOfBirth: '2007-09-18',
  age: 18,
  strokeSpecialty: 'freestyle',
  primaryEvents: ['50m freestyle', '100m freestyle'],
  maxHeartRate: 198,
  restingHeartRate: 52,
  criticalVelocityMetersPerSecond: 1.42,
  sprintAnchor50PaceSeconds: 24.2,
  pace100Seconds: 53.8,
  pace200Seconds: 118.0,
  pace400Seconds: 255.0,
  baselineStrokeEfficiency: 100,
  baselineIntervalConsistencyPercent: 94,
  timezone: 'America/New_York',
  circadianPeakHourLocal: 17,
  infradianCycleLengthDays: 30,
  volatilityBaselinePercent: 12,
  latestSessionClass: SessionClass.NeuralSprint,
});

export const midDistanceSwimmer = createAthleteFixture({
  name: 'midDistanceSwimmer',
  id: '22222222-2222-2222-2222-222222222222',
  givenName: 'Jordan',
  familyName: 'Reed',
  dateOfBirth: '2006-08-11',
  age: 19,
  strokeSpecialty: 'freestyle',
  primaryEvents: ['200m freestyle', '400m freestyle'],
  maxHeartRate: 196,
  restingHeartRate: 50,
  criticalVelocityMetersPerSecond: 1.48,
  sprintAnchor50PaceSeconds: 25.4,
  pace100Seconds: 55.6,
  pace200Seconds: 118.8,
  pace400Seconds: 247.0,
  baselineStrokeEfficiency: 100,
  baselineIntervalConsistencyPercent: 92,
  timezone: 'America/New_York',
  circadianPeakHourLocal: 17,
  infradianCycleLengthDays: 30,
  volatilityBaselinePercent: 11,
  latestSessionClass: SessionClass.ThresholdAerobicPower,
});

export const distanceSwimmer = createAthleteFixture({
  name: 'distanceSwimmer',
  id: '33333333-3333-3333-3333-333333333333',
  givenName: 'Morgan',
  familyName: 'Vale',
  dateOfBirth: '2005-07-05',
  age: 20,
  strokeSpecialty: 'freestyle',
  primaryEvents: ['400m freestyle', '800m freestyle'],
  maxHeartRate: 194,
  restingHeartRate: 47,
  criticalVelocityMetersPerSecond: 1.52,
  sprintAnchor50PaceSeconds: 26.8,
  pace100Seconds: 58.2,
  pace200Seconds: 123.5,
  pace400Seconds: 250.0,
  baselineStrokeEfficiency: 100,
  baselineIntervalConsistencyPercent: 95,
  timezone: 'America/New_York',
  circadianPeakHourLocal: 17,
  infradianCycleLengthDays: 30,
  volatilityBaselinePercent: 10,
  latestSessionClass: SessionClass.AerobicBase,
});

export const athleteFixtures = {
  sprintSwimmer,
  midDistanceSwimmer,
  distanceSwimmer,
} satisfies Record<AthleteArchetypeName, AthleteArchetypeFixture>;

export const athleteFixtureList = [
  sprintSwimmer,
  midDistanceSwimmer,
  distanceSwimmer,
] as const;

export const engineTestAthlete = midDistanceSwimmer.athlete;

export const thresholdSensitivityWeights =
  defaultSensitivityWeightsByClass[SessionClass.ThresholdAerobicPower];
