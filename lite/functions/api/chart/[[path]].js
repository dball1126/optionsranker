export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/', '');
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/${path}${url.search}`;

  try {
    const resp = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    const data = await resp.text();
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
