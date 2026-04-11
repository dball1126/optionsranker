// Phase 5.1 — Position Alerts CRUD API
//
// GET /api/alerts?userId=xxx       — list user's alerts
// POST /api/alerts                  — create new alert
// DELETE /api/alerts?id=N&userId=x  — delete alert

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

  // GET — list
  if (context.request.method === 'GET') {
    const userId = url.searchParams.get('userId');
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400, headers: CORS });
    const rows = await db.prepare(
      'SELECT id, symbol, strategy_name, trigger_type, threshold, status, triggered_at, last_checked, created_at FROM position_alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
    ).bind(userId).all();
    return Response.json({ alerts: rows.results || [] }, { headers: CORS });
  }

  // POST — create
  if (context.request.method === 'POST') {
    let body;
    try { body = await context.request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
    }
    const { userId, symbol, strategy_name, trigger_type, threshold, legs } = body;
    if (!userId || !symbol || !trigger_type || threshold == null) {
      return Response.json({ error: 'userId, symbol, trigger_type, threshold required' }, { status: 400, headers: CORS });
    }
    const validTypes = ['profit_target', 'stop_loss', 'iv_rank_above', 'iv_rank_below', 'price_above', 'price_below', 'time_stop'];
    if (!validTypes.includes(trigger_type)) {
      return Response.json({ error: 'invalid trigger_type', valid: validTypes }, { status: 400, headers: CORS });
    }
    const result = await db.prepare(
      `INSERT INTO position_alerts (user_id, symbol, strategy_name, trigger_type, threshold, legs, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(
      userId,
      symbol.toUpperCase(),
      strategy_name || null,
      trigger_type,
      threshold,
      legs ? JSON.stringify(legs) : null
    ).run();
    return Response.json({ created: true, id: result.meta?.last_row_id }, { headers: CORS });
  }

  // DELETE
  if (context.request.method === 'DELETE') {
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');
    if (!id || !userId) return Response.json({ error: 'id and userId required' }, { status: 400, headers: CORS });
    await db.prepare('DELETE FROM position_alerts WHERE id = ? AND user_id = ?').bind(id, userId).run();
    return Response.json({ deleted: true }, { headers: CORS });
  }

  return Response.json({ error: 'method not allowed' }, { status: 405, headers: CORS });
}
