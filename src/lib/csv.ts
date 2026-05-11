import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const METRICS_FILE = path.join(DATA_DIR, 'metrics.csv');
const EVENTS_FILE = path.join(DATA_DIR, 'events.csv');

const RETENTION_DAYS = 30;
const PRUNE_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5MB
const PRUNE_COOLDOWN_MS = 60_000; // 1분 쿨다운
const lastPruned: Record<string, number> = {};

export const METRICS_HEADERS = [
  'timestamp', 'metric_name', 'value', 'unit', 'session_id', 'user_email',
  'user_id', 'model', 'query_source', 'token_type', 'tool_name', 'decision',
  'language', 'start_type', 'speed', 'effort', 'active_time_type',
] as const;

export const EVENTS_HEADERS = [
  'timestamp', 'event_name', 'session_id', 'user_email', 'user_id',
  'prompt_id', 'tool_name', 'success', 'duration_ms', 'cost_usd',
  'input_tokens', 'output_tokens', 'cache_read_tokens', 'cache_creation_tokens',
  'model', 'request_id', 'speed', 'query_source', 'error', 'status_code',
] as const;

export type MetricRow = Record<typeof METRICS_HEADERS[number], string>;
export type EventRow = Record<typeof EVENTS_HEADERS[number], string>;

function ensureFile(filePath: string, headers: readonly string[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, headers.join(',') + '\n', 'utf-8');
  }
}

function escapeCSV(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToLine(headers: readonly string[], row: Record<string, unknown>): string {
  return headers.map(h => escapeCSV(row[h] ?? '')).join(',') + '\n';
}

function pruneFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return;
  const kept = lines.slice(1).filter(line => {
    const comma = line.indexOf(',');
    const ts = comma === -1 ? '' : line.slice(0, comma);
    return ts >= cutoff;
  });
  fs.writeFileSync(filePath, [lines[0], ...kept].join('\n') + '\n', 'utf-8');
}

function maybePrune(filePath: string): void {
  const now = Date.now();
  if ((lastPruned[filePath] ?? 0) + PRUNE_COOLDOWN_MS > now) return;
  try {
    const { size } = fs.statSync(filePath);
    if (size > PRUNE_THRESHOLD_BYTES) {
      pruneFile(filePath);
      lastPruned[filePath] = now;
    }
  } catch {
    // 파일 없거나 stat 실패 시 무시
  }
}

export function appendMetricRow(row: MetricRow): void {
  ensureFile(METRICS_FILE, METRICS_HEADERS);
  maybePrune(METRICS_FILE);
  fs.appendFileSync(METRICS_FILE, rowToLine(METRICS_HEADERS, row), 'utf-8');
}

export function appendEventRow(row: EventRow): void {
  ensureFile(EVENTS_FILE, EVENTS_HEADERS);
  maybePrune(EVENTS_FILE);
  fs.appendFileSync(EVENTS_FILE, rowToLine(EVENTS_HEADERS, row), 'utf-8');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV<T>(filePath: string, headers: readonly string[]): T[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length <= 1) return [];
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row as T;
  });
}

export function readMetrics(): MetricRow[] {
  return parseCSV<MetricRow>(METRICS_FILE, METRICS_HEADERS);
}

export function readEvents(): EventRow[] {
  return parseCSV<EventRow>(EVENTS_FILE, EVENTS_HEADERS);
}
