import { type NextRequest } from 'next/server';
import { computeDashboard } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get('range') ?? 'all';
  const encoder = new TextEncoder();
  let interval: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          const data = computeDashboard(range);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // skip tick on read error
        }
      };
      send();
      interval = setInterval(send, 10_000);
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
