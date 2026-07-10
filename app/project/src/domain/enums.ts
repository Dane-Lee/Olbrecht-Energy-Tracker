/**
 * Ecosystem-shared enums are consumed from the vendored contracts package so
 * this app and the sync surface share ONE enum identity (milestone
 * oet-donate-sync-domain — this app donated these definitions; the shared
 * package extends SourceApp to all 7 apps and SyncPayloadType with the
 * biomech/observation payloads).
 *
 * Enums below the re-export block are local to this app and are NOT part of
 * the cross-app contract.
 */
export {
  SourceApp,
  InternalSystem,
  SessionClass,
  IntensityDomain,
  PoolCourse,
  EnergySystemFocus,
  PaceAnchorType,
  ReadinessCategory,
  MismatchComponent,
  RecommendationCode,
  WarningCode,
  SyncPayloadType,
  RacePriority,
  SessionLinkType,
  SportContext,
  MovementRedFlagSeverity,
} from '@/ecosystem-contracts/enums';

export enum CalibrationMode {
  None = 'none',
  Isotonic = 'isotonic',
  Dirichlet = 'dirichlet',
}

export enum MismatchBand {
  Low = 'low',
  Moderate = 'moderate',
  High = 'high',
  Critical = 'critical',
}

export enum RecommendationConstraint {
  Safety = 'safety',
  Competition = 'competition',
  Mismatch = 'mismatch',
  DataQuality = 'dataQuality',
}
