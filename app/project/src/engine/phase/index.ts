import type {
  IanaTimeZone,
  LocalDate,
  Rfc3339Timestamp,
  RhythmProfile,
} from '@/domain';

import { LOCK_SPEC_CONFIG } from '../config/lock-spec.config';
import type { PhaseEngineConfig, PhaseLookupStrategy } from '../config/types';
import {
  getDaysBetweenLocalDates,
  normalizePhasePosition,
  parseClockHours,
  parseLocalTimestamp,
} from '../shared';

const MINUTES_PER_HOUR = 60;
const FULL_CYCLE = 1;
const PERCENT_SCALE = 100;
const ZERO_MODIFIER_PERCENT = 0;

export interface LocalTimestampInput {
  timestamp: Rfc3339Timestamp;
  timeZone?: IanaTimeZone;
}

export interface LocalTimestampBreakdown {
  localDate: LocalDate;
  localHour: number;
  timeZone?: IanaTimeZone;
}

export interface RhythmLookupPoint {
  phasePosition: number;
  modifierPercent: number;
}

export interface CircadianModifierInput {
  peakLocalTime: string;
  amplitudePercent: number;
  chronotypeOffsetMinutes?: number;
  lookupStrategy?: PhaseLookupStrategy;
  lookupTable?: readonly RhythmLookupPoint[];
}

export interface InfradianModifierInput {
  anchorDate: LocalDate;
  cycleLengthDays: number;
  amplitudePercent: number;
  phaseShiftDays?: number;
  lookupStrategy?: PhaseLookupStrategy;
  lookupTable?: readonly RhythmLookupPoint[];
}

export interface RhythmProfileCircadianInput extends LocalTimestampInput {
  rhythmProfile: RhythmProfile;
  lookupStrategy?: PhaseLookupStrategy;
  lookupTable?: readonly RhythmLookupPoint[];
}

export interface RhythmProfileInfradianInput extends LocalTimestampInput {
  rhythmProfile: RhythmProfile;
  infradianState?: InfradianModifierInput;
  lookupStrategy?: PhaseLookupStrategy;
  lookupTable?: readonly RhythmLookupPoint[];
}

export interface CombinedRhythmModifierInput extends LocalTimestampInput {
  circadian: CircadianModifierInput;
  infradian?: InfradianModifierInput;
}

export interface CombinedRhythmProfileModifierInput
  extends RhythmProfileCircadianInput {
  infradianState?: InfradianModifierInput;
  infradianLookupStrategy?: PhaseLookupStrategy;
  infradianLookupTable?: readonly RhythmLookupPoint[];
}

export interface PhaseModifierResult {
  phasePosition: number;
  modifierPercent: number;
  lookupStrategy: PhaseLookupStrategy;
}

export interface CircadianRhythmModifierResult
  extends LocalTimestampBreakdown,
    PhaseModifierResult {
  peakLocalTime: string;
  amplitudePercent: number;
  chronotypeOffsetMinutes: number;
}

export interface InfradianRhythmModifierResult extends LocalTimestampBreakdown {
  phasePosition: number | null;
  modifierPercent: number;
  lookupStrategy: PhaseLookupStrategy;
  tracked: boolean;
  anchorDate: LocalDate | null;
  cycleLengthDays: number | null;
  phaseShiftDays: number;
  amplitudePercent: number;
}

export interface CombinedRhythmModifierResult extends LocalTimestampBreakdown {
  circadianPhasePosition: number;
  infradianPhasePosition: number | null;
  circadianModifierPercent: number;
  infradianModifierPercent: number;
  combinedModifierPercent: number;
}

export interface CombinedRhythmProfileModifierResult
  extends CombinedRhythmModifierResult {
  circadianLookupStrategy: PhaseLookupStrategy;
  infradianLookupStrategy: PhaseLookupStrategy;
  infradianTracked: boolean;
}

function normalizeLookupStrategy(
  lookupStrategy: PhaseLookupStrategy | undefined,
  phaseConfig: PhaseEngineConfig,
): PhaseLookupStrategy {
  return lookupStrategy ?? phaseConfig.defaultLookupStrategy;
}

function interpolateLookupTable(
  phasePosition: number,
  lookupTable: readonly RhythmLookupPoint[],
): number {
  if (lookupTable.length === 0) {
    return ZERO_MODIFIER_PERCENT;
  }

  const sorted = [...lookupTable].sort(
    (left, right) => left.phasePosition - right.phasePosition,
  );
  const normalizedPhase = normalizePhasePosition(phasePosition);
  const wrappedPoints = [
    ...sorted,
    {
      phasePosition: sorted[0].phasePosition + FULL_CYCLE,
      modifierPercent: sorted[0].modifierPercent,
    },
  ];

  for (let index = 0; index < wrappedPoints.length - 1; index += 1) {
    const current = wrappedPoints[index];
    const next = wrappedPoints[index + 1];
    const adjustedPhase =
      normalizedPhase < current.phasePosition
        ? normalizedPhase + FULL_CYCLE
        : normalizedPhase;

    if (
      adjustedPhase >= current.phasePosition &&
      adjustedPhase <= next.phasePosition
    ) {
      const span = next.phasePosition - current.phasePosition;

      if (span === ZERO_MODIFIER_PERCENT) {
        return current.modifierPercent;
      }

      const progress = (adjustedPhase - current.phasePosition) / span;
      return (
        current.modifierPercent +
        (next.modifierPercent - current.modifierPercent) * progress
      );
    }
  }

  return sorted[sorted.length - 1].modifierPercent;
}

function lookupModifierPercent(
  phasePosition: number,
  amplitudePercent: number,
  lookupStrategy: PhaseLookupStrategy,
  lookupTable?: readonly RhythmLookupPoint[],
): number {
  if (lookupStrategy === 'table' && lookupTable !== undefined && lookupTable.length > 0) {
    return interpolateLookupTable(phasePosition, lookupTable);
  }

  return (
    amplitudePercent * Math.cos(2 * Math.PI * normalizePhasePosition(phasePosition))
  );
}

function combineModifierPercents(
  circadianModifierPercent: number,
  infradianModifierPercent: number,
  phaseConfig: PhaseEngineConfig,
): number {
  if (phaseConfig.combinationStrategy !== 'multiplicativePercent') {
    throw new Error(
      `Unsupported modifier combination strategy: ${phaseConfig.combinationStrategy}`,
    );
  }

  return (
    ((1 + circadianModifierPercent / PERCENT_SCALE) *
      (1 + infradianModifierPercent / PERCENT_SCALE) -
      1) *
    PERCENT_SCALE
  );
}

export function extractLocalTimestampContext(
  timestampOrInput: Rfc3339Timestamp | LocalTimestampInput,
): LocalTimestampBreakdown {
  const input =
    typeof timestampOrInput === 'string'
      ? { timestamp: timestampOrInput }
      : timestampOrInput;
  const { localDate, localHour } = parseLocalTimestamp(input.timestamp);

  return {
    localDate,
    localHour,
    timeZone: input.timeZone,
  };
}

export function extractLocalHour(
  timestampOrInput: Rfc3339Timestamp | LocalTimestampInput,
): number {
  return extractLocalTimestampContext(timestampOrInput).localHour;
}

export function extractLocalDate(
  timestampOrInput: Rfc3339Timestamp | LocalTimestampInput,
): LocalDate {
  return extractLocalTimestampContext(timestampOrInput).localDate;
}

export function getCircadianPhasePosition(
  localHour: number,
  peakLocalTime: string,
  phaseConfig: PhaseEngineConfig = LOCK_SPEC_CONFIG.foundation.phase,
  chronotypeOffsetMinutes = 0,
): number {
  const peakHour =
    parseClockHours(peakLocalTime) + chronotypeOffsetMinutes / MINUTES_PER_HOUR;

  return normalizePhasePosition(
    (localHour - peakHour) / phaseConfig.circadianCycleHours,
  );
}

export function getInfradianPhasePosition(
  localDate: LocalDate,
  anchorDate: LocalDate,
  cycleLengthDays: number,
  phaseShiftDays = 0,
): number {
  if (cycleLengthDays <= ZERO_MODIFIER_PERCENT) {
    throw new Error('cycleLengthDays must be greater than zero.');
  }

  const elapsedDays = getDaysBetweenLocalDates(anchorDate, localDate) - phaseShiftDays;
  return normalizePhasePosition(elapsedDays / cycleLengthDays);
}

export function getCircadianModifier(
  localHour: number,
  circadian: CircadianModifierInput,
  phaseConfig: PhaseEngineConfig = LOCK_SPEC_CONFIG.foundation.phase,
): PhaseModifierResult {
  const lookupStrategy = normalizeLookupStrategy(
    circadian.lookupStrategy,
    phaseConfig,
  );
  const phasePosition = getCircadianPhasePosition(
    localHour,
    circadian.peakLocalTime,
    phaseConfig,
    circadian.chronotypeOffsetMinutes ?? ZERO_MODIFIER_PERCENT,
  );

  return {
    phasePosition,
    modifierPercent: lookupModifierPercent(
      phasePosition,
      circadian.amplitudePercent,
      lookupStrategy,
      circadian.lookupTable,
    ),
    lookupStrategy,
  };
}

export const lookupCircadianModifier = getCircadianModifier;

export function getInfradianModifier(
  localDate: LocalDate,
  infradian: InfradianModifierInput,
  phaseConfig: PhaseEngineConfig = LOCK_SPEC_CONFIG.foundation.phase,
): PhaseModifierResult {
  const lookupStrategy = normalizeLookupStrategy(
    infradian.lookupStrategy,
    phaseConfig,
  );
  const phasePosition = getInfradianPhasePosition(
    localDate,
    infradian.anchorDate,
    infradian.cycleLengthDays,
    infradian.phaseShiftDays ?? ZERO_MODIFIER_PERCENT,
  );

  return {
    phasePosition,
    modifierPercent: lookupModifierPercent(
      phasePosition,
      infradian.amplitudePercent,
      lookupStrategy,
      infradian.lookupTable,
    ),
    lookupStrategy,
  };
}

export const lookupInfradianModifier = getInfradianModifier;

export function getCircadianModifierFromRhythmProfile(
  input: RhythmProfileCircadianInput,
  phaseConfig: PhaseEngineConfig = LOCK_SPEC_CONFIG.foundation.phase,
): CircadianRhythmModifierResult {
  const breakdown = extractLocalTimestampContext(input);
  const modifier = getCircadianModifier(
    breakdown.localHour,
    {
      peakLocalTime: input.rhythmProfile.circadianPeakLocalTime,
      amplitudePercent: input.rhythmProfile.circadianAmplitudePercent,
      chronotypeOffsetMinutes: input.rhythmProfile.chronotypeOffsetMinutes,
      lookupStrategy: input.lookupStrategy,
      lookupTable: input.lookupTable,
    },
    phaseConfig,
  );

  return {
    ...breakdown,
    ...modifier,
    peakLocalTime: input.rhythmProfile.circadianPeakLocalTime,
    amplitudePercent: input.rhythmProfile.circadianAmplitudePercent,
    chronotypeOffsetMinutes:
      input.rhythmProfile.chronotypeOffsetMinutes ?? ZERO_MODIFIER_PERCENT,
  };
}

export function getInfradianModifierFromRhythmProfile(
  input: RhythmProfileInfradianInput,
  phaseConfig: PhaseEngineConfig = LOCK_SPEC_CONFIG.foundation.phase,
): InfradianRhythmModifierResult {
  const breakdown = extractLocalTimestampContext(input);
  const lookupStrategy = normalizeLookupStrategy(input.lookupStrategy, phaseConfig);

  if (
    !input.rhythmProfile.infradianTrackingEnabled ||
    input.infradianState === undefined
  ) {
    return {
      ...breakdown,
      phasePosition: null,
      modifierPercent: ZERO_MODIFIER_PERCENT,
      lookupStrategy,
      tracked: false,
      anchorDate: null,
      cycleLengthDays: null,
      phaseShiftDays: ZERO_MODIFIER_PERCENT,
      amplitudePercent: ZERO_MODIFIER_PERCENT,
    };
  }

  const modifier = getInfradianModifier(
    breakdown.localDate,
    {
      ...input.infradianState,
      lookupStrategy,
      lookupTable: input.lookupTable,
    },
    phaseConfig,
  );

  return {
    ...breakdown,
    phasePosition: modifier.phasePosition,
    modifierPercent: modifier.modifierPercent,
    lookupStrategy: modifier.lookupStrategy,
    tracked: true,
    anchorDate: input.infradianState.anchorDate,
    cycleLengthDays: input.infradianState.cycleLengthDays,
    phaseShiftDays:
      input.infradianState.phaseShiftDays ?? ZERO_MODIFIER_PERCENT,
    amplitudePercent: input.infradianState.amplitudePercent,
  };
}

export function getCombinedRhythmModifier(
  input: CombinedRhythmModifierInput,
  phaseConfig: PhaseEngineConfig = LOCK_SPEC_CONFIG.foundation.phase,
): CombinedRhythmModifierResult {
  const breakdown = extractLocalTimestampContext(input);
  const circadian = getCircadianModifier(
    breakdown.localHour,
    input.circadian,
    phaseConfig,
  );
  const infradian = input.infradian
    ? getInfradianModifier(breakdown.localDate, input.infradian, phaseConfig)
    : undefined;
  const infradianModifierPercent =
    infradian?.modifierPercent ?? ZERO_MODIFIER_PERCENT;

  return {
    ...breakdown,
    circadianPhasePosition: circadian.phasePosition,
    infradianPhasePosition: infradian?.phasePosition ?? null,
    circadianModifierPercent: circadian.modifierPercent,
    infradianModifierPercent,
    combinedModifierPercent: combineModifierPercents(
      circadian.modifierPercent,
      infradianModifierPercent,
      phaseConfig,
    ),
  };
}

export function getCombinedRhythmModifierFromRhythmProfile(
  input: CombinedRhythmProfileModifierInput,
  phaseConfig: PhaseEngineConfig = LOCK_SPEC_CONFIG.foundation.phase,
): CombinedRhythmProfileModifierResult {
  const circadian = getCircadianModifierFromRhythmProfile(input, phaseConfig);
  const infradian = getInfradianModifierFromRhythmProfile(
    {
      timestamp: input.timestamp,
      timeZone: input.timeZone,
      rhythmProfile: input.rhythmProfile,
      infradianState: input.infradianState,
      lookupStrategy: input.infradianLookupStrategy,
      lookupTable: input.infradianLookupTable,
    },
    phaseConfig,
  );

  return {
    localDate: circadian.localDate,
    localHour: circadian.localHour,
    timeZone: circadian.timeZone,
    circadianPhasePosition: circadian.phasePosition,
    infradianPhasePosition: infradian.phasePosition,
    circadianModifierPercent: circadian.modifierPercent,
    infradianModifierPercent: infradian.modifierPercent,
    combinedModifierPercent: combineModifierPercents(
      circadian.modifierPercent,
      infradian.modifierPercent,
      phaseConfig,
    ),
    circadianLookupStrategy: circadian.lookupStrategy,
    infradianLookupStrategy: infradian.lookupStrategy,
    infradianTracked: infradian.tracked,
  };
}
