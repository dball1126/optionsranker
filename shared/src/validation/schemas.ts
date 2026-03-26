import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().max(100).optional(),
});

export const createPortfolioSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

export const createTradeSchema = z.object({
  portfolioId: z.number().int().positive(),
  symbol: z.string().min(1).max(10).toUpperCase(),
  optionType: z.enum(['call', 'put', 'stock']),
  direction: z.enum(['buy', 'sell']),
  quantity: z.number().int().positive(),
  strikePrice: z.number().positive().optional(),
  expirationDate: z.string().optional(),
  entryPrice: z.number().positive(),
  strategyTag: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const closeTradeSchema = z.object({
  exitPrice: z.number().positive(),
});

export const createWatchlistSchema = z.object({
  name: z.string().min(1).max(100),
});

export const addWatchlistItemSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  notes: z.string().max(500).optional(),
});

export const strategyLegSchema = z.object({
  type: z.enum(['call', 'put', 'stock']),
  direction: z.enum(['buy', 'sell']),
  quantity: z.number().int().positive(),
  strike: z.number().positive().optional(),
  premium: z.number().optional(),
  expiration: z.string().optional(),
});

export const strategyAnalysisSchema = z.object({
  underlying: z.string().min(1).max(10).toUpperCase(),
  underlyingPrice: z.number().positive(),
  legs: z.array(strategyLegSchema).min(1).max(8),
  riskFreeRate: z.number().min(0).max(1).optional(),
  volatility: z.number().min(0).max(5).optional(),
});

export const updateProgressSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
  quizScore: z.number().min(0).max(100).optional(),
});
