import {
  InternalSystem,
  type Rfc3339Timestamp,
  type SessionClass,
  type ThresholdWindow,
} from '@/domain';

import { LOCK_SPEC_CONFIG } from './config/lock-spec.config';
import type { OlbrechtLockSpecConfig } from './config/types';
import type {
  ContinuousSystemLoadVector,
  ContinuousSystemState,
  FatigueScaleBounds,
} from './foundation-types';

const RFC_3339_LOCAL_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function getFatigueScaleBounds(
  config: OlbrechtLockSpecConfig = LOCK_SPEC_CONFIG,
): FatigueScaleBounds {
  return config.foundation.fatigueScale;
}

export function clampToFatigueScale(
  value: number,
  bounds: FatigueScaleBounds = getFatigueScaleBounds(),
): number {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

export function createSystemState(
  factory: (system: InternalSystem) => number,
): ContinuousSystemState {
  return {
    neurological: factory(InternalSystem.Neurological),
    muscular: factory(InternalSystem.Muscular),
    cardiovascular: factory(InternalSystem.Cardiovascular),
  };
}

export function createSystemLoadVector(
  factory: (system: InternalSystem) => number,
): ContinuousSystemLoadVector {
  return {
    neurological: factory(InternalSystem.Neurological),
    muscular: factory(InternalSystem.Muscular),
    cardiovascular: factory(InternalSystem.Cardiovascular),
  };
}

export function clampSystemState(
  state: ContinuousSystemState,
  bounds: FatigueScaleBounds = getFatigueScaleBounds(),
): ContinuousSystemState {
  return createSystemState((system) => clampToFatigueScale(state[system], bounds));
}

export function sumNumbers(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function normalizePhasePosition(rawPosition: number): number {
  const wrapped = rawPosition % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

export function parseLocalTimestamp(
  timestamp: Rfc3339Timestamp,
): {
  localDate: string;
  localHour: number;
} {
  const match = RFC_3339_LOCAL_PATTERN.exec(timestamp);

  if (!match) {
    throw new Error(`Invalid RFC 3339 timestamp: ${timestamp}`);
  }

  const [, localDate, hoursText, minutesText, secondsText] = match;
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = Number(secondsText ?? '0');

  return {
    localDate,
    localHour: hours + minutes / 60 + seconds / 3600,
  };
}

export function parseClockHours(clock: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(clock);

  if (!match) {
    throw new Error(`Invalid clock string: ${clock}`);
  }

  const [, hoursText, minutesText] = match;
  return Number(hoursText) + Number(minutesText) / 60;
}

export function getDaysBetweenLocalDates(
  startDate: string,
  endDate: string,
): number {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  const startUtc = Date.UTC(startYear, startMonth - 1, startDay);
  const endUtc = Date.UTC(endYear, endMonth - 1, endDay);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return (endUtc - startUtc) / millisecondsPerDay;
}

export function getPolicyThresholdWindow(
  sessionClass: SessionClass,
  metric: string,
  config: OlbrechtLockSpecConfig = LOCK_SPEC_CONFIG,
): ThresholdWindow | undefined {
  const rule = config.classification.sessionClassPolicies[sessionClass].rules.find(
    (candidate) => candidate.metric === metric,
  );

  return rule?.range;
}

export function isWithinThresholdWindow(
  value: number,
  window: ThresholdWindow | undefined,
): boolean {
  if (!window) {
    return false;
  }

  if (window.minInclusive !== undefined && value < window.minInclusive) {
    return false;
  }

  if (window.maxInclusive !== undefined && value > window.maxInclusive) {
    return false;
  }

  return true;
}
