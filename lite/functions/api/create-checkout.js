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

  const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID } = context.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    return Response.json({ error: 'Stripe not configured' }, { status: 500, headers: CORS });
  }

  let body;
  try { body = await context.request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  const { userId, email } = body;
  if (!userId || !email) {
    return Response.json({ error: 'userId and email required' }, { status: 400, headers: CORS });
  }

  const db = context.env.DB;
  const origin = new URL(context.request.url).origin;

  // Check if user already has a Stripe customer ID
  let stripeCustomerId = null;
  if (db) {
    const row = await db.prepare('SELECT stripe_customer_id FROM users WHERE user_id = ?').bind(userId).first();
    if (row?.stripe_customer_id) {
      stripeCustomerId = row.stripe_customer_id;
    }
  }

  // Create Stripe customer if needed
  if (!stripeCustomerId) {
    const custResp = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ email, 'metadata[user_id]': userId }),
    });
    const cust = await custResp.json();
    if (cust.error) {
      return Response.json({ error: cust.error.message }, { status: 400, headers: CORS });
    }
    stripeCustomerId = cust.id;

    // Save to DB
    if (db) {
      await db.prepare(
        `INSERT INTO users (user_id, email, stripe_customer_id) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id, email = excluded.email, updated_at = datetime('now')`
      ).bind(userId, email, stripeCustomerId).run();
    }
  }

  // Create Checkout Session
  const sessionResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      customer: stripeCustomerId,
      'line_items[0][price]': STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: `${origin}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}?canceled=1`,
      'metadata[user_id]': userId,
    }),
  });
  const session = await sessionResp.json();
  if (session.error) {
    return Response.json({ error: session.error.message }, { status: 400, headers: CORS });
  }

  structuredLog('create-checkout', { status: 200, userId, durationMs: Date.now() - start });
  return Response.json({ url: session.url }, { headers: CORS });
}
