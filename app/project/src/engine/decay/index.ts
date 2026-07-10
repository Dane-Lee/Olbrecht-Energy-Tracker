import { InternalSystem, type Rfc3339Timestamp } from '@/domain';

import { LOCK_SPEC_CONFIG } from '../config/lock-spec.config';
import type { DecayEngineConfig } from '../config/types';
import type {
  ContinuousSystemState,
  FatigueScaleBounds,
} from '../foundation-types';
import {
  clampSystemState,
  createSystemState,
  getFatigueScaleBounds,
} from '../shared';

const HALF_LIFE_DECAY_BASE = 0.5;
const MINIMUM_POSITIVE_VALUE = Number.EPSILON;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const NO_ELAPSED_HOURS = 0;

export interface DecayTimestampInput {
  startTimestamp: Rfc3339Timestamp;
  endTimestamp: Rfc3339Timestamp;
}

export interface DecayInput {
  fatigueState: ContinuousSystemState;
  halfLifeBySystem: Readonly<Record<InternalSystem, number>>;
  elapsedHours?: number;
  elapsedTimestamps?: DecayTimestampInput;
  recentLoadModulationBySystem?: Readonly<Record<InternalSystem, number>>;
}

export interface DecaySystemDetail {
  startingFatigue: number;
  halfLifeDays: number;
  effectiveHalfLifeHours: number;
  recentLoadMultiplier: number;
  rawDecayedFatigue: number;
  clampedDecayedFatigue: number;
}

export interface DecayResult {
  elapsedHours: number;
  rawFatigueAfterDecay: ContinuousSystemState;
  fatigueAfterDecay: ContinuousSystemState;
  perSystem: Readonly<Record<InternalSystem, DecaySystemDetail>>;
}

export function getElapsedHoursFromTimestamps(
  input: DecayTimestampInput,
): number {
  const elapsedMilliseconds =
    new Date(input.endTimestamp).getTime() - new Date(input.startTimestamp).getTime();

  return Math.max(elapsedMilliseconds / MILLISECONDS_PER_HOUR, NO_ELAPSED_HOURS);
}

function resolveElapsedHours(input: DecayInput): number {
  if (input.elapsedHours !== undefined) {
    return Math.max(input.elapsedHours, NO_ELAPSED_HOURS);
  }

  if (input.elapsedTimestamps !== undefined) {
    return getElapsedHoursFromTimestamps(input.elapsedTimestamps);
  }

  throw new Error(
    'applyFatigueDecay requires either elapsedHours or elapsedTimestamps.',
  );
}

function getRecentLoadMultiplier(
  input: DecayInput,
  system: InternalSystem,
  config: DecayEngineConfig,
): number {
  if (
    !config.supportsRecentLoadModulation ||
    input.recentLoadModulationBySystem === undefined
  ) {
    return 1;
  }

  return Math.max(input.recentLoadModulationBySystem[system], MINIMUM_POSITIVE_VALUE);
}

export function applyFatigueDecay(
  input: DecayInput,
  config: DecayEngineConfig = LOCK_SPEC_CONFIG.foundation.decay,
  bounds: FatigueScaleBounds = getFatigueScaleBounds(),
): DecayResult {
  const elapsedHours = resolveElapsedHours(input);
  const rawFatigueAfterDecay = createSystemState((system) => {
    const recentLoadMultiplier = getRecentLoadMultiplier(input, system, config);
    const effectiveHalfLifeHours = Math.max(
      input.halfLifeBySystem[system] *
        config.hoursPerHalfLifeUnit *
        recentLoadMultiplier,
      MINIMUM_POSITIVE_VALUE,
    );

    return (
      input.fatigueState[system] *
      HALF_LIFE_DECAY_BASE ** (elapsedHours / effectiveHalfLifeHours)
    );
  });
  const fatigueAfterDecay = config.clampToFatigueScale
    ? clampSystemState(rawFatigueAfterDecay, bounds)
    : rawFatigueAfterDecay;

  return {
    elapsedHours,
    rawFatigueAfterDecay,
    fatigueAfterDecay,
    perSystem: {
      [InternalSystem.Neurological]: {
        startingFatigue: input.fatigueState[InternalSystem.Neurological],
        halfLifeDays: input.halfLifeBySystem[InternalSystem.Neurological],
        effectiveHalfLifeHours:
          input.halfLifeBySystem[InternalSystem.Neurological] *
          config.hoursPerHalfLifeUnit *
          getRecentLoadMultiplier(input, InternalSystem.Neurological, config),
        recentLoadMultiplier: getRecentLoadMultiplier(
          input,
          InternalSystem.Neurological,
          config,
        ),
        rawDecayedFatigue: rawFatigueAfterDecay[InternalSystem.Neurological],
        clampedDecayedFatigue: fatigueAfterDecay[InternalSystem.Neurological],
      },
      [InternalSystem.Muscular]: {
        startingFatigue: input.fatigueState[InternalSystem.Muscular],
        halfLifeDays: input.halfLifeBySystem[InternalSystem.Muscular],
        effectiveHalfLifeHours:
          input.halfLifeBySystem[InternalSystem.Muscular] *
          config.hoursPerHalfLifeUnit *
          getRecentLoadMultiplier(input, InternalSystem.Muscular, config),
        recentLoadMultiplier: getRecentLoadMultiplier(
          input,
          InternalSystem.Muscular,
          config,
        ),
        rawDecayedFatigue: rawFatigueAfterDecay[InternalSystem.Muscular],
        clampedDecayedFatigue: fatigueAfterDecay[InternalSystem.Muscular],
      },
      [InternalSystem.Cardiovascular]: {
        startingFatigue: input.fatigueState[InternalSystem.Cardiovascular],
        halfLifeDays: input.halfLifeBySystem[InternalSystem.Cardiovascular],
        effectiveHalfLifeHours:
          input.halfLifeBySystem[InternalSystem.Cardiovascular] *
          config.hoursPerHalfLifeUnit *
          getRecentLoadMultiplier(input, InternalSystem.Cardiovascular, config),
        recentLoadMultiplier: getRecentLoadMultiplier(
          input,
          InternalSystem.Cardiovascular,
          config,
        ),
        rawDecayedFatigue: rawFatigueAfterDecay[InternalSystem.Cardiovascular],
        clampedDecayedFatigue: fatigueAfterDecay[InternalSystem.Cardiovascular],
      },
    },
  };
}
