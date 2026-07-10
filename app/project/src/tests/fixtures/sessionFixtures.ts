import {
  EnergySystemFocus,
  IntensityDomain,
  InternalSystem,
  PaceAnchorType,
  PoolCourse,
  SessionClass,
  type IntensityDomainDistribution,
  type IntervalTimeEntry,
  type SessionClassDistribution,
  type SessionPlan,
  type SessionResponse,
} from '@/domain';

import {
  engineTestAthlete,
  distanceSwimmer,
  midDistanceSwimmer,
  sprintSwimmer,
  type AthleteArchetypeFixture,
} from './athleteFixtures';

export type SessionFixtureName =
  | 'neuralSprint'
  | 'musclePowerEndurance'
  | 'anaerobicCapacity'
  | 'racePace'
  | 'aerobicBase'
  | 'thresholdAerobicPower'
  | 'recoveryTechnique';

export type FixtureDataQualityBand = 'highConfidence' | 'minimumRequired';

export interface SessionFixture {
  readonly athlete: AthleteArchetypeFixture;
  readonly sessionPlan: SessionPlan;
  readonly sessionResponse: SessionResponse;
  readonly expectedTopClass: SessionClass;
  readonly expectedIntentVector: SessionClassDistribution;
  readonly expectedPrimarySystemLoad: InternalSystem;
  readonly expectedDataQualityBand: FixtureDataQualityBand;
  readonly observedMetrics: {
    readonly workRestRatio: number;
    readonly strokeEfficiencyDegradationPercent: number;
    readonly intervalPerformanceConsistencyPercent: number;
  };
}

interface SessionFixtureDefinition {
  readonly athlete: AthleteArchetypeFixture;
  readonly planId: SessionPlan['id'];
  readonly responseId: SessionResponse['id'];
  readonly startTimestamp: SessionPlan['startTimestamp'];
  readonly responseTimestamp: SessionResponse['createdAt'];
  readonly sessionLabel: SessionPlan['sessionLabel'];
  readonly intendedSessionClass: SessionClass;
  readonly intendedEnergySystemFocus: EnergySystemFocus;
  readonly plannedTotalDistanceMeters: number;
  readonly plannedDurationMinutes: number;
  readonly coachFocusTag: SessionPlan['coachFocusTag'];
  readonly intervalSets: SessionPlan['intervalSets'];
  readonly notes: string;
  readonly plannedIntensityDomainDistribution: IntensityDomainDistribution;
  readonly expectedIntentVector: SessionClassDistribution;
  readonly expectedPrimarySystemLoad: InternalSystem;
  readonly sessionRpe: number;
  readonly heartRatePeak: number;
  readonly heartRateAverage: number;
  readonly postSessionHRRecovery1Min: number;
  readonly postSessionHRRecovery3Min: number;
  readonly postSessionHRRecovery5Min: number;
  readonly strokeEfficiencyDegradationPercent: number;
  readonly intervalPerformanceConsistencyPercent: number;
  readonly intervalTimes: readonly IntervalTimeEntry[];
  readonly dataSource: SessionResponse['dataSource'];
  readonly readinessInputs: SessionResponse['readinessInputs'];
  readonly hooperInputs: NonNullable<SessionResponse['hooperInputs']>;
  readonly strokeMetrics: NonNullable<SessionResponse['strokeMetrics']>;
  readonly expectedDataQualityBand: FixtureDataQualityBand;
}

const DATA_SOURCE = 'fixture-manual-entry';

const createSessionClassDistribution = (
  values: Partial<Record<SessionClass, number>>,
): SessionClassDistribution => ({
  [SessionClass.NeuralSprint]: values[SessionClass.NeuralSprint] ?? 0,
  [SessionClass.MusclePowerEndurance]:
    values[SessionClass.MusclePowerEndurance] ?? 0,
  [SessionClass.AnaerobicCapacity]: values[SessionClass.AnaerobicCapacity] ?? 0,
  [SessionClass.RacePace]: values[SessionClass.RacePace] ?? 0,
  [SessionClass.AerobicBase]: values[SessionClass.AerobicBase] ?? 0,
  [SessionClass.ThresholdAerobicPower]:
    values[SessionClass.ThresholdAerobicPower] ?? 0,
  [SessionClass.RecoveryTechnique]: values[SessionClass.RecoveryTechnique] ?? 0,
});

const createIntensityDistribution = (
  values: Partial<Record<IntensityDomain, number>>,
): IntensityDomainDistribution => ({
  [IntensityDomain.Low]: values[IntensityDomain.Low] ?? 0,
  [IntensityDomain.Moderate]: values[IntensityDomain.Moderate] ?? 0,
  [IntensityDomain.Heavy]: values[IntensityDomain.Heavy] ?? 0,
  [IntensityDomain.Severe]: values[IntensityDomain.Severe] ?? 0,
  [IntensityDomain.Extreme]: values[IntensityDomain.Extreme] ?? 0,
});

const buildIntervalTimes = ({
  setIndex,
  distanceMeters,
  times,
  restSeconds,
  stroke,
  techniqueTag,
  heartRateStart,
  heartRateStep,
}: {
  readonly setIndex: number;
  readonly distanceMeters: number;
  readonly times: readonly number[];
  readonly restSeconds: number;
  readonly stroke: string;
  readonly techniqueTag?: string;
  readonly heartRateStart: number;
  readonly heartRateStep: number;
}): readonly IntervalTimeEntry[] =>
  times.map((seconds, index) => ({
    setIndex,
    repeatIndex: index + 1,
    distanceMeters,
    seconds,
    restSeconds,
    stroke,
    techniqueTag,
    heartRateBpm: heartRateStart + heartRateStep * index,
  }));

const createHeartRateZoneDistribution = (
  low: number,
  moderate: number,
  high: number,
): Readonly<Record<string, number>> => ({
  z1: low,
  z2: moderate,
  z3: high,
});

const createStrokeMetrics = (
  baselineStrokeEfficiency: number,
  degradationPercent: number,
  swolfStart: number,
): NonNullable<SessionResponse['strokeMetrics']> => ({
  strokeIndex: Number(
    (baselineStrokeEfficiency - degradationPercent / 2).toFixed(2),
  ),
  swolf: swolfStart + 1,
  strokeIndexSeries: [
    baselineStrokeEfficiency,
    Number((baselineStrokeEfficiency - degradationPercent / 2).toFixed(2)),
    Number((baselineStrokeEfficiency - degradationPercent).toFixed(2)),
  ],
  swolfSeries: [swolfStart, swolfStart + 1, swolfStart + 2],
});

const createSessionFixture = (
  definition: SessionFixtureDefinition,
): SessionFixture => {
  const sessionPlan: SessionPlan = {
    id: definition.planId,
    athleteId: definition.athlete.athlete.id,
    planRevision: 1,
    startTimestamp: definition.startTimestamp,
    timeZone: definition.athlete.timezone,
    poolCourse: PoolCourse.Scm,
    sessionLabel: definition.sessionLabel,
    coachFocusTag: definition.coachFocusTag,
    plannedTotalDistanceMeters: definition.plannedTotalDistanceMeters,
    plannedDurationMinutes: definition.plannedDurationMinutes,
    intendedSessionClass: definition.intendedSessionClass,
    intendedEnergySystemFocus: definition.intendedEnergySystemFocus,
    intervalSets: definition.intervalSets,
    notes: definition.notes,
    plannedIntensityDomainDistribution: definition.plannedIntensityDomainDistribution,
    intendedClassDistribution: definition.expectedIntentVector,
    createdAt: definition.startTimestamp,
    updatedAt: definition.startTimestamp,
  };

  const sessionResponse: SessionResponse = {
    id: definition.responseId,
    athleteId: definition.athlete.athlete.id,
    responseRevision: 1,
    linkedPlanId: sessionPlan.id,
    startTimestamp: definition.startTimestamp,
    timeZone: definition.athlete.timezone,
    actualTotalDistanceMeters: definition.plannedTotalDistanceMeters,
    actualDurationMinutes: definition.plannedDurationMinutes,
    sessionRPE: {
      value: definition.sessionRpe,
      scaleType: 'foster-0-10',
    },
    readinessInputs: definition.readinessInputs,
    hooperInputs: definition.hooperInputs,
    heartRateSummary: {
      averageBpm: definition.heartRateAverage,
      peakBpm: definition.heartRatePeak,
      zoneDistribution: createHeartRateZoneDistribution(0.3, 0.45, 0.25),
    },
    postMainSetHeartRateRecovery: {
      hrAtEndMainSet: definition.heartRatePeak,
      hrAfter1Min: definition.heartRatePeak - definition.postSessionHRRecovery1Min,
      hrAfter3Min: definition.heartRatePeak - definition.postSessionHRRecovery3Min,
      hrAfter5Min: definition.heartRatePeak - definition.postSessionHRRecovery5Min,
      recoveryDrop: {
        oneMinute: definition.postSessionHRRecovery1Min,
        threeMinute: definition.postSessionHRRecovery3Min,
        fiveMinute: definition.postSessionHRRecovery5Min,
      },
    },
    strokeMetrics: definition.strokeMetrics,
    intervalTimes: definition.intervalTimes,
    dataSource: definition.dataSource,
    notes: definition.notes,
    createdAt: definition.responseTimestamp,
    updatedAt: definition.responseTimestamp,
  };

  return {
    athlete: definition.athlete,
    sessionPlan,
    sessionResponse,
    expectedTopClass: definition.intendedSessionClass,
    expectedIntentVector: definition.expectedIntentVector,
    expectedPrimarySystemLoad: definition.expectedPrimarySystemLoad,
    expectedDataQualityBand: definition.expectedDataQualityBand,
    observedMetrics: {
      workRestRatio: Number(
        (
          definition.intervalTimes[0].seconds /
          (definition.intervalTimes[0].restSeconds ?? 1)
        ).toFixed(2),
      ),
      strokeEfficiencyDegradationPercent:
        definition.strokeEfficiencyDegradationPercent,
      intervalPerformanceConsistencyPercent:
        definition.intervalPerformanceConsistencyPercent,
    },
  };
};

export const neuralSprint = createSessionFixture({
  athlete: sprintSwimmer,
  planId: 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  responseId: 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  startTimestamp: '2026-03-15T15:30:00-04:00',
  responseTimestamp: '2026-03-15T17:00:00-04:00',
  sessionLabel: 'Neural Sprint Speed',
  intendedSessionClass: SessionClass.NeuralSprint,
  intendedEnergySystemFocus: EnergySystemFocus.Neurological,
  plannedTotalDistanceMeters: 1800,
  plannedDurationMinutes: 55,
  coachFocusTag: ['speed', 'neuromuscular'],
  intervalSets: [
    {
      setIndex: 1,
      setLabel: 'Main Sprint Set',
      primaryStroke: 'freestyle',
      equipmentTags: [],
      repeatDistanceMeters: 25,
      repeatCount: 12,
      targetPaceSeconds: 12.2,
      targetPaceAnchorType: PaceAnchorType.Sprint,
      restSeconds: 40,
      blockRestSeconds: 120,
      drillTag: null,
      intensityDomain: IntensityDomain.Extreme,
    },
  ],
  notes:
    'Includes 900m warm-up and 600m cool-down around a high-quality sprint main set.',
  plannedIntensityDomainDistribution: createIntensityDistribution({
    [IntensityDomain.Low]: 0.05,
    [IntensityDomain.Heavy]: 0.1,
    [IntensityDomain.Severe]: 0.25,
    [IntensityDomain.Extreme]: 0.6,
  }),
  expectedIntentVector: createSessionClassDistribution({
    [SessionClass.NeuralSprint]: 0.88,
    [SessionClass.MusclePowerEndurance]: 0.12,
  }),
  expectedPrimarySystemLoad: InternalSystem.Neurological,
  sessionRpe: 8,
  heartRatePeak: 176,
  heartRateAverage: 132,
  postSessionHRRecovery1Min: 34,
  postSessionHRRecovery3Min: 52,
  postSessionHRRecovery5Min: 63,
  strokeEfficiencyDegradationPercent: 7,
  intervalPerformanceConsistencyPercent: 91,
  intervalTimes: buildIntervalTimes({
    setIndex: 1,
    distanceMeters: 25,
    times: [12.1, 12.2, 12.2, 12.3, 12.2, 12.4, 12.3, 12.4, 12.5, 12.4, 12.5, 12.6],
    restSeconds: 40,
    stroke: 'freestyle',
    heartRateStart: 162,
    heartRateStep: 1,
  }),
  dataSource: DATA_SOURCE,
  readinessInputs: {
    readinessScore: 8,
    focusScore: 9,
    intensityPerception: 8,
    fatigueIndicators: {
      [InternalSystem.Neurological]: 3,
      [InternalSystem.Muscular]: 2,
      [InternalSystem.Cardiovascular]: 1,
    },
  },
  hooperInputs: {
    sleepQuality: 4,
    stress: 2,
    fatigue: 2,
    muscleSoreness: 2,
  },
  strokeMetrics: createStrokeMetrics(
    sprintSwimmer.baselineStrokeEfficiency,
    7,
    29,
  ),
  expectedDataQualityBand: 'highConfidence',
});

export const musclePowerEndurance = createSessionFixture({
  athlete: sprintSwimmer,
  planId: 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  responseId: 'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  startTimestamp: '2026-03-16T15:30:00-04:00',
  responseTimestamp: '2026-03-16T17:00:00-04:00',
  sessionLabel: 'Muscle Power Endurance',
  intendedSessionClass: SessionClass.MusclePowerEndurance,
  intendedEnergySystemFocus: EnergySystemFocus.Muscular,
  plannedTotalDistanceMeters: 2800,
  plannedDurationMinutes: 70,
  coachFocusTag: ['anaerobic-power', 'speed-endurance'],
  intervalSets: [
    {
      setIndex: 1,
      setLabel: 'Primary Power Block',
      primaryStroke: 'freestyle',
      equipmentTags: ['finis-snorkel'],
      repeatDistanceMeters: 25,
      repeatCount: 20,
      targetPaceSeconds: 13,
      targetPaceAnchorType: PaceAnchorType.Sprint,
      restSeconds: 20,
      blockRestSeconds: 150,
      drillTag: null,
      intensityDomain: IntensityDomain.Extreme,
    },
  ],
  notes:
    'Includes activation work and 1,800m of supporting volume around repeated short maximal efforts.',
  plannedIntensityDomainDistribution: createIntensityDistribution({
    [IntensityDomain.Moderate]: 0.05,
    [IntensityDomain.Heavy]: 0.2,
    [IntensityDomain.Severe]: 0.35,
    [IntensityDomain.Extreme]: 0.4,
  }),
  expectedIntentVector: createSessionClassDistribution({
    [SessionClass.MusclePowerEndurance]: 0.82,
    [SessionClass.NeuralSprint]: 0.1,
    [SessionClass.AnaerobicCapacity]: 0.08,
  }),
  expectedPrimarySystemLoad: InternalSystem.Muscular,
  sessionRpe: 8,
  heartRatePeak: 184,
  heartRateAverage: 152,
  postSessionHRRecovery1Min: 28,
  postSessionHRRecovery3Min: 45,
  postSessionHRRecovery5Min: 58,
  strokeEfficiencyDegradationPercent: 11,
  intervalPerformanceConsistencyPercent: 84,
  intervalTimes: buildIntervalTimes({
    setIndex: 1,
    distanceMeters: 25,
    times: [
      13.0, 13.1, 13.2, 13.3, 13.4, 13.4, 13.5, 13.6, 13.8, 13.9,
      14.0, 14.1, 14.2, 14.3, 14.4, 14.5, 14.4, 14.5, 14.6, 14.7,
    ],
    restSeconds: 20,
    stroke: 'freestyle',
    heartRateStart: 168,
    heartRateStep: 1,
  }),
  dataSource: DATA_SOURCE,
  readinessInputs: {
    readinessScore: 7,
    focusScore: 8,
    intensityPerception: 8,
    fatigueIndicators: {
      [InternalSystem.Neurological]: 2,
      [InternalSystem.Muscular]: 3,
      [InternalSystem.Cardiovascular]: 1,
    },
  },
  hooperInputs: {
    sleepQuality: 4,
    stress: 2,
    fatigue: 3,
    muscleSoreness: 3,
  },
  strokeMetrics: createStrokeMetrics(
    sprintSwimmer.baselineStrokeEfficiency,
    11,
    30,
  ),
  expectedDataQualityBand: 'highConfidence',
});

export const anaerobicCapacity = createSessionFixture({
  athlete: sprintSwimmer,
  planId: 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  responseId: 'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
  startTimestamp: '2026-03-17T15:30:00-04:00',
  responseTimestamp: '2026-03-17T17:10:00-04:00',
  sessionLabel: 'Anaerobic Capacity Build',
  intendedSessionClass: SessionClass.AnaerobicCapacity,
  intendedEnergySystemFocus: EnergySystemFocus.Muscular,
  plannedTotalDistanceMeters: 3200,
  plannedDurationMinutes: 75,
  coachFocusTag: ['glycolytic', 'repeat-power'],
  intervalSets: [
    {
      setIndex: 1,
      setLabel: 'Primary Capacity Set',
      primaryStroke: 'freestyle',
      equipmentTags: [],
      repeatDistanceMeters: 50,
      repeatCount: 10,
      targetPaceSeconds: 34,
      targetPaceAnchorType: PaceAnchorType.EventPace,
      restSeconds: 40,
      blockRestSeconds: 180,
      drillTag: null,
      intensityDomain: IntensityDomain.Severe,
    },
  ],
  notes:
    'Includes long activation, descending preparation work, and a glycolytic main set with full timing capture.',
  plannedIntensityDomainDistribution: createIntensityDistribution({
    [IntensityDomain.Moderate]: 0.05,
    [IntensityDomain.Heavy]: 0.15,
    [IntensityDomain.Severe]: 0.55,
    [IntensityDomain.Extreme]: 0.25,
  }),
  expectedIntentVector: createSessionClassDistribution({
    [SessionClass.AnaerobicCapacity]: 0.82,
    [SessionClass.MusclePowerEndurance]: 0.1,
    [SessionClass.RacePace]: 0.08,
  }),
  expectedPrimarySystemLoad: InternalSystem.Muscular,
  sessionRpe: 9,
  heartRatePeak: 190,
  heartRateAverage: 161,
  postSessionHRRecovery1Min: 24,
  postSessionHRRecovery3Min: 40,
  postSessionHRRecovery5Min: 51,
  strokeEfficiencyDegradationPercent: 14,
  intervalPerformanceConsistencyPercent: 79,
  intervalTimes: buildIntervalTimes({
    setIndex: 1,
    distanceMeters: 50,
    times: [34.1, 34.4, 34.8, 35.0, 35.2, 35.4, 35.7, 36.0, 35.9, 36.1],
    restSeconds: 40,
    stroke: 'freestyle',
    heartRateStart: 172,
    heartRateStep: 2,
  }),
  dataSource: DATA_SOURCE,
  readinessInputs: {
    readinessScore: 7,
    focusScore: 8,
    intensityPerception: 9,
    fatigueIndicators: {
      [InternalSystem.Neurological]: 1,
      [InternalSystem.Muscular]: 3,
      [InternalSystem.Cardiovascular]: 3,
    },
  },
  hooperInputs: {
    sleepQuality: 3,
    stress: 3,
    fatigue: 3,
    muscleSoreness: 4,
  },
  strokeMetrics: createStrokeMetrics(
    sprintSwimmer.baselineStrokeEfficiency,
    14,
    31,
  ),
  expectedDataQualityBand: 'highConfidence',
});

export const racePace = createSessionFixture({
  athlete: midDistanceSwimmer,
  planId: 'aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
  responseId: 'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
  startTimestamp: '2026-03-18T15:30:00-04:00',
  responseTimestamp: '2026-03-18T17:00:00-04:00',
  sessionLabel: 'Race Pace Specificity',
  intendedSessionClass: SessionClass.RacePace,
  intendedEnergySystemFocus: EnergySystemFocus.Muscular,
  plannedTotalDistanceMeters: 3000,
  plannedDurationMinutes: 68,
  coachFocusTag: ['race-pace', 'pace-anchored'],
  intervalSets: [
    {
      setIndex: 1,
      setLabel: 'Race Pace Main Set',
      primaryStroke: 'freestyle',
      equipmentTags: [],
      repeatDistanceMeters: 50,
      repeatCount: 12,
      targetPaceSeconds: 30,
      targetPaceAnchorType: PaceAnchorType.EventPace,
      restSeconds: 40,
      blockRestSeconds: 120,
      drillTag: null,
      intensityDomain: IntensityDomain.Severe,
    },
  ],
  notes:
    'Built around 200m race-pace splits with full split capture for pace-anchored normalization.',
  plannedIntensityDomainDistribution: createIntensityDistribution({
    [IntensityDomain.Moderate]: 0.1,
    [IntensityDomain.Heavy]: 0.3,
    [IntensityDomain.Severe]: 0.4,
    [IntensityDomain.Extreme]: 0.2,
  }),
  expectedIntentVector: createSessionClassDistribution({
    [SessionClass.RacePace]: 0.86,
    [SessionClass.ThresholdAerobicPower]: 0.14,
  }),
  expectedPrimarySystemLoad: InternalSystem.Muscular,
  sessionRpe: 8,
  heartRatePeak: 186,
  heartRateAverage: 156,
  postSessionHRRecovery1Min: 27,
  postSessionHRRecovery3Min: 43,
  postSessionHRRecovery5Min: 55,
  strokeEfficiencyDegradationPercent: 9,
  intervalPerformanceConsistencyPercent: 88,
  intervalTimes: buildIntervalTimes({
    setIndex: 1,
    distanceMeters: 50,
    times: [29.8, 29.9, 30.0, 30.1, 30.0, 30.2, 30.1, 30.2, 30.3, 30.2, 30.4, 30.3],
    restSeconds: 40,
    stroke: 'freestyle',
    heartRateStart: 170,
    heartRateStep: 1,
  }),
  dataSource: DATA_SOURCE,
  readinessInputs: {
    readinessScore: 8,
    focusScore: 8,
    intensityPerception: 8,
    fatigueIndicators: {
      [InternalSystem.Neurological]: 2,
      [InternalSystem.Muscular]: 2,
      [InternalSystem.Cardiovascular]: 2,
    },
  },
  hooperInputs: {
    sleepQuality: 4,
    stress: 2,
    fatigue: 2,
    muscleSoreness: 2,
  },
  strokeMetrics: createStrokeMetrics(
    midDistanceSwimmer.baselineStrokeEfficiency,
    9,
    30,
  ),
  expectedDataQualityBand: 'highConfidence',
});

export const aerobicBase = createSessionFixture({
  athlete: distanceSwimmer,
  planId: 'aaaaaaa5-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
  responseId: 'bbbbbbb5-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
  startTimestamp: '2026-03-19T06:45:00-04:00',
  responseTimestamp: '2026-03-19T08:30:00-04:00',
  sessionLabel: 'Aerobic Base Endurance',
  intendedSessionClass: SessionClass.AerobicBase,
  intendedEnergySystemFocus: EnergySystemFocus.Cardiovascular,
  plannedTotalDistanceMeters: 6200,
  plannedDurationMinutes: 95,
  coachFocusTag: ['aerobic-base', 'volume'],
  intervalSets: [
    {
      setIndex: 1,
      setLabel: 'Aerobic Main Set',
      primaryStroke: 'freestyle',
      equipmentTags: [],
      repeatDistanceMeters: 200,
      repeatCount: 12,
      targetPaceSeconds: 162,
      targetPaceAnchorType: PaceAnchorType.CriticalVelocity,
      restSeconds: 90,
      blockRestSeconds: 120,
      drillTag: null,
      intensityDomain: IntensityDomain.Low,
    },
  ],
  notes:
    'Large-volume aerobic set with controlled pace and generous technical focus between repetitions.',
  plannedIntensityDomainDistribution: createIntensityDistribution({
    [IntensityDomain.Low]: 0.65,
    [IntensityDomain.Moderate]: 0.3,
    [IntensityDomain.Heavy]: 0.05,
  }),
  expectedIntentVector: createSessionClassDistribution({
    [SessionClass.AerobicBase]: 0.9,
    [SessionClass.RecoveryTechnique]: 0.1,
  }),
  expectedPrimarySystemLoad: InternalSystem.Cardiovascular,
  sessionRpe: 5,
  heartRatePeak: 162,
  heartRateAverage: 138,
  postSessionHRRecovery1Min: 30,
  postSessionHRRecovery3Min: 46,
  postSessionHRRecovery5Min: 59,
  strokeEfficiencyDegradationPercent: 6,
  intervalPerformanceConsistencyPercent: 93,
  intervalTimes: buildIntervalTimes({
    setIndex: 1,
    distanceMeters: 200,
    times: [161.8, 162.0, 162.4, 162.7, 162.6, 162.8, 163.1, 163.0, 163.3, 163.6, 163.4, 163.8],
    restSeconds: 90,
    stroke: 'freestyle',
    heartRateStart: 140,
    heartRateStep: 1,
  }),
  dataSource: DATA_SOURCE,
  readinessInputs: {
    readinessScore: 8,
    focusScore: 7,
    intensityPerception: 5,
    fatigueIndicators: {
      [InternalSystem.Neurological]: 1,
      [InternalSystem.Muscular]: 1,
      [InternalSystem.Cardiovascular]: 2,
    },
  },
  hooperInputs: {
    sleepQuality: 4,
    stress: 2,
    fatigue: 2,
    muscleSoreness: 1,
  },
  strokeMetrics: createStrokeMetrics(
    distanceSwimmer.baselineStrokeEfficiency,
    6,
    33,
  ),
  expectedDataQualityBand: 'highConfidence',
});

export const thresholdAerobicPower = createSessionFixture({
  athlete: midDistanceSwimmer,
  planId: 'aaaaaaa6-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
  responseId: 'bbbbbbb6-bbbb-bbbb-bbbb-bbbbbbbbbbb6',
  startTimestamp: '2026-03-20T15:30:00-04:00',
  responseTimestamp: '2026-03-20T17:00:00-04:00',
  sessionLabel: 'Threshold Aerobic Power',
  intendedSessionClass: SessionClass.ThresholdAerobicPower,
  intendedEnergySystemFocus: EnergySystemFocus.Cardiovascular,
  plannedTotalDistanceMeters: 4800,
  plannedDurationMinutes: 82,
  coachFocusTag: ['threshold', 'aerobic-power'],
  intervalSets: [
    {
      setIndex: 1,
      setLabel: 'Threshold Main Set',
      primaryStroke: 'freestyle',
      equipmentTags: [],
      repeatDistanceMeters: 100,
      repeatCount: 12,
      targetPaceSeconds: 70,
      targetPaceAnchorType: PaceAnchorType.CriticalVelocity,
      restSeconds: 64,
      blockRestSeconds: 120,
      drillTag: null,
      intensityDomain: IntensityDomain.Heavy,
    },
  ],
  notes:
    'Threshold session with short rest and steady heavy-domain pace anchored to critical velocity.',
  plannedIntensityDomainDistribution: createIntensityDistribution({
    [IntensityDomain.Low]: 0.05,
    [IntensityDomain.Moderate]: 0.15,
    [IntensityDomain.Heavy]: 0.55,
    [IntensityDomain.Severe]: 0.25,
  }),
  expectedIntentVector: createSessionClassDistribution({
    [SessionClass.ThresholdAerobicPower]: 0.84,
    [SessionClass.RacePace]: 0.1,
    [SessionClass.AerobicBase]: 0.06,
  }),
  expectedPrimarySystemLoad: InternalSystem.Cardiovascular,
  sessionRpe: 7,
  heartRatePeak: 178,
  heartRateAverage: 149,
  postSessionHRRecovery1Min: 26,
  postSessionHRRecovery3Min: 42,
  postSessionHRRecovery5Min: 54,
  strokeEfficiencyDegradationPercent: 8,
  intervalPerformanceConsistencyPercent: 87,
  intervalTimes: buildIntervalTimes({
    setIndex: 1,
    distanceMeters: 100,
    times: [69.8, 70.0, 70.1, 70.3, 70.4, 70.5, 70.7, 70.8, 70.9, 71.0, 71.1, 71.2],
    restSeconds: 64,
    stroke: 'freestyle',
    heartRateStart: 160,
    heartRateStep: 1,
  }),
  dataSource: DATA_SOURCE,
  readinessInputs: {
    readinessScore: 7,
    focusScore: 8,
    intensityPerception: 7,
    fatigueIndicators: {
      [InternalSystem.Neurological]: 1,
      [InternalSystem.Muscular]: 2,
      [InternalSystem.Cardiovascular]: 3,
    },
  },
  hooperInputs: {
    sleepQuality: 4,
    stress: 2,
    fatigue: 2,
    muscleSoreness: 2,
  },
  strokeMetrics: createStrokeMetrics(
    midDistanceSwimmer.baselineStrokeEfficiency,
    8,
    31,
  ),
  expectedDataQualityBand: 'highConfidence',
});

export const recoveryTechnique = createSessionFixture({
  athlete: distanceSwimmer,
  planId: 'aaaaaaa7-aaaa-aaaa-aaaa-aaaaaaaaaaa7',
  responseId: 'bbbbbbb7-bbbb-bbbb-bbbb-bbbbbbbbbbb7',
  startTimestamp: '2026-03-21T08:00:00-04:00',
  responseTimestamp: '2026-03-21T09:15:00-04:00',
  sessionLabel: 'Recovery Technique Reset',
  intendedSessionClass: SessionClass.RecoveryTechnique,
  intendedEnergySystemFocus: EnergySystemFocus.Cardiovascular,
  plannedTotalDistanceMeters: 2500,
  plannedDurationMinutes: 50,
  coachFocusTag: ['recovery', 'technique'],
  intervalSets: [
    {
      setIndex: 1,
      setLabel: 'Technique Main Set',
      primaryStroke: 'freestyle',
      equipmentTags: ['pull-buoy'],
      repeatDistanceMeters: 100,
      repeatCount: 10,
      targetPaceSeconds: 110,
      targetPaceAnchorType: PaceAnchorType.CriticalVelocity,
      restSeconds: 50,
      blockRestSeconds: 60,
      drillTag: 'freestyle-technique',
      intensityDomain: IntensityDomain.Low,
    },
  ],
  notes:
    'Recovery session with drill-infused low-intensity repetitions and full response capture.',
  plannedIntensityDomainDistribution: createIntensityDistribution({
    [IntensityDomain.Low]: 0.75,
    [IntensityDomain.Moderate]: 0.25,
  }),
  expectedIntentVector: createSessionClassDistribution({
    [SessionClass.RecoveryTechnique]: 0.82,
    [SessionClass.AerobicBase]: 0.18,
  }),
  expectedPrimarySystemLoad: InternalSystem.Cardiovascular,
  sessionRpe: 2,
  heartRatePeak: 138,
  heartRateAverage: 112,
  postSessionHRRecovery1Min: 36,
  postSessionHRRecovery3Min: 55,
  postSessionHRRecovery5Min: 68,
  strokeEfficiencyDegradationPercent: 3,
  intervalPerformanceConsistencyPercent: 96,
  intervalTimes: buildIntervalTimes({
    setIndex: 1,
    distanceMeters: 100,
    times: [109.8, 109.9, 110.0, 110.1, 110.0, 110.2, 110.1, 110.2, 110.3, 110.4],
    restSeconds: 50,
    stroke: 'freestyle',
    techniqueTag: 'freestyle-technique',
    heartRateStart: 118,
    heartRateStep: 1,
  }),
  dataSource: DATA_SOURCE,
  readinessInputs: {
    readinessScore: 9,
    focusScore: 7,
    intensityPerception: 2,
    fatigueIndicators: {
      [InternalSystem.Neurological]: 0,
      [InternalSystem.Muscular]: 0,
      [InternalSystem.Cardiovascular]: 1,
    },
  },
  hooperInputs: {
    sleepQuality: 5,
    stress: 1,
    fatigue: 1,
    muscleSoreness: 1,
  },
  strokeMetrics: createStrokeMetrics(
    distanceSwimmer.baselineStrokeEfficiency,
    3,
    34,
  ),
  expectedDataQualityBand: 'highConfidence',
});

export const sessionFixtures = {
  neuralSprint,
  musclePowerEndurance,
  anaerobicCapacity,
  racePace,
  aerobicBase,
  thresholdAerobicPower,
  recoveryTechnique,
} satisfies Record<SessionFixtureName, SessionFixture>;

export const sessionFixtureList = [
  neuralSprint,
  musclePowerEndurance,
  anaerobicCapacity,
  racePace,
  aerobicBase,
  thresholdAerobicPower,
  recoveryTechnique,
] as const;

const createCompatibilityIntervalEntries = (
  input: {
    readonly setIndex: number;
    readonly repeatDistanceMeters: number;
    readonly repSeconds: readonly number[];
    readonly restSeconds: number;
    readonly techniqueTag?: string;
  },
): readonly IntervalTimeEntry[] =>
  input.repSeconds.map((seconds, index) => ({
    setIndex: input.setIndex,
    repeatIndex: index + 1,
    distanceMeters: input.repeatDistanceMeters,
    seconds,
    restSeconds:
      index < input.repSeconds.length - 1 ? input.restSeconds : undefined,
    stroke: 'freestyle',
    techniqueTag: input.techniqueTag,
  }));

const compatibilityIntervalTimes = [
  ...createCompatibilityIntervalEntries({
    setIndex: 1,
    repeatDistanceMeters: 50,
    repSeconds: [45, 45, 46, 44],
    restSeconds: 15,
    techniqueTag: 'drill',
  }),
  ...createCompatibilityIntervalEntries({
    setIndex: 2,
    repeatDistanceMeters: 100,
    repSeconds: [70, 71, 71, 72, 71, 72],
    restSeconds: 10,
  }),
  ...createCompatibilityIntervalEntries({
    setIndex: 3,
    repeatDistanceMeters: 25,
    repSeconds: [15, 15, 16, 15, 16, 15, 16, 15],
    restSeconds: 60,
  }),
] as const;

export const engineTestSessionPlan: SessionPlan = {
  id: '00000000-0000-0000-0000-000000000401',
  athleteId: engineTestAthlete.id,
  planRevision: 1,
  startTimestamp: '2026-03-14T15:30:00-04:00',
  timeZone: engineTestAthlete.profile.timezone,
  poolCourse: PoolCourse.Scm,
  sessionLabel: 'Engine Foundation Mixed Session',
  coachFocusTag: ['threshold', 'speed', 'technique'],
  plannedTotalDistanceMeters: 1000,
  plannedDurationMinutes: 28,
  intendedSessionClass: SessionClass.ThresholdAerobicPower,
  intendedEnergySystemFocus: EnergySystemFocus.Cardiovascular,
  intervalSets: [
    {
      setIndex: 1,
      setLabel: 'Warmup Drill',
      primaryStroke: 'freestyle',
      equipmentTags: ['snorkel'],
      repeatDistanceMeters: 50,
      repeatCount: 4,
      targetPaceSeconds: 45,
      targetPaceAnchorType: null,
      restSeconds: 15,
      blockRestSeconds: null,
      drillTag: 'technique',
      intensityDomain: IntensityDomain.Low,
    },
    {
      setIndex: 2,
      setLabel: 'Threshold Main Set',
      primaryStroke: 'freestyle',
      equipmentTags: [],
      repeatDistanceMeters: 100,
      repeatCount: 6,
      targetPaceSeconds: 71,
      targetPaceAnchorType: PaceAnchorType.CriticalVelocity,
      restSeconds: 10,
      blockRestSeconds: null,
      drillTag: null,
      intensityDomain: IntensityDomain.Heavy,
    },
    {
      setIndex: 3,
      setLabel: 'Sprint Finish',
      primaryStroke: 'freestyle',
      equipmentTags: ['parachute'],
      repeatDistanceMeters: 25,
      repeatCount: 8,
      targetPaceSeconds: 15,
      targetPaceAnchorType: PaceAnchorType.Sprint,
      restSeconds: 60,
      blockRestSeconds: null,
      drillTag: null,
      intensityDomain: IntensityDomain.Extreme,
    },
  ],
  notes: 'Deterministic compatibility fixture for classification metrics tests.',
  plannedHeartRateZoneTarget: 'z4',
  competitionPrepFlag: false,
  intendedClassDistribution: createSessionClassDistribution({
    [SessionClass.MusclePowerEndurance]: 0.1,
    [SessionClass.AerobicBase]: 0.1,
    [SessionClass.ThresholdAerobicPower]: 0.8,
  }),
  plannedIntensityDomainDistribution: createIntensityDistribution({
    [IntensityDomain.Low]: 0.2,
    [IntensityDomain.Heavy]: 0.6,
    [IntensityDomain.Extreme]: 0.2,
  }),
  createdAt: '2026-03-14T08:00:00-04:00',
  updatedAt: '2026-03-14T08:00:00-04:00',
};

export const engineTestSessionResponse: SessionResponse = {
  id: '00000000-0000-0000-0000-000000000402',
  athleteId: engineTestAthlete.id,
  responseRevision: 1,
  linkedPlanId: engineTestSessionPlan.id,
  startTimestamp: engineTestSessionPlan.startTimestamp,
  timeZone: engineTestAthlete.profile.timezone,
  actualTotalDistanceMeters: 1000,
  actualDurationMinutes: 28,
  sessionRPE: {
    value: 7,
    scaleType: 'foster-0-10',
  },
  readinessInputs: {
    readinessScore: 7,
    focusScore: 8,
    intensityPerception: 7,
    fatigueIndicators: {
      [InternalSystem.Neurological]: 1,
      [InternalSystem.Muscular]: 2,
      [InternalSystem.Cardiovascular]: 1,
    },
  },
  heartRateSummary: {
    averageBpm: 158,
    peakBpm: 185,
    zoneDistribution: {
      z1: 5,
      z2: 10,
      z3: 15,
      z4: 8,
      z5: 2,
    },
  },
  postMainSetHeartRateRecovery: {
    hrAtEndMainSet: 182,
    hrAfter1Min: 158,
    hrAfter3Min: 140,
    hrAfter5Min: 129,
    recoveryDrop: {
      oneMinute: 24,
      threeMinute: 42,
      fiveMinute: 53,
    },
  },
  strokeMetrics: {
    strokeIndex: 2.4,
    swolf: 37,
    strokeIndexSeries: [2.45, 2.42, 2.4],
    swolfSeries: [35, 36, 37],
  },
  intervalTimes: compatibilityIntervalTimes,
  dataSource: 'engineFixtureManual',
  notes: 'Deterministic compatibility fixture for classification metrics tests.',
  createdAt: '2026-03-14T08:00:00-04:00',
  updatedAt: '2026-03-14T17:10:00-04:00',
};
