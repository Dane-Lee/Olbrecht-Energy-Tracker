import { InternalSystem } from '@/domain';

import { LOCK_SPEC_CONFIG } from '../config/lock-spec.config';
import type { AccumulationEngineConfig } from '../config/types';
import type {
  ContinuousSystemLoadVector,
  ContinuousSystemState,
  FatigueScaleBounds,
} from '../foundation-types';
import {
  clampSystemState,
  createSystemLoadVector,
  createSystemState,
  getFatigueScaleBounds,
} from '../shared';

export interface AccumulationInput {
  currentFatigueState: ContinuousSystemState;
  rawSystemLoad: ContinuousSystemLoadVector;
  sensitivityBySystem: ContinuousSystemLoadVector;
}

export interface AccumulationSystemDetail {
  startingFatigue: number;
  rawLoad: number;
  sensitivity: number;
  weightedLoad: number;
  availableHeadroom: number;
  delta: number;
  preClampFatigue: number;
  finalFatigue: number;
}

export interface AccumulationResult {
  startingFatigueState: ContinuousSystemState;
  rawSystemLoad: ContinuousSystemLoadVector;
  availableHeadroom: ContinuousSystemLoadVector;
  weightedSystemLoad: ContinuousSystemLoadVector;
  delta: ContinuousSystemState;
  preClampFatigueState: ContinuousSystemState;
  finalFatigueState: ContinuousSystemState;
  perSystem: Readonly<Record<InternalSystem, AccumulationSystemDetail>>;
}

function getAvailableHeadroom(
  currentFatigue: number,
  weightedLoad: number,
  bounds: FatigueScaleBounds,
): number {
  if (weightedLoad > 0) {
    return Math.max(bounds.max - currentFatigue, 0);
  }

  if (weightedLoad < 0) {
    return Math.max(currentFatigue - bounds.min, 0);
  }

  return 0;
}

function getFatigueDelta(
  currentFatigue: number,
  weightedLoad: number,
  bounds: FatigueScaleBounds,
  config: AccumulationEngineConfig,
): number {
  const availableHeadroom = getAvailableHeadroom(currentFatigue, weightedLoad, bounds);

  if (availableHeadroom === 0 || weightedLoad === 0) {
    return 0;
  }

  if (config.nonlinearStrategy !== 'boundedHeadroomExponential') {
    throw new Error(
      `Unsupported accumulation strategy: ${config.nonlinearStrategy}`,
    );
  }

  return (
    Math.sign(weightedLoad) *
    availableHeadroom *
    (1 - Math.exp(-Math.abs(weightedLoad) / availableHeadroom))
  );
}

export function applyFatigueAccumulation(
  input: AccumulationInput,
  config: AccumulationEngineConfig = LOCK_SPEC_CONFIG.foundation.accumulation,
  bounds: FatigueScaleBounds = getFatigueScaleBounds(),
): AccumulationResult {
  const startingFatigueState = clampSystemState(input.currentFatigueState, bounds);
  const weightedSystemLoad = createSystemLoadVector(
    (system) => input.rawSystemLoad[system] * input.sensitivityBySystem[system],
  );
  const availableHeadroom = createSystemLoadVector((system) =>
    getAvailableHeadroom(
      startingFatigueState[system],
      weightedSystemLoad[system],
      bounds,
    ),
  );
  const delta = createSystemState((system) =>
    getFatigueDelta(
      startingFatigueState[system],
      weightedSystemLoad[system],
      bounds,
      config,
    ),
  );
  const preClampFatigueState = createSystemState(
    (system) => startingFatigueState[system] + delta[system],
  );
  const finalFatigueState = config.clampToFatigueScale
    ? clampSystemState(preClampFatigueState, bounds)
    : preClampFatigueState;

  return {
    startingFatigueState,
    rawSystemLoad: input.rawSystemLoad,
    availableHeadroom,
    weightedSystemLoad,
    delta,
    preClampFatigueState,
    finalFatigueState,
    perSystem: {
      [InternalSystem.Neurological]: {
        startingFatigue: startingFatigueState[InternalSystem.Neurological],
        rawLoad: input.rawSystemLoad[InternalSystem.Neurological],
        sensitivity: input.sensitivityBySystem[InternalSystem.Neurological],
        weightedLoad: weightedSystemLoad[InternalSystem.Neurological],
        availableHeadroom: availableHeadroom[InternalSystem.Neurological],
        delta: delta[InternalSystem.Neurological],
        preClampFatigue: preClampFatigueState[InternalSystem.Neurological],
        finalFatigue: finalFatigueState[InternalSystem.Neurological],
      },
      [InternalSystem.Muscular]: {
        startingFatigue: startingFatigueState[InternalSystem.Muscular],
        rawLoad: input.rawSystemLoad[InternalSystem.Muscular],
        sensitivity: input.sensitivityBySystem[InternalSystem.Muscular],
        weightedLoad: weightedSystemLoad[InternalSystem.Muscular],
        availableHeadroom: availableHeadroom[InternalSystem.Muscular],
        delta: delta[InternalSystem.Muscular],
        preClampFatigue: preClampFatigueState[InternalSystem.Muscular],
        finalFatigue: finalFatigueState[InternalSystem.Muscular],
      },
      [InternalSystem.Cardiovascular]: {
        startingFatigue: startingFatigueState[InternalSystem.Cardiovascular],
        rawLoad: input.rawSystemLoad[InternalSystem.Cardiovascular],
        sensitivity: input.sensitivityBySystem[InternalSystem.Cardiovascular],
        weightedLoad: weightedSystemLoad[InternalSystem.Cardiovascular],
        availableHeadroom: availableHeadroom[InternalSystem.Cardiovascular],
        delta: delta[InternalSystem.Cardiovascular],
        preClampFatigue: preClampFatigueState[InternalSystem.Cardiovascular],
        finalFatigue: finalFatigueState[InternalSystem.Cardiovascular],
      },
    },
  };
}
