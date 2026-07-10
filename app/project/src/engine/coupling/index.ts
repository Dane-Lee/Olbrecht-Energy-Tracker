import { InternalSystem, type SystemCouplingMatrix } from '@/domain';

import { LOCK_SPEC_CONFIG } from '../config/lock-spec.config';
import type { CouplingEngineConfig } from '../config/types';
import type {
  ContinuousSystemState,
  FatigueScaleBounds,
} from '../foundation-types';
import {
  clampSystemState,
  createSystemState,
  getFatigueScaleBounds,
  sumNumbers,
} from '../shared';

export interface CouplingInput {
  fatigueState: ContinuousSystemState;
  couplingMatrix: SystemCouplingMatrix;
}

export interface CouplingTargetDetail {
  sourceWeights: Readonly<Record<InternalSystem, number>>;
  sourceContributions: ContinuousSystemState;
  selfContribution: number;
  rawCrossContribution: number;
  crossContributionCap: number;
  cappedCrossContribution: number;
  totalContribution: number;
  stabilizedContribution: number;
  clampedContribution: number;
}

export interface CouplingResult {
  sourceFatigueState: ContinuousSystemState;
  weightsByTarget: SystemCouplingMatrix;
  contributionsByTarget: Readonly<Record<InternalSystem, ContinuousSystemState>>;
  uncappedState: ContinuousSystemState;
  preClampState: ContinuousSystemState;
  postClampState: ContinuousSystemState;
  perTarget: Readonly<Record<InternalSystem, CouplingTargetDetail>>;
}

const TARGET_SYSTEMS = [
  InternalSystem.Neurological,
  InternalSystem.Muscular,
  InternalSystem.Cardiovascular,
] as const;

function sumSystemState(state: ContinuousSystemState): number {
  return sumNumbers([
    state[InternalSystem.Neurological],
    state[InternalSystem.Muscular],
    state[InternalSystem.Cardiovascular],
  ]);
}

function clampContributionMagnitude(value: number, limit: number): number {
  return Math.min(Math.max(value, -limit), limit);
}

function getCrossContribution(
  target: InternalSystem,
  sourceContributions: ContinuousSystemState,
): number {
  return sumNumbers(
    TARGET_SYSTEMS.filter((system) => system !== target).map(
      (system) => sourceContributions[system],
    ),
  );
}

function getCrossContributionCap(
  selfContribution: number,
  config: CouplingEngineConfig,
): number {
  return Math.max(
    Math.abs(selfContribution) * config.maxCrossContributionRatioToSelf,
    config.minimumAbsoluteCrossContributionCap,
  );
}

export function applySystemCoupling(
  input: CouplingInput,
  config: CouplingEngineConfig = LOCK_SPEC_CONFIG.foundation.coupling,
  bounds: FatigueScaleBounds = getFatigueScaleBounds(),
): CouplingResult {
  if (config.matrixOrientation !== 'targetBySource') {
    throw new Error(
      `Unsupported coupling matrix orientation: ${config.matrixOrientation}`,
    );
  }

  const contributionsByTarget: Readonly<Record<InternalSystem, ContinuousSystemState>> = {
    [InternalSystem.Neurological]: createSystemState(
      (source) =>
        input.fatigueState[source] *
        input.couplingMatrix[InternalSystem.Neurological][source],
    ),
    [InternalSystem.Muscular]: createSystemState(
      (source) =>
        input.fatigueState[source] *
        input.couplingMatrix[InternalSystem.Muscular][source],
    ),
    [InternalSystem.Cardiovascular]: createSystemState(
      (source) =>
        input.fatigueState[source] *
        input.couplingMatrix[InternalSystem.Cardiovascular][source],
    ),
  };
  const perTarget: Readonly<Record<InternalSystem, CouplingTargetDetail>> = {
    [InternalSystem.Neurological]: (() => {
      const sourceContributions = contributionsByTarget[InternalSystem.Neurological];
      const selfContribution = sourceContributions[InternalSystem.Neurological];
      const rawCrossContribution = getCrossContribution(
        InternalSystem.Neurological,
        sourceContributions,
      );
      const crossContributionCap = getCrossContributionCap(
        selfContribution,
        config,
      );
      const cappedCrossContribution = clampContributionMagnitude(
        rawCrossContribution,
        crossContributionCap,
      );
      const totalContribution = sumSystemState(sourceContributions);
      const stabilizedContribution = selfContribution + cappedCrossContribution;

      return {
        sourceWeights: input.couplingMatrix[InternalSystem.Neurological],
        sourceContributions,
        selfContribution,
        rawCrossContribution,
        crossContributionCap,
        cappedCrossContribution,
        totalContribution,
        stabilizedContribution,
        clampedContribution: stabilizedContribution,
      };
    })(),
    [InternalSystem.Muscular]: (() => {
      const sourceContributions = contributionsByTarget[InternalSystem.Muscular];
      const selfContribution = sourceContributions[InternalSystem.Muscular];
      const rawCrossContribution = getCrossContribution(
        InternalSystem.Muscular,
        sourceContributions,
      );
      const crossContributionCap = getCrossContributionCap(
        selfContribution,
        config,
      );
      const cappedCrossContribution = clampContributionMagnitude(
        rawCrossContribution,
        crossContributionCap,
      );
      const totalContribution = sumSystemState(sourceContributions);
      const stabilizedContribution = selfContribution + cappedCrossContribution;

      return {
        sourceWeights: input.couplingMatrix[InternalSystem.Muscular],
        sourceContributions,
        selfContribution,
        rawCrossContribution,
        crossContributionCap,
        cappedCrossContribution,
        totalContribution,
        stabilizedContribution,
        clampedContribution: stabilizedContribution,
      };
    })(),
    [InternalSystem.Cardiovascular]: (() => {
      const sourceContributions = contributionsByTarget[InternalSystem.Cardiovascular];
      const selfContribution = sourceContributions[InternalSystem.Cardiovascular];
      const rawCrossContribution = getCrossContribution(
        InternalSystem.Cardiovascular,
        sourceContributions,
      );
      const crossContributionCap = getCrossContributionCap(
        selfContribution,
        config,
      );
      const cappedCrossContribution = clampContributionMagnitude(
        rawCrossContribution,
        crossContributionCap,
      );
      const totalContribution = sumSystemState(sourceContributions);
      const stabilizedContribution = selfContribution + cappedCrossContribution;

      return {
        sourceWeights: input.couplingMatrix[InternalSystem.Cardiovascular],
        sourceContributions,
        selfContribution,
        rawCrossContribution,
        crossContributionCap,
        cappedCrossContribution,
        totalContribution,
        stabilizedContribution,
        clampedContribution: stabilizedContribution,
      };
    })(),
  };
  const uncappedState = createSystemState(
    (target) => perTarget[target].totalContribution,
  );
  const preClampState = createSystemState(
    (target) => perTarget[target].stabilizedContribution,
  );
  const postClampState = config.clampToFatigueScale
    ? clampSystemState(preClampState, bounds)
    : preClampState;

  return {
    sourceFatigueState: input.fatigueState,
    weightsByTarget: input.couplingMatrix,
    contributionsByTarget,
    uncappedState,
    preClampState,
    postClampState,
    perTarget: {
      [InternalSystem.Neurological]: {
        ...perTarget[InternalSystem.Neurological],
        clampedContribution: postClampState[InternalSystem.Neurological],
      },
      [InternalSystem.Muscular]: {
        ...perTarget[InternalSystem.Muscular],
        clampedContribution: postClampState[InternalSystem.Muscular],
      },
      [InternalSystem.Cardiovascular]: {
        ...perTarget[InternalSystem.Cardiovascular],
        clampedContribution: postClampState[InternalSystem.Cardiovascular],
      },
    },
  };
}
