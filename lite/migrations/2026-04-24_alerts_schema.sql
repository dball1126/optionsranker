-- OptionsRanker D1 schema alignment record.
--
-- Applied on 2026-04-24 by running the full bootstrap schema:
--   npx wrangler d1 execute optionsranker-db --remote --file schema.sql
--
-- That created the missing `users` and `signal_snapshots` tables on the remote
-- D1 database and verified these required app/backtester tables exist.

CREATE TABLE IF NOT EXISTS position_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  strategy_name TEXT,
  trigger_type TEXT NOT NULL,
  threshold REAL NOT NULL,
  legs TEXT,
  status TEXT DEFAULT 'pending',
  notified TEXT,
  triggered_at TEXT,
  last_checked TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON position_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON position_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON position_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_notif_alert ON notification_log(alert_id);
