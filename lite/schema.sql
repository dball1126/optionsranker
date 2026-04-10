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
  created_at TEXT DEFAULT (datetime('now')),
  exit_rules TEXT,
  target_exit_date TEXT,
  exit_explanation TEXT
);

-- Backtester paper trading state (managed by the optionsranker backtester agent)
CREATE TABLE IF NOT EXISTS paper_trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  strategy TEXT NOT NULL,
  score INTEGER,
  iv_rank REAL,
  entry_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  dte INTEGER,
  entry_price REAL,
  current_price REAL,
  max_profit REAL,
  max_loss REAL,
  legs TEXT,
  status TEXT DEFAULT 'open',
  exit_date TEXT,
  exit_price REAL,
  pnl REAL,
  pnl_pct REAL,
  notes TEXT,
  exit_reason TEXT,
  target_exit_date TEXT,
  profit_target REAL,
  stop_loss REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS backtest_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL,
  total_trades INTEGER,
  open_trades INTEGER,
  closed_trades INTEGER,
  wins INTEGER,
  losses INTEGER,
  win_rate REAL,
  total_pnl REAL,
  avg_pnl REAL,
  best_strategy TEXT,
  worst_strategy TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_iv_symbol ON iv_history(symbol);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_pt_status ON paper_trades(status);
CREATE INDEX IF NOT EXISTS idx_pt_expiry ON paper_trades(expiry_date);

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
