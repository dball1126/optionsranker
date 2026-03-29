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

  const url = new URL(context.request.url);
  const action = url.searchParams.get('action');

  // POST /api/market-pulse?action=report-signals
  if (context.request.method === 'POST' && action === 'report-signals') {
    let body;
    try { body = await context.request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
    }

    const { spy_above_200, spy_pct_from_200, breadth_improving, rsp_vs_spy,
            vix_bullish, vix_current, vix_20_high, bullish_count } = body;

    if (bullish_count == null) {
      return Response.json({ error: 'bullish_count required' }, { status: 400, headers: CORS });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Upsert today's snapshot
    await db.prepare(
      `INSERT INTO signal_snapshots (date, spy_above_200, spy_pct_from_200, breadth_improving, rsp_vs_spy, vix_bullish, vix_current, vix_20_high, bullish_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         spy_above_200 = excluded.spy_above_200,
         spy_pct_from_200 = excluded.spy_pct_from_200,
         breadth_improving = excluded.breadth_improving,
         rsp_vs_spy = excluded.rsp_vs_spy,
         vix_bullish = excluded.vix_bullish,
         vix_current = excluded.vix_current,
         vix_20_high = excluded.vix_20_high,
         bullish_count = excluded.bullish_count`
    ).bind(
      today,
      spy_above_200 ? 1 : 0, spy_pct_from_200 || 0,
      breadth_improving ? 1 : 0, rsp_vs_spy || 0,
      vix_bullish ? 1 : 0, vix_current || 0, vix_20_high || 0,
      bullish_count
    ).run();

    // Transition detection: did we just hit 3/3?
    let transitioned = false;
    if (bullish_count === 3) {
      // Check if notification already sent today
      const todayRow = await db.prepare(
        'SELECT notification_sent FROM signal_snapshots WHERE date = ?'
      ).bind(today).first();

      if (todayRow && !todayRow.notification_sent) {
        // Check yesterday's snapshot
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const yesterdayRow = await db.prepare(
          'SELECT bullish_count FROM signal_snapshots WHERE date = ?'
        ).bind(yesterday).first();

        if (!yesterdayRow || yesterdayRow.bullish_count < 3) {
          transitioned = true;

          // Find all users opted in to market pulse alerts
          const users = await db.prepare(
            `SELECT user_id, email FROM users
             WHERE email IS NOT NULL AND email != ''
             AND json_extract(preferences, '$.market_pulse_alerts') = true`
          ).all();

          const recipients = users.results || [];
          let emailsSent = 0;

          if (recipients.length > 0 && context.env.RESEND_API_KEY) {
            for (const user of recipients) {
              try {
                const emailResp = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: 'OptionsRanker <alerts@optionsranker.com>',
                    to: [user.email],
                    subject: 'All 3 Market Pulse Signals Just Aligned',
                    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
                      <h2 style="color:#00d4aa;margin:0 0 16px">Market Pulse: 3/3 Bullish</h2>
                      <p>All three re-entry signals are now aligned:</p>
                      <ul>
                        <li><strong>S&P 500</strong> is above its 200-day moving average (${(spy_pct_from_200 || 0).toFixed(1)}% above)</li>
                        <li><strong>Market breadth</strong> is improving — RSP outperforming SPY</li>
                        <li><strong>VIX</strong> is calming after recent volatility</li>
                      </ul>
                      <p style="color:#888">This is a market conditions update, not financial advice. Conditions can change rapidly.</p>
                      <p><a href="https://optionsranker.com" style="color:#00d4aa">Open OptionsRanker</a></p>
                    </div>`,
                  }),
                });

                if (emailResp.ok) {
                  emailsSent++;
                  await db.prepare(
                    `INSERT INTO notification_log (user_id, notification_type, status) VALUES (?, 'market_pulse_3_aligned', 'sent')`
                  ).bind(user.user_id).run();
                } else {
                  await db.prepare(
                    `INSERT INTO notification_log (user_id, notification_type, status) VALUES (?, 'market_pulse_3_aligned', 'failed')`
                  ).bind(user.user_id).run();
                }
              } catch (e) {
                await db.prepare(
                  `INSERT INTO notification_log (user_id, notification_type, status) VALUES (?, 'market_pulse_3_aligned', 'error')`
                ).bind(user.user_id).run();
              }
            }
          }

          // Mark notification as sent to prevent duplicates
          await db.prepare(
            'UPDATE signal_snapshots SET notification_sent = 1 WHERE date = ?'
          ).bind(today).run();
        }
      }
    }

    return Response.json({ saved: true, date: today, transitioned }, { headers: CORS });
  }

  // GET /api/market-pulse?action=history&limit=30
  if (context.request.method === 'GET' && action === 'history') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 90);
    const rows = await db.prepare(
      'SELECT date, spy_above_200, spy_pct_from_200, breadth_improving, rsp_vs_spy, vix_bullish, vix_current, bullish_count FROM signal_snapshots ORDER BY date DESC LIMIT ?'
    ).bind(limit).all();

    return Response.json({ history: rows.results || [] }, { headers: CORS });
  }

  // POST /api/market-pulse?action=preferences
  if (context.request.method === 'POST' && action === 'preferences') {
    let body;
    try { body = await context.request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
    }

    const { userId, market_pulse_alerts } = body;
    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400, headers: CORS });
    }

    // Read current preferences, merge, write back
    const user = await db.prepare('SELECT preferences FROM users WHERE user_id = ?').bind(userId).first();
    let prefs = {};
    try { prefs = JSON.parse(user?.preferences || '{}'); } catch { prefs = {}; }
    prefs.market_pulse_alerts = !!market_pulse_alerts;

    await db.prepare(
      'UPDATE users SET preferences = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
    ).bind(JSON.stringify(prefs), userId).run();

    return Response.json({ saved: true, preferences: prefs }, { headers: CORS });
  }

  // GET /api/market-pulse?action=get-preferences&userId=xxx
  if (context.request.method === 'GET' && action === 'get-preferences') {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400, headers: CORS });
    }

    const user = await db.prepare('SELECT preferences FROM users WHERE user_id = ?').bind(userId).first();
    let prefs = {};
    try { prefs = JSON.parse(user?.preferences || '{}'); } catch { prefs = {}; }

    return Response.json({ preferences: prefs }, { headers: CORS });
  }

  return Response.json({ error: 'Unknown action. Use: report-signals, history, preferences, get-preferences' }, { status: 400, headers: CORS });
}
