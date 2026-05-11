'use client';

import { useState } from 'react';
import { useLiveData } from '@/hooks/use-live-data';
import SummaryCards from '@/components/dashboard/summary-cards';
import CostChart from '@/components/dashboard/cost-chart';
import TokenChart from '@/components/dashboard/token-chart';
import ModelChart from '@/components/dashboard/model-chart';
import ToolChart from '@/components/dashboard/tool-chart';
import EventsTable from '@/components/dashboard/events-table';
import BudgetPanel from '@/components/dashboard/budget-panel';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const RANGES = [
  { label: '오늘', value: '1d' },
  { label: '7일', value: '7d' },
  { label: '30일', value: '30d' },
  { label: '전체', value: 'all' },
] as const;

export default function Home() {
  const [range, setRange] = useState<string>('7d');
  const { data, connected, refresh } = useLiveData(range);

  return (
    <main className="min-h-screen bg-background dashboard-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-4)] to-[var(--chart-2)]" />
          <div className="px-6 pt-6 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br from-[var(--chart-1)]/10 to-[var(--chart-4)]/10">
                  <Activity className="h-5 w-5 text-[var(--chart-1)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold tracking-tight">Claude Code 모니터링</h1>
                    {connected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Wifi className="h-3 w-3" />
                        실시간
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                        <WifiOff className="h-3 w-3" />
                        연결 중
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    OpenTelemetry 기반 사용량 · 비용 · 도구 활동 추적
                  </p>
                </div>
              </div>

              {/* Range selector + refresh */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="flex rounded-lg border overflow-hidden text-xs">
                  {RANGES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRange(r.value)}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        range === r.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  className="h-8"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  새로고침
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {!data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card h-28 animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <SummaryCards
              totalCost={data.totalCost}
              totalTokens={data.totalTokens}
              totalSessions={data.totalSessions}
              activeTimeSeconds={data.activeTimeSeconds}
              prevCost={data.prevCost}
              prevTokens={data.prevTokens}
            />

            {/* Budget panel */}
            <BudgetPanel todayCost={data.todayCost} />

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CostChart data={data.costData} />
              <TokenChart data={data.tokenData} />
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ModelChart data={data.modelData} />
              <ToolChart data={data.toolData} />
            </div>

            {/* Events table */}
            <EventsTable events={data.events} />

            {/* Setup guide */}
            {data.events.length === 0 && data.totalCost === 0 && (
              <div className="relative overflow-hidden rounded-xl border bg-card p-6 space-y-4">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--chart-3)] to-[var(--chart-2)]" />
                <div>
                  <h2 className="font-semibold text-sm">Claude Code 연결 설정</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    아래 환경 변수를 설정하고 claude 명령을 실행하세요:
                  </p>
                </div>
                <pre className="text-xs bg-muted/50 rounded-lg p-4 overflow-x-auto border font-mono leading-relaxed">
{`export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:3000/api/otlp/metrics
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:3000/api/otlp/logs
export OTEL_METRIC_EXPORT_INTERVAL=10000
export OTEL_LOGS_EXPORT_INTERVAL=5000`}
                </pre>
                <p className="text-xs text-muted-foreground">
                  영구 설정을 원하면{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs border">~/.claude/settings.json</code>
                  {' '}의{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs border">env</code>
                  {' '}필드에 추가하세요.
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 pb-2 text-xs text-muted-foreground/60">
          <span>Claude Code Monitoring Dashboard</span>
          <span className="flex items-center gap-2">
            {data && (
              <span>업데이트: {new Date(data.lastUpdated).toLocaleTimeString('ko-KR')}</span>
            )}
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--chart-1)]" />
              OpenTelemetry · Next.js 15 · SSE
            </span>
          </span>
        </div>
      </div>
    </main>
  );
}
