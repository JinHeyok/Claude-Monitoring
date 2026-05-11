import { NextRequest, NextResponse } from 'next/server';
import { appendEventRow, type EventRow } from '@/lib/csv';

type OtelValue = {
  stringValue?: string;
  intValue?: string;
  doubleValue?: number;
  boolValue?: boolean;
};
type OtelAttr = { key: string; value: OtelValue };

function getAttr(attrs: OtelAttr[], key: string): string {
  const a = attrs.find(x => x.key === key);
  if (!a) return '';
  const v = a.value;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.intValue !== undefined) return String(v.intValue);
  if (v.doubleValue !== undefined) return String(v.doubleValue);
  if (v.boolValue !== undefined) return String(v.boolValue);
  return '';
}

function nanoToISO(nanoStr: string): string {
  try {
    const ms = Number(BigInt(nanoStr) / BigInt(1_000_000));
    return new Date(ms).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resourceLogs = body.resourceLogs ?? [];

    for (const rl of resourceLogs) {
      const resAttrs: OtelAttr[] = rl.resource?.attributes ?? [];
      const sessionId = getAttr(resAttrs, 'session.id');
      const userEmail = getAttr(resAttrs, 'user.email');
      const userId = getAttr(resAttrs, 'user.id');

      for (const sl of rl.scopeLogs ?? []) {
        for (const lr of sl.logRecords ?? []) {
          const attrs: OtelAttr[] = lr.attributes ?? [];
          const timestamp = nanoToISO(String(lr.timeUnixNano ?? '0'));

          const row: EventRow = {
            timestamp,
            event_name: getAttr(attrs, 'event.name'),
            session_id: sessionId,
            user_email: userEmail,
            user_id: userId,
            prompt_id: getAttr(attrs, 'prompt.id'),
            tool_name: getAttr(attrs, 'tool_name'),
            success: getAttr(attrs, 'success'),
            duration_ms: getAttr(attrs, 'duration_ms'),
            cost_usd: getAttr(attrs, 'cost_usd'),
            input_tokens: getAttr(attrs, 'input_tokens'),
            output_tokens: getAttr(attrs, 'output_tokens'),
            cache_read_tokens: getAttr(attrs, 'cache_read_tokens'),
            cache_creation_tokens: getAttr(attrs, 'cache_creation_tokens'),
            model: getAttr(attrs, 'model'),
            request_id: getAttr(attrs, 'request_id'),
            speed: getAttr(attrs, 'speed'),
            query_source: getAttr(attrs, 'query_source'),
            error: getAttr(attrs, 'error'),
            status_code: getAttr(attrs, 'status_code'),
          };

          appendEventRow(row);
        }
      }
    }

    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    console.error('[OTLP logs]', err);
    return NextResponse.json({ error: 'parse error' }, { status: 400 });
  }
}
