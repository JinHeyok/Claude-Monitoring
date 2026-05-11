'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

type TokenDataPoint = { type: string; tokens: number };

const LABELS: Record<string, string> = {
  input: '입력',
  output: '출력',
  cacheRead: '캐시 읽기',
  cacheCreation: '캐시 생성',
};

const BAR_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
];

const chartConfig = {
  tokens: { label: '토큰' },
} satisfies ChartConfig;

export default function TokenChart({ data }: { data: TokenDataPoint[] }) {
  const display = data
    .filter(d => d.tokens > 0)
    .map((d, i) => ({ ...d, label: LABELS[d.type] ?? d.type, color: BAR_COLORS[i % BAR_COLORS.length] }));

  if (display.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">토큰 사용량</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          데이터 없음 — Claude Code를 실행하면 여기에 표시됩니다
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">토큰 사용량</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart data={display} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              width={48}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [Number(value).toLocaleString(), '토큰']}
                />
              }
            />
            <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
              {display.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {display.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm inline-block" style={{ backgroundColor: entry.color }} />
              {entry.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
