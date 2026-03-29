CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  picture TEXT,
  subscription_tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'none',
  subscription_expires_at TEXT,
  preferences TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS iv_history (
  symbol TEXT NOT NULL,
  date TEXT NOT NULL,
  avg_iv REAL NOT NULL,
  iv_high REAL,
  iv_low REAL,
  price REAL,
  PRIMARY KEY (symbol, date)
);

CREATE TABLE IF NOT EXISTS saved_strategies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  legs TEXT NOT NULL,
  entry_price REAL,
  score INTEGER,
  iv_at_entry REAL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_iv_symbol ON iv_history(symbol);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_strategies(user_id);

-- Daily market pulse signal snapshots (one row per day, upserted)
CREATE TABLE IF NOT EXISTS signal_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  spy_above_200 INTEGER NOT NULL,
  spy_pct_from_200 REAL,
  breadth_improving INTEGER NOT NULL,
  rsp_vs_spy REAL,
  vix_bullish INTEGER NOT NULL,
  vix_current REAL,
  vix_20_high REAL,
  bullish_count INTEGER NOT NULL,
  notification_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Email notification log (audit trail)
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'sent'
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notification_log(user_id);
