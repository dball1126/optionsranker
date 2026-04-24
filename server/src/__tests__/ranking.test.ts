import { describe, it, expect } from 'vitest';
import type { OptionsContract, OptionsChain } from '@optionsranker/shared';
import { _testing } from '../services/ranking.service.js';

const { findATM, findByStrike, getStrikeOffset, midPrice, isLiquid, avgIV, probAbove, probBelow, computePoP, computeExpectedValue, lognormalPDF, resolveMaxLoss, resolveMaxProfit, selectExpiration, BUILDERS } = _testing;

// ── Mock Data Factory ───────────────────────────────────────────────

function mockContract(overrides: Partial<OptionsContract> = {}): OptionsContract {
  return {
    symbol: 'AAPL260515C00250000',
    underlying: 'AAPL',
    type: 'call',
    strike: 250,
    expiration: '2026-05-15',
    bid: 4.50,
    ask: 5.00,
    last: 4.75,
    volume: 500,
    openInterest: 2000,
    impliedVolatility: 0.30,
    greeks: { delta: 0.50, gamma: 0.02, theta: -0.05, vega: 0.15, rho: 0.03 },
    ...overrides,
  };
}

function mockChain(S: number, strikes: number[]): { calls: OptionsContract[]; puts: OptionsContract[] } {
  const calls = strikes.map((k, i) => mockContract({
    symbol: `TEST${k}C`,
    type: 'call',
    strike: k,
    bid: Math.max(0.5, 6 - i),
    ask: Math.max(0.55, Math.max(0.5, 6 - i) + 0.05),
    last: Math.max(0.525, Math.max(0.5, 6 - i) + 0.025),
    volume: 100 + i * 50,
    openInterest: 500 + i * 100,
    impliedVolatility: 0.28 + i * 0.02,
    greeks: {
      delta: Math.max(0.05, 0.90 - i * 0.15),
      gamma: 0.02,
      theta: -0.05,
      vega: 0.15,
      rho: 0.03,
    },
  }));

  const puts = strikes.map((k, i) => mockContract({
    symbol: `TEST${k}P`,
    type: 'put',
    strike: k,
    bid: Math.max(0.5, 2 + i),
    ask: Math.max(0.55, Math.max(0.5, 2 + i) + 0.05),
    last: Math.max(0.525, Math.max(0.5, 2 + i) + 0.025),
    volume: 80 + i * 40,
    openInterest: 400 + i * 80,
    impliedVolatility: 0.30 + (strikes.length - 1 - i) * 0.02,
    greeks: {
      delta: Math.min(-0.05, -0.90 + i * 0.15),
      gamma: 0.02,
      theta: -0.04,
      vega: 0.14,
      rho: -0.02,
    },
  }));

  return { calls, puts };
}

// ── Strike Selection Tests ──────────────────────────────────────────

describe('Strike Selection', () => {
  const strikes = [240, 245, 250, 255, 260];
  const { calls, puts } = mockChain(250, strikes);

  it('findATM selects closest strike to underlying price', () => {
    const atm = findATM(calls, 250);
    expect(atm).not.toBeNull();
    expect(atm!.strike).toBe(250);
  });

  it('findATM works when price is between strikes', () => {
    const atm = findATM(calls, 252);
    expect(atm).not.toBeNull();
    // Should pick 250 or 255, whichever is closer
    expect([250, 255]).toContain(atm!.strike);
  });

  it('findByStrike returns exact match', () => {
    const c = findByStrike(calls, 255);
    expect(c).not.toBeNull();
    expect(c!.strike).toBe(255);
  });

  it('getStrikeOffset returns correct offset', () => {
    const twoAbove = getStrikeOffset(calls, 250, 2);
    expect(twoAbove).not.toBeNull();
    expect(twoAbove!.strike).toBe(260);

    const twoBelow = getStrikeOffset(puts, 250, -2);
    expect(twoBelow).not.toBeNull();
    expect(twoBelow!.strike).toBe(240);
  });

  it('getStrikeOffset returns null for out of bounds', () => {
    const result = getStrikeOffset(calls, 260, 3);
    expect(result).toBeNull();
  });

  it('Bull Call Spread selects ATM buy + 2 strikes higher sell', () => {
    const strategy = BUILDERS.bull_call_spread(calls, puts, 250, '2026-05-15');
    expect(strategy).not.toBeNull();
    expect(strategy!.legs).toHaveLength(2);
    expect(strategy!.legs[0].strike).toBe(250); // buy ATM
    expect(strategy!.legs[1].strike).toBe(260); // sell 2 strikes up
    expect(strategy!.legs[0].direction).toBe('buy');
    expect(strategy!.legs[1].direction).toBe('sell');
  });

  it('Covered Call picks delta ≈ 0.30 for short call', () => {
    const strategy = BUILDERS.covered_call(calls, puts, 250, '2026-05-15');
    expect(strategy).not.toBeNull();
    expect(strategy!.legs).toHaveLength(2);
    expect(strategy!.legs[0].type).toBe('stock');
    expect(strategy!.legs[1].type).toBe('call');
    expect(strategy!.legs[1].direction).toBe('sell');
    expect(strategy!.legs[1].strike!).toBeGreaterThan(250); // OTM
  });
});

// ── P&L Calculation Tests ───────────────────────────────────────────

describe('P&L Calculations', () => {
  const strikes = [240, 245, 250, 255, 260];
  const { calls, puts } = mockChain(250, strikes);

  it('Long Call: max loss = premium paid', () => {
    const strategy = BUILDERS.long_call(calls, puts, 250, '2026-05-15');
    expect(strategy).not.toBeNull();
    expect(strategy!.netDebit).toBeGreaterThan(0); // debit strategy
    // Max loss should equal premium * 100
    const premium = strategy!.legs[0].premium!;
    expect(strategy!.netDebit).toBeCloseTo(premium * 100, 0);
  });

  it('Bull Call Spread: net debit = buy premium - sell premium', () => {
    const strategy = BUILDERS.bull_call_spread(calls, puts, 250, '2026-05-15');
    expect(strategy).not.toBeNull();
    const buyPremium = strategy!.legs[0].premium!;
    const sellPremium = strategy!.legs[1].premium!;
    expect(strategy!.netDebit).toBeCloseTo((buyPremium - sellPremium) * 100, 0);
    expect(strategy!.netDebit).toBeGreaterThan(0); // should be debit
  });

  it('Iron Condor: receives net credit', () => {
    const strategy = BUILDERS.iron_condor(calls, puts, 250, '2026-05-15');
    if (strategy) {
      // Net debit should be negative (credit received)
      expect(strategy.netDebit).toBeLessThanOrEqual(0);
    }
  });

  it('Straddle: net debit = call premium + put premium', () => {
    const strategy = BUILDERS.straddle(calls, puts, 250, '2026-05-15');
    expect(strategy).not.toBeNull();
    const callP = strategy!.legs[0].premium!;
    const putP = strategy!.legs[1].premium!;
    expect(strategy!.netDebit).toBeCloseTo((callP + putP) * 100, 0);
  });
});

// ── Probability of Profit Tests ─────────────────────────────────────

describe('Probability of Profit', () => {
  it('ATM long call has PoP slightly below 50%', () => {
    // S=250, breakeven=255 (ATM + premium), 30 days, 30% IV
    const T = 30 / 365;
    const pop = probAbove(250, 255, T, 0.30);
    expect(pop).toBeGreaterThan(0.30);
    expect(pop).toBeLessThan(0.55);
  });

  it('Deep ITM call has high PoP', () => {
    const T = 30 / 365;
    const pop = probAbove(250, 230, T, 0.30);
    expect(pop).toBeGreaterThan(0.85);
  });

  it('Far OTM call has low PoP', () => {
    const T = 30 / 365;
    const pop = probAbove(250, 300, T, 0.30);
    expect(pop).toBeLessThan(0.10);
  });

  it('Iron Condor between breakevens has high PoP', () => {
    const T = 30 / 365;
    const pop = computePoP(250, [240, 260], T, 0.30, 'between');
    expect(pop).toBeGreaterThan(0.35); // ~43% for ±$10 range with 30% IV in 30 days
    expect(pop).toBeLessThan(0.95);
  });

  it('Straddle outside breakevens has lower PoP', () => {
    const T = 30 / 365;
    const popBelow = probBelow(250, 245, T, 0.30);
    const popAbove = probAbove(250, 255, T, 0.30);
    const totalPoP = popBelow + popAbove;
    expect(totalPoP).toBeGreaterThan(0.30);
    expect(totalPoP).toBeLessThan(0.85); // ~76% for ±$5 breakevens with 30% IV
  });

  it('Higher IV increases PoP for straddles', () => {
    const T = 30 / 365;
    const lowIVPoP = probBelow(250, 240, T, 0.20) + probAbove(250, 260, T, 0.20);
    const highIVPoP = probBelow(250, 240, T, 0.60) + probAbove(250, 260, T, 0.60);
    expect(highIVPoP).toBeGreaterThan(lowIVPoP);
  });
});

// ── Ranking Order Tests ─────────────────────────────────────────────

describe('Ranking Order', () => {
  const strikes = [240, 245, 250, 255, 260];
  const { calls, puts } = mockChain(250, strikes);

  it('All 10 strategy builders produce valid output or null', () => {
    const types = Object.keys(BUILDERS);
    expect(types).toHaveLength(10);

    for (const type of types) {
      const result = BUILDERS[type](calls, puts, 250, '2026-05-15');
      if (result) {
        expect(result.legs.length).toBeGreaterThan(0);
        expect(result.strategyType).toBe(type);
        expect(typeof result.netDebit).toBe('number');
      }
    }
  });

  it('Strategies with concrete legs have valid premiums', () => {
    for (const type of Object.keys(BUILDERS)) {
      const result = BUILDERS[type](calls, puts, 250, '2026-05-15');
      if (result) {
        for (const leg of result.legs) {
          if (leg.type !== 'stock') {
            expect(leg.premium).toBeDefined();
            expect(leg.premium).toBeGreaterThanOrEqual(0);
            expect(leg.strike).toBeDefined();
            expect(leg.strike).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

// ── Helper Function Tests ───────────────────────────────────────────

describe('Helpers', () => {
  it('midPrice calculates correctly', () => {
    const c = mockContract({ bid: 4.00, ask: 5.00 });
    expect(midPrice(c)).toBe(4.50);
  });

  it('midPrice falls back to last when no bid/ask', () => {
    const c = mockContract({ bid: 0, ask: 0, last: 3.00 });
    expect(midPrice(c)).toBe(3.00);
  });

  it('isLiquid filters correctly', () => {
    expect(isLiquid(mockContract({ volume: 5, openInterest: 3 }))).toBe(false);
    expect(isLiquid(mockContract({ volume: 5, openInterest: 5 }))).toBe(true);
    expect(isLiquid(mockContract({ volume: 100, openInterest: 500 }))).toBe(true);
  });

  it('avgIV computes weighted average', () => {
    const contracts = [
      mockContract({ impliedVolatility: 0.25 }),
      mockContract({ impliedVolatility: 0.35 }),
    ];
    expect(avgIV(contracts)).toBeCloseTo(0.30);
  });

  it('avgIV defaults to 0.30 with no data', () => {
    expect(avgIV([])).toBe(0.3);
  });
});

// ── Edge Cases ──────────────────────────────────────────────────────

describe('Edge Cases', () => {
  it('Penny stock ($1.50) strikes do not go negative', () => {
    const strikes = [0.5, 1, 1.5, 2, 2.5];
    const { calls, puts } = mockChain(1.5, strikes);

    for (const type of Object.keys(BUILDERS)) {
      const result = BUILDERS[type](calls, puts, 1.5, '2026-05-15');
      if (result) {
        for (const leg of result.legs) {
          if (leg.strike) expect(leg.strike).toBeGreaterThan(0);
        }
      }
    }
  });

  it('Handles chain with only 1 strike gracefully', () => {
    const { calls, puts } = mockChain(250, [250]);
    // Most multi-leg strategies should return null
    const spread = BUILDERS.bull_call_spread(calls, puts, 250, '2026-05-15');
    expect(spread).toBeNull(); // can't build spread with 1 strike

    // Single-leg strategies should work
    const longCall = BUILDERS.long_call(calls, puts, 250, '2026-05-15');
    expect(longCall).not.toBeNull();
  });

  it('All illiquid contracts filters out strategies', () => {
    const { calls, puts } = mockChain(250, [240, 245, 250, 255, 260]);
    const illiquidCalls = calls.map(c => ({ ...c, volume: 0, openInterest: 0 }));
    const illiquidPuts = puts.map(c => ({ ...c, volume: 0, openInterest: 0 }));

    for (const type of Object.keys(BUILDERS)) {
      const result = BUILDERS[type](illiquidCalls, illiquidPuts, 250, '2026-05-15');
      expect(result).toBeNull();
    }
  });
});

// ── Expiration Selection Tests ──────────────────────────────────────

describe('Expiration Selection', () => {
  it('Skips expirations < 7 DTE', () => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0];
    const exp = selectExpiration([tomorrow, nextWeek]);
    expect(exp).toBe(nextWeek);
  });

  it('Falls back to furthest expiration if all < 7 DTE', () => {
    const today = new Date();
    const d1 = new Date(today.getTime() + 1 * 86400000).toISOString().split('T')[0];
    const d3 = new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0];
    const exp = selectExpiration([d1, d3]);
    expect(exp).toBe(d3);
  });

  it('Returns null for empty expirations', () => {
    expect(selectExpiration([])).toBeNull();
  });
});

// ── Expected Value Integration Tests ────────────────────────────────

describe('Expected Value (probability-weighted)', () => {
  it('Produces reasonable EV for Long Call', () => {
    // Simple P&L curve: loss below breakeven, profit above
    const pnlData = [];
    const S = 250;
    for (let i = 0; i <= 60; i++) {
      const price = 175 + i * 2.5; // 175 to 325
      const pnl = Math.max(-500, (price - 255) * 100); // breakeven at 255, max loss $500
      pnlData.push({ price, pnl });
    }
    const T = 30 / 365;
    const ev = computeExpectedValue(pnlData, S, T, 0.30);
    // Should be modest — not thousands of dollars
    expect(ev).toBeGreaterThan(-500);
    expect(ev).toBeLessThan(500);
  });

  it('Iron Condor has positive EV when PoP is high', () => {
    // Credit spread: max profit $200 between 240-260, max loss $300 outside
    const pnlData = [];
    const S = 250;
    for (let i = 0; i <= 60; i++) {
      const price = 175 + i * 2.5;
      let pnl: number;
      if (price >= 240 && price <= 260) pnl = 200;
      else pnl = -300;
      pnlData.push({ price, pnl });
    }
    const T = 30 / 365;
    const ev = computeExpectedValue(pnlData, S, T, 0.20); // low vol
    // Low vol iron condor: EV should be near breakeven (slightly negative to slightly positive)
    // The $200/$300 payoff with ±$10 range at 20% IV is close to fair
    expect(ev).toBeGreaterThan(-100);
    expect(ev).toBeLessThan(200);
  });

  it('Lognormal PDF integrates to approximately 1', () => {
    const S = 250;
    const T = 30 / 365;
    const sigma = 0.30;
    let integral = 0;
    const dPrice = 0.5;
    for (let price = 50; price <= 500; price += dPrice) {
      integral += lognormalPDF(price, S, T, sigma) * dPrice;
    }
    expect(integral).toBeCloseTo(1, 1); // within 0.1
  });
});

// ── Realistic Risk Resolution Tests ─────────────────────────────────

describe('Risk Resolution', () => {
  it('resolveMaxLoss for unlimited uses 2-sigma', () => {
    const S = 250;
    const T = 30 / 365;
    const sigma = 0.30;
    const loss = resolveMaxLoss('unlimited', S, T, sigma);
    // 2-sigma downside for 30 days at 30% IV: ~$28 per share, so ~$2800 per 100 shares
    expect(loss).toBeGreaterThan(1000);
    expect(loss).toBeLessThan(10000);
  });

  it('resolveMaxProfit for unlimited uses 2-sigma', () => {
    const S = 250;
    const T = 30 / 365;
    const sigma = 0.30;
    const profit = resolveMaxProfit('unlimited', S, T, sigma);
    expect(profit).toBeGreaterThan(1000);
    expect(profit).toBeLessThan(15000);
  });

  it('resolveMaxLoss passes through numeric values', () => {
    expect(resolveMaxLoss(-500, 250, 30 / 365, 0.30)).toBe(500);
    expect(resolveMaxLoss(0, 250, 30 / 365, 0.30)).toBe(0);
  });
});
