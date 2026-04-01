// Per-IP rate limiting (in-memory, resets on worker restart)
const rateLimitMap = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60000;

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

let cachedCrumb = null;
let cachedCookie = null;
let crumbExpiry = 0;

async function getCrumb() {
  if (cachedCrumb && Date.now() < crumbExpiry) return { crumb: cachedCrumb, cookie: cachedCookie };
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
  const initResp = await fetch('https://fc.yahoo.com/x', { headers: { 'User-Agent': ua }, redirect: 'manual' });
  const setCookie = initResp.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  const crumbResp = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': ua, 'Cookie': cookie }
  });
  const crumb = await crumbResp.text();
  cachedCrumb = crumb;
  cachedCookie = cookie;
  crumbExpiry = Date.now() + 300000;
  return { crumb, cookie };
}

export async function onRequest(context) {
  const start = Date.now();
  const ip = context.request.headers.get('CF-Connecting-IP') || context.request.headers.get('x-forwarded-for') || 'unknown';
  const url = new URL(context.request.url);
  const symbol = url.pathname.replace('/api/options/', '').split('/')[0];

  if (!checkRateLimit(ip)) {
    structuredLog('options', { status: 429, ip, symbol, error: 'rate limited' });
    return new Response(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Retry-After': '60',
      }
    });
  }

  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  try {
    const { crumb, cookie } = await getCrumb();
    const sep = url.search ? '&' : '?';
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/options/${symbol}${url.search}${sep}crumb=${encodeURIComponent(crumb)}`;
    const resp = await fetch(yahooUrl, {
      headers: { 'User-Agent': ua, 'Cookie': cookie }
    });
    const data = await resp.text();
    structuredLog('options', { status: resp.status, symbol, durationMs: Date.now() - start });
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=120'
      }
    });
  } catch (e) {
    structuredLog('options', { status: 500, symbol, durationMs: Date.now() - start, error: e.message });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
