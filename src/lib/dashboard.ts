import { readMetrics, readEvents, type EventRow } from './csv';

export type ModelStat = { model: string; cost: number; tokens: number; requests: number };
export type ToolStat = { tool: string; count: number };
export type CostPoint = { date: string; cost: number };
export type TokenPoint = { type: string; tokens: number };

export type DashboardData = {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  activeTimeSeconds: number;
  prevCost: number;
  prevTokens: number;
  todayCost: number;
  costData: CostPoint[];
  tokenData: TokenPoint[];
  modelData: ModelStat[];
  toolData: ToolStat[];
  events: EventRow[];
  lastUpdated: string;
  range: string;
};

function getRangeMs(range: string): number | null {
  const map: Record<string, number> = { '1d': 24, '7d': 168, '30d': 720 };
  return range in map ? map[range] * 3_600_000 : null;
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

  // Summary
  const totalCost = metrics
    .filter(m => m.metric_name === 'claude_code.cost.usage')
    .reduce((s, m) => s + (parseFloat(m.value) || 0), 0);
  const totalTokens = metrics
    .filter(m => m.metric_name === 'claude_code.token.usage')
    .reduce((s, m) => s + (parseFloat(m.value) || 0), 0);

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

  const activeTimeSeconds = metrics
    .filter(m => m.metric_name === 'claude_code.active_time.total')
    .reduce((s, m) => s + (parseFloat(m.value) || 0), 0);

  const prevCost = prevMetrics
    .filter(m => m.metric_name === 'claude_code.cost.usage')
    .reduce((s, m) => s + (parseFloat(m.value) || 0), 0);
  const prevTokens = prevMetrics
    .filter(m => m.metric_name === 'claude_code.token.usage')
    .reduce((s, m) => s + (parseFloat(m.value) || 0), 0);

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
  const costData = Object.entries(dailyCost)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost: Math.round(cost * 1e6) / 1e6 }));

  // Token breakdown
  const tokenTotals: Record<string, number> = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  metrics
    .filter(m => m.metric_name === 'claude_code.token.usage')
    .forEach(m => {
      const t = m.token_type;
      if (t in tokenTotals) tokenTotals[t] += parseFloat(m.value) || 0;
    });
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
    totalSessions,
    activeTimeSeconds,
    prevCost,
    prevTokens,
    todayCost,
    costData,
    tokenData,
    modelData,
    toolData,
    events: [...events].reverse().slice(0, 500),
    lastUpdated: new Date().toISOString(),
    range,
  };
}
