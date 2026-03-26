import { getDb } from '../connection.js';

interface UserRow {
  id: number;
  email: string;
  username: string;
  display_name: string | null;
  password_hash: string;
  tier: string;
  created_at: string;
  updated_at: string;
}

export function findByEmail(email: string): UserRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function findById(id: number): UserRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function findByUsername(username: string): UserRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
}

export function create(data: {
  email: string;
  username: string;
  passwordHash: string;
  displayName?: string;
}): UserRow {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO users (email, username, password_hash, display_name)
    VALUES (?, ?, ?, ?)
  `).run(data.email, data.username, data.passwordHash, data.displayName ?? null);

  return findById(result.lastInsertRowid as number)!;
}

export function update(id: number, data: {
  displayName?: string;
  email?: string;
  username?: string;
  tier?: string;
}): UserRow | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.displayName !== undefined) {
    fields.push('display_name = ?');
    values.push(data.displayName);
  }
  if (data.email !== undefined) {
    fields.push('email = ?');
    values.push(data.email);
  }
  if (data.username !== undefined) {
    fields.push('username = ?');
    values.push(data.username);
  }
  if (data.tier !== undefined) {
    fields.push('tier = ?');
    values.push(data.tier);
  }

  if (fields.length === 0) return findById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return findById(id);
}

// Refresh token helpers
export function storeRefreshToken(userId: number, tokenHash: string, expiresAt: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, tokenHash, expiresAt);
}

export function findRefreshToken(tokenHash: string): { id: number; user_id: number; token_hash: string; expires_at: string } | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(tokenHash) as any;
}

export function deleteRefreshToken(tokenHash: string): void {
  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
}

export function deleteAllRefreshTokens(userId: number): void {
  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

export function cleanExpiredTokens(): void {
  const db = getDb();
  db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run();
}
