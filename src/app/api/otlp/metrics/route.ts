import { NextRequest, NextResponse } from 'next/server';
import { appendMetricRow, type MetricRow } from '@/lib/csv';

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

function getDataPointValue(dp: Record<string, unknown>): string {
  if (typeof dp.asDouble === 'number') return String(dp.asDouble);
  if (typeof dp.asInt === 'string') return dp.asInt;
  if (typeof dp.asInt === 'number') return String(dp.asInt);
  return '0';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resourceMetrics = body.resourceMetrics ?? [];

    for (const rm of resourceMetrics) {
      const resAttrs: OtelAttr[] = rm.resource?.attributes ?? [];
      const sessionId = getAttr(resAttrs, 'session.id');
      const userEmail = getAttr(resAttrs, 'user.email');
      const userId = getAttr(resAttrs, 'user.id');

      for (const sm of rm.scopeMetrics ?? []) {
        for (const metric of sm.metrics ?? []) {
          const name: string = metric.name ?? '';
          const unit: string = metric.unit ?? '';

          const dataPoints: Record<string, unknown>[] =
            metric.sum?.dataPoints ??
            metric.gauge?.dataPoints ??
            metric.histogram?.dataPoints ??
            [];

          for (const dp of dataPoints) {
            const dpAttrs: OtelAttr[] = (dp.attributes as OtelAttr[]) ?? [];
            const timestamp = nanoToISO(String(dp.timeUnixNano ?? '0'));
            const value = getDataPointValue(dp);

            const row: MetricRow = {
              timestamp,
              metric_name: name,
              value,
              unit,
              session_id: sessionId,
              user_email: userEmail,
              user_id: userId,
              model: getAttr(dpAttrs, 'model'),
              query_source: getAttr(dpAttrs, 'query_source'),
              token_type: getAttr(dpAttrs, 'type'),
              tool_name: getAttr(dpAttrs, 'tool_name'),
              decision: getAttr(dpAttrs, 'decision'),
              language: getAttr(dpAttrs, 'language'),
              start_type: getAttr(dpAttrs, 'start_type'),
              speed: getAttr(dpAttrs, 'speed'),
              effort: getAttr(dpAttrs, 'effort'),
              active_time_type: getAttr(dpAttrs, 'type'),
            };

            appendMetricRow(row);
          }
        }
      }
    }

    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    console.error('[OTLP metrics]', err);
    return NextResponse.json({ error: 'parse error' }, { status: 400 });
  }
}
