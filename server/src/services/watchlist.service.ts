import * as watchlistQueries from '../db/queries/watchlists.js';
import { notFound, badRequest } from '../utils/errors.js';
import type { Watchlist, WatchlistItem, WatchlistWithItems } from '@optionsranker/shared';

function toWatchlist(row: any): Watchlist {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function toWatchlistItem(row: any): WatchlistItem {
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    symbol: row.symbol,
    addedAt: row.added_at,
    notes: row.notes,
  };
}

export function getWatchlistsByUserId(userId: number): Watchlist[] {
  return watchlistQueries.findByUserId(userId).map(toWatchlist);
}

export function getWatchlistById(id: number, userId: number): WatchlistWithItems {
  const row = watchlistQueries.findByIdAndUserId(id, userId);
  if (!row) throw notFound('Watchlist not found');

  const items = watchlistQueries.findItemsByWatchlistId(id).map(toWatchlistItem);

  return {
    ...toWatchlist(row),
    items,
  };
}

export function createWatchlist(userId: number, data: { name: string }): Watchlist {
  const row = watchlistQueries.create({ userId, name: data.name });
  return toWatchlist(row);
}

export function updateWatchlist(id: number, userId: number, data: { name: string }): Watchlist {
  const existing = watchlistQueries.findByIdAndUserId(id, userId);
  if (!existing) throw notFound('Watchlist not found');

  const row = watchlistQueries.update(id, data);
  return toWatchlist(row!);
}

export function deleteWatchlist(id: number, userId: number): void {
  const existing = watchlistQueries.findByIdAndUserId(id, userId);
  if (!existing) throw notFound('Watchlist not found');

  watchlistQueries.remove(id);
}

export function addItem(watchlistId: number, userId: number, data: { symbol: string; notes?: string }): WatchlistItem {
  const watchlist = watchlistQueries.findByIdAndUserId(watchlistId, userId);
  if (!watchlist) throw notFound('Watchlist not found');

  const existing = watchlistQueries.findItemByWatchlistAndSymbol(watchlistId, data.symbol);
  if (existing) throw badRequest('Symbol already in watchlist');

  const row = watchlistQueries.addItem({
    watchlistId,
    symbol: data.symbol,
    notes: data.notes,
  });

  return toWatchlistItem(row);
}

export function removeItem(watchlistId: number, itemId: number, userId: number): void {
  const watchlist = watchlistQueries.findByIdAndUserId(watchlistId, userId);
  if (!watchlist) throw notFound('Watchlist not found');

  const item = watchlistQueries.findItemById(itemId);
  if (!item || item.watchlist_id !== watchlistId) throw notFound('Item not found');

  watchlistQueries.removeItem(itemId);
}
