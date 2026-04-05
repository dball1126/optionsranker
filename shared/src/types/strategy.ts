export type StrategyType =
  | 'long_call'
  | 'long_put'
  | 'covered_call'
  | 'protective_put'
  | 'bull_call_spread'
  | 'bear_put_spread'
  | 'iron_condor'
  | 'iron_butterfly'
  | 'straddle'
  | 'strangle'
  | 'custom';

export interface StrategyLeg {
  type: 'call' | 'put' | 'stock';
  direction: 'buy' | 'sell';
  quantity: number;
  strike?: number;
  premium?: number;
  expiration?: string;
}

export interface StrategyDefinition {
  type: StrategyType;
  name: string;
  description: string;
  legs: StrategyLeg[];
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakeven: number[];
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'volatile';
}

export interface StrategyAnalysisRequest {
  underlying: string;
  underlyingPrice: number;
  legs: StrategyLeg[];
  riskFreeRate?: number;
  volatility?: number;
}

export interface RankedStrategy {
  rank: number;
  strategyType: StrategyType;
  strategyName: string;
  score: number;
  legs: StrategyLeg[];
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakeven: number[];
  probabilityOfProfit: number;
  expectedValue: number;
  riskRewardRatio: number;
  liquidityScore: number;
  netDebit: number;
  expiration: string;
}

export interface RankingResponse {
  symbol: string;
  underlyingPrice: number;
  expiration: string;
  rankedStrategies: RankedStrategy[];
}

export interface StrategyAnalysisResponse {
  legs: StrategyLeg[];
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakeven: number[];
  pnlData: { price: number; pnl: number }[];
  probabilityOfProfit: number;
}
