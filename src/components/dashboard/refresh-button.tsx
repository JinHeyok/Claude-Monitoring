'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Timer } from 'lucide-react';

export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoOn, setAutoOn] = useState(false);
  const [intervalSecs, setIntervalSecs] = useState(30);
  const [inputVal, setInputVal] = useState('30');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!autoOn) return;
    timerRef.current = setInterval(() => {
      startTransition(() => router.refresh());
    }, Math.max(5, intervalSecs) * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoOn, intervalSecs, router]);

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {/* Auto-refresh controls */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs">
        <Timer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Input
          type="number"
          min={5}
          max={3600}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={() => {
            const n = Math.max(5, parseInt(inputVal, 10) || 30);
            setInputVal(String(n));
            setIntervalSecs(n);
          }}
          className="w-12 h-6 text-xs border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-muted-foreground">초</span>
        <div className="w-px h-3.5 bg-border" />
        <Switch
          id="auto-refresh"
          checked={autoOn}
          onCheckedChange={setAutoOn}
          className="scale-[0.7] origin-center"
        />
        <Label
          htmlFor="auto-refresh"
          className={`cursor-pointer font-medium ${autoOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
        >
          {autoOn ? '자동 ON' : '자동 OFF'}
        </Label>
        {autoOn && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </div>

      {/* Manual refresh */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        className="h-8"
      >
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
        새로고침
      </Button>
    </div>
  );
}
