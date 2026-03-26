import { getDb } from '../connection.js';

interface PortfolioRow {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  is_default: number;
  paper_mode: number;
  paper_balance: number;
  created_at: string;
  updated_at: string;
}

export function findByUserId(userId: number): PortfolioRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM portfolios WHERE user_id = ? ORDER BY is_default DESC, created_at ASC').all(userId) as PortfolioRow[];
}

export function findById(id: number): PortfolioRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM portfolios WHERE id = ?').get(id) as PortfolioRow | undefined;
}

export function findByIdAndUserId(id: number, userId: number): PortfolioRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM portfolios WHERE id = ? AND user_id = ?').get(id, userId) as PortfolioRow | undefined;
}

export function create(data: {
  userId: number;
  name: string;
  description?: string;
  isDefault?: boolean;
  paperMode?: boolean;
  paperBalance?: number;
}): PortfolioRow {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO portfolios (user_id, name, description, is_default, paper_mode, paper_balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.userId, 
    data.name, 
    data.description ?? null, 
    data.isDefault ? 1 : 0,
    data.paperMode ? 1 : 0,
    data.paperBalance ?? 100000
  );

  return findById(result.lastInsertRowid as number)!;
}

export function update(id: number, data: {
  name?: string;
  description?: string;
}): PortfolioRow | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }

  if (fields.length === 0) return findById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE portfolios SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

export function remove(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM portfolios WHERE id = ?').run(id);
  return result.changes > 0;
}

export function countByUserId(userId: number): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM portfolios WHERE user_id = ?').get(userId) as { count: number };
  return row.count;
}
