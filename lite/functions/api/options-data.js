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
  const action = url.searchParams.get('action');

  // GET /api/options-data?action=iv-history&symbol=AAPL
  if (context.request.method === 'GET' && action === 'iv-history') {
    const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
    if (!symbol) {
      return Response.json({ error: 'symbol required' }, { status: 400, headers: CORS });
    }
    const rows = await db.prepare(
      'SELECT date, avg_iv, iv_high, iv_low, price FROM iv_history WHERE symbol = ? ORDER BY date DESC LIMIT 365'
    ).bind(symbol).all();

    return Response.json({ symbol, history: rows.results || [] }, { headers: CORS });
  }

  // POST /api/options-data?action=record-iv
  if (context.request.method === 'POST' && action === 'record-iv') {
    let body;
    try { body = await context.request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
    }
    const { symbol, avg_iv, iv_high, iv_low, price } = body;
    if (!symbol || avg_iv == null) {
      return Response.json({ error: 'symbol and avg_iv required' }, { status: 400, headers: CORS });
    }
    const today = new Date().toISOString().slice(0, 10);
    await db.prepare(
      `INSERT INTO iv_history (symbol, date, avg_iv, iv_high, iv_low, price)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(symbol, date) DO UPDATE SET
         avg_iv = excluded.avg_iv,
         iv_high = MAX(iv_history.iv_high, excluded.iv_high),
         iv_low = MIN(iv_history.iv_low, excluded.iv_low),
         price = excluded.price`
    ).bind(symbol.toUpperCase(), today, avg_iv, iv_high || avg_iv, iv_low || avg_iv, price || null).run();

    return Response.json({ recorded: true, symbol: symbol.toUpperCase(), date: today }, { headers: CORS });
  }

  // GET /api/options-data?action=saved&userId=xxx
  if (context.request.method === 'GET' && action === 'saved') {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400, headers: CORS });
    }
    const rows = await db.prepare(
      'SELECT id, symbol, strategy_name, legs, entry_price, score, iv_at_entry, notes, created_at FROM saved_strategies WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(userId).all();

    return Response.json({
      strategies: (rows.results || []).map(r => ({
        ...r,
        legs: JSON.parse(r.legs || '[]'),
      }))
    }, { headers: CORS });
  }

  // POST /api/options-data?action=save
  if (context.request.method === 'POST' && action === 'save') {
    let body;
    try { body = await context.request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
    }
    const { userId, symbol, strategy_name, legs, entry_price, score, iv_at_entry, notes } = body;
    if (!userId || !symbol || !strategy_name || !legs) {
      return Response.json({ error: 'userId, symbol, strategy_name, legs required' }, { status: 400, headers: CORS });
    }
    const result = await db.prepare(
      `INSERT INTO saved_strategies (user_id, symbol, strategy_name, legs, entry_price, score, iv_at_entry, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, symbol.toUpperCase(), strategy_name, JSON.stringify(legs), entry_price || null, score || null, iv_at_entry || null, notes || '').run();

    return Response.json({ saved: true, id: result.meta?.last_row_id }, { headers: CORS });
  }

  // DELETE /api/options-data?action=unsave&id=123&userId=xxx
  if (context.request.method === 'DELETE' && action === 'unsave') {
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');
    if (!id || !userId) {
      return Response.json({ error: 'id and userId required' }, { status: 400, headers: CORS });
    }
    await db.prepare(
      'DELETE FROM saved_strategies WHERE id = ? AND user_id = ?'
    ).bind(id, userId).run();

    return Response.json({ deleted: true }, { headers: CORS });
  }

  return Response.json({ error: 'Unknown action. Use: iv-history, record-iv, saved, save, unsave' }, { status: 400, headers: CORS });
}
