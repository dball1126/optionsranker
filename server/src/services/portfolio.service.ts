import * as portfolioQueries from '../db/queries/portfolios.js';
import * as tradeQueries from '../db/queries/trades.js';
import { notFound, forbidden, badRequest } from '../utils/errors.js';
import type { Portfolio, PortfolioSummary } from '@optionsranker/shared';

function toPortfolio(row: any): Portfolio {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    isDefault: Boolean(row.is_default),
    paperMode: Boolean(row.paper_mode),
    paperBalance: row.paper_balance || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getPortfoliosByUserId(userId: number): Portfolio[] {
  const rows = portfolioQueries.findByUserId(userId);
  return rows.map(toPortfolio);
}

export function getPortfolioById(id: number, userId: number): Portfolio {
  const row = portfolioQueries.findByIdAndUserId(id, userId);
  if (!row) throw notFound('Portfolio not found');
  return toPortfolio(row);
}

export function getPortfolioSummary(id: number, userId: number): PortfolioSummary {
  const portfolio = getPortfolioById(id, userId);
  const trades = tradeQueries.findByPortfolioId(id);

  const openTrades = trades.filter(t => t.status === 'open');
  const closedTrades = trades.filter(t => t.status === 'closed');

  let totalPnL = 0;
  let totalValue = 0;
  let totalCost = 0;

  for (const trade of closedTrades) {
    const direction = trade.direction === 'buy' ? 1 : -1;
    const multiplier = trade.option_type === 'stock' ? 1 : 100;
    const pnl = direction * (trade.exit_price! - trade.entry_price) * trade.quantity * multiplier;
    totalPnL += pnl;
  }

  for (const trade of openTrades) {
    const multiplier = trade.option_type === 'stock' ? 1 : 100;
    totalValue += trade.entry_price * trade.quantity * multiplier;
    totalCost += trade.entry_price * trade.quantity * multiplier;
  }

  return {
    ...portfolio,
    totalValue: Math.round(totalValue * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    totalPnLPercent: totalCost > 0 ? Math.round((totalPnL / totalCost) * 10000) / 100 : 0,
    openPositions: openTrades.length,
  };
}

export function createPortfolio(userId: number, data: { name: string; description?: string; paperMode?: boolean; paperBalance?: number }): Portfolio {
  const count = portfolioQueries.countByUserId(userId);
  if (count >= 10) {
    throw badRequest('Maximum of 10 portfolios allowed');
  }

  const row = portfolioQueries.create({
    userId,
    name: data.name,
    description: data.description,
    isDefault: count === 0,
    paperMode: data.paperMode || false,
    paperBalance: data.paperBalance || 100000,
  });

  return toPortfolio(row);
}

export function updatePortfolio(
  id: number,
  userId: number,
  data: { name?: string; description?: string }
): Portfolio {
  const existing = portfolioQueries.findByIdAndUserId(id, userId);
  if (!existing) throw notFound('Portfolio not found');

  const row = portfolioQueries.update(id, data);
  return toPortfolio(row!);
}

export function deletePortfolio(id: number, userId: number): void {
  const existing = portfolioQueries.findByIdAndUserId(id, userId);
  if (!existing) throw notFound('Portfolio not found');

  if (existing.is_default) {
    throw badRequest('Cannot delete the default portfolio');
  }

  portfolioQueries.remove(id);
}
