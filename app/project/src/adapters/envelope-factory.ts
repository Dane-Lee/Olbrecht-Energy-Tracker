/**
 * Envelope factory — wraps contract payloads in the shared wire format
 * (milestone oet-publish-session-envelopes).
 *
 * Every outbound object (SessionPlan, SessionResponse, DerivedMetrics,
 * ReadinessSnapshot, RaceEvent, Athlete) goes through here so the source app,
 * schema versions, and idempotency key are stamped uniformly.
 */
import type { AnySyncEnvelope, SyncEnvelope, SyncPayloadMap } from '@/domain';
import { SourceApp, SyncPayloadType } from '@/domain';
import { SYNC_SCHEMA_VERSION } from '@/ecosystem-contracts/envelope';
import { PAYLOAD_SCHEMA_VERSION } from '@/engine';

function generateIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  // RFC 4122-shaped fallback for environments without crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export interface EnvelopeOptions {
  /** Stable key for retries; generated when omitted. */
  idempotencyKey?: string;
  externalTraceId?: string;
  exportedAt?: string;
}

export function createEnvelope<TType extends SyncPayloadType>(
  payloadType: TType,
  payload: SyncPayloadMap[TType],
  options: EnvelopeOptions = {},
): SyncEnvelope<TType> {
  return {
    syncSchemaVersion: SYNC_SCHEMA_VERSION,
    sourceApp: SourceApp.OlbrechtSystem,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    idempotencyKey: options.idempotencyKey ?? generateIdempotencyKey(),
    payloadType,
    payload,
    payloadSchemaVersion: PAYLOAD_SCHEMA_VERSION,
    externalTraceId: options.externalTraceId,
  };
}

export function createSessionPlanEnvelope(
  payload: SyncPayloadMap[SyncPayloadType.SessionPlanUpsert],
  options?: EnvelopeOptions,
): AnySyncEnvelope {
  return createEnvelope(SyncPayloadType.SessionPlanUpsert, payload, options);
}

export function createSessionResponseEnvelope(
  payload: SyncPayloadMap[SyncPayloadType.SessionResponseUpsert],
  options?: EnvelopeOptions,
): AnySyncEnvelope {
  return createEnvelope(SyncPayloadType.SessionResponseUpsert, payload, options);
}

export function createDerivedMetricsEnvelope(
  payload: SyncPayloadMap[SyncPayloadType.DerivedMetricsUpsert],
  options?: EnvelopeOptions,
): AnySyncEnvelope {
  return createEnvelope(SyncPayloadType.DerivedMetricsUpsert, payload, options);
}
