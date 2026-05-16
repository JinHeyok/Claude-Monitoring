'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bell, BellOff, Zap } from 'lucide-react';

const STORAGE_KEY = 'cc_token_budget_v2';

type State = {
  alertPct: number;
  alertEnabled: boolean;
  notifiedDates: Record<string, boolean>;
};

type LimitsSnap = {
  available: boolean;
  fiveHour?: { usedPercent: number | null; resetsAt: number | null };
};

function formatResetIn(resetsAt: number | null | undefined): string {
  if (!resetsAt) return '';
  const diff = resetsAt - Date.now();
  if (diff <= 0) return '곧 리셋';
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return `${mins}분`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...{ alertPct: 80, alertEnabled: false, notifiedDates: {} }, ...JSON.parse(raw) as State };
  } catch {}
  return { alertPct: 80, alertEnabled: false, notifiedDates: {} };
}

function save(state: State) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function TokenBudgetPanel() {
  const [state, setState] = useState<State | null>(null);
  const [alertPctInput, setAlertPctInput] = useState('80');
  const [limits, setLimits] = useState<LimitsSnap | null>(null);

  useEffect(() => {
    const s = load();
    setState(s);
    setAlertPctInput(String(s.alertPct));
  }, []);

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

  const fiveHourUsedPct = limits?.available ? (limits.fiveHour?.usedPercent ?? null) : null;

  const checkAlert = useCallback((s: State, usedPct: number | null) => {
    if (!s.alertEnabled || usedPct === null || usedPct < s.alertPct) return;
    const today = new Date().toISOString().slice(0, 10);
    if (s.notifiedDates[today]) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Claude Code 5h 임계치 도달', {
        body: `5시간 사용량 ${usedPct}% → 알림 기준 ${s.alertPct}% 초과`,
        icon: '/favicon.ico',
      });
      const updated = { ...s, notifiedDates: { ...s.notifiedDates, [today]: true } };
      save(updated);
      setState(updated);
    }
  }, []);

  useEffect(() => {
    if (state) checkAlert(state, fiveHourUsedPct);
  }, [state, fiveHourUsedPct, checkAlert]);

  const handleAlertPctBlur = () => {
    if (!state) return;
    const alertPct = Math.min(100, Math.max(1, parseInt(alertPctInput, 10) || 80));
    const updated = { ...state, alertPct };
    save(updated);
    setState(updated);
    setAlertPctInput(String(alertPct));
  };

  const toggleAlert = async () => {
    if (!state) return;
    if (!state.alertEnabled) {
      if ('Notification' in window && Notification.permission !== 'granted') {
        const result = await Notification.requestPermission();
        if (result !== 'granted') return;
      }
      const updated = { ...state, alertEnabled: true, notifiedDates: {} };
      save(updated);
      setState(updated);
    } else {
      const updated = { ...state, alertEnabled: false };
      save(updated);
      setState(updated);
    }
  };

  if (!state) return null;

  const alertPct = state.alertPct;
  const usedPct = fiveHourUsedPct ?? 0;
  const alerting = fiveHourUsedPct !== null && fiveHourUsedPct >= alertPct;
  const resetIn = formatResetIn(limits?.fiveHour?.resetsAt);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          5h 사용 알림
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">알림 기준</span>
          <Input
            type="number"
            min={1}
            max={100}
            step={1}
            value={alertPctInput}
            onChange={e => setAlertPctInput(e.target.value)}
            onBlur={handleAlertPctBlur}
            placeholder="80"
            className="h-8 text-sm w-16"
          />
          <span className="text-xs text-muted-foreground">%</span>
          <button
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
              state.alertEnabled
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted/60'
            }`}
            onClick={toggleAlert}
          >
            {state.alertEnabled
              ? <><Bell className="h-3.5 w-3.5" />알림 ON</>
              : <><BellOff className="h-3.5 w-3.5" />알림 OFF</>
            }
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {fiveHourUsedPct !== null ? `5h ${fiveHourUsedPct}% 사용` : '데이터 없음'}
            </span>
            <span className={alerting ? 'text-orange-500 font-semibold' : 'text-muted-foreground'}>
              {alerting
                ? `임계치 도달 (${alertPct}%)`
                : resetIn
                  ? `리셋: ${resetIn}`
                  : `기준 ${alertPct}%`}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${alerting ? 'bg-orange-500' : 'bg-yellow-500'}`}
              style={{ width: `${Math.min(100, usedPct)}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-orange-400/70"
              style={{ left: `${alertPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {usedPct.toFixed(1)}% 사용 · 알림 기준 {alertPct}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
