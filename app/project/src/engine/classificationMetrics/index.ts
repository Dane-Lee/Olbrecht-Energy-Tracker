import {
  IntensityDomain,
  PaceAnchorType,
  SessionClass,
  type Athlete,
  type CoachFocusTag,
  type IntervalSet,
  type IntervalTimeEntry,
  type SessionPlan,
  type SessionResponse,
} from '@/domain';

import { LOCK_SPEC_CONFIG } from '../config/lock-spec.config';
import type {
  ClassificationMetricsConfig,
  OlbrechtLockSpecConfig,
} from '../config/types';
import {
  getPolicyThresholdWindow,
  isWithinThresholdWindow,
  sumNumbers,
} from '../shared';

const PERCENT_SCALE = 100;
const NO_NUMERIC_RESULT = null;

export interface HeartRateIntensityIndicators {
  hasHeartRateSummary: boolean;
  hasZoneDistribution: boolean;
  averageBpm?: number;
  peakBpm?: number;
  highestConfiguredZoneFraction?: number;
  oneMinuteRecoveryDrop?: number;
}

export interface PaceAnchorAvailability {
  hasAnyAnchor: boolean;
  hasEventPaceAnchor: boolean;
  hasCriticalVelocityAnchor: boolean;
  hasSprintAnchor: boolean;
  hasPlannedAnchorUsage: boolean;
  plannedEventAnchorSetCount: number;
  plannedCriticalVelocityAnchorSetCount: number;
  plannedSprintAnchorSetCount: number;
}

export interface TechniqueEmphasisIndicators {
  hasTechniqueCoachFocus: boolean;
  hasDrillTag: boolean;
  drillSetCount: number;
  drillVolumeMeters: number;
  hasTechniqueTaggedIntervals: boolean;
  techniqueTaggedIntervalCount: number;
  hasStrokeMetrics: boolean;
  equipmentTaggedSetCount: number;
}

export interface SessionFeatureCoverage {
  hasLinkedPlan: boolean;
  hasIntervalTimes: boolean;
  hasHeartRateSummary: boolean;
  hasHeartRateRecovery: boolean;
  hasStrokeMetrics: boolean;
  hasSessionRpe: boolean;
  hasPaceAnchors: boolean;
  hasDrillOrTechniqueSignal: boolean;
  intervalCoverageFraction?: number;
  coverageScore: number;
  coveragePercent: number;
}

export interface ClassificationMetricsResult {
  totalDistanceMeters: number;
  totalDurationMinutes: number;
  totalWorkSeconds: number;
  totalRestSeconds: number;
  workRestRatio: number | null;
  averageIntervalDistanceMeters: number | null;
  repeatedEffortDensity: number | null;
  highIntensityVolumeMeters: number;
  highIntensityFraction: number;
  sprintFraction: number;
  thresholdFraction: number;
  recoveryFraction: number;
  lowIntensityFraction: number;
  moderateIntensityFraction: number;
  severeAndExtremeFraction: number;
  heartRatePeakBpm: number | null;
  heartRateAverageBpm: number | null;
  heartRateRecovery1Min: number | null;
  heartRateRecovery3Min: number | null;
  heartRateRecovery5Min: number | null;
  strokeEfficiencySeriesAvailable: boolean;
  intervalTimesAvailable: boolean;
  techniqueEmphasisPresent: boolean;
  paceAnchorAvailability: PaceAnchorAvailability;
  featureCoveragePercent: number;
  intervalSetCount: number;
  intervalEntryCount: number;
  dataOrigin: 'response' | 'plan';
  heartRateIndicators: HeartRateIntensityIndicators;
  techniqueEmphasis: TechniqueEmphasisIndicators;
  featureCoverage: SessionFeatureCoverage;
}

export interface ClassificationMetricsInput {
  athlete?: Athlete;
  plan?: SessionPlan;
  response: SessionResponse;
}

interface SetObservation {
  observedDistanceMeters: number;
  observedWorkSeconds: number;
  observedRestSeconds: number;
  observedRepeatCount: number;
}

interface SetComputation extends SetObservation {
  set: IntervalSet;
}

type IntensityDomainDistanceMap = Readonly<Record<IntensityDomain, number>>;

function buildObservedSetMap(
  intervalTimes: readonly IntervalTimeEntry[] | undefined,
): Readonly<Record<number, SetObservation>> {
  if (!intervalTimes || intervalTimes.length === 0) {
    return {};
  }

  return intervalTimes.reduce<Record<number, SetObservation>>((map, entry) => {
    const current = map[entry.setIndex] ?? {
      observedDistanceMeters: 0,
      observedWorkSeconds: 0,
      observedRestSeconds: 0,
      observedRepeatCount: 0,
    };

    map[entry.setIndex] = {
      observedDistanceMeters: current.observedDistanceMeters + entry.distanceMeters,
      observedWorkSeconds: current.observedWorkSeconds + entry.seconds,
      observedRestSeconds: current.observedRestSeconds + (entry.restSeconds ?? 0),
      observedRepeatCount: current.observedRepeatCount + 1,
    };

    return map;
  }, {});
}

function getPlannedSetRestSeconds(
  set: IntervalSet,
  restObservationMode: ClassificationMetricsConfig['restObservationMode'],
): number {
  const repeatTransitions =
    restObservationMode === 'repeatCountMinusOne' ? Math.max(set.repeatCount - 1, 0) : 0;

  return repeatTransitions * set.restSeconds + (set.blockRestSeconds ?? 0);
}

function getSetComputation(
  set: IntervalSet,
  observedSetMap: Readonly<Record<number, SetObservation>>,
  metricsConfig: ClassificationMetricsConfig,
): SetComputation {
  const observed = observedSetMap[set.setIndex];

  if (observed) {
    return {
      set,
      ...observed,
    };
  }

  return {
    set,
    observedDistanceMeters: set.repeatDistanceMeters * set.repeatCount,
    observedWorkSeconds: set.targetPaceSeconds * set.repeatCount,
    observedRestSeconds: getPlannedSetRestSeconds(set, metricsConfig.restObservationMode),
    observedRepeatCount: set.repeatCount,
  };
}

function countTechniqueTaggedIntervals(
  intervalTimes: readonly IntervalTimeEntry[] | undefined,
): number {
  if (!intervalTimes) {
    return 0;
  }

  return intervalTimes.filter((entry) => entry.techniqueTag !== undefined).length;
}

function normalizeCoachFocusTags(
  coachFocusTag: CoachFocusTag | undefined,
): readonly string[] {
  if (coachFocusTag === undefined) {
    return [];
  }

  return Array.isArray(coachFocusTag) ? coachFocusTag : [coachFocusTag];
}

function hasTechniqueCoachFocus(plan: SessionPlan | undefined): boolean {
  return normalizeCoachFocusTags(plan?.coachFocusTag).some((tag) =>
    tag.toLowerCase().includes('technique'),
  );
}

function getIntervalHeartRateSeries(
  intervalTimes: readonly IntervalTimeEntry[] | undefined,
): readonly number[] {
  if (!intervalTimes) {
    return [];
  }

  return intervalTimes
    .map((entry) => entry.heartRateBpm)
    .filter((heartRate): heartRate is number => heartRate !== undefined);
}

function getAverageHeartRateBpm(response: SessionResponse): number | null {
  if (response.heartRateSummary?.averageBpm !== undefined) {
    return response.heartRateSummary.averageBpm;
  }

  const intervalHeartRates = getIntervalHeartRateSeries(response.intervalTimes);

  return intervalHeartRates.length > 0
    ? sumNumbers(intervalHeartRates) / intervalHeartRates.length
    : NO_NUMERIC_RESULT;
}

function getPeakHeartRateBpm(response: SessionResponse): number | null {
  if (response.heartRateSummary?.peakBpm !== undefined) {
    return response.heartRateSummary.peakBpm;
  }

  const intervalHeartRates = getIntervalHeartRateSeries(response.intervalTimes);

  return intervalHeartRates.length > 0
    ? Math.max(...intervalHeartRates)
    : NO_NUMERIC_RESULT;
}

function getRecoveryDropValue(
  response: SessionResponse,
  recoveryKey: 'oneMinute' | 'threeMinute' | 'fiveMinute',
  heartRateAfterKey: 'hrAfter1Min' | 'hrAfter3Min' | 'hrAfter5Min',
): number | null {
  const recovery = response.postMainSetHeartRateRecovery;

  if (!recovery) {
    return NO_NUMERIC_RESULT;
  }

  const recoveryDrop = recovery.recoveryDrop[recoveryKey];

  if (recoveryDrop !== undefined) {
    return recoveryDrop;
  }

  const heartRateAfter = recovery[heartRateAfterKey];

  return heartRateAfter !== undefined
    ? recovery.hrAtEndMainSet - heartRateAfter
    : NO_NUMERIC_RESULT;
}

function createIntensityDomainDistanceMap(
  setComputations: readonly SetComputation[],
): IntensityDomainDistanceMap {
  const startingMap: Record<IntensityDomain, number> = {
    [IntensityDomain.Low]: 0,
    [IntensityDomain.Moderate]: 0,
    [IntensityDomain.Heavy]: 0,
    [IntensityDomain.Severe]: 0,
    [IntensityDomain.Extreme]: 0,
  };

  return setComputations.reduce<Record<IntensityDomain, number>>((map, computation) => {
    map[computation.set.intensityDomain] += computation.observedDistanceMeters;
    return map;
  }, startingMap);
}

function getFraction(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function isSprintSet(
  setComputation: SetComputation,
  metricsConfig: ClassificationMetricsConfig,
  sprintDistanceWindow: ReturnType<typeof getPolicyThresholdWindow>,
): boolean {
  const usesSprintAnchor =
    metricsConfig.sprintQualifiers.includes('sprintAnchorType') &&
    setComputation.set.targetPaceAnchorType === PaceAnchorType.Sprint;
  const usesSprintDistance =
    metricsConfig.sprintQualifiers.includes('neuralSprintDistanceWindow') &&
    isWithinThresholdWindow(
      setComputation.set.repeatDistanceMeters,
      sprintDistanceWindow,
    );

  return usesSprintAnchor || usesSprintDistance;
}

function isThresholdSet(
  setComputation: SetComputation,
  metricsConfig: ClassificationMetricsConfig,
  thresholdDistanceWindow: ReturnType<typeof getPolicyThresholdWindow>,
): boolean {
  const usesThresholdDistance =
    metricsConfig.thresholdQualifiers.includes('thresholdDistanceWindow') &&
    isWithinThresholdWindow(
      setComputation.set.repeatDistanceMeters,
      thresholdDistanceWindow,
    );
  const usesThresholdDomains =
    metricsConfig.thresholdQualifiers.includes('thresholdIntensityDomains') &&
    metricsConfig.thresholdDomains.includes(setComputation.set.intensityDomain);

  return usesThresholdDistance && usesThresholdDomains;
}

function isRecoverySet(
  setComputation: SetComputation,
  metricsConfig: ClassificationMetricsConfig,
): boolean {
  const usesRecoveryDomain =
    metricsConfig.recoveryQualifiers.includes('recoveryDomains') &&
    metricsConfig.recoveryDomains.includes(setComputation.set.intensityDomain);
  const usesDrillTag =
    metricsConfig.recoveryQualifiers.includes('drillTagPresent') &&
    setComputation.set.drillTag !== null;

  return usesRecoveryDomain && usesDrillTag;
}

function getHighestConfiguredZoneFraction(
  athlete: Athlete | undefined,
  response: SessionResponse,
): number | undefined {
  const zoneDistribution = response.heartRateSummary?.zoneDistribution;

  if (!athlete || !zoneDistribution) {
    return undefined;
  }

  const orderedZones = [...athlete.profile.heartRateZones.zones].sort(
    (left, right) => left.maxBpm - right.maxBpm,
  );
  const highestZone = orderedZones[orderedZones.length - 1];
  const distributionTotal = sumNumbers(Object.values(zoneDistribution));

  if (!highestZone || distributionTotal === 0) {
    return undefined;
  }

  return (zoneDistribution[highestZone.zoneLabel] ?? 0) / distributionTotal;
}

export function buildClassificationMetrics(
  input: ClassificationMetricsInput,
  metricsConfig: ClassificationMetricsConfig = LOCK_SPEC_CONFIG.foundation.classificationMetrics,
  lockConfig: OlbrechtLockSpecConfig = LOCK_SPEC_CONFIG,
): ClassificationMetricsResult {
  const observedSetMap = buildObservedSetMap(input.response.intervalTimes);
  const setComputations = (input.plan?.intervalSets ?? []).map((set) =>
    getSetComputation(set, observedSetMap, metricsConfig),
  );
  const totalWorkSeconds = sumNumbers(
    setComputations.map((setComputation) => setComputation.observedWorkSeconds),
  );
  const totalRestSeconds = sumNumbers(
    setComputations.map((setComputation) => setComputation.observedRestSeconds),
  );
  const highIntensityVolumeMeters = sumNumbers(
    setComputations
      .filter((setComputation) =>
        metricsConfig.highIntensityDomains.includes(setComputation.set.intensityDomain),
      )
      .map((setComputation) => setComputation.observedDistanceMeters),
  );
  const intensityDomainDistance = createIntensityDomainDistanceMap(setComputations);

  const sprintDistanceWindow = getPolicyThresholdWindow(
    SessionClass.NeuralSprint,
    'repeatDistanceMeters',
    lockConfig,
  );
  const thresholdDistanceWindow = getPolicyThresholdWindow(
    SessionClass.ThresholdAerobicPower,
    'repeatDistanceMeters',
    lockConfig,
  );

  const sprintVolumeMeters = sumNumbers(
    setComputations
      .filter((setComputation) =>
        isSprintSet(setComputation, metricsConfig, sprintDistanceWindow),
      )
      .map((setComputation) => setComputation.observedDistanceMeters),
  );
  const thresholdVolumeMeters = sumNumbers(
    setComputations
      .filter((setComputation) =>
        isThresholdSet(setComputation, metricsConfig, thresholdDistanceWindow),
      )
      .map((setComputation) => setComputation.observedDistanceMeters),
  );
  const recoveryVolumeMeters = sumNumbers(
    setComputations
      .filter((setComputation) => isRecoverySet(setComputation, metricsConfig))
      .map((setComputation) => setComputation.observedDistanceMeters),
  );

  const plannedRepeatCount = sumNumbers(
    (input.plan?.intervalSets ?? []).map((set) => set.repeatCount),
  );
  const observedRepeatCount =
    input.response.intervalTimes?.length ??
    sumNumbers(setComputations.map((setComputation) => setComputation.observedRepeatCount));
  const totalObservedDistanceMeters =
    input.response.intervalTimes?.reduce(
      (total, intervalTime) => total + intervalTime.distanceMeters,
      0,
    ) ??
    sumNumbers(setComputations.map((setComputation) => setComputation.observedDistanceMeters));
  const averageIntervalDistanceMeters =
    observedRepeatCount > 0 ? totalObservedDistanceMeters / observedRepeatCount : null;
  const totalDistanceMeters = input.response.actualTotalDistanceMeters;

  const paceAnchorAvailability: PaceAnchorAvailability = {
    hasAnyAnchor: false,
    hasEventPaceAnchor:
      Object.keys(input.athlete?.profile.eventPaceAnchors ?? {}).length > 0,
    hasCriticalVelocityAnchor: input.athlete?.profile.criticalVelocityAnchor !== undefined,
    hasSprintAnchor: input.athlete?.profile.sprintAnchor !== undefined,
    hasPlannedAnchorUsage: false,
    plannedEventAnchorSetCount: (input.plan?.intervalSets ?? []).filter(
      (set) => set.targetPaceAnchorType === PaceAnchorType.EventPace,
    ).length,
    plannedCriticalVelocityAnchorSetCount: (input.plan?.intervalSets ?? []).filter(
      (set) => set.targetPaceAnchorType === PaceAnchorType.CriticalVelocity,
    ).length,
    plannedSprintAnchorSetCount: (input.plan?.intervalSets ?? []).filter(
      (set) => set.targetPaceAnchorType === PaceAnchorType.Sprint,
    ).length,
  };
  paceAnchorAvailability.hasPlannedAnchorUsage =
    paceAnchorAvailability.plannedEventAnchorSetCount +
      paceAnchorAvailability.plannedCriticalVelocityAnchorSetCount +
      paceAnchorAvailability.plannedSprintAnchorSetCount >
    0;
  paceAnchorAvailability.hasAnyAnchor =
    paceAnchorAvailability.hasEventPaceAnchor ||
    paceAnchorAvailability.hasCriticalVelocityAnchor ||
    paceAnchorAvailability.hasSprintAnchor ||
    paceAnchorAvailability.hasPlannedAnchorUsage;

  const techniqueCoachFocus = hasTechniqueCoachFocus(input.plan);
  const techniqueTaggedIntervalCount = countTechniqueTaggedIntervals(
    input.response.intervalTimes,
  );
  const techniqueEmphasis: TechniqueEmphasisIndicators = {
    hasTechniqueCoachFocus: techniqueCoachFocus,
    hasDrillTag: (input.plan?.intervalSets ?? []).some((set) => set.drillTag !== null),
    drillSetCount: (input.plan?.intervalSets ?? []).filter((set) => set.drillTag !== null)
      .length,
    drillVolumeMeters: sumNumbers(
      setComputations
        .filter((setComputation) => setComputation.set.drillTag !== null)
        .map((setComputation) => setComputation.observedDistanceMeters),
    ),
    hasTechniqueTaggedIntervals: techniqueTaggedIntervalCount > 0,
    techniqueTaggedIntervalCount,
    hasStrokeMetrics: input.response.strokeMetrics !== undefined,
    equipmentTaggedSetCount: (input.plan?.intervalSets ?? []).filter(
      (set) => set.equipmentTags.length > 0,
    ).length,
  };
  const techniqueEmphasisPresent =
    techniqueEmphasis.hasTechniqueCoachFocus ||
    techniqueEmphasis.hasDrillTag ||
    techniqueEmphasis.hasTechniqueTaggedIntervals;
  const intervalTimesAvailable =
    input.response.intervalTimes !== undefined && input.response.intervalTimes.length > 0;
  const heartRateAverageBpm = getAverageHeartRateBpm(input.response);
  const heartRatePeakBpm = getPeakHeartRateBpm(input.response);
  const heartRateRecovery1Min = getRecoveryDropValue(
    input.response,
    'oneMinute',
    'hrAfter1Min',
  );
  const heartRateRecovery3Min = getRecoveryDropValue(
    input.response,
    'threeMinute',
    'hrAfter3Min',
  );
  const heartRateRecovery5Min = getRecoveryDropValue(
    input.response,
    'fiveMinute',
    'hrAfter5Min',
  );
  const strokeEfficiencySeriesAvailable =
    (input.response.strokeMetrics?.strokeIndexSeries?.length ?? 0) > 0 ||
    (input.response.strokeMetrics?.swolfSeries?.length ?? 0) > 0;

  const featureCoverageSignals = {
    linkedPlan:
      input.plan !== undefined &&
      input.response.linkedPlanId !== undefined &&
      input.response.linkedPlanId === input.plan.id,
    intervalTimes: intervalTimesAvailable,
    heartRateSummary:
      input.response.heartRateSummary !== undefined ||
      heartRateAverageBpm !== null ||
      heartRatePeakBpm !== null,
    heartRateRecovery:
      heartRateRecovery1Min !== null ||
      heartRateRecovery3Min !== null ||
      heartRateRecovery5Min !== null,
    strokeMetrics: input.response.strokeMetrics !== undefined,
    sessionRPE: Number.isFinite(input.response.sessionRPE.value),
    paceAnchors: paceAnchorAvailability.hasAnyAnchor,
    drillOrTechniqueSignal: techniqueEmphasisPresent,
  } as const;

  const presentSignalCount = metricsConfig.featureCoverageSignals.filter((signal) => {
    const featureSignal = featureCoverageSignals[
      signal as keyof typeof featureCoverageSignals
    ];
    return featureSignal;
  }).length;
  const coverageScore =
    metricsConfig.featureCoverageSignals.length > 0
      ? presentSignalCount / metricsConfig.featureCoverageSignals.length
      : 0;

  const featureCoverage: SessionFeatureCoverage = {
    hasLinkedPlan: featureCoverageSignals.linkedPlan,
    hasIntervalTimes: featureCoverageSignals.intervalTimes,
    hasHeartRateSummary: featureCoverageSignals.heartRateSummary,
    hasHeartRateRecovery: featureCoverageSignals.heartRateRecovery,
    hasStrokeMetrics: featureCoverageSignals.strokeMetrics,
    hasSessionRpe: featureCoverageSignals.sessionRPE,
    hasPaceAnchors: featureCoverageSignals.paceAnchors,
    hasDrillOrTechniqueSignal: featureCoverageSignals.drillOrTechniqueSignal,
    intervalCoverageFraction:
      plannedRepeatCount > 0 ? Math.min(observedRepeatCount / plannedRepeatCount, 1) : undefined,
    coverageScore,
    coveragePercent: coverageScore * PERCENT_SCALE,
  };

  return {
    totalDistanceMeters,
    totalDurationMinutes: input.response.actualDurationMinutes,
    totalWorkSeconds,
    totalRestSeconds,
    workRestRatio: totalRestSeconds > 0 ? totalWorkSeconds / totalRestSeconds : null,
    averageIntervalDistanceMeters,
    repeatedEffortDensity:
      totalWorkSeconds + totalRestSeconds > 0
        ? totalWorkSeconds / (totalWorkSeconds + totalRestSeconds)
        : null,
    highIntensityVolumeMeters,
    highIntensityFraction: getFraction(highIntensityVolumeMeters, totalDistanceMeters),
    sprintFraction: getFraction(sprintVolumeMeters, totalDistanceMeters),
    thresholdFraction: getFraction(thresholdVolumeMeters, totalDistanceMeters),
    recoveryFraction: getFraction(recoveryVolumeMeters, totalDistanceMeters),
    lowIntensityFraction: getFraction(
      intensityDomainDistance[IntensityDomain.Low],
      totalDistanceMeters,
    ),
    moderateIntensityFraction: getFraction(
      intensityDomainDistance[IntensityDomain.Moderate],
      totalDistanceMeters,
    ),
    severeAndExtremeFraction: getFraction(
      intensityDomainDistance[IntensityDomain.Severe] +
        intensityDomainDistance[IntensityDomain.Extreme],
      totalDistanceMeters,
    ),
    heartRatePeakBpm,
    heartRateAverageBpm,
    heartRateRecovery1Min,
    heartRateRecovery3Min,
    heartRateRecovery5Min,
    strokeEfficiencySeriesAvailable,
    intervalTimesAvailable,
    techniqueEmphasisPresent,
    paceAnchorAvailability,
    featureCoveragePercent: featureCoverage.coveragePercent,
    intervalSetCount: input.plan?.intervalSets.length ?? 0,
    intervalEntryCount: input.response.intervalTimes?.length ?? 0,
    dataOrigin:
      intervalTimesAvailable || input.plan === undefined ? 'response' : 'plan',
    heartRateIndicators: {
      hasHeartRateSummary:
        input.response.heartRateSummary !== undefined ||
        heartRateAverageBpm !== null ||
        heartRatePeakBpm !== null,
      hasZoneDistribution: input.response.heartRateSummary?.zoneDistribution !== undefined,
      averageBpm: heartRateAverageBpm ?? undefined,
      peakBpm: heartRatePeakBpm ?? undefined,
      highestConfiguredZoneFraction: getHighestConfiguredZoneFraction(
        input.athlete,
        input.response,
      ),
      oneMinuteRecoveryDrop: heartRateRecovery1Min ?? undefined,
    },
    techniqueEmphasis,
    featureCoverage,
  };
}
