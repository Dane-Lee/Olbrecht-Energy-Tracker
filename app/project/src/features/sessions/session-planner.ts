import {
  InternalSystem,
  ReadinessCategory,
  SessionClass,
} from '@/domain';
import {
  type SessionModulationResult,
  modulateSessionTargets,
} from '@/engine';

export interface SessionPlannerInput {
  intendedSessionClass: SessionClass;
  plannedDistanceMeters: number;
  globalReadinessCategory: ReadinessCategory;
  systemReadinessCategory: Readonly<Record<InternalSystem, ReadinessCategory>>;
  daysSinceLastAnaerobicPower?: number;
  anaerobicPowerTolerant?: boolean;
  daysToRace?: number;
  evaluatedAt?: Date;
}

export interface SessionPlannerRecommendation {
  modulation: SessionModulationResult;
  adjustedDistanceMeters: number;
}

export function createSessionPlannerRecommendation(
  input: SessionPlannerInput,
): SessionPlannerRecommendation {
  const evaluatedAt = input.evaluatedAt ?? new Date();
  const timestamp = evaluatedAt.toISOString();
  const modulation = modulateSessionTargets({
    intendedSessionClass: input.intendedSessionClass,
    snapshot: {
      globalReadinessCategory: input.globalReadinessCategory,
      systemReadinessCategory: input.systemReadinessCategory,
      snapshotDate: timestamp.slice(0, 10),
      createdAt: timestamp,
    },
    daysSinceLastAnaerobicPower: input.daysSinceLastAnaerobicPower,
    anaerobicPowerTolerant: input.anaerobicPowerTolerant,
    daysToRace: input.daysToRace,
  });

  return {
    modulation,
    adjustedDistanceMeters: Math.max(
      0,
      Math.round(input.plannedDistanceMeters * modulation.volumeScale),
    ),
  };
}
