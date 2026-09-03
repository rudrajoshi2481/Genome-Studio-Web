"use client";

import { useState, useEffect, useCallback } from 'react';
import { checkHubHealth, HubHealth } from '@/lib/services/package-manager-service';

/**
 * Polls the Extension Hub service health endpoint.
 * Returns { isConnected, health, refresh }.
 *
 * When the hub is offline, the UI can still manage locally installed
 * packages — only browse/publish/login require the hub.
 */
export function useHubHealth(intervalMs: number = 15000) {
  const [health, setHealth] = useState<HubHealth>({ connected: false, hub_url: '' });
  const [isChecking, setIsChecking] = useState(true);

  const refresh = useCallback(async () => {
    const result = await checkHubHealth();
    setHealth(result);
    setIsChecking(false);
    return result;
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return {
    isConnected: health.connected,
    health,
    isChecking,
    refresh,
  };
}
