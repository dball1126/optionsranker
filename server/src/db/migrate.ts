import { getDb } from './connection.js';
import { logger } from '../utils/logger.js';

export function applyMigrations(): void {
  const db = getDb();
  
  try {
    // Check if paper_mode column exists in portfolios
    const portfolioColumns = db.prepare("PRAGMA table_info(portfolios)").all() as any[];
    const hasPaperMode = portfolioColumns.some(col => col.name === 'paper_mode');
    const hasPaperBalance = portfolioColumns.some(col => col.name === 'paper_balance');
    
    if (!hasPaperMode) {
      db.exec('ALTER TABLE portfolios ADD COLUMN paper_mode INTEGER NOT NULL DEFAULT 0');
      logger.info('Added paper_mode column to portfolios');
    }
    
    if (!hasPaperBalance) {
      db.exec('ALTER TABLE portfolios ADD COLUMN paper_balance REAL NOT NULL DEFAULT 100000.0');
      logger.info('Added paper_balance column to portfolios');
    }

    // Check if paper_trade column exists in trades
    const tradeColumns = db.prepare("PRAGMA table_info(trades)").all() as any[];
    const hasPaperTrade = tradeColumns.some(col => col.name === 'paper_trade');
    
    if (!hasPaperTrade) {
      db.exec('ALTER TABLE trades ADD COLUMN paper_trade INTEGER NOT NULL DEFAULT 0');
      logger.info('Added paper_trade column to trades');
    }

    // Create paper_signals table if it doesn't exist
    db.exec(`
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
      )
    `);

    // Create indexes for paper_signals
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_paper_signals_symbol ON paper_signals(symbol);
      CREATE INDEX IF NOT EXISTS idx_paper_signals_created_at ON paper_signals(created_at);
      CREATE INDEX IF NOT EXISTS idx_paper_signals_confidence ON paper_signals(confidence);
    `);

    // Create notification_preferences table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_notifications INTEGER NOT NULL DEFAULT 1,
        browser_notifications INTEGER NOT NULL DEFAULT 1,
        signal_threshold INTEGER NOT NULL DEFAULT 70 CHECK (signal_threshold BETWEEN 0 AND 100),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id)
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
    `);

    // Create user_notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        signal_id INTEGER REFERENCES paper_signals(id) ON DELETE SET NULL,
        notification_type TEXT NOT NULL CHECK (notification_type IN ('signal', 'educational', 'system')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);
    `);

    logger.info('All migrations applied successfully');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}