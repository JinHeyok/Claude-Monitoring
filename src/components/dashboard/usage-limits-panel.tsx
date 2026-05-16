'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, AlertTriangle, Clock } from 'lucide-react';

type Limits = {
  available: boolean;
  stale?: boolean;
  ageMs?: number;
  cachedAt?: number;
  model?: string | null;
  project?: string | null;
  context?: number | null;
  costUsd?: number | null;
  fiveHour?: { usedPercent: number | null; resetsAt: number | null };
  sevenDay?: { usedPercent: number | null; resetsAt: number | null };
  message?: string;
};

function formatResetIn(resetsAt: number | null | undefined): string {
  if (!resetsAt) return '';
  const diff = resetsAt - Date.now();
  if (diff <= 0) return '곧 리셋';
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return `${mins}분`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
  }
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}

function barColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return 'bg-muted';
  if (pct >= 90) return 'bg-destructive';
  if (pct >= 70) return 'bg-orange-500';
  if (pct >= 40) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function UsageRow({
  label,
  pct,
  resetsAt,
}: {
  label: string;
  pct: number | null | undefined;
  resetsAt: number | null | undefined;
}) {
  const value = pct ?? 0;
  const reset = formatResetIn(resetsAt);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-medium w-16">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-mono font-semibold ${pct === null || pct === undefined ? 'text-muted-foreground' : ''}`}>
            {pct === null || pct === undefined ? '--' : `${pct}%`}
          </span>
          {reset && (
            <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
              <Clock className="h-3 w-3" />
              {reset}
            </span>
          )}
        </div>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export default function UsageLimitsPanel() {
  const [data, setData] = useState<Limits | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/usage/limits', { cache: 'no-store' });
        const json = (await res.json()) as Limits;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ available: false, message: '로드 실패' });
      }
    };
    fetchData();
    const id = setInterval(fetchData, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            Claude 한도 (공식)
          </span>
          {data?.model && (
            <span className="text-xs font-normal text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              {data.model}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!data && (
          <div className="text-xs text-muted-foreground">로드 중…</div>
        )}

        {data && !data.available && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{data.message ?? '캐시 없음. Claude Code에서 메시지를 보내면 자동 갱신됩니다.'}</span>
          </div>
        )}

        {data && data.available && (
          <>
            {data.stale && (
              <div className="flex items-center gap-1.5 text-[11px] text-orange-500">
                <AlertTriangle className="h-3 w-3" />
                Stale 캐시 ({Math.round((data.ageMs ?? 0) / 60_000)}분 전)
              </div>
            )}
            <UsageRow
              label="Context"
              pct={data.context}
              resetsAt={null}
            />
            <UsageRow
              label="5h"
              pct={data.fiveHour?.usedPercent}
              resetsAt={data.fiveHour?.resetsAt}
            />
            <UsageRow
              label="Weekly"
              pct={data.sevenDay?.usedPercent}
              resetsAt={data.sevenDay?.resetsAt}
            />
            {data.costUsd !== null && data.costUsd !== undefined && (
              <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t">
                <span>세션 비용</span>
                <span className="font-mono">${data.costUsd.toFixed(4)}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
