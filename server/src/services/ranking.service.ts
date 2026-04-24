import type {
  OptionsContract,
  StrategyLeg,
  RankedStrategy,
  RankingResponse,
  RankingMode,
  Quote,
  ScannerResponse,
  ScannerResult,
  ScannerSectorDefinition,
} from '@optionsranker/shared';
import {
  STRATEGY_TEMPLATES,
  MARKET_SCANNER_CORE_STRATEGIES,
  MARKET_SCANNER_SECTORS,
} from '@optionsranker/shared';
import { normalCDF } from '../utils/blackScholes.js';
import { analyzeStrategy } from './strategy.service.js';
import { realMarketDataService } from './realMarketData.service.js';

const R = 0.05; // risk-free rate
const MIN_LIQUIDITY = 10; // minimum volume + OI per leg
const MAX_RISK_REWARD_CAP = 10; // cap for unlimited-profit strategies
const MAX_BID_ASK_SPREAD_RATIO = 0.10;
const MARKET_SCANNER_CACHE_MS = 5 * 60 * 1000;
const MARKET_SCANNER_CONCURRENCY = 4;
const MARKET_SCANNER_MIN_LIQUIDITY_SCORE = 25;
const scannerCache = new Map<string, { timestamp: number; data: ScannerResponse }>();

// ── Helpers ─────────────────────────────────────────────────────────

/** Find the contract closest to a target strike */
function findByStrike(contracts: OptionsContract[], targetStrike: number): OptionsContract | null {
  if (!contracts.length) return null;
  return contracts.reduce((best, c) =>
    Math.abs(c.strike - targetStrike) < Math.abs(best.strike - targetStrike) ? c : best
  );
}

/** Find the ATM strike (closest to underlying price) */
function findATM(contracts: OptionsContract[], S: number): OptionsContract | null {
  return findByStrike(contracts, S);
}

/** Find contract closest to a target delta */
function findByDelta(contracts: OptionsContract[], targetDelta: number): OptionsContract | null {
  if (!contracts.length) return null;
  return contracts.reduce((best, c) =>
    Math.abs(c.greeks.delta - targetDelta) < Math.abs(best.greeks.delta - targetDelta) ? c : best
  );
}

/** Get strikes sorted ascending */
function getSortedStrikes(contracts: OptionsContract[]): number[] {
  return [...new Set(contracts.map(c => c.strike))].sort((a, b) => a - b);
}

/** Get the contract N strikes above/below a reference strike */
function getStrikeOffset(contracts: OptionsContract[], refStrike: number, offset: number): OptionsContract | null {
  const strikes = getSortedStrikes(contracts);
  const idx = strikes.findIndex(s => s >= refStrike);
  if (idx === -1) return null;
  const targetIdx = idx + offset;
  if (targetIdx < 0 || targetIdx >= strikes.length) return null;
  return findByStrike(contracts, strikes[targetIdx]);
}

/** Mid price for buying (conservative) */
function midPrice(c: OptionsContract): number {
  if (c.bid > 0 && c.ask > 0) return (c.bid + c.ask) / 2;
  return c.last || c.ask || 0;
}

function hasTightSpread(c: OptionsContract): boolean {
  return c.ask > 0 && c.bid > 0 && ((c.ask - c.bid) / c.ask) <= MAX_BID_ASK_SPREAD_RATIO;
}

/** Check if a contract has sufficient liquidity */
function isLiquid(c: OptionsContract): boolean {
  return (c.volume + c.openInterest) >= MIN_LIQUIDITY && hasTightSpread(c);
}

/** Average IV across a set of contracts */
function avgIV(contracts: OptionsContract[]): number {
  const ivs = contracts.filter(c => c.impliedVolatility > 0).map(c => c.impliedVolatility);
  return ivs.length > 0 ? ivs.reduce((a, b) => a + b, 0) / ivs.length : 0.3;
}

/**
 * Probability that stock price ends above a given level at expiry.
 * Uses lognormal distribution: P(S_T > K) = N(d2) where d2 uses real IV.
 */
function probAbove(S: number, K: number, T: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) return S > K ? 1 : 0;
  const d2 = (Math.log(S / K) + (R - 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  return normalCDF(d2);
}

function probBelow(S: number, K: number, T: number, sigma: number): number {
  return 1 - probAbove(S, K, T, sigma);
}

// ── Strategy Builders ───────────────────────────────────────────────

interface ConcreteStrategy {
  strategyType: string;
  strategyName: string;
  legs: StrategyLeg[];
  contracts: OptionsContract[]; // the actual contracts used
  netDebit: number;
}

type StrategyBuilder = (
  calls: OptionsContract[],
  puts: OptionsContract[],
  S: number,
  expiration: string,
) => ConcreteStrategy | null;

function buildLongCall(calls: OptionsContract[], _puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  const atm = findATM(calls, S);
  if (!atm || !isLiquid(atm)) return null;
  const premium = midPrice(atm);
  return {
    strategyType: 'long_call', strategyName: 'Long Call',
    legs: [{ type: 'call', direction: 'buy', quantity: 1, strike: atm.strike, premium, expiration: exp }],
    contracts: [atm], netDebit: premium * 100,
  };
}

function buildLongPut(_calls: OptionsContract[], puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  const atm = findATM(puts, S);
  if (!atm || !isLiquid(atm)) return null;
  const premium = midPrice(atm);
  return {
    strategyType: 'long_put', strategyName: 'Long Put',
    legs: [{ type: 'put', direction: 'buy', quantity: 1, strike: atm.strike, premium, expiration: exp }],
    contracts: [atm], netDebit: premium * 100,
  };
}

function buildCoveredCall(calls: OptionsContract[], _puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  const otmCall = findByDelta(calls.filter(c => c.strike > S), 0.30);
  if (!otmCall || !isLiquid(otmCall)) return null;
  const premium = otmCall.bid > 0 ? otmCall.bid : midPrice(otmCall);
  return {
    strategyType: 'covered_call', strategyName: 'Covered Call',
    legs: [
      { type: 'stock', direction: 'buy', quantity: 100, strike: S, premium: S },
      { type: 'call', direction: 'sell', quantity: 1, strike: otmCall.strike, premium, expiration: exp },
    ],
    contracts: [otmCall], netDebit: S * 100 - premium * 100,
  };
}

function buildProtectivePut(_calls: OptionsContract[], puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  const otmPut = findByDelta(puts.filter(c => c.strike < S), -0.30);
  if (!otmPut || !isLiquid(otmPut)) return null;
  const premium = midPrice(otmPut);
  return {
    strategyType: 'protective_put', strategyName: 'Protective Put',
    legs: [
      { type: 'stock', direction: 'buy', quantity: 100, strike: S, premium: S },
      { type: 'put', direction: 'buy', quantity: 1, strike: otmPut.strike, premium, expiration: exp },
    ],
    contracts: [otmPut], netDebit: S * 100 + premium * 100,
  };
}

function buildBullCallSpread(calls: OptionsContract[], _puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  const buyCall = findATM(calls, S);
  if (!buyCall || !isLiquid(buyCall)) return null;
  const sellCall = getStrikeOffset(calls, buyCall.strike, 2);
  if (!sellCall || !isLiquid(sellCall)) return null;
  const buyPremium = midPrice(buyCall);
  const sellPremium = sellCall.bid > 0 ? sellCall.bid : midPrice(sellCall);
  return {
    strategyType: 'bull_call_spread', strategyName: 'Bull Call Spread',
    legs: [
      { type: 'call', direction: 'buy', quantity: 1, strike: buyCall.strike, premium: buyPremium, expiration: exp },
      { type: 'call', direction: 'sell', quantity: 1, strike: sellCall.strike, premium: sellPremium, expiration: exp },
    ],
    contracts: [buyCall, sellCall], netDebit: (buyPremium - sellPremium) * 100,
  };
}

function buildBearPutSpread(_calls: OptionsContract[], puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  const buyPut = findATM(puts, S);
  if (!buyPut || !isLiquid(buyPut)) return null;
  const sellPut = getStrikeOffset(puts, buyPut.strike, -2);
  if (!sellPut || !isLiquid(sellPut)) return null;
  const buyPremium = midPrice(buyPut);
  const sellPremium = sellPut.bid > 0 ? sellPut.bid : midPrice(sellPut);
  return {
    strategyType: 'bear_put_spread', strategyName: 'Bear Put Spread',
    legs: [
      { type: 'put', direction: 'buy', quantity: 1, strike: buyPut.strike, premium: buyPremium, expiration: exp },
      { type: 'put', direction: 'sell', quantity: 1, strike: sellPut.strike, premium: sellPremium, expiration: exp },
    ],
    contracts: [buyPut, sellPut], netDebit: (buyPremium - sellPremium) * 100,
  };
}

function buildIronCondor(calls: OptionsContract[], puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  // Sell OTM put spread + OTM call spread
  const sellPut = getStrikeOffset(puts, S, -2);
  const buyPut = sellPut ? getStrikeOffset(puts, sellPut.strike, -1) : null;
  const sellCall = getStrikeOffset(calls, S, 2);
  const buyCall = sellCall ? getStrikeOffset(calls, sellCall.strike, 1) : null;
  if (!sellPut || !buyPut || !sellCall || !buyCall) return null;
  if (![sellPut, buyPut, sellCall, buyCall].every(isLiquid)) return null;

  const credit = (sellPut.bid + sellCall.bid) - (midPrice(buyPut) + midPrice(buyCall));
  return {
    strategyType: 'iron_condor', strategyName: 'Iron Condor',
    legs: [
      { type: 'put', direction: 'buy', quantity: 1, strike: buyPut.strike, premium: midPrice(buyPut), expiration: exp },
      { type: 'put', direction: 'sell', quantity: 1, strike: sellPut.strike, premium: sellPut.bid, expiration: exp },
      { type: 'call', direction: 'sell', quantity: 1, strike: sellCall.strike, premium: sellCall.bid, expiration: exp },
      { type: 'call', direction: 'buy', quantity: 1, strike: buyCall.strike, premium: midPrice(buyCall), expiration: exp },
    ],
    contracts: [buyPut, sellPut, sellCall, buyCall], netDebit: -credit * 100,
  };
}

function buildIronButterfly(calls: OptionsContract[], puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  const atmCall = findATM(calls, S);
  const atmPut = findATM(puts, S);
  if (!atmCall || !atmPut) return null;
  const buyCall = getStrikeOffset(calls, atmCall.strike, 2);
  const buyPut = getStrikeOffset(puts, atmPut.strike, -2);
  if (!buyCall || !buyPut) return null;
  if (![atmCall, atmPut, buyCall, buyPut].every(isLiquid)) return null;

  const credit = (atmCall.bid + atmPut.bid) - (midPrice(buyCall) + midPrice(buyPut));
  return {
    strategyType: 'iron_butterfly', strategyName: 'Iron Butterfly',
    legs: [
      { type: 'put', direction: 'buy', quantity: 1, strike: buyPut.strike, premium: midPrice(buyPut), expiration: exp },
      { type: 'put', direction: 'sell', quantity: 1, strike: atmPut.strike, premium: atmPut.bid, expiration: exp },
      { type: 'call', direction: 'sell', quantity: 1, strike: atmCall.strike, premium: atmCall.bid, expiration: exp },
      { type: 'call', direction: 'buy', quantity: 1, strike: buyCall.strike, premium: midPrice(buyCall), expiration: exp },
    ],
    contracts: [buyPut, atmPut, atmCall, buyCall], netDebit: -credit * 100,
  };
}

function buildStraddle(calls: OptionsContract[], puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  const atmCall = findATM(calls, S);
  const atmPut = findATM(puts, S);
  if (!atmCall || !atmPut || !isLiquid(atmCall) || !isLiquid(atmPut)) return null;
  const callPremium = midPrice(atmCall);
  const putPremium = midPrice(atmPut);
  return {
    strategyType: 'straddle', strategyName: 'Long Straddle',
    legs: [
      { type: 'call', direction: 'buy', quantity: 1, strike: atmCall.strike, premium: callPremium, expiration: exp },
      { type: 'put', direction: 'buy', quantity: 1, strike: atmPut.strike, premium: putPremium, expiration: exp },
    ],
    contracts: [atmCall, atmPut], netDebit: (callPremium + putPremium) * 100,
  };
}

function buildStrangle(calls: OptionsContract[], puts: OptionsContract[], S: number, exp: string): ConcreteStrategy | null {
  const otmCall = getStrikeOffset(calls, S, 1);
  const otmPut = getStrikeOffset(puts, S, -1);
  if (!otmCall || !otmPut || !isLiquid(otmCall) || !isLiquid(otmPut)) return null;
  const callPremium = midPrice(otmCall);
  const putPremium = midPrice(otmPut);
  return {
    strategyType: 'strangle', strategyName: 'Long Strangle',
    legs: [
      { type: 'call', direction: 'buy', quantity: 1, strike: otmCall.strike, premium: callPremium, expiration: exp },
      { type: 'put', direction: 'buy', quantity: 1, strike: otmPut.strike, premium: putPremium, expiration: exp },
    ],
    contracts: [otmCall, otmPut], netDebit: (callPremium + putPremium) * 100,
  };
}

const BUILDERS: Record<string, StrategyBuilder> = {
  long_call: buildLongCall,
  long_put: buildLongPut,
  covered_call: buildCoveredCall,
  protective_put: buildProtectivePut,
  bull_call_spread: buildBullCallSpread,
  bear_put_spread: buildBearPutSpread,
  iron_condor: buildIronCondor,
  iron_butterfly: buildIronButterfly,
  straddle: buildStraddle,
  strangle: buildStrangle,
};

// ── Scoring ─────────────────────────────────────────────────────────

const MIN_DTE = 7; // minimum days to expiration

/** Lognormal probability density function */
function lognormalPDF(ST: number, S: number, T: number, sigma: number): number {
  if (ST <= 0 || T <= 0 || sigma <= 0) return 0;
  const mu = Math.log(S) + (R - 0.5 * sigma * sigma) * T;
  const s = sigma * Math.sqrt(T);
  const logST = Math.log(ST);
  return Math.exp(-0.5 * ((logST - mu) / s) ** 2) / (ST * s * Math.sqrt(2 * Math.PI));
}

function computePoP(
  S: number, breakevens: number[], T: number, sigma: number,
  maxProfitPrice: 'above' | 'below' | 'between',
): number {
  if (breakevens.length === 0) return 0.5;

  if (breakevens.length === 1) {
    if (maxProfitPrice === 'above') return probAbove(S, breakevens[0], T, sigma);
    return probBelow(S, breakevens[0], T, sigma);
  }

  if (breakevens.length === 2) {
    const [lower, upper] = breakevens.sort((a, b) => a - b);
    if (maxProfitPrice === 'between') {
      return probAbove(S, lower, T, sigma) - probAbove(S, upper, T, sigma);
    }
    return probBelow(S, lower, T, sigma) + probAbove(S, upper, T, sigma);
  }

  return 0.5;
}

function getMaxProfitDirection(strategyType: string): 'above' | 'below' | 'between' | 'outside' {
  switch (strategyType) {
    case 'long_call': case 'bull_call_spread': case 'covered_call': return 'above';
    case 'long_put': case 'bear_put_spread': case 'protective_put': return 'below';
    case 'iron_condor': case 'iron_butterfly': return 'between';
    case 'straddle': case 'strangle': return 'outside';
    default: return 'above';
  }
}

/**
 * Compute expected value by integrating P&L curve against lognormal probability density.
 * This is the proper way: EV = ∫ PnL(S_T) * f(S_T) dS_T
 */
function computeExpectedValue(
  pnlData: { price: number; pnl: number }[],
  S: number, T: number, sigma: number,
): number {
  if (pnlData.length < 2) return 0;
  let ev = 0;
  for (let i = 1; i < pnlData.length; i++) {
    const price = pnlData[i].price;
    const pnl = pnlData[i].pnl;
    const dPrice = pnlData[i].price - pnlData[i - 1].price;
    const density = lognormalPDF(price, S, T, sigma);
    ev += pnl * density * dPrice;
  }
  return ev;
}

/** Resolve "unlimited" max loss to a practical 2-sigma downside move */
function resolveMaxLoss(maxLoss: number | 'unlimited', S: number, T: number, sigma: number): number {
  if (typeof maxLoss === 'number') return Math.abs(maxLoss);
  // 2-sigma downside for stock-based strategies
  const twoSigmaDown = S * (1 - Math.exp(-sigma * Math.sqrt(T) * 2));
  return twoSigmaDown * 100;
}

/** Resolve "unlimited" max profit to a practical 2-sigma upside move */
function resolveMaxProfit(maxProfit: number | 'unlimited', S: number, T: number, sigma: number): number {
  if (typeof maxProfit === 'number') return maxProfit;
  const twoSigmaUp = S * (Math.exp(sigma * Math.sqrt(T) * 2) - 1);
  return twoSigmaUp * 100;
}

// ── Main Ranking Function ───────────────────────────────────────────

/** Pick the best expiration: first one with ≥7 DTE, or furthest available */
function selectExpiration(expirations: string[]): string | null {
  if (!expirations.length) return null;
  for (const exp of expirations) {
    const days = (new Date(exp).getTime() - Date.now()) / 86400000;
    if (days >= MIN_DTE) return exp;
  }
  return expirations[expirations.length - 1]; // fallback to furthest
}

export async function rankStrategies(symbol: string, mode: RankingMode = 'current'): Promise<RankingResponse> {
  const chain = await realMarketDataService.getOptionsChain(symbol);
  if (!chain || chain.expirations.length === 0) {
    return { symbol, rankingMode: mode, underlyingPrice: 0, expiration: '', rankedStrategies: [] };
  }

  const S = chain.underlyingPrice;
  const expiration = selectExpiration(chain.expirations);
  if (!expiration) return { symbol, rankingMode: mode, underlyingPrice: S, expiration: '', rankedStrategies: [] };

  const expData = chain.chain[expiration];
  if (!expData) return { symbol, rankingMode: mode, underlyingPrice: S, expiration, rankedStrategies: [] };

  if (mode === 'aeroc') {
    return rankStrategiesByAEROC(symbol, S, expiration, expData.calls, expData.puts);
  }

  const { calls, puts } = expData;
  const sigma = avgIV([...calls, ...puts]);
  const T = Math.max(0.01, (new Date(expiration).getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000));

  // Build concrete strategies from templates
  const candidates: { concrete: ConcreteStrategy; analysis: ReturnType<typeof analyzeStrategy> }[] = [];

  for (const template of STRATEGY_TEMPLATES) {
    const builder = BUILDERS[template.type];
    if (!builder) continue;
    const concrete = builder(calls, puts, S, expiration);
    if (!concrete) continue;

    const analysis = analyzeStrategy({
      underlying: symbol,
      underlyingPrice: S,
      legs: concrete.legs,
      volatility: sigma,
      riskFreeRate: R,
    });
    candidates.push({ concrete, analysis });
  }

  if (candidates.length === 0) {
    return { symbol, rankingMode: mode, underlyingPrice: S, expiration, rankedStrategies: [] };
  }

  // Score each strategy
  const scored = candidates.map(({ concrete, analysis }) => {
    const direction = getMaxProfitDirection(concrete.strategyType);

    // Probability of profit
    const pop = direction === 'outside' && analysis.breakeven.length === 2
      ? probBelow(S, Math.min(...analysis.breakeven), T, sigma) + probAbove(S, Math.max(...analysis.breakeven), T, sigma)
      : computePoP(S, analysis.breakeven, T, sigma,
          direction === 'outside' ? 'above' : direction as 'above' | 'below' | 'between');

    // Expected value via proper probability-weighted integration
    const expectedValue = computeExpectedValue(analysis.pnlData, S, T, sigma);

    // Risk/reward with practical caps for unlimited strategies
    const practicalMaxProfit = resolveMaxProfit(analysis.maxProfit, S, T, sigma);
    const practicalMaxLoss = resolveMaxLoss(analysis.maxLoss, S, T, sigma);
    const riskReward = practicalMaxLoss > 0
      ? Math.min(practicalMaxProfit / practicalMaxLoss, MAX_RISK_REWARD_CAP) : MAX_RISK_REWARD_CAP;

    // Theta efficiency: daily income per dollar risked (benefits credit strategies)
    const dailyTheta = analysis.greeks.theta;
    const thetaEfficiency = dailyTheta > 0 && practicalMaxLoss > 0
      ? Math.min(1, (dailyTheta / practicalMaxLoss) * 100) : 0;

    return { concrete, analysis, pop, expectedValue, riskReward, thetaEfficiency };
  });

  // Normalize and compute final scores
  const allEVs = scored.map(s => s.expectedValue);
  const allRRs = scored.map(s => s.riskReward);
  const maxEV = Math.max(...allEVs.map(Math.abs), 1);
  const maxRR = Math.max(...allRRs, 0.01);

  const ranked: RankedStrategy[] = scored
    .map(({ concrete, analysis, pop, expectedValue, riskReward, thetaEfficiency }) => {
      // Normalize EV: map from [-maxEV, maxEV] to [0, 1]
      const normEV = (expectedValue + maxEV) / (2 * maxEV);
      const normRR = Math.min(riskReward, MAX_RISK_REWARD_CAP) / MAX_RISK_REWARD_CAP;

      // Score: EV 40% + PoP 25% + R:R 15% + Theta 20%
      const score = normEV * 0.40 + pop * 0.25 + normRR * 0.15 + thetaEfficiency * 0.20;

      const liquidityScore = Math.min(...concrete.contracts.map(c => c.volume + c.openInterest));

      return {
        rank: 0,
        rankingMode: 'current' as const,
        strategyType: concrete.strategyType as any,
        strategyName: concrete.strategyName,
        score: Math.round(score * 10000) / 10000,
        legs: concrete.legs,
        strikes: concrete.legs.map((leg) => leg.strike).filter((strike): strike is number => typeof strike === 'number'),
        maxProfit: analysis.maxProfit,
        maxLoss: analysis.maxLoss,
        breakeven: analysis.breakeven,
        probabilityOfProfit: Math.round(pop * 10000) / 10000,
        expectedValue: Math.round(expectedValue * 100) / 100,
        riskRewardRatio: Math.round(riskReward * 100) / 100,
        liquidityScore,
        netDebit: Math.round(concrete.netDebit * 100) / 100,
        debitPaid: Math.round(Math.abs(concrete.netDebit) * 100) / 100,
        eroc: null,
        aeroc: null,
        expiration,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return { symbol: symbol.toUpperCase(), rankingMode: mode, underlyingPrice: S, expiration, rankedStrategies: ranked };
}

function isScannerStrategy(strategy: RankedStrategy): boolean {
  return MARKET_SCANNER_CORE_STRATEGIES.includes(strategy.strategyType);
}

function dedupeSymbols(sectors: ScannerSectorDefinition[]): string[] {
  return [...new Set(sectors.flatMap((sector) => sector.symbols))];
}

function createScannerCacheKey(sectorId?: string): string {
  return sectorId ? `sector:${sectorId}` : 'all';
}

function getScannerSectors(sectorId?: string): ScannerSectorDefinition[] {
  if (!sectorId) return MARKET_SCANNER_SECTORS;
  return MARKET_SCANNER_SECTORS.filter((sector) => sector.id === sectorId);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  async function runWorker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

async function buildScannerCandidate(
  symbol: string,
  sector: ScannerSectorDefinition,
): Promise<(Omit<ScannerResult, 'rank' | 'sectorRank' | 'scannerScore'> & { rawLiquidity: number }) | null> {
  const [quote, ranking] = await Promise.all([
    realMarketDataService.getQuote(symbol),
    rankStrategies(symbol, 'current'),
  ]);

  const strategy = ranking.rankedStrategies.find((candidate) =>
    isScannerStrategy(candidate) && candidate.liquidityScore >= MARKET_SCANNER_MIN_LIQUIDITY_SCORE,
  );

  if (!quote || !strategy) return null;

  return {
    symbol,
    companyName: quote.name || symbol,
    sector: sector.id,
    sectorLabel: sector.label,
    underlyingPrice: ranking.underlyingPrice || quote.price,
    priceChange: quote.change,
    priceChangePercent: quote.changePercent,
    baseScore: strategy.score,
    strategy,
    rawLiquidity: strategy.liquidityScore,
  };
}

function finalizeScannerResults(
  candidates: Array<Omit<ScannerResult, 'rank' | 'sectorRank' | 'scannerScore'> & { rawLiquidity: number }>,
): ScannerResult[] {
  if (candidates.length === 0) return [];

  const maxLiquidity = Math.max(...candidates.map((candidate) => candidate.rawLiquidity), 1);
  const maxExpectedValue = Math.max(...candidates.map((candidate) => Math.abs(candidate.strategy.expectedValue)), 1);
  const sectorMaxScores = new Map<string, number>();

  for (const candidate of candidates) {
    const currentMax = sectorMaxScores.get(candidate.sector) || 0;
    sectorMaxScores.set(candidate.sector, Math.max(currentMax, candidate.baseScore));
  }

  const scored = candidates
    .map((candidate) => {
      const sectorMax = sectorMaxScores.get(candidate.sector) || candidate.baseScore || 1;
      const sectorRelative = sectorMax > 0 ? candidate.baseScore / sectorMax : 0;
      const normalizedEV = Math.min(Math.abs(candidate.strategy.expectedValue) / maxExpectedValue, 1);
      const normalizedLiquidity = Math.min(candidate.rawLiquidity / maxLiquidity, 1);
      const scannerScore = (
        candidate.baseScore * 0.65 +
        sectorRelative * 0.20 +
        candidate.strategy.probabilityOfProfit * 0.10 +
        normalizedEV * 0.03 +
        normalizedLiquidity * 0.02
      );

      return {
        ...candidate,
        scannerScore: Math.max(0, Math.min(1, Math.round(scannerScore * 10000) / 10000)),
      };
    })
    .sort((a, b) => {
      if (b.scannerScore !== a.scannerScore) return b.scannerScore - a.scannerScore;
      return b.baseScore - a.baseScore;
    });

  const sectorRanks = new Map<string, number>();
  return scored.map((candidate, index) => {
    const nextSectorRank = (sectorRanks.get(candidate.sector) || 0) + 1;
    sectorRanks.set(candidate.sector, nextSectorRank);
    const { rawLiquidity, ...rest } = candidate;
    return {
      ...rest,
      rank: index + 1,
      sectorRank: nextSectorRank,
    };
  });
}

export async function scanMarketStrategies(sectorId?: string): Promise<ScannerResponse> {
  const sectors = getScannerSectors(sectorId);
  if (sectors.length === 0) {
    return {
      rankingMode: 'current',
      asOf: new Date().toISOString(),
      cached: false,
      universeSize: 0,
      sectors: [],
      results: [],
    };
  }

  const cacheKey = createScannerCacheKey(sectorId);
  const cached = scannerCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < MARKET_SCANNER_CACHE_MS) {
    return { ...cached.data, cached: true };
  }

  const symbols = dedupeSymbols(sectors);
  const candidates = await mapWithConcurrency(symbols, MARKET_SCANNER_CONCURRENCY, async (symbol) => {
    const sector = sectors.find((entry) => entry.symbols.includes(symbol));
    if (!sector) return null;
    try {
      return await buildScannerCandidate(symbol, sector);
    } catch (error) {
      console.error(`[Scanner] Failed to scan ${symbol}:`, error);
      return null;
    }
  });

  const results = finalizeScannerResults(
    candidates.filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null),
  );

  const response: ScannerResponse = {
    rankingMode: 'current',
    asOf: new Date().toISOString(),
    cached: false,
    universeSize: symbols.length,
    sectors,
    results,
  };

  scannerCache.set(cacheKey, { timestamp: Date.now(), data: response });
  return response;
}

interface AEROCStrategyCandidate {
  strategyType: 'long_call' | 'long_put' | 'bull_call_spread' | 'bear_put_spread';
  strategyName: string;
  legs: StrategyLeg[];
  strikes: number[];
  breakeven: number[];
  debitPaid: number;
  maxProfit: number;
  maxLoss: number;
  probabilityOfProfit: number;
  expectedValue: number;
  eroc: number;
  aeroc: number;
  riskRewardRatio: number;
  liquidityScore: number;
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function absoluteDelta(contract: OptionsContract): number {
  return Math.abs(contract.greeks.delta || 0);
}

function buildLongSingleCandidates(
  contracts: OptionsContract[],
  expiration: string,
  underlyingPrice: number,
  optionType: 'call' | 'put',
): AEROCStrategyCandidate[] {
  return contracts
    .filter(isLiquid)
    .map((contract) => {
      const debitPaid = contract.ask * 100;
      const maxProfit = underlyingPrice * 0.20 * 100;
      const maxLoss = debitPaid;
      const probabilityOfProfit = clampProbability(absoluteDelta(contract));
      const expectedValue = (probabilityOfProfit * maxProfit) - ((1 - probabilityOfProfit) * maxLoss);
      const eroc = debitPaid > 0 ? expectedValue / debitPaid : -Infinity;
      const dte = Math.max(1, Math.ceil((new Date(expiration).getTime() - Date.now()) / 86400000));
      const aeroc = eroc * (365 / dte);
      const strategyType: AEROCStrategyCandidate['strategyType'] = optionType === 'call' ? 'long_call' : 'long_put';
      const strategyName = optionType === 'call' ? 'Long Call' : 'Long Put';
      const breakeven = optionType === 'call'
        ? [contract.strike + contract.ask]
        : [contract.strike - contract.ask];
      return {
        strategyType,
        strategyName,
        legs: [{
          type: optionType,
          direction: 'buy' as const,
          quantity: 1,
          strike: contract.strike,
          premium: contract.ask,
          expiration,
        }],
        strikes: [contract.strike],
        debitPaid,
        maxProfit,
        maxLoss,
        probabilityOfProfit,
        expectedValue,
        eroc,
        aeroc,
        riskRewardRatio: maxLoss > 0 ? maxProfit / maxLoss : MAX_RISK_REWARD_CAP,
        liquidityScore: contract.volume + contract.openInterest,
        breakeven,
      };
    })
    .filter((candidate) => candidate.expectedValue > 0);
}

function buildBullCallSpreadCandidates(calls: OptionsContract[], expiration: string): AEROCStrategyCandidate[] {
  const liquidCalls = [...calls].filter(isLiquid).sort((a, b) => a.strike - b.strike);
  const candidates: AEROCStrategyCandidate[] = [];
  for (let i = 0; i < liquidCalls.length; i++) {
    for (let j = i + 1; j < liquidCalls.length; j++) {
      const longLeg = liquidCalls[i];
      const shortLeg = liquidCalls[j];
      const debitPaid = (longLeg.ask - shortLeg.bid) * 100;
      if (debitPaid <= 0) continue;
      const width = (shortLeg.strike - longLeg.strike) * 100;
      const maxProfit = width - debitPaid;
      if (maxProfit <= 0) continue;
      const maxLoss = debitPaid;
      const probabilityOfProfit = clampProbability(absoluteDelta(longLeg) - absoluteDelta(shortLeg));
      const expectedValue = (probabilityOfProfit * maxProfit) - ((1 - probabilityOfProfit) * maxLoss);
      if (expectedValue <= 0) continue;
      const dte = Math.max(1, Math.ceil((new Date(expiration).getTime() - Date.now()) / 86400000));
      const eroc = expectedValue / debitPaid;
      candidates.push({
        strategyType: 'bull_call_spread',
        strategyName: 'Bull Call Spread',
        legs: [
          { type: 'call', direction: 'buy' as const, quantity: 1, strike: longLeg.strike, premium: longLeg.ask, expiration },
          { type: 'call', direction: 'sell' as const, quantity: 1, strike: shortLeg.strike, premium: shortLeg.bid, expiration },
        ],
        strikes: [longLeg.strike, shortLeg.strike],
        debitPaid,
        maxProfit,
        maxLoss,
        probabilityOfProfit,
        expectedValue,
        eroc,
        aeroc: eroc * (365 / dte),
        riskRewardRatio: maxLoss > 0 ? maxProfit / maxLoss : MAX_RISK_REWARD_CAP,
        liquidityScore: Math.min(longLeg.volume + longLeg.openInterest, shortLeg.volume + shortLeg.openInterest),
        breakeven: [longLeg.strike + (debitPaid / 100)],
      });
    }
  }
  return candidates;
}

function buildBearPutSpreadCandidates(puts: OptionsContract[], expiration: string): AEROCStrategyCandidate[] {
  const liquidPuts = [...puts].filter(isLiquid).sort((a, b) => a.strike - b.strike);
  const candidates: AEROCStrategyCandidate[] = [];
  for (let i = 0; i < liquidPuts.length; i++) {
    for (let j = i + 1; j < liquidPuts.length; j++) {
      const shortLeg = liquidPuts[i];
      const longLeg = liquidPuts[j];
      const debitPaid = (longLeg.ask - shortLeg.bid) * 100;
      if (debitPaid <= 0) continue;
      const width = (longLeg.strike - shortLeg.strike) * 100;
      const maxProfit = width - debitPaid;
      if (maxProfit <= 0) continue;
      const maxLoss = debitPaid;
      const probabilityOfProfit = clampProbability(absoluteDelta(longLeg) - absoluteDelta(shortLeg));
      const expectedValue = (probabilityOfProfit * maxProfit) - ((1 - probabilityOfProfit) * maxLoss);
      if (expectedValue <= 0) continue;
      const dte = Math.max(1, Math.ceil((new Date(expiration).getTime() - Date.now()) / 86400000));
      const eroc = expectedValue / debitPaid;
      candidates.push({
        strategyType: 'bear_put_spread',
        strategyName: 'Bear Put Spread',
        legs: [
          { type: 'put', direction: 'buy' as const, quantity: 1, strike: longLeg.strike, premium: longLeg.ask, expiration },
          { type: 'put', direction: 'sell' as const, quantity: 1, strike: shortLeg.strike, premium: shortLeg.bid, expiration },
        ],
        strikes: [longLeg.strike, shortLeg.strike],
        debitPaid,
        maxProfit,
        maxLoss,
        probabilityOfProfit,
        expectedValue,
        eroc,
        aeroc: eroc * (365 / dte),
        riskRewardRatio: maxLoss > 0 ? maxProfit / maxLoss : MAX_RISK_REWARD_CAP,
        liquidityScore: Math.min(longLeg.volume + longLeg.openInterest, shortLeg.volume + shortLeg.openInterest),
        breakeven: [longLeg.strike - (debitPaid / 100)],
      });
    }
  }
  return candidates;
}

function rankStrategiesByAEROC(
  symbol: string,
  underlyingPrice: number,
  expiration: string,
  calls: OptionsContract[],
  puts: OptionsContract[],
): RankingResponse {
  const candidates = [
    ...buildLongSingleCandidates(calls, expiration, underlyingPrice, 'call'),
    ...buildLongSingleCandidates(puts, expiration, underlyingPrice, 'put'),
    ...buildBullCallSpreadCandidates(calls, expiration),
    ...buildBearPutSpreadCandidates(puts, expiration),
  ];

  const positive = candidates
    .filter((candidate) => Number.isFinite(candidate.aeroc) && candidate.expectedValue > 0)
    .sort((a, b) => b.aeroc - a.aeroc)
    .slice(0, 10);

  const maxAeroc = Math.max(...positive.map((candidate) => candidate.aeroc), 1);
  const rankedStrategies: RankedStrategy[] = positive.map((candidate, index) => ({
    rank: index + 1,
    rankingMode: 'aeroc' as const,
    strategyType: candidate.strategyType,
    strategyName: candidate.strategyName,
    score: Math.max(0, Math.min(1, candidate.aeroc / maxAeroc)),
    legs: candidate.legs,
    strikes: candidate.strikes,
    maxProfit: Math.round(candidate.maxProfit * 100) / 100,
    maxLoss: Math.round(candidate.maxLoss * 100) / 100,
    breakeven: candidate.breakeven,
    probabilityOfProfit: Math.round(candidate.probabilityOfProfit * 10000) / 10000,
    expectedValue: Math.round(candidate.expectedValue * 100) / 100,
    riskRewardRatio: Math.round(candidate.riskRewardRatio * 100) / 100,
    liquidityScore: candidate.liquidityScore,
    netDebit: Math.round(candidate.debitPaid * 100) / 100,
    debitPaid: Math.round(candidate.debitPaid * 100) / 100,
    eroc: Math.round(candidate.eroc * 10000) / 10000,
    aeroc: Math.round(candidate.aeroc * 10000) / 10000,
    expiration,
  }));

  return {
    symbol: symbol.toUpperCase(),
    rankingMode: 'aeroc',
    underlyingPrice,
    expiration,
    rankedStrategies,
  };
}

// Export helpers for testing
export const _testing = {
  findATM, findByStrike, findByDelta, getStrikeOffset, midPrice, isLiquid,
  avgIV, probAbove, probBelow, computePoP, computeExpectedValue, lognormalPDF,
  resolveMaxLoss, resolveMaxProfit, selectExpiration, BUILDERS,
};
