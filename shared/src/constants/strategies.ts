import type { StrategyType, StrategyLeg } from '../types/strategy.js';

export interface StrategyTemplate {
  type: StrategyType;
  name: string;
  description: string;
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'volatile';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  legs: Omit<StrategyLeg, 'strike' | 'premium' | 'expiration'>[];
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    type: 'long_call',
    name: 'Long Call',
    description: 'Buy a call option to profit from a price increase. Limited risk, unlimited profit potential.',
    sentiment: 'bullish',
    difficulty: 'beginner',
    legs: [{ type: 'call', direction: 'buy', quantity: 1 }],
  },
  {
    type: 'long_put',
    name: 'Long Put',
    description: 'Buy a put option to profit from a price decrease. Limited risk, substantial profit potential.',
    sentiment: 'bearish',
    difficulty: 'beginner',
    legs: [{ type: 'put', direction: 'buy', quantity: 1 }],
  },
  {
    type: 'covered_call',
    name: 'Covered Call',
    description: 'Own the stock and sell a call. Generate income while holding shares. Limits upside.',
    sentiment: 'neutral',
    difficulty: 'beginner',
    legs: [
      { type: 'stock', direction: 'buy', quantity: 100 },
      { type: 'call', direction: 'sell', quantity: 1 },
    ],
  },
  {
    type: 'protective_put',
    name: 'Protective Put',
    description: 'Own the stock and buy a put for downside protection. Insurance for your position.',
    sentiment: 'bullish',
    difficulty: 'beginner',
    legs: [
      { type: 'stock', direction: 'buy', quantity: 100 },
      { type: 'put', direction: 'buy', quantity: 1 },
    ],
  },
  {
    type: 'bull_call_spread',
    name: 'Bull Call Spread',
    description: 'Buy a call and sell a higher-strike call. Reduces cost but caps profit. Moderately bullish.',
    sentiment: 'bullish',
    difficulty: 'intermediate',
    legs: [
      { type: 'call', direction: 'buy', quantity: 1 },
      { type: 'call', direction: 'sell', quantity: 1 },
    ],
  },
  {
    type: 'bear_put_spread',
    name: 'Bear Put Spread',
    description: 'Buy a put and sell a lower-strike put. Reduces cost but caps profit. Moderately bearish.',
    sentiment: 'bearish',
    difficulty: 'intermediate',
    legs: [
      { type: 'put', direction: 'buy', quantity: 1 },
      { type: 'put', direction: 'sell', quantity: 1 },
    ],
  },
  {
    type: 'iron_condor',
    name: 'Iron Condor',
    description: 'Sell a put spread and a call spread. Profit from low volatility within a price range.',
    sentiment: 'neutral',
    difficulty: 'advanced',
    legs: [
      { type: 'put', direction: 'buy', quantity: 1 },
      { type: 'put', direction: 'sell', quantity: 1 },
      { type: 'call', direction: 'sell', quantity: 1 },
      { type: 'call', direction: 'buy', quantity: 1 },
    ],
  },
  {
    type: 'iron_butterfly',
    name: 'Iron Butterfly',
    description: 'Sell an ATM straddle and buy OTM wings. Profit from minimal price movement.',
    sentiment: 'neutral',
    difficulty: 'advanced',
    legs: [
      { type: 'put', direction: 'buy', quantity: 1 },
      { type: 'put', direction: 'sell', quantity: 1 },
      { type: 'call', direction: 'sell', quantity: 1 },
      { type: 'call', direction: 'buy', quantity: 1 },
    ],
  },
  {
    type: 'straddle',
    name: 'Long Straddle',
    description: 'Buy both ATM call and put. Profit from big moves in either direction.',
    sentiment: 'volatile',
    difficulty: 'intermediate',
    legs: [
      { type: 'call', direction: 'buy', quantity: 1 },
      { type: 'put', direction: 'buy', quantity: 1 },
    ],
  },
  {
    type: 'strangle',
    name: 'Long Strangle',
    description: 'Buy OTM call and OTM put. Cheaper than a straddle, needs larger moves to profit.',
    sentiment: 'volatile',
    difficulty: 'intermediate',
    legs: [
      { type: 'call', direction: 'buy', quantity: 1 },
      { type: 'put', direction: 'buy', quantity: 1 },
    ],
  },
];
