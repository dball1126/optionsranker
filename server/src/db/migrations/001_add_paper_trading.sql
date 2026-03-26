-- Add paper trading support
-- Note: Some columns might already exist, SQLite will error on duplicates
-- Check if columns exist before adding them in the migration logic

-- Create paper trading signals table for tracking signal accuracy
CREATE TABLE IF NOT EXISTS paper_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('bullish', 'bearish', 'neutral')),
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  suggested_strike REAL,
  suggested_expiry TEXT,
  suggested_direction TEXT NOT NULL CHECK (suggested_direction IN ('call', 'put')),
  target_price REAL,
  stop_loss REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'breakeven')),
  pnl_percent REAL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_paper_signals_symbol ON paper_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_paper_signals_created_at ON paper_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_paper_signals_confidence ON paper_signals(confidence);

-- Create user notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_notifications INTEGER NOT NULL DEFAULT 1,
  browser_notifications INTEGER NOT NULL DEFAULT 1,
  signal_threshold INTEGER NOT NULL DEFAULT 70 CHECK (signal_threshold BETWEEN 0 AND 100),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Create user notification log
CREATE TABLE IF NOT EXISTS user_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_id INTEGER REFERENCES paper_signals(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('signal', 'educational', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);