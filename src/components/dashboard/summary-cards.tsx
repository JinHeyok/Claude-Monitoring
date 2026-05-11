import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Zap, Terminal, Clock, TrendingUp, TrendingDown } from 'lucide-react';

type Props = {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  activeTimeSeconds: number;
  prevCost?: number;
  prevTokens?: number;
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${fmt(n / 1_000_000, 2)}M`;
  if (n >= 1_000) return `${fmt(n / 1_000, 1)}K`;
  return String(Math.round(n));
}

function fmtTime(s: number) {
  if (s >= 3600) return `${fmt(s / 3600, 1)}h`;
  if (s >= 60) return `${fmt(s / 60, 1)}m`;
  return `${Math.round(s)}s`;
}

function Trend({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 || current === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  const isUp = pct > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" />
      {isUp ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

export default function SummaryCards({
  totalCost,
  totalTokens,
  totalSessions,
  activeTimeSeconds,
  prevCost,
  prevTokens,
}: Props) {
  const cards = [
    {
      title: '총 비용',
      value: `$${fmt(totalCost, 4)}`,
      sub: 'USD',
      icon: DollarSign,
      color: 'text-green-500',
      trend: prevCost !== undefined ? <Trend current={totalCost} prev={prevCost} /> : null,
    },
    {
      title: '총 토큰',
      value: fmtTokens(totalTokens),
      sub: 'tokens',
      icon: Zap,
      color: 'text-yellow-500',
      trend: prevTokens !== undefined ? <Trend current={totalTokens} prev={prevTokens} /> : null,
    },
    {
      title: '세션 수',
      value: String(totalSessions),
      sub: 'sessions',
      icon: Terminal,
      color: 'text-blue-500',
      trend: null,
    },
    {
      title: '활성 시간',
      value: fmtTime(activeTimeSeconds),
      sub: 'active',
      icon: Clock,
      color: 'text-purple-500',
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{card.sub}</p>
                {card.trend}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
