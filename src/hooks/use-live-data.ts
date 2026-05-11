'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardData } from '@/lib/dashboard';

export function useLiveData(range: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [connected, setConnected] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setConnected(false);
    const es = new EventSource(`/api/stream?range=${encodeURIComponent(range)}`);

    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        setData(JSON.parse(e.data) as DashboardData);
      } catch {}
    };
    es.onerror = () => setConnected(false);

    return () => es.close();
  }, [range, refreshKey]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return { data, connected, refresh };
}
