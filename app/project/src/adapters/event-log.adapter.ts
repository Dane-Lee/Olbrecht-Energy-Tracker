import type { AnySyncEnvelope, Rfc3339Timestamp, UUID } from '@/domain';

export interface DomainEvent {
  eventId: UUID;
  aggregateId: UUID;
  aggregateType: string;
  eventType: string;
  occurredAt: Rfc3339Timestamp;
  payload: Readonly<Record<string, unknown>>;
  syncEnvelope?: AnySyncEnvelope;
}

export interface EventLogAdapter {
  append(event: DomainEvent): Promise<void>;
  listByAggregate(aggregateId: UUID): Promise<readonly DomainEvent[]>;
  exportEnvelopes(since?: Rfc3339Timestamp): Promise<readonly AnySyncEnvelope[]>;
}
