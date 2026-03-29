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
  const url = new URL(context.request.url);
  const symbol = url.pathname.replace('/api/options/', '').split('/')[0];
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  try {
    const { crumb, cookie } = await getCrumb();
    const sep = url.search ? '&' : '?';
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/options/${symbol}${url.search}${sep}crumb=${encodeURIComponent(crumb)}`;
    const resp = await fetch(yahooUrl, {
      headers: { 'User-Agent': ua, 'Cookie': cookie }
    });
    const data = await resp.text();
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=120'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
