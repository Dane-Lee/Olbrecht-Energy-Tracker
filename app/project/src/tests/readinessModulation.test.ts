import {
  dominantSystemForClass,
  loadWeightedSuppression,
  modulateSessionTargets,
} from '@/engine/modulation/readiness-modulation';
import {
  InternalSystem,
  ReadinessCategory,
  RecommendationCode,
  SessionClass,
  WarningCode,
} from '@/domain';
import { assertApproximatelyEqual, assertEqual, assertOk, test } from './testHarness';

function categories(
  neurological: ReadinessCategory,
  muscular: ReadinessCategory,
  cardiovascular: ReadinessCategory,
) {
  return {
    [InternalSystem.Neurological]: neurological,
    [InternalSystem.Muscular]: muscular,
    [InternalSystem.Cardiovascular]: cardiovascular,
  } as const;
}

function snapshot(
  global: ReadinessCategory,
  perSystem = categories(global, global, global),
) {
  return {
    systemReadinessCategory: perSystem,
    globalReadinessCategory: global,
    snapshotDate: '2026-07-07',
    createdAt: '2026-07-07T08:00:00.000Z',
  };
}

test('dominant system follows the lock-spec load allocation', () => {
  assertEqual(dominantSystemForClass(SessionClass.NeuralSprint), InternalSystem.Neurological);
  assertEqual(dominantSystemForClass(SessionClass.MusclePowerEndurance), InternalSystem.Muscular);
  assertEqual(dominantSystemForClass(SessionClass.AerobicBase), InternalSystem.Cardiovascular);
});

test('load-weighted suppression is zero at all-green and scales with class fractions', () => {
  assertApproximatelyEqual(
    loadWeightedSuppression(
      SessionClass.NeuralSprint,
      categories(ReadinessCategory.Green, ReadinessCategory.Green, ReadinessCategory.Green),
    ),
    0,
  );

  // Neural sprint fractions are 0.7/0.2/0.1; red neuro (severity 3) dominates.
  assertApproximatelyEqual(
    loadWeightedSuppression(
      SessionClass.NeuralSprint,
      categories(ReadinessCategory.Red, ReadinessCategory.Green, ReadinessCategory.Green),
    ),
    0.7 * 3,
  );
});

test('green readiness maintains the plan untouched', () => {
  const result = modulateSessionTargets({
    intendedSessionClass: SessionClass.ThresholdAerobicPower,
    snapshot: snapshot(ReadinessCategory.Green),
  });

  assertEqual(result.recommendedSessionClass, SessionClass.ThresholdAerobicPower);
  assertApproximatelyEqual(result.volumeScale, 1);
  assertApproximatelyEqual(result.restScale, 1);
  assertEqual(result.intensityGuidance, 'maintain');
  assertEqual(result.recommendationCode, RecommendationCode.MaintainLoad);
});

test('yellow readiness tightens execution', () => {
  const result = modulateSessionTargets({
    intendedSessionClass: SessionClass.AerobicBase,
    snapshot: snapshot(ReadinessCategory.Yellow),
  });

  assertApproximatelyEqual(result.volumeScale, 0.9);
  assertApproximatelyEqual(result.restScale, 1.1);
  assertEqual(result.intensityGuidance, 'cap');
  assertEqual(result.recommendationCode, RecommendationCode.TightenLoad);
});

test('red readiness swaps high-power classes to recovery technique', () => {
  const result = modulateSessionTargets({
    intendedSessionClass: SessionClass.NeuralSprint,
    snapshot: snapshot(ReadinessCategory.Red),
  });

  assertEqual(result.recommendedSessionClass, SessionClass.RecoveryTechnique);
  assertApproximatelyEqual(result.volumeScale, 0.6);
  assertEqual(result.recommendationCode, RecommendationCode.ScheduleRecoveryTechnique);
});

test('red readiness swaps aerobic-power classes to aerobic base', () => {
  const result = modulateSessionTargets({
    intendedSessionClass: SessionClass.AnaerobicCapacity,
    snapshot: snapshot(ReadinessCategory.Red),
  });

  assertEqual(result.recommendedSessionClass, SessionClass.AerobicBase);
});

test('suppressed dominant system gates harder than a green global', () => {
  // Global green but muscular (MPE-dominant) is red.
  const result = modulateSessionTargets({
    intendedSessionClass: SessionClass.MusclePowerEndurance,
    snapshot: snapshot(
      ReadinessCategory.Green,
      categories(ReadinessCategory.Green, ReadinessCategory.Red, ReadinessCategory.Green),
    ),
  });

  assertEqual(result.recommendedSessionClass, SessionClass.RecoveryTechnique);
  assertEqual(result.recommendationCode, RecommendationCode.ScheduleRecoveryTechnique);
  assertOk(
    result.rationale.some((line) => line.includes('muscular')),
    'rationale should name the gating system',
  );
});

test('anaerobic power spacing swaps to recovery technique inside the window', () => {
  const result = modulateSessionTargets({
    intendedSessionClass: SessionClass.NeuralSprint,
    snapshot: snapshot(ReadinessCategory.Green),
    daysSinceLastAnaerobicPower: 3,
  });

  assertEqual(result.recommendedSessionClass, SessionClass.RecoveryTechnique);
  assertOk(
    result.warnings.includes(WarningCode.MusclePowerEnduranceFrequency),
    'expected the frequency warning',
  );
});

test('tolerant athletes get the 4-day spacing window', () => {
  const blocked = modulateSessionTargets({
    intendedSessionClass: SessionClass.MusclePowerEndurance,
    snapshot: snapshot(ReadinessCategory.Green),
    daysSinceLastAnaerobicPower: 3,
    anaerobicPowerTolerant: true,
  });
  assertEqual(blocked.recommendedSessionClass, SessionClass.RecoveryTechnique);

  const allowed = modulateSessionTargets({
    intendedSessionClass: SessionClass.MusclePowerEndurance,
    snapshot: snapshot(ReadinessCategory.Green),
    daysSinceLastAnaerobicPower: 5,
    anaerobicPowerTolerant: true,
  });
  assertEqual(allowed.recommendedSessionClass, SessionClass.MusclePowerEndurance);
});

test('taper precedence caps volume, keeps intensity, and re-routes base swaps', () => {
  const result = modulateSessionTargets({
    intendedSessionClass: SessionClass.RacePace,
    snapshot: snapshot(ReadinessCategory.Orange),
    daysToRace: 10,
  });

  assertOk(result.volumeScale <= 0.85, 'taper caps volume at 85%');
  assertEqual(result.intensityGuidance, 'cap'); // not 'reduce' — taper keeps intensity
  assertEqual(result.recommendationCode, RecommendationCode.ProtectTaper);
});

test('taper + red re-routes the aerobic-base swap to recovery technique', () => {
  const result = modulateSessionTargets({
    intendedSessionClass: SessionClass.RacePace,
    snapshot: snapshot(ReadinessCategory.Red),
    daysToRace: 7,
  });

  assertEqual(result.recommendedSessionClass, SessionClass.RecoveryTechnique);
  assertEqual(result.recommendationCode, RecommendationCode.ProtectTaper);
});
