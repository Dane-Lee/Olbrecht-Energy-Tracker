import { buildClassificationMetrics } from '@/engine/classificationMetrics';

import {
  engineTestAthlete,
  engineTestSessionPlan,
  engineTestSessionResponse,
} from './fixtures';
import {
  test,
  assertApproximatelyEqual,
  assertEqual,
} from './testHarness';

test('classification metrics extract deterministic feature inputs from fixture session data', () => {
  const result = buildClassificationMetrics({
    athlete: engineTestAthlete,
    plan: engineTestSessionPlan,
    response: engineTestSessionResponse,
  });

  assertEqual(result.totalDistanceMeters, 1000);
  assertEqual(result.totalDurationMinutes, 28);
  assertEqual(result.totalWorkSeconds, 730);
  assertEqual(result.totalRestSeconds, 515);
  assertApproximatelyEqual(result.workRestRatio ?? 0, 730 / 515);
  assertApproximatelyEqual(result.averageIntervalDistanceMeters ?? 0, 1000 / 18);
  assertApproximatelyEqual(result.repeatedEffortDensity ?? 0, 730 / 1245);
  assertEqual(result.highIntensityVolumeMeters, 800);
  assertApproximatelyEqual(result.highIntensityFraction, 0.8);
  assertApproximatelyEqual(result.sprintFraction, 0.2);
  assertApproximatelyEqual(result.thresholdFraction, 0.6);
  assertApproximatelyEqual(result.recoveryFraction, 0.2);
  assertApproximatelyEqual(result.lowIntensityFraction, 0.2);
  assertApproximatelyEqual(result.moderateIntensityFraction, 0);
  assertApproximatelyEqual(result.severeAndExtremeFraction, 0.2);
  assertEqual(result.heartRatePeakBpm, 185);
  assertEqual(result.heartRateAverageBpm, 158);
  assertEqual(result.heartRateRecovery1Min, 24);
  assertEqual(result.heartRateRecovery3Min, 42);
  assertEqual(result.heartRateRecovery5Min, 53);
  assertEqual(result.strokeEfficiencySeriesAvailable, true);
  assertEqual(result.intervalTimesAvailable, true);
  assertEqual(result.techniqueEmphasisPresent, true);
  assertApproximatelyEqual(
    result.heartRateIndicators.highestConfiguredZoneFraction ?? 0,
    0.05,
  );
  assertEqual(result.paceAnchorAvailability.hasAnyAnchor, true);
  assertEqual(result.paceAnchorAvailability.plannedCriticalVelocityAnchorSetCount, 1);
  assertEqual(result.paceAnchorAvailability.plannedSprintAnchorSetCount, 1);
  assertEqual(result.techniqueEmphasis.drillVolumeMeters, 200);
  assertEqual(result.techniqueEmphasis.techniqueTaggedIntervalCount, 4);
  assertApproximatelyEqual(result.featureCoveragePercent, 100);
  assertApproximatelyEqual(result.featureCoverage.coverageScore, 1);
  assertApproximatelyEqual(result.featureCoverage.intervalCoverageFraction ?? 0, 1);
});
