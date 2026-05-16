'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Timer, Terminal, Clock } from 'lucide-react';

type Props = {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  activeTimeSeconds: number;
};

type LimitsSnap = {
  available: boolean;
  fiveHour?: { usedPercent: number | null };
  sevenDay?: { usedPercent: number | null };
};

function fmtTime(s: number) {
  if (s >= 3600) return `${(s / 3600).toFixed(1)}h`;
  if (s >= 60) return `${(s / 60).toFixed(1)}m`;
  return `${Math.round(s)}s`;
}

export default function SummaryCards({ totalSessions, activeTimeSeconds }: Props) {
  const [limits, setLimits] = useState<LimitsSnap | null>(null);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const res = await fetch('/api/usage/limits', { cache: 'no-store' });
        setLimits((await res.json()) as LimitsSnap);
      } catch {}
    };
    fetchLimits();
    const id = setInterval(fetchLimits, 15_000);
    return () => clearInterval(id);
  }, []);

  const weeklyRemaining =
    limits?.available && limits.sevenDay?.usedPercent != null
      ? 100 - limits.sevenDay.usedPercent
      : null;

  const fiveHourRemaining =
    limits?.available && limits.fiveHour?.usedPercent != null
      ? 100 - limits.fiveHour.usedPercent
      : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Weekly 남은 한도</CardTitle>
          <BarChart3 className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {weeklyRemaining != null ? `${weeklyRemaining}%` : '--'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">weekly remaining</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">5h 남은 한도</CardTitle>
          <Timer className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {fiveHourRemaining != null ? `${fiveHourRemaining}%` : '--'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">5h remaining</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">세션 수</CardTitle>
          <Terminal className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{String(totalSessions)}</p>
          <p className="text-xs text-muted-foreground mt-1">sessions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">활성 시간</CardTitle>
          <Clock className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{fmtTime(activeTimeSeconds)}</p>
          <p className="text-xs text-muted-foreground mt-1">active</p>
        </CardContent>
      </Card>
    </div>
  );
}
