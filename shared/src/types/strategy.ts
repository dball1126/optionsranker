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

export type RankingMode = 'current' | 'aeroc';

export interface ScannerSectorDefinition {
  id: string;
  label: string;
  symbols: string[];
}

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
  rankingMode?: RankingMode;
  strategyType: StrategyType;
  strategyName: string;
  score: number;
  legs: StrategyLeg[];
  strikes?: number[];
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakeven: number[];
  probabilityOfProfit: number;
  expectedValue: number;
  riskRewardRatio: number;
  liquidityScore: number;
  netDebit: number;
  debitPaid?: number;
  eroc?: number | null;
  aeroc?: number | null;
  expiration: string;
}

export interface RankingResponse {
  symbol: string;
  rankingMode: RankingMode;
  underlyingPrice: number;
  expiration: string;
  rankedStrategies: RankedStrategy[];
}

export interface ScannerResult {
  rank: number;
  sectorRank: number;
  symbol: string;
  companyName: string;
  sector: string;
  sectorLabel: string;
  underlyingPrice: number;
  priceChange: number;
  priceChangePercent: number;
  scannerScore: number;
  baseScore: number;
  strategy: RankedStrategy;
}

export interface ScannerResponse {
  rankingMode: Extract<RankingMode, 'current'>;
  asOf: string;
  cached: boolean;
  universeSize: number;
  sectors: ScannerSectorDefinition[];
  results: ScannerResult[];
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
