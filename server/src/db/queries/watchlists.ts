import { getDb } from '../connection.js';

interface WatchlistRow {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

interface WatchlistItemRow {
  id: number;
  watchlist_id: number;
  symbol: string;
  added_at: string;
  notes: string | null;
}

export function findByUserId(userId: number): WatchlistRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at ASC').all(userId) as WatchlistRow[];
}

export function findById(id: number): WatchlistRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM watchlists WHERE id = ?').get(id) as WatchlistRow | undefined;
}

export function findByIdAndUserId(id: number, userId: number): WatchlistRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM watchlists WHERE id = ? AND user_id = ?').get(id, userId) as WatchlistRow | undefined;
}

export function create(data: { userId: number; name: string }): WatchlistRow {
  const db = getDb();
  const result = db.prepare('INSERT INTO watchlists (user_id, name) VALUES (?, ?)').run(data.userId, data.name);
  return findById(result.lastInsertRowid as number)!;
}

export function update(id: number, data: { name: string }): WatchlistRow | undefined {
  const db = getDb();
  db.prepare('UPDATE watchlists SET name = ? WHERE id = ?').run(data.name, id);
  return findById(id);
}

export function remove(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM watchlists WHERE id = ?').run(id);
  return result.changes > 0;
}

// Watchlist items
export function findItemsByWatchlistId(watchlistId: number): WatchlistItemRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM watchlist_items WHERE watchlist_id = ? ORDER BY added_at ASC').all(watchlistId) as WatchlistItemRow[];
}

export function findItemById(id: number): WatchlistItemRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM watchlist_items WHERE id = ?').get(id) as WatchlistItemRow | undefined;
}

export function findItemByWatchlistAndSymbol(watchlistId: number, symbol: string): WatchlistItemRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?').get(watchlistId, symbol.toUpperCase()) as WatchlistItemRow | undefined;
}

export function addItem(data: { watchlistId: number; symbol: string; notes?: string }): WatchlistItemRow {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO watchlist_items (watchlist_id, symbol, notes)
    VALUES (?, ?, ?)
  `).run(data.watchlistId, data.symbol.toUpperCase(), data.notes ?? null);

  return findItemById(result.lastInsertRowid as number)!;
}

export function removeItem(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM watchlist_items WHERE id = ?').run(id);
  return result.changes > 0;
}

export function removeItemByWatchlistAndSymbol(watchlistId: number, symbol: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?').run(watchlistId, symbol.toUpperCase());
  return result.changes > 0;
}
