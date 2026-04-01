// Per-IP rate limiting (in-memory, resets on worker restart)
const rateLimitMap = new Map();
const RATE_LIMIT = 30; // requests per window
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    entry = { start: now, count: 0 };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

function structuredLog(fn, data) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), fn, ...data }));
}

export async function onRequest(context) {
  const start = Date.now();
  const ip = context.request.headers.get('CF-Connecting-IP') || context.request.headers.get('x-forwarded-for') || 'unknown';

  if (!checkRateLimit(ip)) {
    structuredLog('chart', { status: 429, ip, error: 'rate limited' });
    return new Response(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Retry-After': '60',
      }
    });
  }

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/', '');
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/${path}${url.search}`;

  try {
    const resp = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    const data = await resp.text();
    structuredLog('chart', { status: resp.status, path, durationMs: Date.now() - start });
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (e) {
    structuredLog('chart', { status: 500, path, durationMs: Date.now() - start, error: e.message });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
