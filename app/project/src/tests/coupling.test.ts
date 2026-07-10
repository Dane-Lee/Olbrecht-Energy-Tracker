import { InternalSystem, type SystemCouplingMatrix } from '@/domain';
import { LOCK_SPEC_CONFIG } from '@/engine';
import { applySystemCoupling } from '@/engine/coupling';

import { engineTestCouplingMatrix } from './fixtures/athleteFixtures';
import { test, assertApproximatelyEqual } from './testHarness';

test('coupling propagates system influence with explicit self and cross weights', () => {
  const result = applySystemCoupling(
    {
      fatigueState: {
        neurological: 2,
        muscular: 1,
        cardiovascular: -1,
      },
      couplingMatrix: engineTestCouplingMatrix,
    },
    LOCK_SPEC_CONFIG.foundation.coupling,
  );

  assertApproximatelyEqual(
    result.perTarget.neurological.sourceContributions.neurological,
    2,
  );
  assertApproximatelyEqual(
    result.perTarget.neurological.sourceContributions.muscular,
    0.1,
  );
  assertApproximatelyEqual(
    result.perTarget.neurological.sourceContributions.cardiovascular,
    -0.1,
  );
  assertApproximatelyEqual(result.perTarget.neurological.selfContribution, 2);
  assertApproximatelyEqual(result.perTarget.neurological.rawCrossContribution, 0);
  assertApproximatelyEqual(result.perTarget.neurological.cappedCrossContribution, 0);
  assertApproximatelyEqual(result.preClampState.neurological, 2);
  assertApproximatelyEqual(result.preClampState.muscular, 1.05);
  assertApproximatelyEqual(result.preClampState.cardiovascular, -0.65);
});

test('coupling caps runaway cross-system amplification before scale clamping', () => {
  const aggressiveMatrix: SystemCouplingMatrix = {
    [InternalSystem.Neurological]: {
      [InternalSystem.Neurological]: 0,
      [InternalSystem.Muscular]: 2,
      [InternalSystem.Cardiovascular]: 2,
    },
    [InternalSystem.Muscular]: {
      [InternalSystem.Neurological]: 2,
      [InternalSystem.Muscular]: 0,
      [InternalSystem.Cardiovascular]: 2,
    },
    [InternalSystem.Cardiovascular]: {
      [InternalSystem.Neurological]: 2,
      [InternalSystem.Muscular]: 2,
      [InternalSystem.Cardiovascular]: 0,
    },
  };
  const result = applySystemCoupling({
    fatigueState: {
      neurological: 0,
      muscular: 4,
      cardiovascular: 4,
    },
    couplingMatrix: aggressiveMatrix,
  });

  assertApproximatelyEqual(result.uncappedState.neurological, 16);
  assertApproximatelyEqual(
    result.perTarget.neurological.crossContributionCap,
    LOCK_SPEC_CONFIG.foundation.coupling.minimumAbsoluteCrossContributionCap,
  );
  assertApproximatelyEqual(result.preClampState.neurological, 1);
  assertApproximatelyEqual(result.postClampState.neurological, 1);
  assertApproximatelyEqual(result.perTarget.neurological.clampedContribution, 1);
});
