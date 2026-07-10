/**
 * Readiness modulation — Swim State Pro readiness modulates this app's
 * session targets (milestone oet-consume-readiness-modulation; the
 * engineering lock's core mandate).
 *
 * Inputs are ecosystem ReadinessSnapshotUpsert payloads pulled from the hub
 * (produced by Swim State Pro). The contract guarantees per-system and global
 * green/yellow/orange/red categories from every producer, so modulation is
 * driven entirely off categories — no producer-specific score math leaks in.
 *
 * Rule order (mirrors the recommendation decision order and Master Mind
 * ecosystem rules 11–12):
 *   1. Taper protection (race ≤ 21 days) caps volume and blocks class swaps
 *      that would ADD load, never intensity (taper maintains intensity).
 *   2. Anaerobic-power spacing: NeuralSprint / MusclePowerEndurance at most
 *      once per 6 days (4 if the athlete is MPE-tolerant).
 *   3. Dominant-system suppression: the class's highest load-fraction system
 *      gates harder than the global category.
 *   4. Global category banding: green maintain / yellow tighten /
 *      orange reduce / red swap-to-recovery.
 */
import type { ReadinessSnapshotUpsertPayload } from '@/domain';
import {
  InternalSystem,
  ReadinessCategory,
  RecommendationCode,
  SessionClass,
  WarningCode,
} from '@/domain';
import { LOCK_SPEC_CONFIG } from '../config/lock-spec.config';

export interface ModulationContext {
  intendedSessionClass: SessionClass;
  snapshot: Pick<
    ReadinessSnapshotUpsertPayload,
    'systemReadinessCategory' | 'globalReadinessCategory' | 'snapshotDate' | 'createdAt'
  >;
  /** Days since the last NeuralSprint or MusclePowerEndurance session. */
  daysSinceLastAnaerobicPower?: number;
  /** ≥5/6 recent MPE sessions returned to green within 48h (lock tolerance rule). */
  anaerobicPowerTolerant?: boolean;
  /** Days until the next race; ≤21 activates taper precedence (rule 12). */
  daysToRace?: number;
}

export interface SessionModulationResult {
  recommendedSessionClass: SessionClass;
  /** Multiplier for planned total volume (1 = unchanged). */
  volumeScale: number;
  /** Multiplier for planned rest durations (1 = unchanged). */
  restScale: number;
  intensityGuidance: 'maintain' | 'cap' | 'reduce';
  recommendationCode: RecommendationCode;
  warnings: readonly WarningCode[];
  /** Every applied rule, in application order, for coach-facing audit. */
  rationale: readonly string[];
}

const CATEGORY_SEVERITY: Readonly<Record<ReadinessCategory, number>> = {
  [ReadinessCategory.Green]: 0,
  [ReadinessCategory.Yellow]: 1,
  [ReadinessCategory.Orange]: 2,
  [ReadinessCategory.Red]: 3,
};

/** Where a class falls back to when its demand cannot be met safely. */
const CLASS_DOWNGRADE: Readonly<Record<SessionClass, SessionClass>> = {
  [SessionClass.NeuralSprint]: SessionClass.RecoveryTechnique,
  [SessionClass.MusclePowerEndurance]: SessionClass.RecoveryTechnique,
  [SessionClass.AnaerobicCapacity]: SessionClass.AerobicBase,
  [SessionClass.RacePace]: SessionClass.AerobicBase,
  [SessionClass.ThresholdAerobicPower]: SessionClass.AerobicBase,
  [SessionClass.AerobicBase]: SessionClass.RecoveryTechnique,
  [SessionClass.RecoveryTechnique]: SessionClass.RecoveryTechnique,
};

const ANAEROBIC_POWER_CLASSES: readonly SessionClass[] = [
  SessionClass.NeuralSprint,
  SessionClass.MusclePowerEndurance,
];

export function dominantSystemForClass(sessionClass: SessionClass): InternalSystem {
  const allocation = LOCK_SPEC_CONFIG.loadModel.defaultLoadAllocationByClass[sessionClass];
  const fractions = allocation.loadFractions;

  let dominant = InternalSystem.Neurological;
  let best = -Infinity;
  for (const system of Object.values(InternalSystem)) {
    const fraction = fractions[system] ?? 0;
    if (fraction > best) {
      best = fraction;
      dominant = system;
    }
  }
  return dominant;
}

/**
 * Load-weighted suppression 0..3: how hard the snapshot's per-system
 * categories press on THIS class's load distribution.
 */
export function loadWeightedSuppression(
  sessionClass: SessionClass,
  categories: ReadinessSnapshotUpsertPayload['systemReadinessCategory'],
): number {
  const fractions =
    LOCK_SPEC_CONFIG.loadModel.defaultLoadAllocationByClass[sessionClass].loadFractions;

  let suppression = 0;
  for (const system of Object.values(InternalSystem)) {
    suppression += (fractions[system] ?? 0) * CATEGORY_SEVERITY[categories[system]];
  }
  return suppression;
}

export function modulateSessionTargets(context: ModulationContext): SessionModulationResult {
  const { intendedSessionClass, snapshot } = context;
  const rationale: string[] = [];
  const warnings: WarningCode[] = [];

  const inTaper = context.daysToRace !== undefined && context.daysToRace <= 21;
  const globalCategory = snapshot.globalReadinessCategory;
  const dominantSystem = dominantSystemForClass(intendedSessionClass);
  const dominantCategory = snapshot.systemReadinessCategory[dominantSystem];

  // The class is gated by the worse of (global, dominant-system) category.
  const gating =
    CATEGORY_SEVERITY[dominantCategory] > CATEGORY_SEVERITY[globalCategory]
      ? dominantCategory
      : globalCategory;
  if (gating !== globalCategory) {
    rationale.push(
      `Dominant system for ${intendedSessionClass} (${dominantSystem}) is ${dominantCategory}, gating harder than global ${globalCategory}.`,
    );
  }

  let recommendedSessionClass = intendedSessionClass;
  let volumeScale = 1;
  let restScale = 1;
  let intensityGuidance: SessionModulationResult['intensityGuidance'] = 'maintain';
  let recommendationCode = RecommendationCode.MaintainLoad;

  switch (gating) {
    case ReadinessCategory.Green:
      rationale.push('Readiness green: maintain planned targets.');
      break;
    case ReadinessCategory.Yellow:
      volumeScale = 0.9;
      restScale = 1.1;
      intensityGuidance = 'cap';
      recommendationCode = RecommendationCode.TightenLoad;
      rationale.push('Readiness yellow: tighten execution — trim volume 10%, extend rest 10%, cap intensity.');
      break;
    case ReadinessCategory.Orange:
      volumeScale = 0.75;
      restScale = 1.25;
      intensityGuidance = 'reduce';
      recommendationCode = RecommendationCode.ReduceLoad;
      rationale.push('Readiness orange: reduce — volume to 75%, rest +25%, intensity reduced.');
      break;
    case ReadinessCategory.Red:
      recommendedSessionClass = CLASS_DOWNGRADE[intendedSessionClass];
      volumeScale = 0.6;
      restScale = 1.5;
      intensityGuidance = 'reduce';
      recommendationCode = RecommendationCode.ScheduleRecoveryTechnique;
      rationale.push(
        recommendedSessionClass === intendedSessionClass
          ? 'Readiness red: hold recovery-technique focus at reduced volume.'
          : `Readiness red: swap ${intendedSessionClass} → ${recommendedSessionClass}, volume to 60%.`,
      );
      break;
  }

  // Anaerobic-power spacing (lock warning trigger 2). Applies to the class
  // that would actually be swum, after any red-swap above.
  if (ANAEROBIC_POWER_CLASSES.includes(recommendedSessionClass)) {
    const minimumSpacingDays = context.anaerobicPowerTolerant ? 4 : 6;
    if (
      context.daysSinceLastAnaerobicPower !== undefined &&
      context.daysSinceLastAnaerobicPower < minimumSpacingDays
    ) {
      recommendedSessionClass = SessionClass.RecoveryTechnique;
      volumeScale = Math.min(volumeScale, 0.75);
      restScale = Math.max(restScale, 1.25);
      intensityGuidance = 'reduce';
      recommendationCode = RecommendationCode.AdjustRestStructure;
      warnings.push(WarningCode.MusclePowerEnduranceFrequency);
      rationale.push(
        `Anaerobic-power spacing violated (${context.daysSinceLastAnaerobicPower} < ${minimumSpacingDays} days): swapped to recovery technique.`,
      );
    }
  }

  // Taper precedence (ecosystem rule 12): protect the taper — volume stays
  // reduced, intensity is NEVER reduced by readiness alone, and class swaps
  // to a HIGHER-volume class are blocked.
  if (inTaper) {
    volumeScale = Math.min(volumeScale, 0.85);
    if (gating !== ReadinessCategory.Red && intensityGuidance === 'reduce') {
      intensityGuidance = 'cap';
      rationale.push('Taper window: intensity maintained/capped rather than reduced (taper keeps intensity).');
    }
    if (
      recommendedSessionClass === SessionClass.AerobicBase &&
      intendedSessionClass !== SessionClass.AerobicBase
    ) {
      // A base-volume swap during taper would ADD aerobic volume — prefer
      // recovery technique to protect the taper's volume drop.
      recommendedSessionClass = SessionClass.RecoveryTechnique;
      rationale.push('Taper window: downgraded swap re-routed to recovery technique to protect volume reduction.');
    }
    recommendationCode = RecommendationCode.ProtectTaper;
    rationale.push('Race within 21 days: taper protection applied (volume capped at 85% of plan).');
  }

  return {
    recommendedSessionClass,
    volumeScale,
    restScale,
    intensityGuidance,
    recommendationCode,
    warnings,
    rationale,
  };
}
