/**
 * Sync surface — consumed from the shared ecosystem contracts package.
 *
 * This app donated its sync domain (envelopes, payload types, identity links)
 * to `@ecosystem/contracts` (INTEGRATION_PLAN.md, ratified decision 3) and now
 * consumes it back from the vendored copy in `src/ecosystem-contracts/`
 * (milestone oet-donate-sync-domain). Do not redefine these types here —
 * re-vendor when the shared package changes.
 *
 * Local session sub-types (IntervalSet, HeartRateSummary, …) remain in
 * `./session` and are structurally identical to the contract versions.
 */
export type {
  SharedAthleteLink,
  SharedSessionLink,
  CanonicalAthleteCreateRequest,
  CanonicalAthleteRecord,
} from '@/ecosystem-contracts/identity';

export type {
  AthleteUpsertProfile,
  AthleteUpsertPayload,
  SessionPlanUpsertPayload,
  SessionResponseUpsertPayload,
  RaceEventUpsertPayload,
} from '@/ecosystem-contracts/payloads/session';

export type { DerivedMetricsUpsertPayload } from '@/ecosystem-contracts/payloads/derived';

export type {
  ReadinessSnapshotUpsertPayload,
  ReadinessDataQuality,
} from '@/ecosystem-contracts/payloads/readiness';

export type {
  BiomechReportUpsertPayload,
  MovementRedFlagUpsertPayload,
} from '@/ecosystem-contracts/payloads/biomech';

export type { ObservationUpsertPayload } from '@/ecosystem-contracts/payloads/observation';

export type {
  SyncPayloadMap,
  SyncPayload,
  SyncEnvelope,
  AnySyncEnvelope,
  SyncPushResult,
  SyncPushRequest,
  SyncPushResponse,
  SyncPullRequest,
  SyncPullResponse,
} from '@/ecosystem-contracts/envelope';
