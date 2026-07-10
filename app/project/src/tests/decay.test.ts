import { LOCK_SPEC_CONFIG } from '@/engine';
import {
  applyFatigueDecay,
  getElapsedHoursFromTimestamps,
} from '@/engine/decay';

import { engineTestHalfLives } from './fixtures/athleteFixtures';
import {
  test,
  assertApproximatelyEqual,
  assertEqual,
  assertOk,
} from './testHarness';

test('decay applies system-specific half-life behavior', () => {
  const result = applyFatigueDecay(
    {
      fatigueState: {
        neurological: 2,
        muscular: 2,
        cardiovascular: 2,
      },
      elapsedTimestamps: {
        startTimestamp: '2026-03-12T12:00:00-04:00',
        endTimestamp: '2026-03-14T12:00:00-04:00',
      },
      halfLifeBySystem: engineTestHalfLives,
    },
    LOCK_SPEC_CONFIG.foundation.decay,
  );

  assertApproximatelyEqual(result.elapsedHours, 48);
  assertApproximatelyEqual(result.rawFatigueAfterDecay.neurological, 1);
  assertApproximatelyEqual(result.fatigueAfterDecay.neurological, 1);
  assertApproximatelyEqual(result.fatigueAfterDecay.muscular, 1.2599210498948732);
  assertApproximatelyEqual(result.fatigueAfterDecay.cardiovascular, 1.148698354997035);
  assertOk(
    result.fatigueAfterDecay.neurological < result.fatigueAfterDecay.cardiovascular,
    'Neurological fatigue should decay faster than cardiovascular fatigue.',
  );
  assertOk(
    result.fatigueAfterDecay.cardiovascular < result.fatigueAfterDecay.muscular,
    'Cardiovascular fatigue should decay faster than muscular fatigue.',
  );
});

test('decay exposes raw and clamped values deterministically', () => {
  const elapsedHours = getElapsedHoursFromTimestamps({
    startTimestamp: '2026-03-14T08:00:00-04:00',
    endTimestamp: '2026-03-14T08:00:00-04:00',
  });
  const result = applyFatigueDecay({
    fatigueState: {
      neurological: 10,
      muscular: -10,
      cardiovascular: 0,
    },
    elapsedHours,
    halfLifeBySystem: engineTestHalfLives,
  });

  assertEqual(elapsedHours, 0);
  assertEqual(result.rawFatigueAfterDecay.neurological, 10);
  assertEqual(result.rawFatigueAfterDecay.muscular, -10);
  assertEqual(result.fatigueAfterDecay.neurological, 4);
  assertEqual(result.fatigueAfterDecay.muscular, -6);
});
