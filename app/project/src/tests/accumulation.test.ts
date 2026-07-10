import { LOCK_SPEC_CONFIG } from '@/engine';
import { applyFatigueAccumulation } from '@/engine/accumulation';

import { thresholdSensitivityWeights } from './fixtures/athleteFixtures';
import {
  test,
  assertApproximatelyEqual,
  assertOk,
} from './testHarness';

test('accumulation applies weighted nonlinear load accumulation and clamps to bounds', () => {
  const result = applyFatigueAccumulation(
    {
      currentFatigueState: {
        neurological: 3.5,
        muscular: 0,
        cardiovascular: -5.5,
      },
      rawSystemLoad: {
        neurological: 2,
        muscular: 4,
        cardiovascular: -3,
      },
      sensitivityBySystem: thresholdSensitivityWeights,
    },
    LOCK_SPEC_CONFIG.foundation.accumulation,
  );

  assertApproximatelyEqual(result.availableHeadroom.neurological, 0.5);
  assertApproximatelyEqual(result.perSystem.neurological.sensitivity, 0.15);
  assertApproximatelyEqual(result.weightedSystemLoad.neurological, 0.3);
  assertApproximatelyEqual(result.weightedSystemLoad.muscular, 1);
  assertApproximatelyEqual(result.weightedSystemLoad.cardiovascular, -1.8);
  assertApproximatelyEqual(result.finalFatigueState.neurological, 3.7255941819529867);
  assertApproximatelyEqual(result.finalFatigueState.muscular, 0.8847968677143805);
  assertApproximatelyEqual(result.finalFatigueState.cardiovascular, -5.986338138776092);
});

test('accumulation saturates as fatigue approaches the positive clamp boundary', () => {
  const result = applyFatigueAccumulation({
    currentFatigueState: {
      neurological: 3.9,
      muscular: 0,
      cardiovascular: 0,
    },
    rawSystemLoad: {
      neurological: 10,
      muscular: 0,
      cardiovascular: 0,
    },
    sensitivityBySystem: {
      neurological: 1,
      muscular: 1,
      cardiovascular: 1,
    },
  });

  assertOk(
    result.delta.neurological < 10,
    'Accumulation delta should saturate below the raw weighted load.',
  );
  assertApproximatelyEqual(result.availableHeadroom.neurological, 0.1);
  assertOk(
    result.finalFatigueState.neurological <= 4,
    'Accumulation should clamp at the fixed fatigue-scale maximum.',
  );
  assertApproximatelyEqual(result.finalFatigueState.neurological, 4);
});
