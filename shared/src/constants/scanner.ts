import type { StrategyType, ScannerSectorDefinition } from '../types/strategy.js';

export const MARKET_SCANNER_CORE_STRATEGIES: StrategyType[] = [
  'long_call',
  'long_put',
  'covered_call',
  'bull_call_spread',
  'bear_put_spread',
  'iron_condor',
  'straddle',
  'strangle',
];

export const MARKET_SCANNER_SECTORS: ScannerSectorDefinition[] = [
  { id: 'tech-mega-cap', label: 'Tech Mega-Cap', symbols: ['AAPL', 'MSFT', 'META', 'AMZN'] },
  { id: 'semiconductors', label: 'Semiconductors', symbols: ['NVDA', 'AMD', 'AVGO', 'QCOM'] },
  { id: 'healthcare', label: 'Healthcare', symbols: ['LLY', 'JNJ', 'UNH', 'ABBV'] },
  { id: 'financials', label: 'Financials', symbols: ['JPM', 'GS', 'BAC', 'AXP'] },
  { id: 'industrials', label: 'Industrials', symbols: ['BA', 'CAT', 'GE', 'HON'] },
  { id: 'consumer', label: 'Consumer', symbols: ['WMT', 'COST', 'HD', 'NKE'] },
  { id: 'energy', label: 'Energy', symbols: ['XOM', 'CVX', 'SLB', 'OXY'] },
  { id: 'etfs', label: 'ETFs', symbols: ['SPY', 'QQQ', 'IWM', 'XLV'] },
];
