import type { OptionsChain, OptionsContract, StrategyLeg, RankedStrategy, RankingResponse } from '@optionsranker/shared';
import { STRATEGY_TEMPLATES } from '@optionsranker/shared';
import { normalCDF } from '../utils/blackScholes.js';
import { analyzeStrategy } from './strategy.service.js';
import { realMarketDataService } from './realMarketData.service.js';

const R = 0.05; // risk-free rate
const MIN_LIQUIDITY = 10; // minimum volume + OI per leg
const MAX_RISK_REWARD_CAP = 10; // cap for unlimited-profit strategies

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

/** Check if a contract has sufficient liquidity */
function isLiquid(c: OptionsContract): boolean {
  return (c.volume + c.openInterest) >= MIN_LIQUIDITY;
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

function computePoP(
  S: number, breakevens: number[], T: number, sigma: number,
  maxProfitPrice: 'above' | 'below' | 'between',
): number {
  if (breakevens.length === 0) return 0.5;

  if (breakevens.length === 1) {
    // Single breakeven: profitable above or below
    if (maxProfitPrice === 'above') return probAbove(S, breakevens[0], T, sigma);
    return probBelow(S, breakevens[0], T, sigma);
  }

  if (breakevens.length === 2) {
    const [lower, upper] = breakevens.sort((a, b) => a - b);
    if (maxProfitPrice === 'between') {
      // Profitable between breakevens (iron condor, iron butterfly)
      return probAbove(S, lower, T, sigma) - probAbove(S, upper, T, sigma);
    }
    // Profitable outside breakevens (straddle, strangle)
    return probBelow(S, lower, T, sigma) + probAbove(S, upper, T, sigma);
  }

  // Fallback for complex strategies
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

function scoreStrategy(
  analysis: { maxProfit: number | 'unlimited'; maxLoss: number | 'unlimited'; breakeven: number[]; pnlData: { price: number; pnl: number }[] },
  pop: number,
  allExpectedValues: number[],
  allRiskRewards: number[],
  expectedValue: number,
  riskReward: number,
): number {
  // Normalize to 0-1 relative to best in the set
  const maxEV = Math.max(...allExpectedValues, 1);
  const maxRR = Math.max(...allRiskRewards, 0.01);

  const normEV = Math.max(0, expectedValue) / maxEV;
  const normRR = Math.min(riskReward, MAX_RISK_REWARD_CAP) / MAX_RISK_REWARD_CAP;

  return normEV * 0.50 + pop * 0.30 + normRR * 0.20;
}

// ── Main Ranking Function ───────────────────────────────────────────

export async function rankStrategies(symbol: string): Promise<RankingResponse> {
  const chain = await realMarketDataService.getOptionsChain(symbol);
  if (!chain || chain.expirations.length === 0) {
    return { symbol, underlyingPrice: 0, expiration: '', rankedStrategies: [] };
  }

  const S = chain.underlyingPrice;
  const expiration = chain.expirations[0]; // nearest expiration
  const expData = chain.chain[expiration];
  if (!expData) {
    return { symbol, underlyingPrice: S, expiration, rankedStrategies: [] };
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

    // Use the existing strategy analyzer for P&L, breakevens, max profit/loss
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
    return { symbol, underlyingPrice: S, expiration, rankedStrategies: [] };
  }

  // Compute PoP, expected value, and risk-reward for each
  const scored: {
    concrete: ConcreteStrategy;
    analysis: ReturnType<typeof analyzeStrategy>;
    pop: number;
    expectedValue: number;
    riskReward: number;
  }[] = [];

  for (const { concrete, analysis } of candidates) {
    const direction = getMaxProfitDirection(concrete.strategyType);
    const pop = computePoP(S, analysis.breakeven, T, sigma,
      direction === 'outside' ? 'above' : direction as 'above' | 'below' | 'between');

    // For straddle/strangle, PoP is outside breakevens
    const adjustedPoP = direction === 'outside' && analysis.breakeven.length === 2
      ? probBelow(S, Math.min(...analysis.breakeven), T, sigma) + probAbove(S, Math.max(...analysis.breakeven), T, sigma)
      : pop;

    // Expected value from P&L data weighted by probability
    const maxP = analysis.maxProfit === 'unlimited' ? Math.max(...analysis.pnlData.map(d => d.pnl)) : analysis.maxProfit;
    const maxL = analysis.maxLoss === 'unlimited' ? Math.min(...analysis.pnlData.map(d => d.pnl)) : analysis.maxLoss;
    const avgProfit = maxP > 0 ? maxP * 0.5 : 0; // conservative: assume average profit is half of max
    const avgLoss = maxL < 0 ? Math.abs(maxL) * 0.5 : 0;
    const expectedValue = (adjustedPoP * avgProfit) - ((1 - adjustedPoP) * avgLoss);

    const absMaxLoss = analysis.maxLoss === 'unlimited' ? 1 : Math.abs(typeof analysis.maxLoss === 'number' ? analysis.maxLoss : 1);
    const absMaxProfit = analysis.maxProfit === 'unlimited' ? absMaxLoss * MAX_RISK_REWARD_CAP : (typeof analysis.maxProfit === 'number' ? analysis.maxProfit : 0);
    const riskReward = absMaxLoss > 0 ? absMaxProfit / absMaxLoss : MAX_RISK_REWARD_CAP;

    scored.push({ concrete, analysis, pop: adjustedPoP, expectedValue, riskReward });
  }

  const allEVs = scored.map(s => s.expectedValue);
  const allRRs = scored.map(s => s.riskReward);

  // Score and rank
  const ranked: RankedStrategy[] = scored
    .map(({ concrete, analysis, pop, expectedValue, riskReward }) => {
      const score = scoreStrategy(analysis, pop, allEVs, allRRs, expectedValue, riskReward);
      const liquidityScore = Math.min(...concrete.contracts.map(c => c.volume + c.openInterest));

      return {
        rank: 0, // assigned after sort
        strategyType: concrete.strategyType as any,
        strategyName: concrete.strategyName,
        score: Math.round(score * 10000) / 10000,
        legs: concrete.legs,
        maxProfit: analysis.maxProfit,
        maxLoss: analysis.maxLoss,
        breakeven: analysis.breakeven,
        probabilityOfProfit: Math.round(pop * 10000) / 10000,
        expectedValue: Math.round(expectedValue * 100) / 100,
        riskRewardRatio: Math.round(riskReward * 100) / 100,
        liquidityScore,
        netDebit: Math.round(concrete.netDebit * 100) / 100,
        expiration,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return { symbol: symbol.toUpperCase(), underlyingPrice: S, expiration, rankedStrategies: ranked };
}

// Export helpers for testing
export const _testing = {
  findATM, findByStrike, findByDelta, getStrikeOffset, midPrice, isLiquid,
  avgIV, probAbove, probBelow, computePoP, BUILDERS,
};
