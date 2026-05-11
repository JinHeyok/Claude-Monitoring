'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ToolStat } from '@/lib/dashboard';
import { Wrench } from 'lucide-react';

const chartConfig = { count: { label: '사용 횟수', color: 'var(--chart-3)' } } satisfies ChartConfig;

function shortToolName(tool: string) {
  if (tool.includes('__')) return tool.split('__').pop() ?? tool;
  return tool;
}

export default function ToolChart({ data }: { data: ToolStat[] }) {
  const display = data.map(d => ({ ...d, label: shortToolName(d.tool) }));

  if (display.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            툴 사용 빈도
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
          <Wrench className="h-4 w-4 text-muted-foreground" />
          툴 사용 빈도 (Top {display.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart
            data={display}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              width={72}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [Number(value).toLocaleString(), '횟수']}
                />
              }
            />
            <Bar dataKey="count" fill="var(--chart-3)" fillOpacity={0.85} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
