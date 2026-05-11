'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { EventRow } from '@/lib/csv';

const EVENT_LABELS: Record<string, string> = {
  api_request: 'API 요청',
  api_error: 'API 오류',
  user_prompt: '프롬프트',
  tool_result: '도구 실행',
  tool_decision: '권한 결정',
  auth: '인증',
  mcp_server_connection: 'MCP 연결',
  permission_mode_changed: '권한 변경',
};

const EVENT_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  api_error: 'destructive',
  api_request: 'default',
  user_prompt: 'secondary',
  tool_result: 'outline',
};

const TIME_RANGES = [
  { label: '전체', value: 'all' },
  { label: '1시간', value: '1h' },
  { label: '24시간', value: '24h' },
  { label: '7일', value: '7d' },
];

const PAGE_SIZES = ['10', '25', '50', '100'];

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  } catch { return iso; }
}

function fmtCost(val: string) {
  const n = parseFloat(val);
  if (!val || isNaN(n) || n === 0) return '-';
  return `$${n.toFixed(5)}`;
}

function fmtTokens(inp: string, out: string) {
  const i = parseInt(inp, 10) || 0;
  const o = parseInt(out, 10) || 0;
  if (i === 0 && o === 0) return '-';
  return `${i.toLocaleString()} / ${o.toLocaleString()}`;
}

function fmtMs(ms: string) {
  const n = parseFloat(ms);
  if (!ms || isNaN(n)) return '-';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(n)}ms`;
}

export default function EventsTable({ events }: { events: EventRow[] }) {
  const [timeRange, setTimeRange] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [pageSize, setPageSize] = useState('25');
  const [page, setPage] = useState(1);

  const eventTypes = useMemo(() => {
    const types = [...new Set(events.map(e => e.event_name).filter(Boolean))].sort();
    return types;
  }, [events]);

  const models = useMemo(() => {
    const ms = [...new Set(events.map(e => e.model).filter(Boolean))].sort();
    return ms;
  }, [events]);

  const filtered = useMemo(() => {
    let result = [...events];

    if (timeRange !== 'all') {
      const now = Date.now();
      const hoursMap: Record<string, number> = { '1h': 1, '24h': 24, '7d': 168 };
      const cutoff = now - (hoursMap[timeRange] ?? 0) * 3_600_000;
      result = result.filter(e => new Date(e.timestamp).getTime() >= cutoff);
    }
    if (eventFilter !== 'all') {
      result = result.filter(e => e.event_name === eventFilter);
    }
    if (modelFilter !== 'all') {
      result = result.filter(e => e.model === modelFilter);
    }

    return result;
  }, [events, timeRange, eventFilter, modelFilter]);

  const ps = parseInt(pageSize, 10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ps));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ps, safePage * ps);

  const resetPage = () => setPage(1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              이벤트 로그
              <span className="text-xs font-normal text-muted-foreground">
                ({filtered.length.toLocaleString()}건)
              </span>
            </CardTitle>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={timeRange} onValueChange={(v) => { setTimeRange(v); resetPage(); }}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="시간" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v); resetPage(); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="이벤트" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">모든 이벤트</SelectItem>
                {eventTypes.map(t => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {EVENT_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={modelFilter} onValueChange={(v) => { setModelFilter(v); resetPage(); }}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="모델" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">모든 모델</SelectItem>
                {models.map(m => (
                  <SelectItem key={m} value={m} className="text-xs truncate">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={pageSize} onValueChange={(v) => { setPageSize(v); resetPage(); }}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{s}개씩</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {paginated.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10 px-6">
            {events.length === 0
              ? '이벤트 없음 — Claude Code를 실행하면 여기에 표시됩니다'
              : '필터 조건에 맞는 이벤트가 없습니다'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-36">시간</TableHead>
                  <TableHead>이벤트</TableHead>
                  <TableHead>모델</TableHead>
                  <TableHead>비용</TableHead>
                  <TableHead>입력 / 출력 토큰</TableHead>
                  <TableHead>소요 시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((ev, i) => (
                  <TableRow key={i} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {fmtTime(ev.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={EVENT_VARIANTS[ev.event_name] ?? 'outline'} className="text-xs">
                        {EVENT_LABELS[ev.event_name] ?? ev.event_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-36 truncate">
                      {ev.model || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {fmtCost(ev.cost_usd)}
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {fmtTokens(ev.input_tokens, ev.output_tokens)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {fmtMs(ev.duration_ms)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
            <span className="text-xs text-muted-foreground">
              {((safePage - 1) * ps + 1).toLocaleString()}–{Math.min(safePage * ps, filtered.length).toLocaleString()} / {filtered.length.toLocaleString()}건
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2 tabular-nums">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
