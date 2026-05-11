'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ModelStat } from '@/lib/dashboard';
import { Cpu } from 'lucide-react';

const BAR_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

const chartConfig = { cost: { label: '비용 (USD)' } } satisfies ChartConfig;

function shortModelName(model: string) {
  const m = model.match(/claude-(\w+)-(\d+)-(\d+)/);
  if (m) return `${m[1].slice(0, 7)}-${m[2]}.${m[3]}`;
  if (model.length > 14) return model.slice(-14);
  return model;
}

export default function ModelChart({ data }: { data: ModelStat[] }) {
  const display = data.map((d, i) => ({
    ...d,
    label: shortModelName(d.model),
    color: BAR_COLORS[i % BAR_COLORS.length],
  }));

  if (display.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            모델별 비용
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          데이터 없음
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          모델별 비용
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart data={display} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `$${v.toFixed(3)}`}
              width={56}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, props) => [
                    `$${Number(value).toFixed(5)}  ·  ${(props.payload as ModelStat).requests}회`,
                    '비용',
                  ]}
                />
              }
            />
            <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
              {display.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
