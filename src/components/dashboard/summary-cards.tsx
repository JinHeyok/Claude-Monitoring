'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, DollarSign, Terminal, Clock } from 'lucide-react';

type Props = {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  activeTimeSeconds: number;
};

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtTime(s: number) {
  if (s >= 3600) return `${(s / 3600).toFixed(1)}h`;
  if (s >= 60) return `${(s / 60).toFixed(1)}m`;
  return `${Math.round(s)}s`;
}

export default function SummaryCards({ totalCost, totalTokens, totalSessions, activeTimeSeconds }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">사용한 토큰량</CardTitle>
          <Zap className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{fmtTokens(totalTokens)}</p>
          <p className="text-xs text-muted-foreground mt-1">tokens</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">사용한 비용</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
          <p className="text-xs text-muted-foreground mt-1">USD</p>
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
