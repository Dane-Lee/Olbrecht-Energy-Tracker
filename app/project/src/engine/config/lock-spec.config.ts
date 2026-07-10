import {
  APP_NAME,
  FATIGUE_SCALE,
  INTENSITY_DOMAINS,
  INTERNAL_SYSTEMS,
  SESSION_CLASSES,
  SYNC_PAYLOAD_TYPES,
  CalibrationMode,
  IntensityDomain,
  InternalSystem,
  MismatchBand,
  MismatchComponent,
  PaceAnchorType,
  ReadinessCategory,
  RecommendationConstraint,
  SessionClass,
} from '@/domain';
import type { FormulaDescriptor, PiecewiseCurveDefinition } from '@/domain';

import type {
  DataQualityPenalty,
  LoadAllocationConfig,
  MismatchBandConfig,
  OlbrechtLockSpecConfig,
  RacePaceLoadAllocationVariant,
  RecommendationStageConfig,
  SessionClassPolicy,
  WarningTriggerConfig,
} from './types';
import { ThresholdComparator } from './types';

export const ENGINE_VERSION = '0.1.0';
export const CONFIG_VERSION = 'lock-spec-v1';
export const SYNC_SCHEMA_VERSION = '1.0.0';
export const PAYLOAD_SCHEMA_VERSION = '1.0.0';

const mismatchBands: readonly MismatchBandConfig[] = [
  {
    band: MismatchBand.Low,
    maxInclusive: 24.999,
  },
  {
    band: MismatchBand.Moderate,
    minInclusive: 25,
    maxInclusive: 50,
  },
  {
    band: MismatchBand.High,
    minInclusive: 50.001,
    maxInclusive: 70,
  },
  {
    band: MismatchBand.Critical,
    minInclusive: 70.001,
  },
] as const;

const sessionClassPolicies: Readonly<Record<SessionClass, SessionClassPolicy>> = {
  [SessionClass.NeuralSprint]: {
    sessionClass: SessionClass.NeuralSprint,
    purpose: 'Neural and phosphagen emphasis.',
    detectionSummary:
      'Very short maximal work with long recovery, low sprint volume, and tight rep retention.',
    rules: [
      {
        metric: 'workIntervalDurationSeconds',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 6, maxInclusive: 15, unit: 'seconds' },
        notes: ['Alternative machine-ready distance window is 10 to 25 meters.'],
      },
      {
        metric: 'repeatDistanceMeters',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 10, maxInclusive: 25, unit: 'meters' },
        notes: ['Distance qualifier when interval timing is not available.'],
      },
      {
        metric: 'restToWorkRatio',
        comparator: ThresholdComparator.AtLeast,
        range: { minInclusive: 6, unit: 'ratio' },
        notes: ['Rest is usually 60 to 180 seconds.'],
      },
      {
        metric: 'mainSetSprintVolumeMeters',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 50, maxInclusive: 300, unit: 'meters' },
        notes: ['Bounded sprint volume is part of the canonical class signature.'],
      },
      {
        metric: 'bestRepRetentionPercent',
        comparator: ThresholdComparator.AtMost,
        range: { maxInclusive: 3, unit: 'percent' },
        notes: ['Best rep retention must remain within 3 percent of fastest rep.'],
      },
    ],
  },
  [SessionClass.MusclePowerEndurance]: {
    sessionClass: SessionClass.MusclePowerEndurance,
    purpose: 'Maximal speed under limited recovery.',
    detectionSummary:
      'Short maximal repeats with compressed rest and bounded anaerobic-power volume.',
    rules: [
      {
        metric: 'repeatDistanceMeters',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 25, maxInclusive: 50, unit: 'meters' },
        notes: ['The lock spec allows occasional 75 meter repeats for advanced blocks.'],
      },
      {
        metric: 'restSeconds',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 5, maxInclusive: 15, unit: 'seconds' },
        notes: ['Limited recovery differentiates this class from neural sprint.'],
      },
      {
        metric: 'anaerobicPowerSetVolumeMeters',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 125, maxInclusive: 250, unit: 'meters' },
        notes: ['Advanced upper limit may extend to 600 meters in blocks.'],
      },
      {
        metric: 'averageRepeatSpeedPercentFromBestRep',
        comparator: ThresholdComparator.AtMost,
        range: { maxInclusive: 2, unit: 'percent' },
        notes: ['Average repeat speed must remain within 2 percent of best rep.'],
      },
    ],
  },
  [SessionClass.AnaerobicCapacity]: {
    sessionClass: SessionClass.AnaerobicCapacity,
    purpose: 'High glycolytic capacity and tolerance.',
    detectionSummary:
      'Short repeats with at least equal rest, substantial main-set volume, and non-neural profile.',
    rules: [
      {
        metric: 'repeatDistanceMeters',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 25, maxInclusive: 50, unit: 'meters' },
        notes: ['Canonical repeat distance window.'],
      },
      {
        metric: 'restToWorkRatio',
        comparator: ThresholdComparator.AtLeast,
        range: { minInclusive: 1, unit: 'ratio' },
        notes: ['Double-work recovery is preferred when programming allows it.'],
      },
      {
        metric: 'mainSetVolumeMeters',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 200, maxInclusive: 1200, unit: 'meters' },
        notes: ['Volume range is level dependent but bounded by the lock spec.'],
      },
      {
        metric: 'lactateMmolPerLiter',
        comparator: ThresholdComparator.AtLeast,
        range: { minInclusive: 12, unit: 'mmol/L' },
        notes: ['Use only when lactate is measured.'],
      },
      {
        metric: 'neuralSprintProfileRejected',
        comparator: ThresholdComparator.Present,
        notes: ['Achieved session must not fit the neural sprint profile.'],
      },
    ],
  },
  [SessionClass.RacePace]: {
    sessionClass: SessionClass.RacePace,
    purpose: 'Event-specific speed patterning and pacing.',
    detectionSummary:
      'Requires an event anchor, close pace adherence, and low rep-time variability.',
    rules: [
      {
        metric: 'targetEventAnchor',
        comparator: ThresholdComparator.Present,
        notes: ['Race pace requires a target event anchor.'],
      },
      {
        metric: 'averageRepPaceErrorPercent',
        comparator: ThresholdComparator.AtMost,
        range: { maxInclusive: 1.5, unit: 'percent' },
        notes: ['Average rep pace must remain within 1.5 percent of event pace.'],
      },
      {
        metric: 'restSeconds',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 5, maxInclusive: 30, unit: 'seconds' },
        notes: ['Larger rest is allowed for sprint race-pace blocks.'],
      },
      {
        metric: 'repTimeCoefficientOfVariationPercent',
        comparator: ThresholdComparator.AtMost,
        range: { maxInclusive: 2, unit: 'percent' },
        notes: ['Coefficient of variation must remain below 2 percent.'],
      },
    ],
  },
  [SessionClass.AerobicBase]: {
    sessionClass: SessionClass.AerobicBase,
    purpose: 'Low to moderate intensity capacity work.',
    detectionSummary:
      'High continuity swimming with low or moderate domain exposure and no meaningful heavy or severe segment.',
    rules: [
      {
        metric: 'effectiveSwimmingTimeMinutes',
        comparator: ThresholdComparator.AtLeast,
        range: { minInclusive: 30, unit: 'minutes' },
        notes: ['Alternative qualifier is at least 1500 meters of low-intensity volume.'],
      },
      {
        metric: 'lowIntensityVolumeMeters',
        comparator: ThresholdComparator.AtLeast,
        range: { minInclusive: 1500, unit: 'meters' },
        notes: ['Pool-based low-intensity volume floor from the lock spec.'],
      },
      {
        metric: 'intensityDomain',
        comparator: ThresholdComparator.OneOf,
        allowedValues: [IntensityDomain.Low, IntensityDomain.Moderate],
        notes: ['RPE is expected to remain very light to moderate.'],
      },
      {
        metric: 'noMeaningfulHeavyOrSevereSegments',
        comparator: ThresholdComparator.Present,
        notes: ['Heavy and severe segments disqualify aerobic base.'],
      },
    ],
  },
  [SessionClass.ThresholdAerobicPower]: {
    sessionClass: SessionClass.ThresholdAerobicPower,
    purpose: 'Heavy to severe work near threshold through aerobic power pace.',
    detectionSummary:
      'Moderate repeats with short rest in heavy or severe domains when race pace is not satisfied.',
    rules: [
      {
        metric: 'repeatDistanceMeters',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 50, maxInclusive: 200, unit: 'meters' },
        notes: ['Canonical repeat distance range.'],
      },
      {
        metric: 'restSeconds',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 5, maxInclusive: 15, unit: 'seconds' },
        notes: ['Short rest keeps the work near threshold or aerobic power.'],
      },
      {
        metric: 'heavyDomainLactateMmolPerLiter',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 4, maxInclusive: 7, unit: 'mmol/L' },
        notes: ['Heavy-domain lactate guidance.'],
      },
      {
        metric: 'severeDomainLactateMmolPerLiter',
        comparator: ThresholdComparator.Between,
        range: { minInclusive: 8, maxInclusive: 10, unit: 'mmol/L' },
        notes: ['Severe-domain lactate guidance.'],
      },
    ],
  },
  [SessionClass.RecoveryTechnique]: {
    sessionClass: SessionClass.RecoveryTechnique,
    purpose: 'Recovery plus skill quality.',
    detectionSummary:
      'Low to moderate intensity, substantial drill or skill content, and no extended heavy or severe segment.',
    rules: [
      {
        metric: 'intensityDomain',
        comparator: ThresholdComparator.OneOf,
        allowedValues: [IntensityDomain.Low, IntensityDomain.Moderate],
        notes: ['Recovery technique must remain low to moderate only.'],
      },
      {
        metric: 'drillOrSkillContent',
        comparator: ThresholdComparator.Present,
        notes: ['Substantial drill or skill content is required.'],
      },
      {
        metric: 'noExtendedHeavyOrSevereSegment',
        comparator: ThresholdComparator.Present,
        notes: ['Extended heavy or severe work disqualifies this class.'],
      },
    ],
  },
} as const;

const mismatchWeightsByClass: Readonly<
  Record<SessionClass, Readonly<Record<MismatchComponent, number>>>
> = {
  [SessionClass.NeuralSprint]: {
    [MismatchComponent.Intent]: 0.3,
    [MismatchComponent.IntensityDomain]: 0.35,
    [MismatchComponent.TechnicalDegradation]: 0.2,
    [MismatchComponent.Perceptual]: 0.1,
    [MismatchComponent.AutonomicRecovery]: 0.05,
  },
  [SessionClass.MusclePowerEndurance]: {
    [MismatchComponent.Intent]: 0.15,
    [MismatchComponent.IntensityDomain]: 0.35,
    [MismatchComponent.TechnicalDegradation]: 0.2,
    [MismatchComponent.Perceptual]: 0.2,
    [MismatchComponent.AutonomicRecovery]: 0.1,
  },
  [SessionClass.AnaerobicCapacity]: {
    [MismatchComponent.Intent]: 0.15,
    [MismatchComponent.IntensityDomain]: 0.3,
    [MismatchComponent.TechnicalDegradation]: 0.15,
    [MismatchComponent.Perceptual]: 0.25,
    [MismatchComponent.AutonomicRecovery]: 0.15,
  },
  [SessionClass.RacePace]: {
    [MismatchComponent.Intent]: 0.25,
    [MismatchComponent.IntensityDomain]: 0.25,
    [MismatchComponent.TechnicalDegradation]: 0.25,
    [MismatchComponent.Perceptual]: 0.15,
    [MismatchComponent.AutonomicRecovery]: 0.1,
  },
  [SessionClass.AerobicBase]: {
    [MismatchComponent.Intent]: 0.15,
    [MismatchComponent.IntensityDomain]: 0.2,
    [MismatchComponent.TechnicalDegradation]: 0.25,
    [MismatchComponent.Perceptual]: 0.15,
    [MismatchComponent.AutonomicRecovery]: 0.25,
  },
  [SessionClass.ThresholdAerobicPower]: {
    [MismatchComponent.Intent]: 0.15,
    [MismatchComponent.IntensityDomain]: 0.3,
    [MismatchComponent.TechnicalDegradation]: 0.2,
    [MismatchComponent.Perceptual]: 0.15,
    [MismatchComponent.AutonomicRecovery]: 0.2,
  },
  [SessionClass.RecoveryTechnique]: {
    [MismatchComponent.Intent]: 0.1,
    [MismatchComponent.IntensityDomain]: 0.1,
    [MismatchComponent.TechnicalDegradation]: 0.45,
    [MismatchComponent.Perceptual]: 0.2,
    [MismatchComponent.AutonomicRecovery]: 0.15,
  },
} as const;

const defaultLoadAllocationByClass: Readonly<
  Record<SessionClass, LoadAllocationConfig>
> = {
  [SessionClass.NeuralSprint]: {
    sessionClass: SessionClass.NeuralSprint,
    loadFractions: {
      [InternalSystem.Neurological]: 0.7,
      [InternalSystem.Muscular]: 0.2,
      [InternalSystem.Cardiovascular]: 0.1,
    },
    notes: ['Primary neural loading.'],
  },
  [SessionClass.MusclePowerEndurance]: {
    sessionClass: SessionClass.MusclePowerEndurance,
    loadFractions: {
      [InternalSystem.Neurological]: 0.3,
      [InternalSystem.Muscular]: 0.6,
      [InternalSystem.Cardiovascular]: 0.1,
    },
    notes: ['High muscular cost with retained neural demand.'],
  },
  [SessionClass.AnaerobicCapacity]: {
    sessionClass: SessionClass.AnaerobicCapacity,
    loadFractions: {
      [InternalSystem.Neurological]: 0.2,
      [InternalSystem.Muscular]: 0.5,
      [InternalSystem.Cardiovascular]: 0.3,
    },
    notes: ['Greater cardiovascular contribution than muscle power endurance.'],
  },
  [SessionClass.RacePace]: {
    sessionClass: SessionClass.RacePace,
    loadFractions: {
      [InternalSystem.Neurological]: 0.25,
      [InternalSystem.Muscular]: 0.55,
      [InternalSystem.Cardiovascular]: 0.2,
    },
    notes: ['Default race-pace allocation uses the 50 to 200 meter variant.'],
  },
  [SessionClass.AerobicBase]: {
    sessionClass: SessionClass.AerobicBase,
    loadFractions: {
      [InternalSystem.Neurological]: 0.05,
      [InternalSystem.Muscular]: 0.15,
      [InternalSystem.Cardiovascular]: 0.8,
    },
    notes: ['Dominant cardiovascular load.'],
  },
  [SessionClass.ThresholdAerobicPower]: {
    sessionClass: SessionClass.ThresholdAerobicPower,
    loadFractions: {
      [InternalSystem.Neurological]: 0.15,
      [InternalSystem.Muscular]: 0.25,
      [InternalSystem.Cardiovascular]: 0.6,
    },
    notes: ['Heavy and severe domain loading near threshold through aerobic power.'],
  },
  [SessionClass.RecoveryTechnique]: {
    sessionClass: SessionClass.RecoveryTechnique,
    loadFractions: {
      [InternalSystem.Neurological]: 0.15,
      [InternalSystem.Muscular]: 0.25,
      [InternalSystem.Cardiovascular]: 0.6,
    },
    notes: ['Class fractions are fixed even though total load remains intentionally low.'],
  },
} as const;

const racePaceVariants: readonly RacePaceLoadAllocationVariant[] = [
  {
    label: '50m to 200m',
    raceDistanceMeters: [50, 100, 200] as const,
    loadFractions: {
      [InternalSystem.Neurological]: 0.25,
      [InternalSystem.Muscular]: 0.55,
      [InternalSystem.Cardiovascular]: 0.2,
    },
  },
  {
    label: '400m',
    raceDistanceMeters: 400,
    loadFractions: {
      [InternalSystem.Neurological]: 0.2,
      [InternalSystem.Muscular]: 0.4,
      [InternalSystem.Cardiovascular]: 0.4,
    },
  },
] as const;

const strokeDegradationCurves: readonly PiecewiseCurveDefinition[] = [
  {
    id: 'distanceCurveDegradation',
    inputUnit: 'percent',
    outputUnit: 'degradationScore0to100',
    clampMinOutput: 0,
    clampMaxOutput: 100,
    segments: [
      { minInclusive: 0, maxInclusive: 2, outputAtMin: 0, outputAtMax: 0 },
      { minInclusive: 2, maxInclusive: 8, outputAtMin: 0, outputAtMax: 50 },
      { minInclusive: 8, maxInclusive: 15, outputAtMin: 50, outputAtMax: 80 },
      { minInclusive: 15, maxInclusive: 25, outputAtMin: 80, outputAtMax: 100 },
      { minInclusive: 25, outputAtMin: 100, outputAtMax: 100 },
    ],
  },
  {
    id: 'sprintCurveDegradation',
    inputUnit: 'percent',
    outputUnit: 'degradationScore0to100',
    clampMinOutput: 0,
    clampMaxOutput: 100,
    segments: [
      { minInclusive: 0, maxInclusive: 3, outputAtMin: 0, outputAtMax: 0 },
      { minInclusive: 3, maxInclusive: 10, outputAtMin: 0, outputAtMax: 50 },
      { minInclusive: 10, maxInclusive: 18, outputAtMin: 50, outputAtMax: 80 },
      { minInclusive: 18, maxInclusive: 30, outputAtMin: 80, outputAtMax: 100 },
      { minInclusive: 30, outputAtMin: 100, outputAtMax: 100 },
    ],
  },
] as const;

const intervalConsistencyCurve: PiecewiseCurveDefinition = {
  id: 'intervalConsistency',
  inputUnit: 'coefficientOfVariationPercent',
  outputUnit: 'stabilityScore0to100',
  clampMinOutput: 0,
  clampMaxOutput: 100,
  segments: [
    { minInclusive: 0, maxInclusive: 1, outputAtMin: 100, outputAtMax: 100 },
    { minInclusive: 1, maxInclusive: 2, outputAtMin: 100, outputAtMax: 85 },
    { minInclusive: 2, maxInclusive: 4, outputAtMin: 85, outputAtMax: 60 },
    { minInclusive: 4, maxInclusive: 7, outputAtMin: 60, outputAtMax: 30 },
    { minInclusive: 7, maxInclusive: 10, outputAtMin: 30, outputAtMax: 0 },
    { minInclusive: 10, outputAtMin: 0, outputAtMax: 0 },
  ],
};

const formulas: readonly FormulaDescriptor[] = [
  {
    id: 'intentMismatch',
    summary:
      'Cosine distance between the planned class distribution and achieved class probability distribution.',
    expression: 'cosineDistance(plannedClassDistribution, achievedClassDistribution)',
    inputs: ['plannedClassDistribution', 'achievedClassDistribution'],
    output: 'intentMismatch0to1',
    notes: ['Intent mismatch is already normalized on a 0 to 1 scale.'],
  },
  {
    id: 'intensityDomainMismatch',
    summary:
      'Sum of absolute domain fraction differences divided by 2 to normalize to 0 through 1.',
    expression:
      'sum(abs(plannedDomainFraction - achievedDomainFraction)) / 2',
    inputs: ['plannedIntensityDomainDistribution', 'achievedIntensityDomainDistribution'],
    output: 'intensityDomainMismatch0to1',
    notes: ['Uses low, moderate, heavy, severe, and extreme domain fractions.'],
  },
  {
    id: 'technicalDegradationMismatch',
    summary:
      'Stroke efficiency degradation mapped from degradationScore0to100 to a 0 to 1 mismatch contribution.',
    expression: 'degradationScore0to100 / 100',
    inputs: ['strokeIndexSeries', 'swolfSeries', 'classTolerance'],
    output: 'technicalDegradationMismatch0to1',
    notes: ['Use the larger degradation signal when both stroke index and SWOLF exist.'],
  },
  {
    id: 'perceptualMismatch',
    summary:
      'Absolute gap between observed session RPE and the predicted RPE band for the achieved class and duration.',
    expression: 'clip(abs(observedRPE - predictedRPEBandCenter) / modeledGap, 0, 1)',
    inputs: ['sessionRPE', 'achievedSessionClass', 'sessionDurationMinutes'],
    output: 'perceptualMismatch0to1',
    notes: ['Predicted RPE band values were not published in the lock spec.'],
  },
  {
    id: 'autonomicRecoveryMismatch',
    summary:
      'Post-set heart-rate-recovery shortfall relative to class-specific baseline, normalized to 0 through 1.',
    expression: 'baselineRelativeScaling(classBaseline, observedRecoveryDrop)',
    inputs: ['postMainSetHeartRateRecovery', 'classSpecificRecoveryBaseline'],
    output: 'autonomicRecoveryMismatch0to1',
    notes: ['Use generic baseline logic when fewer than 20 class-matched sessions exist.'],
  },
  {
    id: 'internalLoadUnits',
    summary:
      'Load magnitude from duration, normalized session RPE, and an intensity factor.',
    expression:
      'sessionDurationMinutes * normalizedSessionRPE * intensityFactor',
    inputs: ['sessionDurationMinutes', 'normalizedSessionRPE', 'intensityFactor'],
    output: 'internalLoadUnits',
    notes: ['The lock spec requires the intensity factor concept but does not publish default numeric values.'],
  },
  {
    id: 'subjectiveDeviationScore',
    summary:
      'Average capped deviation from 28-day median measured in MAD units and mapped to 0 through 100.',
    expression:
      'mean((min(abs(itemValue - rollingMedian) / MAD, 4) / 4) * 100)',
    inputs: ['subjectiveItems', 'rolling28DayMedian', 'rolling28DayMAD'],
    output: 'subjectiveDeviationScore0to100',
    notes: ['A minimum MAD clamp is required by the lock spec but the numeric clamp value is not published.'],
  },
  {
    id: 'psychScore',
    summary:
      'Logistic transform of baseline-normalized subjective items mapped onto a 0 through 100 scale.',
    expression: '100 * mean(logistic((today - rollingMedian) / MAD))',
    inputs: ['subjectiveItems', 'rolling28DayMedian', 'rolling28DayMAD'],
    output: 'psychScore0to100',
    notes: ['The lock spec defines behavior but not the logistic slope constant or MAD clamp.'],
  },
  {
    id: 'psychVolatilityPercent',
    summary:
      'Combined absolute strain and day-to-day instability transformed into psychVolatilityPercent.',
    expression:
      '100 * (1 - exp(-2.2 * sqrt(0.70 * psychScoreNormalized^2 + 0.30 * dailyChangeNormalized^2)^2))',
    inputs: ['psychScore0to100', 'yesterdayPsychScore0to100'],
    output: 'psychVolatilityPercent',
    notes: ['Add 10 points when daily psych score change is at least 25 points, then cap at 100.'],
  },
] as const;

const phaseCircadianFormula: FormulaDescriptor = {
  id: 'circadianModifier',
  summary:
    'Circadian modifier from normalized phase position using amplitude around a 24-hour cycle.',
  expression: 'amplitudePercent * cos(2 * PI * circadianPhasePosition)',
  inputs: ['localHour', 'peakLocalTime', 'chronotypeOffsetMinutes', 'amplitudePercent'],
  output: 'circadianModifierPercent',
  notes: ['Phase position 0 aligns to the configured circadian peak.'],
};

const phaseInfradianFormula: FormulaDescriptor = {
  id: 'infradianModifier',
  summary:
    'Generic infradian modifier from normalized cycle position when tracked data are available.',
  expression: 'amplitudePercent * cos(2 * PI * infradianPhasePosition)',
  inputs: ['localDate', 'anchorDate', 'cycleLengthDays', 'phaseShiftDays', 'amplitudePercent'],
  output: 'infradianModifierPercent',
  notes: ['No default cycle length is supplied by the lock spec; callers must provide tracked data.'],
};

const phaseCombinedFormula: FormulaDescriptor = {
  id: 'combinedRhythmModifier',
  summary:
    'Multiplicative combination of circadian and infradian percent modifiers.',
  expression:
    '(((1 + circadianModifierPercent / 100) * (1 + infradianModifierPercent / 100)) - 1) * 100',
  inputs: ['circadianModifierPercent', 'infradianModifierPercent'],
  output: 'combinedRhythmModifierPercent',
  notes: ['When infradian data are absent, combined modifier equals the circadian modifier.'],
};

const decayFormula: FormulaDescriptor = {
  id: 'fatigueDecay',
  summary:
    'Exponential fatigue decay toward homeostasis using system-specific half-life values.',
  expression:
    'fatigue * 0.5 ^ (elapsedHours / (halfLife * hoursPerHalfLifeUnit * recentLoadMultiplier))',
  inputs: ['fatigue', 'elapsedHours', 'halfLife', 'hoursPerHalfLifeUnit', 'recentLoadMultiplier'],
  output: 'fatigueAfterDecay',
  notes: ['Recent load modulation remains optional because the current config surface does not define a default hook.'],
};

const couplingFormula: FormulaDescriptor = {
  id: 'systemCoupling',
  summary:
    'Per-target fatigue propagation using the explicit coupling matrix with capped cross-system contribution.',
  expression:
    'selfContribution + clamp(rawCrossContribution, -crossContributionCap, crossContributionCap)',
  inputs: ['sourceFatigue', 'couplingMatrix', 'crossContributionCap'],
  output: 'fatigueAfterCoupling',
  notes: [
    'Self weights and cross-system weights stay explicit in the matrix.',
    'Cross-system contribution is capped to prevent runaway amplification.',
  ],
};

const accumulationWeightedLoadFormula: FormulaDescriptor = {
  id: 'weightedSystemLoad',
  summary:
    'Raw system load multiplied by the configured system sensitivity weight.',
  expression: 'rawSystemLoad * systemSensitivity',
  inputs: ['rawSystemLoad', 'systemSensitivity'],
  output: 'weightedSystemLoad',
  notes: ['System sensitivity comes from the canonical learning snapshot surface.'],
};

const accumulationDeltaFormula: FormulaDescriptor = {
  id: 'fatigueAccumulationDelta',
  summary:
    'Bounded nonlinear accumulation that saturates as the fatigue state approaches the clamp boundary.',
  expression:
    'sign(weightedSystemLoad) * availableHeadroom * (1 - exp(-abs(weightedSystemLoad) / availableHeadroom))',
  inputs: ['currentFatigue', 'weightedSystemLoad', 'fatigueScaleBounds'],
  output: 'fatigueDelta',
  notes: ['Available headroom is derived from the fixed fatigue scale rather than hidden coefficients.'],
};

const repeatedEffortDensityFormula: FormulaDescriptor = {
  id: 'repeatedEffortDensity',
  summary:
    'Work density of repeated efforts across observed work and rest time.',
  expression:
    'totalWorkSeconds / max(totalWorkSeconds + totalRestSeconds, Number.EPSILON)',
  inputs: ['totalWorkSeconds', 'totalRestSeconds'],
  output: 'repeatedEffortDensity',
  notes: ['Uses actual interval timing when available, otherwise planned timing fallback.'],
};

const featureCoverageFormula: FormulaDescriptor = {
  id: 'classificationFeatureCoverage',
  summary:
    'Fraction of supported classifier feature signals that are present for a session.',
  expression: 'presentSignals / totalSignals',
  inputs: ['presentSignals', 'totalSignals'],
  output: 'featureCoverageScore',
  notes: ['Feature signal inventory is configured explicitly for deterministic testing.'],
};

const recommendationStages: readonly RecommendationStageConfig[] = [
  {
    stage: RecommendationConstraint.Safety,
    order: 1,
    description:
      'If any system is red, do not prescribe a high-load class for that system within the next 48 hours.',
  },
  {
    stage: RecommendationConstraint.Competition,
    order: 2,
    description:
      'If a priority race is within 14 days and taper is active, taper rules override normal progression.',
  },
  {
    stage: RecommendationConstraint.Mismatch,
    order: 3,
    description:
      'Use mismatchSeverity banding to decide whether to maintain, tighten, or reduce load.',
  },
  {
    stage: RecommendationConstraint.DataQuality,
    order: 4,
    description:
      'If data quality is low, prioritize better data capture before a major prescription change.',
  },
] as const;

const dataQualityPenalties: readonly DataQualityPenalty[] = [
  {
    key: 'missingLinkedPlan',
    penalty: 0.25,
    description: 'Subtract when no linked plan exists.',
  },
  {
    key: 'missingRepTimes',
    penalty: 0.25,
    description: 'Subtract when no rep times exist.',
  },
  {
    key: 'missingTechniqueMetric',
    penalty: 0.15,
    description: 'Subtract when no technique metric exists.',
  },
  {
    key: 'missingSessionRPE',
    penalty: 0.15,
    description: 'Subtract when no session RPE exists.',
  },
  {
    key: 'missingHeartRateRecovery',
    penalty: 0.2,
    description: 'Subtract when no heart-rate recovery exists.',
  },
] as const;

const warningTriggers: readonly WarningTriggerConfig[] = [
  {
    code: 'repeatedMismatch',
    description:
      'High or critical mismatch repeated within rolling 7-day or 14-day windows.',
    thresholds: [
      'At least 2 high-or-critical mismatches within 7 days.',
      'At least 3 high-or-critical mismatches within 14 days.',
    ],
  },
  {
    code: 'slowedHeartRateRecovery',
    description:
      'One-minute heart-rate recovery is materially slower than the class-specific baseline.',
    thresholds: [
      'At least 1 standard deviation below the class-specific mean and at least 5 bpm below the mean.',
      'If fewer than 20 class-matched sessions exist, use generic baseline and widen the gate to 1.5 standard deviations.',
    ],
  },
  {
    code: 'musclePowerEnduranceFrequency',
    description:
      'Muscle power endurance frequency exceeds the athlete-specific tolerance rule.',
    thresholds: [
      'Tolerant only if 5 of the last 6 such sessions return both muscular and neurological fatigue to green within 48 hours.',
      'If tolerant, permit every 4 days; otherwise restrict to every 6 days.',
    ],
  },
  {
    code: 'lowDataQuality',
    description:
      'Data quality is below 0.50, so measurement capture must be prioritized before a major change.',
    thresholds: ['Triggered when data quality score is below 0.50.'],
  },
  {
    code: 'dataReliability',
    description:
      'Heavy, severe, or extreme intensity is paired with unexpectedly low perceptual strain.',
    thresholds: [
      'Flag when achieved intensity is heavy, severe, or extreme but perceptual mismatch indicates low strain.',
    ],
  },
] as const;

export const LOCK_SPEC_CONFIG: OlbrechtLockSpecConfig = {
  metadata: {
    appName: APP_NAME,
    engineVersion: ENGINE_VERSION,
    configVersion: CONFIG_VERSION,
    sourceOfTruth: 'Olbrecht Final Engineering Lock Specification',
  },
  foundation: {
    fatigueScale: {
      min: FATIGUE_SCALE[0],
      max: FATIGUE_SCALE[FATIGUE_SCALE.length - 1],
      homeostasis: 0,
    },
    phase: {
      circadianCycleHours: 24,
      defaultLookupStrategy: 'cosine',
      tableInterpolation: 'linear',
      combinationStrategy: 'multiplicativePercent',
      circadianModifierFormula: phaseCircadianFormula,
      infradianModifierFormula: phaseInfradianFormula,
      combinedModifierFormula: phaseCombinedFormula,
    },
    decay: {
      halfLifeUnit: 'days',
      hoursPerHalfLifeUnit: 24,
      formula: decayFormula,
      supportsRecentLoadModulation: false,
      clampToFatigueScale: true,
    },
    coupling: {
      matrixOrientation: 'targetBySource',
      formula: couplingFormula,
      maxCrossContributionRatioToSelf: 0.5,
      minimumAbsoluteCrossContributionCap: 1,
      clampToFatigueScale: true,
    },
    accumulation: {
      nonlinearStrategy: 'boundedHeadroomExponential',
      weightedLoadFormula: accumulationWeightedLoadFormula,
      deltaFormula: accumulationDeltaFormula,
      clampToFatigueScale: true,
    },
    classificationMetrics: {
      highIntensityDomains: [
        IntensityDomain.Heavy,
        IntensityDomain.Severe,
        IntensityDomain.Extreme,
      ],
      thresholdDomains: [IntensityDomain.Heavy, IntensityDomain.Severe],
      recoveryDomains: [IntensityDomain.Low, IntensityDomain.Moderate],
      sprintQualifiers: ['sprintAnchorType', 'neuralSprintDistanceWindow'],
      thresholdQualifiers: ['thresholdDistanceWindow', 'thresholdIntensityDomains'],
      recoveryQualifiers: ['recoveryDomains', 'drillTagPresent'],
      restObservationMode: 'repeatCountMinusOne',
      repeatedEffortDensityFormula,
      featureCoverageFormula,
      featureCoverageSignals: [
        'linkedPlan',
        'intervalTimes',
        'heartRateSummary',
        'heartRateRecovery',
        'strokeMetrics',
        'sessionRPE',
        'paceAnchors',
        'drillOrTechniqueSignal',
      ],
    },
  },
  taxonomy: {
    internalSystems: INTERNAL_SYSTEMS,
    fatigueScale: FATIGUE_SCALE,
    sessionClasses: SESSION_CLASSES,
    intensityDomains: INTENSITY_DOMAINS,
    paceAnchorTypes: [
      PaceAnchorType.EventPace,
      PaceAnchorType.CriticalVelocity,
      PaceAnchorType.Sprint,
    ],
  },
  classification: {
    priorityOrder: [
      SessionClass.NeuralSprint,
      SessionClass.AnaerobicCapacity,
      SessionClass.RacePace,
      SessionClass.MusclePowerEndurance,
      SessionClass.ThresholdAerobicPower,
      SessionClass.AerobicBase,
      SessionClass.RecoveryTechnique,
    ],
    probabilityMembershipShape: 'triangular',
    probabilityDiscriminators: [
      'workIntervalDurationDistribution',
      'restToWorkRatioDistribution',
      'totalDistanceInPrimarySet',
      'paceErrorRelativeToEventPaceAndCriticalVelocityAnchors',
      'repTimeCoefficientOfVariation',
      'lactateDomain',
      'heartRateDomainFeatures',
    ],
    classifierTemperature: 0.2,
    calibrationModes: [
      CalibrationMode.None,
      CalibrationMode.Isotonic,
      CalibrationMode.Dirichlet,
    ],
    mixedIntentThreshold: 0.6,
    sessionClassPolicies,
    planResponseTolerances: {
      plannedDistancePercentTolerance: 3,
      plannedDistanceAbsoluteMetersTolerance: 100,
      repeatCountDeltaPerSetTolerance: 1,
      achievedPaceTolerancePercent: 1.5,
    },
  },
  mismatch: {
    formulas: formulas.slice(0, 5),
    bands: mismatchBands,
    defaultWeightsByClass: mismatchWeightsByClass,
    reflowRules: [
      {
        whenComponentMissing: MismatchComponent.AutonomicRecovery,
        redistributeTo: [
          { component: MismatchComponent.IntensityDomain, fraction: 0.6 },
          { component: MismatchComponent.Perceptual, fraction: 0.4 },
        ],
        proportionalFallbackCap: 0.45,
        notes: ['When autonomic recovery is missing, move that weight in a 60/40 split.'],
      },
      {
        whenComponentMissing: MismatchComponent.TechnicalDegradation,
        redistributeTo: [
          { component: MismatchComponent.Intent, fraction: 0.4 },
          { component: MismatchComponent.IntensityDomain, fraction: 0.6 },
        ],
        proportionalFallbackCap: 0.45,
        notes: ['When technical metrics are missing, move that weight in a 40/60 split.'],
      },
    ],
  },
  loadModel: {
    internalLoadFormula: formulas[5],
    readinessBands: [
      {
        category: ReadinessCategory.Green,
        minInclusive: -1,
        maxInclusive: 1,
        note: 'Green from negative 1 through positive 1.',
      },
      {
        category: ReadinessCategory.Yellow,
        minInclusive: -2,
        maxInclusive: -1,
        note: 'Yellow below homeostasis from less than negative 1 through negative 2.',
      },
      {
        category: ReadinessCategory.Yellow,
        minInclusive: 1,
        maxInclusive: 2,
        note: 'Yellow above homeostasis from greater than positive 1 through positive 2.',
      },
      {
        category: ReadinessCategory.Orange,
        minInclusive: -4,
        maxInclusive: -2,
        note: 'Orange below homeostasis from less than negative 2 through negative 4.',
      },
      {
        category: ReadinessCategory.Orange,
        minInclusive: 2,
        maxInclusive: 3,
        note: 'Orange above homeostasis from greater than positive 2 through positive 3.',
      },
      {
        category: ReadinessCategory.Red,
        maxInclusive: -4,
        note: 'Red below negative 4.',
      },
      {
        category: ReadinessCategory.Red,
        minInclusive: 3,
        note: 'Red above positive 3.',
      },
    ],
    defaultLoadAllocationByClass,
    racePaceVariants,
  },
  monitoring: {
    strokeDegradationCurves,
    intervalConsistencyCurve,
    heartRateRecoverySlowThreshold: {
      minimumClassSampleSize: 20,
      standardDeviationBelowMean: 1,
      absoluteBpmBelowMean: 5,
      fallbackStandardDeviationBelowMean: 1.5,
    },
    subjectiveDeviationFormula: formulas[6],
    psychScoreFormula: formulas[7],
    psychVolatilityFormula: formulas[8],
  },
  recommendation: {
    mismatchBands,
    decisionOrder: recommendationStages,
    dataQualityPenalties,
    lowDataQualityThreshold: 0.5,
    warningTriggers,
    musclePowerEnduranceTolerance: {
      sessionsObserved: 6,
      sessionsRequiredInGreenWithin48Hours: 5,
      tolerantFrequencyDays: 4,
      defaultFrequencyDays: 6,
    },
  },
  rhythm: {
    taperPriorityWindowDays: 14,
    taperInferenceWindowDays: 21,
    taperVolumeReductionThresholdPercent: 35,
    circadianPeakLocalTime: '17:00',
    circadianAmplitudePercent: 2,
    sparseHistoryMinimumSessions: 14,
    infradianTrackingDefaultEnabled: false,
  },
  adaptiveLearning: {
    minimumSameClassSessions: 20,
    frozenDuring: ['taper', 'illness'],
    learnableParameters: [
      'decayHalfLifePerSystem',
      'classSensitivityWeights',
      'heartRateRecoveryBaselines',
      'subjectiveWellnessBaselines',
      'rhythmAmplitude',
      'rhythmDrift',
      'couplingWeights',
      'volatilityBaseline',
      'baselineDrift',
    ],
  },
  sync: {
    syncSchemaVersion: SYNC_SCHEMA_VERSION,
    payloadSchemaVersion: PAYLOAD_SCHEMA_VERSION,
    payloadTypes: SYNC_PAYLOAD_TYPES,
    timestampsFormat: 'RFC 3339',
    identifiersFormat: 'UUID',
    responseOnlySessionsAllowed: true,
  },
  unresolvedLockedConfigSlots: [
    {
      key: 'classification.predictedRpeBands',
      reason:
        'The lock spec requires predicted RPE bands by achieved class and duration but does not publish numeric centers or widths.',
    },
    {
      key: 'loadModel.intensityFactorByDomain',
      reason:
        'The lock spec requires an intensity factor in the internal load formula but does not publish default numeric values.',
    },
    {
      key: 'monitoring.minimumMadClamp',
      reason:
        'The lock spec requires a minimum MAD clamp for subjective deviation and psych score calculations but does not publish the clamp value.',
    },
    {
      key: 'monitoring.psychLogisticSlope',
      reason:
        'The psych score logistic mapping behavior is described, but the exact slope constant is not published.',
    },
    {
      key: 'sessionClassPolicies.recoveryTechnique.lowTotalLoadThreshold',
      reason:
        'Recovery technique requires low total load, but the lock spec does not publish a numeric threshold for that load boundary.',
    },
    {
      key: 'sessionResponse.dataSourceEnum',
      reason:
        'SessionResponse.dataSource is required as an enum in the lock spec, but the allowed values are not enumerated there.',
    },
  ],
};
