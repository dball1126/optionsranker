import * as tradeQueries from '../db/queries/trades.js';
import * as portfolioQueries from '../db/queries/portfolios.js';
import { notFound, forbidden, badRequest } from '../utils/errors.js';
import type { Trade } from '@optionsranker/shared';

function toTrade(row: any): Trade {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    userId: row.user_id,
    symbol: row.symbol,
    optionType: row.option_type,
    direction: row.direction,
    quantity: row.quantity,
    strikePrice: row.strike_price,
    expirationDate: row.expiration_date,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    status: row.status,
    strategyTag: row.strategy_tag,
    notes: row.notes,
    paperTrade: Boolean(row.paper_trade || false),
    openedAt: row.opened_at,
    closedAt: row.closed_at,
  };
}

export function getTradesByUserId(userId: number, filters?: {
  portfolioId?: number;
  status?: string;
  symbol?: string;
}): Trade[] {
  const rows = filters
    ? tradeQueries.findFiltered(userId, filters)
    : tradeQueries.findByUserId(userId);
  return rows.map(toTrade);
}

export function getTradeById(id: number, userId: number): Trade {
  const row = tradeQueries.findByIdAndUserId(id, userId);
  if (!row) throw notFound('Trade not found');
  return toTrade(row);
}

export function createTrade(userId: number, data: {
  portfolioId: number;
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
}): Trade {
  // Verify portfolio belongs to user
  const portfolio = portfolioQueries.findByIdAndUserId(data.portfolioId, userId);
  if (!portfolio) throw notFound('Portfolio not found');

  // Validate option-specific fields
  if (data.optionType !== 'stock' && !data.strikePrice) {
    throw badRequest('Strike price is required for option trades');
  }
  if (data.optionType !== 'stock' && !data.expirationDate) {
    throw badRequest('Expiration date is required for option trades');
  }

  const row = tradeQueries.create({
    ...data,
    userId,
  });

  return toTrade(row);
}

export function closeTrade(id: number, userId: number, exitPrice: number): Trade {
  const existing = tradeQueries.findByIdAndUserId(id, userId);
  if (!existing) throw notFound('Trade not found');
  if (existing.status !== 'open') throw badRequest('Trade is already closed');

  const row = tradeQueries.closeTrade(id, exitPrice);
  return toTrade(row!);
}

export function updateTrade(id: number, userId: number, data: {
  notes?: string;
  strategyTag?: string;
}): Trade {
  const existing = tradeQueries.findByIdAndUserId(id, userId);
  if (!existing) throw notFound('Trade not found');

  const row = tradeQueries.update(id, data);
  return toTrade(row!);
}

export function deleteTrade(id: number, userId: number): void {
  const existing = tradeQueries.findByIdAndUserId(id, userId);
  if (!existing) throw notFound('Trade not found');

  tradeQueries.remove(id);
}
