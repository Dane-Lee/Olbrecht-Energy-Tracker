import {
  IntensityDomain,
  InternalSystem,
  SessionClass,
  SyncPayloadType,
} from './enums';

export const APP_NAME = 'Olbrecht Energy Tracking System';

export const INTERNAL_SYSTEMS = [
  InternalSystem.Neurological,
  InternalSystem.Muscular,
  InternalSystem.Cardiovascular,
] as const;

export const FATIGUE_SCALE = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4] as const;

export const SESSION_CLASSES = [
  SessionClass.NeuralSprint,
  SessionClass.MusclePowerEndurance,
  SessionClass.AnaerobicCapacity,
  SessionClass.RacePace,
  SessionClass.AerobicBase,
  SessionClass.ThresholdAerobicPower,
  SessionClass.RecoveryTechnique,
] as const;

export const INTENSITY_DOMAINS = [
  IntensityDomain.Low,
  IntensityDomain.Moderate,
  IntensityDomain.Heavy,
  IntensityDomain.Severe,
  IntensityDomain.Extreme,
] as const;

export const SYNC_PAYLOAD_TYPES = [
  SyncPayloadType.AthleteUpsert,
  SyncPayloadType.SessionPlanUpsert,
  SyncPayloadType.SessionResponseUpsert,
  SyncPayloadType.DerivedMetricsUpsert,
  SyncPayloadType.ReadinessSnapshotUpsert,
  SyncPayloadType.RaceEventUpsert,
] as const;

export type FatigueLevel = (typeof FATIGUE_SCALE)[number];

export type UUID = string;
export type Rfc3339Timestamp = string;
export type LocalDate = string;
export type IanaTimeZone = string;
export type CoachFocusTag = string | readonly string[];

export type JsonPrimitive = string | number | boolean | null;
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface JsonArray extends ReadonlyArray<JsonValue> {}

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type SessionClassDistribution = Readonly<Record<SessionClass, number>>;
export type IntensityDomainDistribution = Readonly<Record<IntensityDomain, number>>;
export type SystemLoadVector = Readonly<Record<InternalSystem, number>>;
export type SystemFatigueState = Readonly<Record<InternalSystem, FatigueLevel>>;

export interface ThresholdWindow {
  minInclusive?: number;
  maxInclusive?: number;
  unit: string;
  note?: string;
}

export interface FormulaDescriptor {
  id: string;
  summary: string;
  expression: string;
  inputs: readonly string[];
  output: string;
  notes: readonly string[];
}

export interface PiecewiseCurveSegment {
  minInclusive: number;
  maxInclusive?: number;
  outputAtMin: number;
  outputAtMax: number;
}

export interface PiecewiseCurveDefinition {
  id: string;
  inputUnit: string;
  outputUnit: string;
  segments: readonly PiecewiseCurveSegment[];
  clampMinOutput?: number;
  clampMaxOutput?: number;
}
