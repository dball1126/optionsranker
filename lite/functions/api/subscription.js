const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const db = context.env.DB;
  if (!db) {
    return Response.json({ error: 'Database not configured' }, { status: 500, headers: CORS });
  }

  const url = new URL(context.request.url);
  const userId = url.searchParams.get('userId');
  if (!userId) {
    return Response.json({ tier: 'free', active: false }, { headers: CORS });
  }

  const row = await db.prepare(
    'SELECT subscription_tier, subscription_status, subscription_expires_at FROM users WHERE user_id = ?'
  ).bind(userId).first();

  if (!row) {
    return Response.json({ tier: 'free', active: false }, { headers: CORS });
  }

  const now = new Date().toISOString();
  const active = row.subscription_status === 'active' ||
    (row.subscription_status === 'canceled' && row.subscription_expires_at && row.subscription_expires_at > now);

  return Response.json({
    tier: active ? 'pro' : 'free',
    active,
    status: row.subscription_status,
    expiresAt: row.subscription_expires_at,
  }, { headers: CORS });
}
