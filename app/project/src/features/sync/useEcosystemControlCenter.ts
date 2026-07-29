import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ConnectionSettingsManager,
  LocalStorageConnectionSettingsStorage,
} from '@/adapters';
import { SyncPayloadType } from '@/domain';
import type {
  ConnectionChange,
  EcosystemStatus,
} from '@/ecosystem-control-center';

const API_BASE_URL = (
  import.meta.env?.VITE_OLBRECHT_API_URL ?? 'http://127.0.0.1:4000'
).replace(/\/$/, '');

function mergeLocalSettings(
  status: EcosystemStatus,
  settings: ReturnType<ConnectionSettingsManager['load']>,
): EcosystemStatus {
  return {
    ...status,
    connections: [
      ...status.connections.filter((report) => report.app !== 'olbrechtSystem'),
      {
        app: 'olbrechtSystem',
        settings: {
          version: settings.version,
          outbound: settings.outbound,
          inbound: settings.inbound,
          updatedAt: settings.updatedAt,
        },
        reportedAt: settings.updatedAt,
      },
    ],
  };
}

export function useEcosystemControlCenter() {
  const manager = useMemo(
    () =>
      new ConnectionSettingsManager({
        storage: new LocalStorageConnectionSettingsStorage(),
      }),
    [],
  );
  const [status, setStatus] = useState<EcosystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ecosystem/status`);
      const body = (await response.json()) as EcosystemStatus | { error?: string };
      if (!response.ok) {
        throw new Error(
          'error' in body && body.error
            ? body.error
            : `Status request failed (${response.status}).`,
        );
      }
      setStatus(
        mergeLocalSettings(body as EcosystemStatus, manager.load()),
      );
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Live ecosystem status is unavailable.',
      );
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const setConnection = useCallback(
    async (change: ConnectionChange) => {
      if (
        !Object.values(SyncPayloadType).includes(
          change.payloadType as SyncPayloadType,
        )
      ) {
        return;
      }
      const settings = manager.setConnectionState(
        change.direction,
        change.payloadType as SyncPayloadType,
        change.state,
      );
      setStatus((current) =>
        current ? mergeLocalSettings(current, settings) : current,
      );
      try {
        await fetch(`${API_BASE_URL}/api/ecosystem/connections`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
      } catch {
        // Local enforcement is authoritative; hub mirroring is best effort.
      }
    },
    [manager],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, error, refresh, setConnection };
}
