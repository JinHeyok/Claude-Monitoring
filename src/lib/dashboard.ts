import { readMetrics, readEvents, type MetricRow, type EventRow } from './csv';

export type ModelStat = { model: string; cost: number; tokens: number; requests: number };
export type ToolStat = { tool: string; count: number };
export type CostPoint = { date: string; cost: number };
export type TokenPoint = { type: string; tokens: number };

export type DashboardData = {
  totalCost: number;
  totalTokens: number;
  weeklyTokens: number;
  sessionTokens: number;
  sessionStartTs: number;
  totalSessions: number;
  activeTimeSeconds: number;
  prevCost: number;
  prevTokens: number;
  todayCost: number;
  todayTokens: number;
  costData: CostPoint[];
  tokenData: TokenPoint[];
  modelData: ModelStat[];
  toolData: ToolStat[];
  events: EventRow[];
  lastUpdated: string;
  range: string;
};

function getWeeklyStartMs(): number {
  const now = new Date();
  const day = now.getDay();
  let daysSinceWed = (day - 3 + 7) % 7;
  const lastWed = new Date(now);
  lastWed.setDate(now.getDate() - daysSinceWed);
  lastWed.setHours(12, 0, 0, 0);
  if (lastWed.getTime() > now.getTime()) {
    lastWed.setDate(lastWed.getDate() - 7);
  }
  return lastWed.getTime();
}

function getRangeMs(range: string): number | null {
  const map: Record<string, number> = { '1d': 24, '7d': 168, '30d': 720 };
  return range in map ? map[range] * 3_600_000 : null;
}

// OTel counters are cumulative: each export sends the total since session start.
// Summing all rows overcounts. Instead, take the latest value per (session, sub-key).
function sumCumulative(rows: MetricRow[], metricName: string, subKey: (r: MetricRow) => string): number {
  const latest = new Map<string, { value: number; ts: number }>();
  rows
    .filter(r => r.metric_name === metricName)
    .forEach(r => {
      const key = `${r.session_id}__${subKey(r)}`;
      const ts = new Date(r.timestamp).getTime();
      const prev = latest.get(key);
      if (!prev || ts > prev.ts) latest.set(key, { value: parseFloat(r.value) || 0, ts });
    });
  return Array.from(latest.values()).reduce((s, { value }) => s + value, 0);
}

export function computeDashboard(range = 'all'): DashboardData {
  const allMetrics = readMetrics();
  const allEvents = readEvents();
  const now = Date.now();
  const rangeMs = getRangeMs(range);
  const cutoff = rangeMs ? now - rangeMs : null;

  const metrics = cutoff
    ? allMetrics.filter(m => new Date(m.timestamp).getTime() >= cutoff)
    : allMetrics;
  const events = cutoff
    ? allEvents.filter(e => new Date(e.timestamp).getTime() >= cutoff)
    : allEvents;

  const prevCutoff = cutoff && rangeMs ? cutoff - rangeMs : null;
  const prevMetrics = prevCutoff
    ? allMetrics.filter(m => {
        const t = new Date(m.timestamp).getTime();
        return t >= prevCutoff && t < cutoff!;
      })
    : [];

  // Summary — use sumCumulative to avoid overcounting repeated cumulative exports
  const totalCost = sumCumulative(metrics, 'claude_code.cost.usage', r => r.model || '_');
  const totalTokens = sumCumulative(metrics, 'claude_code.token.usage', r => r.token_type || '_');

  const SESSION_STALE_MS = 60_000;
  const sessionLatest = new Map<string, { value: number; ts: number }>();
  metrics
    .filter(m => m.metric_name === 'claude_code.session.count')
    .forEach(m => {
      const ts = new Date(m.timestamp).getTime();
      const prev = sessionLatest.get(m.session_id);
      if (!prev || ts > prev.ts)
        sessionLatest.set(m.session_id, { value: parseFloat(m.value) || 0, ts });
    });
  const totalSessions = Array.from(sessionLatest.values())
    .filter(({ ts }) => now - ts <= SESSION_STALE_MS)
    .reduce((s, { value }) => s + Math.round(value), 0);

  const activeTimeSeconds = sumCumulative(metrics, 'claude_code.active_time.total', r => r.active_time_type || '_');

  const prevCost = sumCumulative(prevMetrics, 'claude_code.cost.usage', r => r.model || '_');
  const prevTokens = sumCumulative(prevMetrics, 'claude_code.token.usage', r => r.token_type || '_');

  const weekCutoff = getWeeklyStartMs();
  const weeklyMetrics = allMetrics.filter(m => new Date(m.timestamp).getTime() >= weekCutoff);
  // Exclude cacheRead: it inflates counts 10-50x without reflecting meaningful usage
  const weeklyTokens = sumCumulative(
    weeklyMetrics.filter(m => m.token_type !== 'cacheRead'),
    'claude_code.token.usage', r => r.token_type || '_'
  );

  const SESSION_WINDOW_MS = 5 * 3_600_000;
  const sessionCutoff = now - SESSION_WINDOW_MS;
  const sessionMetrics = allMetrics.filter(
    m => m.metric_name === 'claude_code.token.usage' && new Date(m.timestamp).getTime() >= sessionCutoff
  );
  const sessionTokens = sumCumulative(
    sessionMetrics.filter(m => m.token_type !== 'cacheRead'),
    'claude_code.token.usage', r => r.token_type || '_'
  );
  const sessionStartTs = sessionMetrics.length > 0
    ? Math.min(...sessionMetrics.map(m => new Date(m.timestamp).getTime()))
    : now;

  // Daily cost
  const dailyCost: Record<string, number> = {};
  events
    .filter(e => e.event_name === 'api_request' && e.cost_usd)
    .forEach(e => {
      const date = e.timestamp.slice(0, 10);
      if (!date) return;
      dailyCost[date] = (dailyCost[date] ?? 0) + (parseFloat(e.cost_usd) || 0);
    });
  const today = new Date().toISOString().slice(0, 10);
  const todayCost = dailyCost[today] ?? 0;
  const todayTokens = allEvents
    .filter(e => e.event_name === 'api_request' && e.timestamp.slice(0, 10) === today)
    .reduce((s, e) => s + (parseInt(e.input_tokens, 10) || 0) + (parseInt(e.output_tokens, 10) || 0), 0);
  const costData = Object.entries(dailyCost)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost: Math.round(cost * 1e6) / 1e6 }));

  // Token breakdown — latest per (session, type) to avoid cumulative overcounting
  const tokenLatest = new Map<string, { value: number; ts: number }>();
  metrics
    .filter(m => m.metric_name === 'claude_code.token.usage')
    .forEach(m => {
      const key = `${m.session_id}__${m.token_type}`;
      const ts = new Date(m.timestamp).getTime();
      const prev = tokenLatest.get(key);
      if (!prev || ts > prev.ts) tokenLatest.set(key, { value: parseFloat(m.value) || 0, ts });
    });
  const tokenTotals: Record<string, number> = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  for (const [key, { value }] of tokenLatest) {
    const type = key.split('__')[1];
    if (type in tokenTotals) tokenTotals[type] += value;
  }
  const tokenData = Object.entries(tokenTotals).map(([type, tokens]) => ({ type, tokens }));

  // Model breakdown
  const modelMap = new Map<string, ModelStat>();
  events
    .filter(e => e.event_name === 'api_request' && e.model)
    .forEach(e => {
      const model = e.model;
      const cost = parseFloat(e.cost_usd) || 0;
      const tokens = (parseInt(e.input_tokens, 10) || 0) + (parseInt(e.output_tokens, 10) || 0);
      const prev = modelMap.get(model) ?? { model, cost: 0, tokens: 0, requests: 0 };
      modelMap.set(model, {
        model,
        cost: prev.cost + cost,
        tokens: prev.tokens + tokens,
        requests: prev.requests + 1,
      });
    });
  const modelData = Array.from(modelMap.values()).sort((a, b) => b.cost - a.cost);

  // Tool usage top 10
  const toolMap = new Map<string, number>();
  events
    .filter(e => e.event_name === 'tool_result' && e.tool_name)
    .forEach(e => {
      toolMap.set(e.tool_name, (toolMap.get(e.tool_name) ?? 0) + 1);
    });
  const toolData = Array.from(toolMap.entries())
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalCost,
    totalTokens,
    weeklyTokens,
    sessionTokens,
    sessionStartTs,
    totalSessions,
    activeTimeSeconds,
    prevCost,
    prevTokens,
    todayCost,
    costData,
    tokenData,
    modelData,
    toolData,
    todayTokens,
    events: [...events].reverse().slice(0, 500),
    lastUpdated: new Date().toISOString(),
    range,
  };
}
