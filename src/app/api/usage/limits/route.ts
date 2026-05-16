import { readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const CACHE_PATH = join(homedir(), '.claude', 'rate-limits-cache.json');
const STALE_MS = 10 * 60 * 1000;

type RateWindow = {
  used_percentage: number | null;
  resets_at: number | null;
};

type Cache = {
  timestamp: number;
  model: string | null;
  session_id: string | null;
  cwd_basename: string | null;
  context: { used_percentage: number | null };
  cost: { total_cost_usd: number | null };
  rate_limits: {
    five_hour?: RateWindow | null;
    seven_day?: RateWindow | null;
  } | null;
};

export async function GET() {
  try {
    const stat = statSync(CACHE_PATH);
    const cache: Cache = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));

    const now = Date.now();
    const age = now - (cache.timestamp ?? stat.mtimeMs);
    const stale = age > STALE_MS;

    return Response.json({
      available: true,
      stale,
      ageMs: age,
      cachedAt: cache.timestamp,
      model: cache.model,
      sessionId: cache.session_id,
      project: cache.cwd_basename,
      context: cache.context?.used_percentage ?? null,
      costUsd: cache.cost?.total_cost_usd ?? null,
      fiveHour: {
        usedPercent: cache.rate_limits?.five_hour?.used_percentage ?? null,
        resetsAt: cache.rate_limits?.five_hour?.resets_at
          ? cache.rate_limits.five_hour.resets_at * 1000
          : null,
      },
      sevenDay: {
        usedPercent: cache.rate_limits?.seven_day?.used_percentage ?? null,
        resetsAt: cache.rate_limits?.seven_day?.resets_at
          ? cache.rate_limits.seven_day.resets_at * 1000
          : null,
      },
    });
  } catch {
    return Response.json(
      {
        available: false,
        message:
          'rate-limits-cache.json 없음. Claude Code에서 메시지를 한 번 보내야 캐시가 생성됩니다.',
      },
      { status: 200 },
    );
  }
}
