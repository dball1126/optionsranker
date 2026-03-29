const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  // POST — sync user on sign-in
  if (context.request.method === 'POST') {
    let body;
    try { body = await context.request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
    }
    const { userId, email, name, picture } = body;
    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400, headers: CORS });
    }

    await db.prepare(`
      INSERT INTO users (user_id, email, name, picture)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email = COALESCE(excluded.email, email),
        name = COALESCE(excluded.name, name),
        picture = COALESCE(excluded.picture, picture),
        updated_at = datetime('now')
    `).bind(userId, email || null, name || null, picture || null).run();

    // Return subscription status
    const row = await db.prepare(
      'SELECT subscription_tier, subscription_status, subscription_expires_at FROM users WHERE user_id = ?'
    ).bind(userId).first();

    const now = new Date().toISOString();
    const active = row && (row.subscription_status === 'active' ||
      (row.subscription_status === 'canceled' && row.subscription_expires_at && row.subscription_expires_at > now));

    return Response.json({
      saved: true,
      subscription: { tier: active ? 'pro' : 'free', active: !!active }
    }, { headers: CORS });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405, headers: CORS });
}
