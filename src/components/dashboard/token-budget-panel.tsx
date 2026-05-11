'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Zap } from 'lucide-react';

const STORAGE_KEY = 'cc_token_budget';

type TokenBudgetState = {
  dailyLimit: number;
  alertPct: number;
  alertEnabled: boolean;
  notifiedDates: Record<string, boolean>;
};

function load(): TokenBudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TokenBudgetState;
      return { ...parsed, alertPct: parsed.alertPct ?? 80 };
    }
  } catch {}
  return { dailyLimit: 0, alertPct: 80, alertEnabled: false, notifiedDates: {} };
}

function save(state: TokenBudgetState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export default function TokenBudgetPanel({ todayTokens }: { todayTokens: number }) {
  const [budget, setBudget] = useState<TokenBudgetState | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [alertPctInput, setAlertPctInput] = useState('80');

  useEffect(() => {
    const b = load();
    setBudget(b);
    setInputVal(b.dailyLimit > 0 ? String(b.dailyLimit) : '');
    setAlertPctInput(String(b.alertPct));
  }, []);

  const checkAlert = useCallback((b: TokenBudgetState, tokens: number) => {
    if (!b.alertEnabled || b.dailyLimit <= 0) return;
    const threshold = b.dailyLimit * (b.alertPct / 100);
    const today = new Date().toISOString().slice(0, 10);
    if (tokens >= threshold && !b.notifiedDates[today]) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Claude Code 토큰 임계치 도달', {
          body: `오늘 토큰 ${fmtTokens(tokens)} → 한도의 ${b.alertPct}% (${fmtTokens(threshold)}) 초과`,
          icon: '/favicon.ico',
        });
        const updated = { ...b, notifiedDates: { ...b.notifiedDates, [today]: true } };
        save(updated);
        setBudget(updated);
      }
    }
  }, []);

  useEffect(() => {
    if (budget) checkAlert(budget, todayTokens);
  }, [budget, todayTokens, checkAlert]);

  const handleSave = () => {
    const limit = Math.max(0, parseInt(inputVal, 10) || 0);
    const alertPct = Math.min(100, Math.max(1, parseInt(alertPctInput, 10) || 80));
    const updated: TokenBudgetState = {
      ...(budget ?? { alertEnabled: false, notifiedDates: {} }),
      dailyLimit: limit,
      alertPct,
    };
    save(updated);
    setBudget(updated);
    setAlertPctInput(String(alertPct));
  };

  const toggleAlert = async () => {
    if (!budget) return;
    if (!budget.alertEnabled) {
      if ('Notification' in window && Notification.permission !== 'granted') {
        const result = await Notification.requestPermission();
        if (result !== 'granted') return;
      }
      const updated = { ...budget, alertEnabled: true, notifiedDates: {} };
      save(updated);
      setBudget(updated);
    } else {
      const updated = { ...budget, alertEnabled: false };
      save(updated);
      setBudget(updated);
    }
  };

  if (!budget) return null;

  const limit = budget.dailyLimit;
  const alertPct = budget.alertPct;
  const usedPct = limit > 0 ? Math.min(100, (todayTokens / limit) * 100) : 0;
  const threshold = limit * (alertPct / 100);
  const alerting = limit > 0 && todayTokens >= threshold;
  const over = limit > 0 && todayTokens >= limit;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          일별 토큰 예산
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">한도</span>
          <Input
            type="number"
            min={0}
            step={1000}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={handleSave}
            placeholder="예: 50000"
            className="h-8 text-sm w-28"
          />
          <span className="text-xs text-muted-foreground">임계치</span>
          <Input
            type="number"
            min={1}
            max={100}
            step={1}
            value={alertPctInput}
            onChange={e => setAlertPctInput(e.target.value)}
            onBlur={handleSave}
            placeholder="80"
            className="h-8 text-sm w-16"
          />
          <span className="text-xs text-muted-foreground">%</span>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSave}>
            저장
          </Button>
          <Button
            size="sm"
            variant={budget.alertEnabled ? 'default' : 'outline'}
            className="h-8 text-xs gap-1.5"
            onClick={toggleAlert}
          >
            {budget.alertEnabled
              ? <><Bell className="h-3.5 w-3.5" />알림 ON</>
              : <><BellOff className="h-3.5 w-3.5" />알림 OFF</>
            }
          </Button>
        </div>

        {limit > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">오늘 {fmtTokens(todayTokens)}</span>
              <span className={over ? 'text-destructive font-semibold' : alerting ? 'text-orange-500 font-semibold' : 'text-muted-foreground'}>
                {over ? '한도 초과!' : alerting ? `임계치 도달 (${alertPct}%)` : `/ ${fmtTokens(limit)}`}
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-destructive' : alerting ? 'bg-orange-500' : 'bg-yellow-500'}`}
                style={{ width: `${usedPct}%` }}
              />
              {/* threshold marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-orange-400/70"
                style={{ left: `${alertPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{usedPct.toFixed(1)}% 사용 · 임계치 {alertPct}%</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
