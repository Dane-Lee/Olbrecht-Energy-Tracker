/**
 * HubSyncAdapter — the concrete SwimStateProSyncAdapter (milestone
 * oet-implement-sync-adapter).
 *
 * Transport is hub-and-spoke through AthleteOS (ratified INTEGRATION_PLAN.md
 * Section 3.2): envelopes push to POST /api/sync/push and pull from
 * GET /api/sync/pull, authenticated with this app's olbrechtSystem service
 * key. Swim State Pro data arrives *through the hub*, not from Swim State
 * directly — the adapter name is kept for the engineering-lock contract.
 *
 * Environment-agnostic: configuration is injected, fetch is injectable for
 * tests, and nothing here touches import.meta.env or the DOM.
 *
 * Connection switchboard (milestone eco-connection-settings): pulls are
 * gated per requested payload type via inboundState/shouldTransmit — only
 * 'on' pulls; 'pause'/'off' skip the network call entirely so the hub-held
 * cursor never advances past envelopes this app didn't fetch, meaning
 * flipping back to 'on' resumes with nothing lost. Settings mirror to the
 * hub via reportConnectionSettings so a future Control Center can render
 * this app's switchboard; that call is purely cosmetic reporting, never
 * enforcement.
 */
import type {
  AnySyncEnvelope,
  SharedAthleteLink,
  SharedSessionLink,
  SyncPullResponse,
  SyncPushResult,
  UUID,
} from '@/domain';
import { SyncPayloadType } from '@/domain';
import {
  DEFAULT_CONNECTION_SETTINGS,
  inboundState,
  shouldTransmit,
  type ConnectionSettings,
} from '@/ecosystem-contracts/connections';
import type { ConnectionSettingsReader } from './connection-settings.adapter';
import type { SwimStateProSyncAdapter, SyncPushResult as LegacySyncPushResult } from './swim-state-pro.adapter';

const OPEN_CONNECTION_SETTINGS: ConnectionSettingsReader = {
  load: () => DEFAULT_CONNECTION_SETTINGS,
};

export interface HubSyncAdapterOptions {
  /** AthleteOS hub base URL, e.g. http://localhost:3001 */
  hubUrl: string;
  /** olbrechtSystem service key issued by the hub (x-service-key header). */
  serviceKey: string;
  fetchImpl?: typeof fetch;
  /**
   * Connection switchboard reader; defaults to fully open (every payload
   * type 'on') so adapters that never receive one pull exactly as before
   * this feature existed (ecosystem rule 1).
   */
  connectionSettings?: ConnectionSettingsReader;
}

export class HubSyncError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'HubSyncError';
  }
}

export class HubSyncAdapter implements SwimStateProSyncAdapter {
  private readonly hubUrl: string;
  private readonly serviceKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly connectionSettings: ConnectionSettingsReader;

  /** Session links have no hub endpoint yet; they are held locally. */
  private readonly localSessionLinks = new Map<UUID, SharedSessionLink>();

  constructor(options: HubSyncAdapterOptions) {
    this.hubUrl = options.hubUrl.replace(/\/$/, '');
    this.serviceKey = options.serviceKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.connectionSettings = options.connectionSettings ?? OPEN_CONNECTION_SETTINGS;
  }

  async push(envelope: AnySyncEnvelope): Promise<LegacySyncPushResult> {
    const [result] = await this.pushBatch([envelope]);
    return result;
  }

  async pushBatch(envelopes: readonly AnySyncEnvelope[]): Promise<readonly SyncPushResult[]> {
    const response = await this.request('POST', '/api/sync/push', { envelopes });
    const body = (await response.json()) as { results?: SyncPushResult[] };
    if (!Array.isArray(body.results) || body.results.length !== envelopes.length) {
      throw new HubSyncError('Hub push returned a malformed results array.');
    }
    return body.results;
  }

  /**
   * Interface-compat pull: `timestamp` is treated as the hub's opaque cursor
   * (the hub paginates by cursor, not by wall-clock time). Drains every page.
   */
  async pullSince(cursor?: string): Promise<readonly AnySyncEnvelope[]> {
    const collected: AnySyncEnvelope[] = [];
    let since = cursor;

    for (;;) {
      const page = await this.pullPage({ since });
      collected.push(...page.envelopes);
      if (!page.hasMore) break;
      since = page.nextCursor;
    }

    return collected;
  }

  /**
   * Connection switchboard: when the caller names specific payload types,
   * any currently 'pause'/'off' for inbound are dropped from the request
   * before it goes out. If every requested type is gated, the network call
   * is skipped entirely and the cursor is echoed back unchanged — so the hub
   * retains everything and flipping back to 'on' resumes with nothing lost.
   * An unfiltered pull (no payloadTypes given) is not gated here: there is no
   * existing caller today that fetches "everything", and guessing a default
   * type universe to filter against would fabricate behavior beyond what a
   * real caller has asked for.
   */
  async pullPage(options: {
    since?: string;
    payloadTypes?: readonly SyncPayloadType[];
    limit?: number;
  } = {}): Promise<SyncPullResponse> {
    let requestedTypes = options.payloadTypes;

    if (requestedTypes && requestedTypes.length > 0) {
      const settings = this.connectionSettings.load();
      const allowedTypes = requestedTypes.filter((type) => shouldTransmit(inboundState(settings, type)));
      if (allowedTypes.length === 0) {
        return { envelopes: [], nextCursor: options.since ?? '', hasMore: false };
      }
      requestedTypes = allowedTypes;
    }

    const params = new URLSearchParams();
    if (options.since) params.set('since', options.since);
    if (options.limit) params.set('limit', String(options.limit));
    if (requestedTypes?.length) params.set('types', requestedTypes.join(','));

    const query = params.toString();
    const response = await this.request('GET', `/api/sync/pull${query ? `?${query}` : ''}`);
    return (await response.json()) as SyncPullResponse;
  }

  /**
   * Mirrors this app's connection switchboard to the hub (PUT
   * /api/ecosystem/connections) so a future Control Center panel can render
   * every app's flows from one place. Purely cosmetic — enforcement of the
   * switchboard already happens locally in pullPage/SyncOutbox regardless of
   * whether this call ever succeeds.
   */
  async reportConnectionSettings(settings: ConnectionSettings): Promise<void> {
    await this.request('PUT', '/api/ecosystem/connections', settings);
  }

  /**
   * Ensures the hub registry holds this app's mapping for the athlete. The
   * hub is authoritative for canonical IDs: if it resolves to a different
   * sharedAthleteId than the link claims, this throws so the caller can
   * reconcile instead of silently forking identity.
   */
  async linkAthlete(link: SharedAthleteLink): Promise<void> {
    const response = await this.request('POST', '/api/registry/athletes', {
      sourceAthleteId: link.sourceAthleteId,
      externalStableKey: link.externalStableKey,
      matchMethod: link.matchMethod,
    });
    const body = (await response.json()) as { sharedAthleteId?: UUID };

    if (body.sharedAthleteId && body.sharedAthleteId !== link.sharedAthleteId) {
      throw new HubSyncError(
        `Hub resolves athlete ${link.sourceAthleteId} to ${body.sharedAthleteId}, not ${link.sharedAthleteId}.`,
      );
    }
  }

  /**
   * Registers the session link on the hub registry (POST
   * /api/registry/sessions, idempotent per source app + session + type).
   * The link is also cached locally so correlation keeps working while the
   * hub is unreachable; the local copy adopts the hub's sharedObjectId when
   * they differ (hub is authoritative for shared identity).
   */
  async linkSession(link: SharedSessionLink): Promise<void> {
    this.localSessionLinks.set(link.sourceSessionId, link);

    const response = await this.request('POST', '/api/registry/sessions', {
      sharedAthleteId: link.sharedAthleteId,
      sourceSessionId: link.sourceSessionId,
      sessionLinkType: link.sessionLinkType,
      sharedObjectId: link.sharedObjectId,
      linkedPlanId: link.linkedPlanId,
      linkedResponseId: link.linkedResponseId,
    });
    const body = (await response.json()) as { sharedObjectId?: UUID };
    if (body.sharedObjectId && body.sharedObjectId !== link.sharedObjectId) {
      this.localSessionLinks.set(link.sourceSessionId, {
        ...link,
        sharedObjectId: body.sharedObjectId,
      });
    }
  }

  getLocalSessionLink(sourceSessionId: UUID): SharedSessionLink | undefined {
    return this.localSessionLinks.get(sourceSessionId);
  }

  private async request(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.hubUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': this.serviceKey,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new HubSyncError(
        `Hub unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new HubSyncError(
        `Hub ${method} ${path} failed (${response.status}): ${await response.text()}`,
        response.status,
      );
    }

    return response;
  }
}
