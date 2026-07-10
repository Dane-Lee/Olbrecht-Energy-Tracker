import type {
  FormulaDescriptor,
  PiecewiseCurveDefinition,
  ThresholdWindow,
} from '@/domain';
import {
  CalibrationMode,
  IntensityDomain,
  InternalSystem,
  MismatchBand,
  MismatchComponent,
  PaceAnchorType,
  ReadinessCategory,
  RecommendationConstraint,
  SessionClass,
  SyncPayloadType,
} from '@/domain';

export enum ThresholdComparator {
  Between = 'between',
  AtLeast = 'atLeast',
  AtMost = 'atMost',
  Present = 'present',
  OneOf = 'oneOf',
}

export interface ThresholdRule {
  metric: string;
  comparator: ThresholdComparator;
  range?: ThresholdWindow;
  allowedValues?: readonly string[];
  notes: readonly string[];
}

export interface SessionClassPolicy {
  sessionClass: SessionClass;
  purpose: string;
  detectionSummary: string;
  rules: readonly ThresholdRule[];
}

export interface PlanResponseToleranceConfig {
  plannedDistancePercentTolerance: number;
  plannedDistanceAbsoluteMetersTolerance: number;
  repeatCountDeltaPerSetTolerance: number;
  achievedPaceTolerancePercent: number;
}

export interface MismatchBandConfig {
  band: MismatchBand;
  minInclusive?: number;
  maxInclusive?: number;
}

export interface ReflowTarget {
  component: MismatchComponent;
  fraction: number;
}

export interface MismatchWeightReflowRule {
  whenComponentMissing: MismatchComponent;
  redistributeTo: readonly ReflowTarget[];
  proportionalFallbackCap: number;
  notes: readonly string[];
}

export interface LoadAllocationConfig {
  sessionClass: SessionClass;
  loadFractions: Readonly<Record<InternalSystem, number>>;
  notes: readonly string[];
}

export interface RacePaceLoadAllocationVariant {
  label: string;
  raceDistanceMeters: number | readonly number[];
  loadFractions: Readonly<Record<InternalSystem, number>>;
}

export interface ReadinessBandRule {
  category: ReadinessCategory;
  minInclusive?: number;
  maxInclusive?: number;
  note: string;
}

export interface DataQualityPenalty {
  key: string;
  penalty: number;
  description: string;
}

export interface WarningTriggerConfig {
  code: string;
  description: string;
  thresholds: readonly string[];
}

export interface RecommendationStageConfig {
  stage: RecommendationConstraint;
  order: number;
  description: string;
}

export interface SyncContractConfig {
  syncSchemaVersion: string;
  payloadSchemaVersion: string;
  payloadTypes: readonly SyncPayloadType[];
  timestampsFormat: 'RFC 3339';
  identifiersFormat: 'UUID';
  responseOnlySessionsAllowed: boolean;
}

export interface UnresolvedLockedConfigSlot {
  key: string;
  reason: string;
}

export interface FatigueScaleConfig {
  min: number;
  max: number;
  homeostasis: number;
}

export type PhaseLookupStrategy = 'cosine' | 'table';
export type ModifierCombinationStrategy = 'multiplicativePercent';

export interface PhaseEngineConfig {
  circadianCycleHours: number;
  defaultLookupStrategy: PhaseLookupStrategy;
  tableInterpolation: 'linear';
  combinationStrategy: ModifierCombinationStrategy;
  circadianModifierFormula: FormulaDescriptor;
  infradianModifierFormula: FormulaDescriptor;
  combinedModifierFormula: FormulaDescriptor;
}

export interface DecayEngineConfig {
  halfLifeUnit: 'days';
  hoursPerHalfLifeUnit: number;
  formula: FormulaDescriptor;
  supportsRecentLoadModulation: boolean;
  clampToFatigueScale: boolean;
}

export interface CouplingEngineConfig {
  matrixOrientation: 'targetBySource';
  formula: FormulaDescriptor;
  maxCrossContributionRatioToSelf: number;
  minimumAbsoluteCrossContributionCap: number;
  clampToFatigueScale: boolean;
}

export interface AccumulationEngineConfig {
  nonlinearStrategy: 'boundedHeadroomExponential';
  weightedLoadFormula: FormulaDescriptor;
  deltaFormula: FormulaDescriptor;
  clampToFatigueScale: boolean;
}

export type ClassificationFeatureCoverageSignal =
  | 'linkedPlan'
  | 'intervalTimes'
  | 'heartRateSummary'
  | 'heartRateRecovery'
  | 'strokeMetrics'
  | 'sessionRPE'
  | 'paceAnchors'
  | 'drillOrTechniqueSignal';

export interface ClassificationMetricsConfig {
  highIntensityDomains: readonly IntensityDomain[];
  thresholdDomains: readonly IntensityDomain[];
  recoveryDomains: readonly IntensityDomain[];
  sprintQualifiers: readonly ('sprintAnchorType' | 'neuralSprintDistanceWindow')[];
  thresholdQualifiers: readonly (
    | 'thresholdDistanceWindow'
    | 'thresholdIntensityDomains'
  )[];
  recoveryQualifiers: readonly ('recoveryDomains' | 'drillTagPresent')[];
  restObservationMode: 'repeatCountMinusOne';
  repeatedEffortDensityFormula: FormulaDescriptor;
  featureCoverageFormula: FormulaDescriptor;
  featureCoverageSignals: readonly ClassificationFeatureCoverageSignal[];
}

export interface OlbrechtLockSpecConfig {
  metadata: {
    appName: string;
    engineVersion: string;
    configVersion: string;
    sourceOfTruth: string;
  };
  taxonomy: {
    internalSystems: readonly InternalSystem[];
    fatigueScale: readonly number[];
    sessionClasses: readonly SessionClass[];
    intensityDomains: readonly IntensityDomain[];
    paceAnchorTypes: readonly PaceAnchorType[];
  };
  foundation: {
    fatigueScale: FatigueScaleConfig;
    phase: PhaseEngineConfig;
    decay: DecayEngineConfig;
    coupling: CouplingEngineConfig;
    accumulation: AccumulationEngineConfig;
    classificationMetrics: ClassificationMetricsConfig;
  };
  classification: {
    priorityOrder: readonly SessionClass[];
    probabilityMembershipShape: 'triangular';
    probabilityDiscriminators: readonly string[];
    classifierTemperature: number;
    calibrationModes: readonly CalibrationMode[];
    mixedIntentThreshold: number;
    sessionClassPolicies: Readonly<Record<SessionClass, SessionClassPolicy>>;
    planResponseTolerances: PlanResponseToleranceConfig;
  };
  mismatch: {
    formulas: readonly FormulaDescriptor[];
    bands: readonly MismatchBandConfig[];
    defaultWeightsByClass: Readonly<
      Record<SessionClass, Readonly<Record<MismatchComponent, number>>>
    >;
    reflowRules: readonly MismatchWeightReflowRule[];
  };
  loadModel: {
    internalLoadFormula: FormulaDescriptor;
    readinessBands: readonly ReadinessBandRule[];
    defaultLoadAllocationByClass: Readonly<Record<SessionClass, LoadAllocationConfig>>;
    racePaceVariants: readonly RacePaceLoadAllocationVariant[];
  };
  monitoring: {
    strokeDegradationCurves: readonly PiecewiseCurveDefinition[];
    intervalConsistencyCurve: PiecewiseCurveDefinition;
    heartRateRecoverySlowThreshold: {
      minimumClassSampleSize: number;
      standardDeviationBelowMean: number;
      absoluteBpmBelowMean: number;
      fallbackStandardDeviationBelowMean: number;
    };
    subjectiveDeviationFormula: FormulaDescriptor;
    psychScoreFormula: FormulaDescriptor;
    psychVolatilityFormula: FormulaDescriptor;
  };
  recommendation: {
    mismatchBands: readonly MismatchBandConfig[];
    decisionOrder: readonly RecommendationStageConfig[];
    dataQualityPenalties: readonly DataQualityPenalty[];
    lowDataQualityThreshold: number;
    warningTriggers: readonly WarningTriggerConfig[];
    musclePowerEnduranceTolerance: {
      sessionsObserved: number;
      sessionsRequiredInGreenWithin48Hours: number;
      tolerantFrequencyDays: number;
      defaultFrequencyDays: number;
    };
  };
  rhythm: {
    taperPriorityWindowDays: number;
    taperInferenceWindowDays: number;
    taperVolumeReductionThresholdPercent: number;
    circadianPeakLocalTime: string;
    circadianAmplitudePercent: number;
    sparseHistoryMinimumSessions: number;
    infradianTrackingDefaultEnabled: boolean;
  };
  adaptiveLearning: {
    minimumSameClassSessions: number;
    frozenDuring: readonly string[];
    learnableParameters: readonly string[];
  };
  sync: SyncContractConfig;
  unresolvedLockedConfigSlots: readonly UnresolvedLockedConfigSlot[];
}
