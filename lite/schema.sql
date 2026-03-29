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
