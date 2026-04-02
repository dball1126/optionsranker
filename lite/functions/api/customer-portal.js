const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function structuredLog(fn, data) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), fn, ...data }));
}

export async function onRequest(context) {
  const start = Date.now();

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (context.request.method !== 'POST') {
    return Response.json({ error: 'POST required' }, { status: 405, headers: CORS });
  }

  const { STRIPE_SECRET_KEY } = context.env;
  if (!STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Stripe not configured' }, { status: 500, headers: CORS });
  }

  let body;
  try { body = await context.request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  const { userId } = body;
  if (!userId) {
    return Response.json({ error: 'userId required' }, { status: 400, headers: CORS });
  }
  if (typeof userId !== 'string' || userId.length > 256) {
    return Response.json({ error: 'Invalid userId' }, { status: 400, headers: CORS });
  }

  const db = context.env.DB;
  if (!db) {
    return Response.json({ error: 'Database not configured' }, { status: 500, headers: CORS });
  }

  const row = await db.prepare('SELECT stripe_customer_id FROM users WHERE user_id = ?').bind(userId).first();
  if (!row?.stripe_customer_id) {
    return Response.json({ error: 'No subscription found' }, { status: 404, headers: CORS });
  }

  const origin = new URL(context.request.url).origin;

  const abort = AbortSignal.timeout(10000);
  const portalResp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    signal: abort,
    body: new URLSearchParams({
      customer: row.stripe_customer_id,
      return_url: origin,
    }),
  });
  const portal = await portalResp.json();
  if (portal.error) {
    return Response.json({ error: portal.error.message }, { status: 400, headers: CORS });
  }

  structuredLog('customer-portal', { status: 200, userId, durationMs: Date.now() - start });
  return Response.json({ url: portal.url }, { headers: CORS });
}
