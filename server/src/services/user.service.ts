import * as userQueries from '../db/queries/users.js';
import { notFound } from '../utils/errors.js';
import type { User } from '@optionsranker/shared';

function toUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    tier: row.tier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getUserById(id: number): User {
  const row = userQueries.findById(id);
  if (!row) throw notFound('User not found');
  return toUser(row);
}

export function updateUser(id: number, data: {
  displayName?: string;
  email?: string;
  username?: string;
}): User {
  const existing = userQueries.findById(id);
  if (!existing) throw notFound('User not found');

  const row = userQueries.update(id, data);
  return toUser(row!);
}
