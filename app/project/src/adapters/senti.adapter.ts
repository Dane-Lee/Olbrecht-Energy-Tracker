/**
 * Fail-silent SentiOS signal emission (module: OlbrechtEngine).
 *
 * SentiOS is the ecosystem's read-only monitoring layer; emission must never
 * affect app behavior, so every call swallows its own errors. Required events
 * per SentiOS/src/shared/modules.ts: lactate_value_recorded, profile_updated,
 * athlete_os_export_success, athlete_os_export_fail, olbrecht_engine_heartbeat.
 *
 * Environment-agnostic: options-injected, no import.meta.env / DOM access.
 */

export type SentiCategory = 'operational' | 'sync' | 'heartbeat';

export interface SentiEmitterOptions {
  /** SentiOS local API base URL; defaults to the standard local port. */
  baseUrl?: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export class SentiEmitter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: SentiEmitterOptions) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:4777').replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  emit(event: string, category: SentiCategory, overrides: Record<string, unknown> = {}): void {
    const signal = {
      module: 'OlbrechtEngine',
      event,
      category,
      inbound: true,
      outbound: true,
      routing: 'complete',
      latency: 0,
      integrity: { ok: true },
      ts: new Date().toISOString(),
      optionalMetadata: { version: 'olbrecht-energy-tracker' },
      ...overrides,
    };

    void this.fetchImpl(`${this.baseUrl}/senti/signal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sentios-api-key': this.apiKey,
      },
      body: JSON.stringify(signal),
    }).catch(() => {
      /* Monitoring only — never disrupt the app. */
    });
  }

  reportPushOutcome(accepted: number, transportFailed: boolean, detail?: string): void {
    if (transportFailed) {
      this.emit('athlete_os_export_fail', 'sync', {
        routing: 'incomplete',
        integrity: { ok: false, details: detail ?? 'hub unreachable' },
      });
    } else {
      this.emit('athlete_os_export_success', 'sync', {
        optionalMetadata: { version: 'olbrecht-energy-tracker', opTime: accepted },
      });
    }
  }

  startHeartbeat(intervalMs = 45_000): void {
    if (this.heartbeatTimer) return;
    this.emit('olbrecht_engine_heartbeat', 'heartbeat');
    this.heartbeatTimer = setInterval(
      () => this.emit('olbrecht_engine_heartbeat', 'heartbeat'),
      intervalMs,
    );
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
