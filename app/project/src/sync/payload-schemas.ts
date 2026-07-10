import {
  EnergySystemFocus,
  IntensityDomain,
  InternalSystem,
  MismatchComponent,
  PaceAnchorType,
  PoolCourse,
  RacePriority,
  ReadinessCategory,
  RecommendationCode,
  SessionClass,
  SourceApp,
  SyncPayloadType,
  WarningCode,
} from '@/domain';
import type {
  AthleteUpsertPayload,
  DerivedMetricsUpsertPayload,
  RaceEventUpsertPayload,
  ReadinessSnapshotUpsertPayload,
  SessionPlanUpsertPayload,
  SessionResponseUpsertPayload,
} from '@/domain';
import {
  SchemaFieldKind,
  type PayloadSchemaDefinition,
  type SchemaField,
} from '@/engine';

const requiredString = (
  description: string,
  format?: 'uuid' | 'rfc3339' | 'date' | 'ianaTimeZone',
) => ({
  kind: SchemaFieldKind.String,
  description,
  required: true,
  format,
} as const);

const optionalString = (
  description: string,
  format?: 'uuid' | 'rfc3339' | 'date' | 'ianaTimeZone',
) => ({
  kind: SchemaFieldKind.String,
  description,
  required: false,
  format,
} as const);

const requiredNumber = (description: string) => ({
  kind: SchemaFieldKind.Number,
  description,
  required: true,
} as const);

const optionalNumber = (description: string) => ({
  kind: SchemaFieldKind.Number,
  description,
  required: false,
} as const);

const requiredInteger = (description: string, minimum?: number) => ({
  kind: SchemaFieldKind.Integer,
  description,
  required: true,
  minimum,
} as const);

const enumField = (
  description: string,
  values: readonly string[],
  required: boolean,
) => ({
  kind: SchemaFieldKind.Enum,
  description,
  required,
  values,
} as const);

const arrayField = (
  description: string,
  items: SchemaField,
  required: boolean,
) => ({
  kind: SchemaFieldKind.Array,
  description,
  required,
  items,
} as const);

const objectField = (
  description: string,
  properties: Readonly<Record<string, SchemaField>>,
  required: boolean,
  additionalProperties = false,
) => ({
  kind: SchemaFieldKind.Object,
  description,
  required,
  properties,
  additionalProperties,
} as const);

const unionField = (
  description: string,
  anyOf: readonly SchemaField[],
  required: boolean,
) => ({
  kind: SchemaFieldKind.Union,
  description,
  required,
  anyOf,
} as const);

const sessionClassDistributionProperties = {
  [SessionClass.NeuralSprint]: requiredNumber('Probability for neural sprint.'),
  [SessionClass.MusclePowerEndurance]: requiredNumber(
    'Probability for muscle power endurance.',
  ),
  [SessionClass.AnaerobicCapacity]: requiredNumber(
    'Probability for anaerobic capacity.',
  ),
  [SessionClass.RacePace]: requiredNumber('Probability for race pace.'),
  [SessionClass.AerobicBase]: requiredNumber('Probability for aerobic base.'),
  [SessionClass.ThresholdAerobicPower]: requiredNumber(
    'Probability for threshold aerobic power.',
  ),
  [SessionClass.RecoveryTechnique]: requiredNumber(
    'Probability for recovery technique.',
  ),
} as const;

const intensityDomainDistributionProperties = {
  [IntensityDomain.Low]: requiredNumber('Low-domain fraction.'),
  [IntensityDomain.Moderate]: requiredNumber('Moderate-domain fraction.'),
  [IntensityDomain.Heavy]: requiredNumber('Heavy-domain fraction.'),
  [IntensityDomain.Severe]: requiredNumber('Severe-domain fraction.'),
  [IntensityDomain.Extreme]: requiredNumber('Extreme-domain fraction.'),
} as const;

const mismatchComponentProperties = {
  [MismatchComponent.Intent]: requiredNumber('Intent mismatch component.'),
  [MismatchComponent.IntensityDomain]: requiredNumber(
    'Intensity-domain mismatch component.',
  ),
  [MismatchComponent.TechnicalDegradation]: requiredNumber(
    'Technical degradation mismatch component.',
  ),
  [MismatchComponent.Perceptual]: requiredNumber('Perceptual mismatch component.'),
  [MismatchComponent.AutonomicRecovery]: requiredNumber(
    'Autonomic recovery mismatch component.',
  ),
} as const;

const systemIndicatorProperties = {
  [InternalSystem.Neurological]: requiredNumber('Neurological system value.'),
  [InternalSystem.Muscular]: requiredNumber('Muscular system value.'),
  [InternalSystem.Cardiovascular]: requiredNumber('Cardiovascular system value.'),
} as const;

const systemFatigueProperties = {
  [InternalSystem.Neurological]: {
    kind: SchemaFieldKind.Integer,
    description: 'Neurological fatigue level on the fixed -6 to +4 scale.',
    required: true,
    minimum: -6,
    maximum: 4,
  },
  [InternalSystem.Muscular]: {
    kind: SchemaFieldKind.Integer,
    description: 'Muscular fatigue level on the fixed -6 to +4 scale.',
    required: true,
    minimum: -6,
    maximum: 4,
  },
  [InternalSystem.Cardiovascular]: {
    kind: SchemaFieldKind.Integer,
    description: 'Cardiovascular fatigue level on the fixed -6 to +4 scale.',
    required: true,
    minimum: -6,
    maximum: 4,
  },
} as const;

const systemReadinessProperties = {
  [InternalSystem.Neurological]: enumField(
    'Neurological readiness category.',
    Object.values(ReadinessCategory),
    true,
  ),
  [InternalSystem.Muscular]: enumField(
    'Muscular readiness category.',
    Object.values(ReadinessCategory),
    true,
  ),
  [InternalSystem.Cardiovascular]: enumField(
    'Cardiovascular readiness category.',
    Object.values(ReadinessCategory),
    true,
  ),
} as const;

const readinessInputsField = objectField(
  'Readiness inputs captured before or after the session.',
  {
    readinessScore: requiredNumber('Readiness score.'),
    focusScore: requiredNumber('Focus score.'),
    intensityPerception: requiredNumber('Intensity perception score.'),
    fatigueIndicators: objectField(
      'Per-system fatigue indicators.',
      systemIndicatorProperties,
      true,
    ),
  },
  true,
);

const heartRateRecoveryField = objectField(
  'Post-main-set heart-rate recovery values.',
  {
    hrAtEndMainSet: requiredNumber('Heart rate at end of main set.'),
    hrAfter1Min: optionalNumber('Heart rate after 1 minute.'),
    hrAfter3Min: optionalNumber('Heart rate after 3 minutes.'),
    hrAfter5Min: optionalNumber('Heart rate after 5 minutes.'),
    recoveryDrop: objectField(
      'Heart-rate recovery deltas.',
      {
        oneMinute: optionalNumber('One-minute recovery drop.'),
        threeMinute: optionalNumber('Three-minute recovery drop.'),
        fiveMinute: optionalNumber('Five-minute recovery drop.'),
      },
      true,
    ),
  },
  false,
);

const strokeMetricsField = objectField(
  'Stroke and efficiency metrics.',
  {
    distancePerStroke: optionalNumber('Distance per stroke.'),
    strokeLengthPerCycle: optionalNumber('Stroke length per cycle.'),
    strokeIndex: optionalNumber('Stroke index.'),
    swolf: optionalNumber('SWOLF score.'),
    strokeRate: optionalNumber('Stroke rate.'),
    strokeIndexSeries: arrayField(
      'Stroke index series.',
      requiredNumber('Stroke index sample.'),
      false,
    ),
    swolfSeries: arrayField(
      'SWOLF series.',
      requiredNumber('SWOLF sample.'),
      false,
    ),
  },
  false,
);

export const athleteUpsertPayloadSchema: PayloadSchemaDefinition<AthleteUpsertPayload> =
  {
    schemaName: 'AthleteUpsert',
    payloadType: SyncPayloadType.AthleteUpsert,
    version: '1.0.0',
    description: 'Shared athlete identity and profile contract.',
    required: ['sharedAthleteId', 'sourceAthleteId', 'sourceApp', 'profile'],
    properties: {
      sharedAthleteId: requiredString('Shared athlete identifier.', 'uuid'),
      sourceAthleteId: requiredString('Source-system athlete identifier.', 'uuid'),
      sourceApp: enumField(
        'Source application emitting the payload.',
        Object.values(SourceApp),
        true,
      ),
      externalStableKey: optionalString('Optional stable external key.'),
      profile: objectField(
        'Shareable athlete profile subset.',
        {
          givenName: requiredString('Athlete given name.'),
          familyName: requiredString('Athlete family name.'),
          dateOfBirth: optionalString('Date of birth.', 'date'),
          sex: optionalString('Optional sex field.'),
          primaryTeamId: optionalString('Optional primary team identifier.'),
          timezone: requiredString('IANA athlete timezone.', 'ianaTimeZone'),
          createdAt: requiredString('Profile creation timestamp.', 'rfc3339'),
          updatedAt: requiredString('Profile update timestamp.', 'rfc3339'),
        },
        true,
      ),
    },
  };

export const sessionPlanUpsertPayloadSchema: PayloadSchemaDefinition<SessionPlanUpsertPayload> =
  {
    schemaName: 'SessionPlanUpsert',
    payloadType: SyncPayloadType.SessionPlanUpsert,
    version: '1.0.0',
    description: 'Planned session contract shared with Swim State Pro.',
    required: [
      'sharedAthleteId',
      'planId',
      'planRevision',
      'startTimestamp',
      'timeZone',
      'poolCourse',
      'plannedTotalDistanceMeters',
      'plannedDurationMinutes',
      'intendedSessionClass',
      'intendedEnergySystemFocus',
      'intervalSets',
      'coachFocusTag',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      sharedAthleteId: requiredString('Shared athlete identifier.', 'uuid'),
      planId: requiredString('Shared plan identifier.', 'uuid'),
      planRevision: requiredInteger('Monotonic plan revision.', 1),
      startTimestamp: requiredString('Plan start timestamp.', 'rfc3339'),
      timeZone: requiredString('IANA athlete timezone.', 'ianaTimeZone'),
      poolCourse: enumField(
        'Pool-course selection.',
        Object.values(PoolCourse),
        true,
      ),
      plannedTotalDistanceMeters: requiredNumber('Planned total distance in meters.'),
      plannedDurationMinutes: requiredNumber('Planned duration in minutes.'),
      intendedSessionClass: enumField(
        'Canonical intended session class.',
        Object.values(SessionClass),
        true,
      ),
      intendedEnergySystemFocus: enumField(
        'Intended energy-system focus.',
        Object.values(EnergySystemFocus),
        true,
      ),
      intervalSets: arrayField(
        'Planned interval sets.',
        objectField(
          'Interval set definition.',
          {
            setIndex: requiredInteger('Ordinal set index.', 0),
            setLabel: requiredString('Human-readable set label.'),
            primaryStroke: requiredString('Primary stroke code.'),
            equipmentTags: arrayField(
              'Equipment tags.',
              requiredString('Equipment tag.'),
              true,
            ),
            repeatDistanceMeters: requiredNumber('Repeat distance in meters.'),
            repeatCount: requiredInteger('Repeat count.', 1),
            targetPaceSeconds: requiredNumber('Target pace in seconds.'),
            targetPaceAnchorType: {
              kind: SchemaFieldKind.Enum,
              description: 'Target pace anchor type or null.',
              required: true,
              values: Object.values(PaceAnchorType),
              nullable: true,
            },
            restSeconds: requiredNumber('Rest between repeats in seconds.'),
            blockRestSeconds: {
              kind: SchemaFieldKind.Number,
              description: 'Optional block rest in seconds.',
              required: true,
              nullable: true,
            },
            drillTag: {
              kind: SchemaFieldKind.String,
              description: 'Optional drill or skill tag.',
              required: true,
              nullable: true,
            },
            intensityDomain: enumField(
              'Target intensity domain.',
              Object.values(IntensityDomain),
              true,
            ),
          },
          true,
        ),
        true,
      ),
      coachFocusTag: unionField(
        'Coach focus tag string or tag collection.',
        [
          requiredString('Single coach focus tag.'),
          arrayField('Coach focus tag collection.', requiredString('Coach focus tag.'), true),
        ],
        true,
      ),
      notes: optionalString('Optional plan notes.'),
      createdAt: requiredString('Creation timestamp.', 'rfc3339'),
      updatedAt: requiredString('Update timestamp.', 'rfc3339'),
    },
  };

export const sessionResponseUpsertPayloadSchema: PayloadSchemaDefinition<SessionResponseUpsertPayload> =
  {
    schemaName: 'SessionResponseUpsert',
    payloadType: SyncPayloadType.SessionResponseUpsert,
    version: '1.0.0',
    description: 'Observed session response contract.',
    required: [
      'sharedAthleteId',
      'responseId',
      'responseRevision',
      'startTimestamp',
      'timeZone',
      'actualTotalDistanceMeters',
      'actualDurationMinutes',
      'sessionRPE',
      'readinessInputs',
      'dataSource',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      sharedAthleteId: requiredString('Shared athlete identifier.', 'uuid'),
      responseId: requiredString('Response identifier.', 'uuid'),
      responseRevision: requiredInteger('Response revision.', 1),
      linkedPlanId: optionalString('Optional linked plan identifier.', 'uuid'),
      startTimestamp: requiredString('Response start timestamp.', 'rfc3339'),
      timeZone: requiredString('IANA athlete timezone.', 'ianaTimeZone'),
      actualTotalDistanceMeters: requiredNumber('Actual total distance in meters.'),
      actualDurationMinutes: requiredNumber('Actual duration in minutes.'),
      sessionRPE: objectField(
        'Session RPE capture.',
        {
          value: requiredNumber('RPE value.'),
          scaleType: requiredString('RPE scale type.'),
        },
        true,
      ),
      readinessInputs: readinessInputsField,
      hooperInputs: objectField(
        'Optional Hooper inputs.',
        {
          sleepQuality: requiredNumber('Sleep quality.'),
          stress: requiredNumber('Stress score.'),
          fatigue: requiredNumber('Fatigue score.'),
          muscleSoreness: requiredNumber('Muscle soreness score.'),
        },
        false,
      ),
      heartRateSummary: objectField(
        'Optional heart-rate summary.',
        {
          averageBpm: optionalNumber('Average heart rate.'),
          peakBpm: optionalNumber('Peak heart rate.'),
          zoneDistribution: objectField(
            'Optional heart-rate zone distribution.',
            {},
            false,
            true,
          ),
        },
        false,
      ),
      postMainSetHeartRateRecovery: heartRateRecoveryField,
      strokeMetrics: strokeMetricsField,
      intervalTimes: arrayField(
        'Optional interval timing entries.',
        objectField(
          'Interval timing entry.',
          {
            setIndex: requiredInteger('Set index.', 0),
            repeatIndex: requiredInteger('Repeat index.', 0),
            distanceMeters: requiredNumber('Repeat distance in meters.'),
            seconds: requiredNumber('Observed time in seconds.'),
            restSeconds: optionalNumber('Observed rest in seconds.'),
            stroke: optionalString('Observed stroke code.'),
            techniqueTag: optionalString('Optional technique tag.'),
            heartRateBpm: optionalNumber('Optional heart-rate capture.'),
          },
          true,
        ),
        false,
      ),
      dataSource: requiredString(
        'Required data source token. Allowed values remain an unresolved lock-spec slot.',
      ),
      supersededByResponseId: optionalString(
        'Optional superseding response identifier.',
        'uuid',
      ),
      createdAt: requiredString('Creation timestamp.', 'rfc3339'),
      updatedAt: requiredString('Update timestamp.', 'rfc3339'),
    },
  };

export const derivedMetricsUpsertPayloadSchema: PayloadSchemaDefinition<DerivedMetricsUpsertPayload> =
  {
    schemaName: 'DerivedMetricsUpsert',
    payloadType: SyncPayloadType.DerivedMetricsUpsert,
    version: '1.0.0',
    description: 'Reproducible derived metrics and recommendation contract.',
    required: [
      'sharedAthleteId',
      'derivedId',
      'linkedResponseId',
      'engineVersion',
      'configVersion',
      'inputHash',
      'achievedClassDistribution',
      'achievedIntensityDomainDistribution',
      'mismatchSeverity0to100',
      'mismatchComponents0to1',
      'mismatchWeights',
      'systemLoadRaw',
      'fatigueStateAfterDecay',
      'fatigueStateAfterCoupling',
      'fatigueStateAfterAccumulation',
      'recoveryDebt',
      'systemReadinessCategory',
      'globalReadinessCategory',
      'warnings',
      'recommendationCode',
      'recommendationDetail',
      'createdAt',
    ],
    properties: {
      sharedAthleteId: requiredString('Shared athlete identifier.', 'uuid'),
      derivedId: requiredString('Derived metrics identifier.', 'uuid'),
      linkedResponseId: requiredString('Linked response identifier.', 'uuid'),
      engineVersion: requiredString('Engine version string.'),
      configVersion: requiredString('Config version string.'),
      inputHash: requiredString('Deterministic input hash.'),
      achievedClassDistribution: objectField(
        'Achieved class probability distribution.',
        sessionClassDistributionProperties,
        true,
      ),
      achievedIntensityDomainDistribution: objectField(
        'Achieved intensity-domain distribution.',
        intensityDomainDistributionProperties,
        true,
      ),
      mismatchSeverity0to100: requiredNumber('Mismatch severity score from 0 to 100.'),
      mismatchComponents0to1: objectField(
        'Normalized mismatch components.',
        mismatchComponentProperties,
        true,
      ),
      mismatchWeights: objectField(
        'Applied mismatch weights.',
        mismatchComponentProperties,
        true,
      ),
      systemLoadRaw: objectField('Raw system load vector.', systemIndicatorProperties, true),
      fatigueStateAfterDecay: objectField(
        'Fatigue state after decay.',
        systemFatigueProperties,
        true,
      ),
      fatigueStateAfterCoupling: objectField(
        'Fatigue state after coupling.',
        systemFatigueProperties,
        true,
      ),
      fatigueStateAfterAccumulation: objectField(
        'Fatigue state after accumulation.',
        systemFatigueProperties,
        true,
      ),
      recoveryDebt: requiredNumber('Recovery debt value.'),
      systemReadinessCategory: objectField(
        'Per-system readiness categories.',
        systemReadinessProperties,
        true,
      ),
      globalReadinessCategory: enumField(
        'Global readiness category.',
        Object.values(ReadinessCategory),
        true,
      ),
      warnings: arrayField(
        'Warning codes.',
        enumField('Warning code.', Object.values(WarningCode), true),
        true,
      ),
      recommendationCode: enumField(
        'Recommendation code.',
        Object.values(RecommendationCode),
        true,
      ),
      recommendationDetail: objectField(
        'Structured recommendation detail.',
        {},
        true,
        true,
      ),
      createdAt: requiredString('Creation timestamp.', 'rfc3339'),
    },
  };

export const readinessSnapshotUpsertPayloadSchema: PayloadSchemaDefinition<ReadinessSnapshotUpsertPayload> =
  {
    schemaName: 'ReadinessSnapshotUpsert',
    payloadType: SyncPayloadType.ReadinessSnapshotUpsert,
    version: '1.0.0',
    description:
      'Daily readiness snapshot contract (shared-package merge: categories are the required common denominator; -6..+4 fatigue and 0-100 scores are producer-native optionals).',
    required: [
      'sharedAthleteId',
      'snapshotDate',
      'timeZone',
      'systemReadinessCategory',
      'globalReadinessCategory',
      'createdAt',
    ],
    properties: {
      sharedAthleteId: requiredString('Shared athlete identifier.', 'uuid'),
      snapshotDate: requiredString('Snapshot local date.', 'date'),
      timeZone: requiredString('IANA timezone.', 'ianaTimeZone'),
      sport: optionalString('Sport context for multi-sport consumers.'),
      systemFatigue: objectField(
        'Per-system fatigue state (-6..+4, Olbrecht-native representation).',
        systemFatigueProperties,
        false,
      ),
      systemReadinessCategory: objectField(
        'Per-system readiness categories.',
        systemReadinessProperties,
        true,
      ),
      globalReadinessCategory: enumField(
        'Global readiness category.',
        Object.values(ReadinessCategory),
        true,
      ),
      systemScores0to100: objectField(
        'Per-system 0-100 readiness scores (Swim State Pro-native representation).',
        systemIndicatorProperties,
        false,
      ),
      compositeScore0to100: optionalNumber('Composite 0-100 readiness score.'),
      categoryBanding: optionalString(
        'Producer-documented score-to-category banding for audit.',
      ),
      psychScore0to100: optionalNumber('Optional psych score.'),
      psychVolatilityPercent: optionalNumber('Optional psych volatility.'),
      sleepScore: optionalNumber('Optional sleep score.'),
      dataQuality: objectField(
        'Producer data-quality flags and confidence level.',
        {},
        false,
        true,
      ),
      extensions: objectField(
        'Producer-specific extras that do not warrant schema changes.',
        {},
        false,
        true,
      ),
      createdAt: requiredString('Creation timestamp.', 'rfc3339'),
    },
  };

export const raceEventUpsertPayloadSchema: PayloadSchemaDefinition<RaceEventUpsertPayload> =
  {
    schemaName: 'RaceEventUpsert',
    payloadType: SyncPayloadType.RaceEventUpsert,
    version: '1.0.0',
    description: 'Race-event and taper-window contract.',
    required: [
      'sharedAthleteId',
      'raceEventId',
      'eventDate',
      'course',
      'priority',
      'targetEvents',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      sharedAthleteId: requiredString('Shared athlete identifier.', 'uuid'),
      raceEventId: requiredString('Race event identifier.', 'uuid'),
      eventDate: requiredString('Event date.', 'date'),
      course: enumField('Race course.', Object.values(PoolCourse), true),
      priority: enumField(
        'Race-event priority.',
        Object.values(RacePriority),
        true,
      ),
      targetEvents: arrayField(
        'Target event labels.',
        requiredString('Target event label.'),
        true,
      ),
      taperStartDate: optionalString('Optional taper start date.', 'date'),
      taperEndDate: optionalString('Optional taper end date.', 'date'),
      createdAt: requiredString('Creation timestamp.', 'rfc3339'),
      updatedAt: requiredString('Update timestamp.', 'rfc3339'),
    },
  };

export const syncPayloadSchemas = [
  athleteUpsertPayloadSchema,
  sessionPlanUpsertPayloadSchema,
  sessionResponseUpsertPayloadSchema,
  derivedMetricsUpsertPayloadSchema,
  readinessSnapshotUpsertPayloadSchema,
  raceEventUpsertPayloadSchema,
] as const;
