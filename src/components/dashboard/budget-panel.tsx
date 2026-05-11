'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Target } from 'lucide-react';

const STORAGE_KEY = 'cc_dashboard_budget';

type BudgetState = {
  dailyLimit: number;
  alertEnabled: boolean;
  notifiedDates: Record<string, boolean>;
};

function loadBudget(): BudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BudgetState;
  } catch {}
  return { dailyLimit: 0, alertEnabled: false, notifiedDates: {} };
}

function saveBudget(state: BudgetState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function BudgetPanel({ todayCost }: { todayCost: number }) {
  const [budget, setBudget] = useState<BudgetState | null>(null);
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    const b = loadBudget();
    setBudget(b);
    setInputVal(b.dailyLimit > 0 ? String(b.dailyLimit) : '');
  }, []);

  const checkAlert = useCallback((b: BudgetState, cost: number) => {
    if (!b.alertEnabled || b.dailyLimit <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    if (cost >= b.dailyLimit && !b.notifiedDates[today]) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Claude Code 예산 초과', {
          body: `오늘 비용 $${cost.toFixed(4)} → 한도 $${b.dailyLimit.toFixed(2)} 초과`,
          icon: '/favicon.ico',
        });
        const updated = { ...b, notifiedDates: { ...b.notifiedDates, [today]: true } };
        saveBudget(updated);
        setBudget(updated);
      }
    }
  }, []);

  useEffect(() => {
    if (budget) checkAlert(budget, todayCost);
  }, [budget, todayCost, checkAlert]);

  const handleSave = () => {
    const limit = Math.max(0, parseFloat(inputVal) || 0);
    const updated: BudgetState = {
      ...(budget ?? { alertEnabled: false, notifiedDates: {} }),
      dailyLimit: limit,
    };
    saveBudget(updated);
    setBudget(updated);
  };

  const toggleAlert = async () => {
    if (!budget) return;
    if (!budget.alertEnabled && 'Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
    const updated = { ...budget, alertEnabled: !budget.alertEnabled };
    saveBudget(updated);
    setBudget(updated);
  };

  if (!budget) return null;

  const limit = budget.dailyLimit;
  const pct = limit > 0 ? Math.min(100, (todayCost / limit) * 100) : 0;
  const over = limit > 0 && todayCost >= limit;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          일별 예산
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">한도 $</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={handleSave}
            placeholder="0.00"
            className="h-8 text-sm w-24"
          />
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
              <span className="text-muted-foreground">오늘 ${todayCost.toFixed(4)}</span>
              <span className={over ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                {over ? '한도 초과!' : `/ $${limit.toFixed(2)}`}
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{pct.toFixed(1)}% 사용</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
