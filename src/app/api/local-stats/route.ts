import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const dynamic = 'force-dynamic';

type DailyModelTokens = { date: string; tokensByModel: Record<string, number> };
type StatsCache = { dailyModelTokens?: DailyModelTokens[] };

function getWeeklyStartMs(): number {
  const now = new Date();
  const day = now.getDay();
  const daysSinceWed = (day - 3 + 7) % 7;
  const lastWed = new Date(now);
  lastWed.setDate(now.getDate() - daysSinceWed);
  lastWed.setHours(12, 0, 0, 0);
  if (lastWed.getTime() > now.getTime()) lastWed.setDate(lastWed.getDate() - 7);
  return lastWed.getTime();
}

export async function GET() {
  try {
    const path = join(homedir(), '.claude', 'stats-cache.json');
    const raw: StatsCache = JSON.parse(readFileSync(path, 'utf-8'));
    const entries = raw.dailyModelTokens ?? [];

    const weekCutoff = getWeeklyStartMs();
    const today = new Date().toISOString().slice(0, 10);
    const SESSION_WINDOW_MS = 5 * 3_600_000;
    const sessionCutoff = Date.now() - SESSION_WINDOW_MS;

    let weeklyTokens = 0;
    let sessionTokens = 0;

    for (const entry of entries) {
      const entryMs = new Date(entry.date).getTime();
      const total = Object.values(entry.tokensByModel).reduce((s, v) => s + v, 0);

      if (entryMs >= weekCutoff) weeklyTokens += total;
      // Use today's tokens as session proxy (stats-cache is daily granularity)
      if (entry.date === today && entryMs >= sessionCutoff) sessionTokens += total;
    }

    return Response.json({ weeklyTokens, sessionTokens });
  } catch {
    return Response.json({ error: 'stats-cache.json 읽기 실패' }, { status: 500 });
  }
}
