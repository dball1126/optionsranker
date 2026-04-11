// Phase 3.1 — Similar trades pattern matcher
// Queries paper_trades for closed trades with the same strategy name
// and similar IV rank / DTE. Returns aggregate win rate and avg P&L.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (context.request.method !== 'GET') {
    return Response.json({ error: 'GET only' }, { status: 405, headers: CORS });
  }
  const db = context.env.DB;
  if (!db) {
    return Response.json({ error: 'Database not configured' }, { status: 500, headers: CORS });
  }

  const url = new URL(context.request.url);
  const strategy = (url.searchParams.get('strategy') || '').trim();
  const ivRank = parseFloat(url.searchParams.get('ivRank'));
  const dte = parseFloat(url.searchParams.get('dte'));

  if (!strategy) {
    return Response.json({ error: 'strategy required' }, { status: 400, headers: CORS });
  }

  // Build query — match by strategy name + IV rank within ±10 + DTE within ±5
  const ivLo = isFinite(ivRank) ? ivRank - 10 : 0;
  const ivHi = isFinite(ivRank) ? ivRank + 10 : 100;
  const dteLo = isFinite(dte) ? dte - 5 : 0;
  const dteHi = isFinite(dte) ? dte + 5 : 365;

  let stmt;
  try {
    stmt = await db.prepare(
      `SELECT id, ticker, status, pnl, pnl_pct, exit_reason, iv_rank, dte
       FROM paper_trades
       WHERE strategy = ?
         AND iv_rank BETWEEN ? AND ?
         AND dte BETWEEN ? AND ?
         AND status = 'closed'
       ORDER BY exit_date DESC
       LIMIT 30`
    ).bind(strategy, ivLo, ivHi, dteLo, dteHi).all();
  } catch (e) {
    return Response.json({ error: 'query_failed', message: e.message }, { status: 500, headers: CORS });
  }

  const rows = stmt.results || [];
  const n = rows.length;
  if (n === 0) {
    return Response.json({
      strategy, ivRank, dte,
      sampleSize: 0,
      winRate: null,
      avgPnl: null,
      totalPnl: null,
      message: 'No closed trades match this profile yet — check back as the backtester accumulates data.',
    }, { headers: CORS });
  }

  const wins = rows.filter(r => (r.pnl || 0) > 0).length;
  const totalPnl = rows.reduce((a, r) => a + (r.pnl || 0), 0);
  const avgPnl = totalPnl / n;

  return Response.json({
    strategy, ivRank, dte,
    sampleSize: n,
    winRate: wins / n,
    avgPnl,
    totalPnl,
    sample: rows.slice(0, 5).map(r => ({ ticker: r.ticker, pnl: r.pnl, exit_reason: r.exit_reason })),
  }, { headers: CORS });
}
