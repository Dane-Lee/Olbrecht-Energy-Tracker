import {
  InternalSystem,
  ReadinessCategory,
  SessionClass,
} from '@/domain';
import { createSessionPlannerRecommendation } from '@/features';
import { assertEqual, test } from './testHarness';

const greenSystems = {
  [InternalSystem.Neurological]: ReadinessCategory.Green,
  [InternalSystem.Muscular]: ReadinessCategory.Green,
  [InternalSystem.Cardiovascular]: ReadinessCategory.Green,
};

test('session planner preserves a green session and planned distance', () => {
  const result = createSessionPlannerRecommendation({
    intendedSessionClass: SessionClass.ThresholdAerobicPower,
    plannedDistanceMeters: 4200,
    globalReadinessCategory: ReadinessCategory.Green,
    systemReadinessCategory: greenSystems,
    evaluatedAt: new Date('2026-07-28T12:00:00.000Z'),
  });

  assertEqual(
    result.modulation.recommendedSessionClass,
    SessionClass.ThresholdAerobicPower,
  );
  assertEqual(result.adjustedDistanceMeters, 4200);
});

test('session planner exposes the red readiness downgrade and volume', () => {
  const result = createSessionPlannerRecommendation({
    intendedSessionClass: SessionClass.NeuralSprint,
    plannedDistanceMeters: 4000,
    globalReadinessCategory: ReadinessCategory.Red,
    systemReadinessCategory: greenSystems,
    evaluatedAt: new Date('2026-07-28T12:00:00.000Z'),
  });

  assertEqual(
    result.modulation.recommendedSessionClass,
    SessionClass.RecoveryTechnique,
  );
  assertEqual(result.adjustedDistanceMeters, 2400);
});

test('session planner applies anaerobic spacing through the locked engine', () => {
  const result = createSessionPlannerRecommendation({
    intendedSessionClass: SessionClass.MusclePowerEndurance,
    plannedDistanceMeters: 3600,
    globalReadinessCategory: ReadinessCategory.Green,
    systemReadinessCategory: greenSystems,
    daysSinceLastAnaerobicPower: 2,
    evaluatedAt: new Date('2026-07-28T12:00:00.000Z'),
  });

  assertEqual(
    result.modulation.recommendedSessionClass,
    SessionClass.RecoveryTechnique,
  );
  assertEqual(result.adjustedDistanceMeters, 2700);
});
