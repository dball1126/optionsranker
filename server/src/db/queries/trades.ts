import { getDb } from '../connection.js';

interface TradeRow {
  id: number;
  portfolio_id: number;
  user_id: number;
  symbol: string;
  option_type: string;
  direction: string;
  quantity: number;
  strike_price: number | null;
  expiration_date: string | null;
  entry_price: number;
  exit_price: number | null;
  status: string;
  strategy_tag: string | null;
  notes: string | null;
  paper_trade: number;
  opened_at: string;
  closed_at: string | null;
}

export function findByPortfolioId(portfolioId: number): TradeRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM trades WHERE portfolio_id = ? ORDER BY opened_at DESC').all(portfolioId) as TradeRow[];
}

export function findByUserId(userId: number): TradeRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY opened_at DESC').all(userId) as TradeRow[];
}

export function findById(id: number): TradeRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM trades WHERE id = ?').get(id) as TradeRow | undefined;
}

export function findByIdAndUserId(id: number, userId: number): TradeRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM trades WHERE id = ? AND user_id = ?').get(id, userId) as TradeRow | undefined;
}

export function findFiltered(userId: number, filters: {
  portfolioId?: number;
  status?: string;
  symbol?: string;
}): TradeRow[] {
  const db = getDb();
  const conditions: string[] = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (filters.portfolioId) {
    conditions.push('portfolio_id = ?');
    params.push(filters.portfolioId);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.symbol) {
    conditions.push('symbol = ?');
    params.push(filters.symbol.toUpperCase());
  }

  const sql = `SELECT * FROM trades WHERE ${conditions.join(' AND ')} ORDER BY opened_at DESC`;
  return db.prepare(sql).all(...params) as TradeRow[];
}

export function create(data: {
  portfolioId: number;
  userId: number;
  symbol: string;
  optionType: string;
  direction: string;
  quantity: number;
  strikePrice?: number;
  expirationDate?: string;
  entryPrice: number;
  strategyTag?: string;
  notes?: string;
  paperTrade?: boolean;
}): TradeRow {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO trades (portfolio_id, user_id, symbol, option_type, direction, quantity,
      strike_price, expiration_date, entry_price, strategy_tag, notes, paper_trade)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.portfolioId,
    data.userId,
    data.symbol.toUpperCase(),
    data.optionType,
    data.direction,
    data.quantity,
    data.strikePrice ?? null,
    data.expirationDate ?? null,
    data.entryPrice,
    data.strategyTag ?? null,
    data.notes ?? null,
    data.paperTrade ? 1 : 0
  );

  return findById(result.lastInsertRowid as number)!;
}

export function closeTrade(id: number, exitPrice: number): TradeRow | undefined {
  const db = getDb();
  db.prepare(`
    UPDATE trades SET exit_price = ?, status = 'closed', closed_at = datetime('now')
    WHERE id = ?
  `).run(exitPrice, id);

  return findById(id);
}

export function update(id: number, data: {
  notes?: string;
  strategyTag?: string;
}): TradeRow | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.notes !== undefined) {
    fields.push('notes = ?');
    values.push(data.notes);
  }
  if (data.strategyTag !== undefined) {
    fields.push('strategy_tag = ?');
    values.push(data.strategyTag);
  }

  if (fields.length === 0) return findById(id);
  values.push(id);

  db.prepare(`UPDATE trades SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM trades WHERE id = ?').run(id);
  return result.changes > 0;
}

export function countOpenByPortfolioId(portfolioId: number): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM trades WHERE portfolio_id = ? AND status = 'open'").get(portfolioId) as { count: number };
  return row.count;
}
