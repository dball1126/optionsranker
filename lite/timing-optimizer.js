// OptionsRanker — Trade Timing Optimizer
//
// Monte Carlo engine that ranks alternative buy/sell timing scenarios
// for a chosen strategy. Used by both the lite SPA and the backtester.
//
// Same dual-export pattern as exit-plan.js: CommonJS for tests + Node,
// window globals for browser. Server-safe (no DOM, no window).

// Import the exit plan helper (used to compute the baseline candidate).
let _computeExitPlan;
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  try { _computeExitPlan = require('./exit-plan').computeExitPlan; } catch (e) { _computeExitPlan = null; }
}

// ---------- Math primitives ----------
function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// Black-Scholes option price (not greeks). Returns the option premium per share.
function blackScholesValue(type, S, K, T, sigma, r) {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    if (type === 'Call' || type === 'call') return Math.max(0, S - K);
    return Math.max(0, K - S);
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  if (type === 'Call' || type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  }
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

// ---------- Strategy valuation primitive ----------
// Returns P&L per contract (already × 100 for options, × 1 for stock).
// Sign convention matches drawPayoffDiagram in index.html.
function valueStrategyAtPrice(strategy, spotPrice, daysRemaining, iv) {
  const sigma = iv || strategy.iv || 0.3;
  const r = 0.05;
  const Trem = Math.max(0, daysRemaining) / 365;
  const isCalOrDiag = strategy.name === 'Calendar Spread' || strategy.name === 'Diagonal Spread';
  let pnl = 0;
  for (const l of strategy.legs) {
    if (l.type === 'Stock') {
      const mult = (l.action === 'Buy' || l.action === 'Hold') ? 1 : -1;
      pnl += (spotPrice - l.price) * mult * (l.qty || 1);
      continue;
    }
    const mult = (l.action === 'Buy' || l.action === 'Hold') ? 1 : -1;
    let curValue;
    if (Trem <= 0) {
      // Expiry — intrinsic only
      curValue = l.type === 'Call' ? Math.max(0, spotPrice - l.strike) : Math.max(0, l.strike - spotPrice);
    } else if (isCalOrDiag && l.action === 'Sell') {
      // Calendar/Diagonal short leg expires earlier — model as intrinsic
      curValue = l.type === 'Call' ? Math.max(0, spotPrice - l.strike) : Math.max(0, l.strike - spotPrice);
    } else {
      curValue = blackScholesValue(l.type, spotPrice, l.strike, Trem, sigma, r);
    }
    pnl += (curValue - (l.price || 0)) * mult * (l.qty || 1) * 100;
  }
  return pnl;
}

// ---------- Deterministic PRNG (Mulberry32) + Box-Muller ----------
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleGaussian(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- Geometric Brownian Motion path ----------
// Returns array of spot prices, index 0 = today, index `days` = expiry.
function simulateGBMPath(spot, iv, days, rng) {
  const dt = 1 / 252;            // trading days
  const r = 0.05;
  // Use null/undefined check, not falsy — `iv === 0` is meaningful (deterministic path)
  const sigma = (iv != null) ? iv : 0.3;
  const drift = (r - 0.5 * sigma * sigma) * dt;
  const diffusion = sigma * Math.sqrt(dt);
  const path = new Array(days + 1);
  path[0] = spot;
  for (let d = 1; d <= days; d++) {
    if (sigma === 0) {
      path[d] = path[d - 1] * Math.exp(drift);
    } else {
      const z = sampleGaussian(rng);
      path[d] = path[d - 1] * Math.exp(drift + diffusion * z);
    }
  }
  return path;
}

// Helper: rolling annualized realized vol over a window of the path
function rollingRealizedVol(path, from, to) {
  if (to - from < 2) return 0;
  const returns = [];
  for (let i = from + 1; i <= to; i++) {
    if (path[i - 1] > 0 && path[i] > 0) returns.push(Math.log(path[i] / path[i - 1]));
  }
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance * 252);
}

// ---------- Candidate generator ----------
function generateCandidates(strategy, marketState) {
  const candidates = [];
  const dte = strategy.dte || 14;
  const ep = (_computeExitPlan || (typeof window !== 'undefined' && window.computeExitPlan))
    ? (_computeExitPlan || window.computeExitPlan)(strategy, marketState.ivRank, marketState.marketPulse, marketState.earningsDays, marketState.now || new Date())
    : { profitTarget: Math.abs(strategy.maxProfit || 100) * 0.5, stopLoss: -Math.abs(strategy.maxLoss || 100) * 0.5, timeStopDTE: 7, explanation: 'Default plan' };

  // 1. Baseline
  candidates.push({
    id: 'baseline',
    name: 'Default plan',
    entryCondition: 'Buy now',
    exitCondition: `+$${ep.profitTarget.toFixed(0)} profit / ${ep.stopLoss != null ? '\u2212$' + Math.abs(ep.stopLoss).toFixed(0) + ' stop' : 'no stop'} / ${ep.timeStopDTE} DTE`,
    params: {
      profitTargetDollars: ep.profitTarget,
      stopLossDollars: ep.stopLoss,
      timeStopDTE: ep.timeStopDTE,
      holdToExpiry: false,
    },
  });

  // 2. Aggressive profit take
  candidates.push({
    id: 'aggressive_pt',
    name: 'Aggressive profit take',
    entryCondition: 'Buy now',
    exitCondition: `+$${(ep.profitTarget * 0.5).toFixed(0)} profit / same stop / ${ep.timeStopDTE} DTE`,
    params: {
      profitTargetDollars: ep.profitTarget * 0.5,
      stopLossDollars: ep.stopLoss,
      timeStopDTE: ep.timeStopDTE,
      holdToExpiry: false,
    },
  });

  // 3. Patient profit take
  candidates.push({
    id: 'patient_pt',
    name: 'Patient profit take',
    entryCondition: 'Buy now',
    exitCondition: `+$${(ep.profitTarget * 1.5).toFixed(0)} profit / same stop / ${ep.timeStopDTE} DTE`,
    params: {
      profitTargetDollars: ep.profitTarget * 1.5,
      stopLossDollars: ep.stopLoss,
      timeStopDTE: ep.timeStopDTE,
      holdToExpiry: false,
    },
  });

  // 4. Hold to expiration
  candidates.push({
    id: 'hold_expiry',
    name: 'Hold to expiration',
    entryCondition: 'Buy now',
    exitCondition: 'Hold through expiration',
    params: {
      profitTargetDollars: null,
      stopLossDollars: null,
      timeStopDTE: 0,
      holdToExpiry: true,
    },
  });

  // 5. Exit at 50% time decay
  const halfTime = Math.max(1, Math.round(dte / 2));
  candidates.push({
    id: 'time_50pct',
    name: 'Exit at 50% time decay',
    entryCondition: 'Buy now',
    exitCondition: `Same profit/stop / exit at ${halfTime} DTE`,
    params: {
      profitTargetDollars: ep.profitTarget,
      stopLossDollars: ep.stopLoss,
      timeStopDTE: halfTime,
      holdToExpiry: false,
    },
  });

  // 6. IV flip
  const ivFlipMode = (marketState.ivRank != null && marketState.ivRank > 50) ? 'high_to_low' : 'low_to_high';
  candidates.push({
    id: 'iv_flip',
    name: 'Exit on IV flip',
    entryCondition: 'Buy now',
    exitCondition: 'Exit when realized vol reverts toward mean',
    params: {
      profitTargetDollars: ep.profitTarget,
      stopLossDollars: ep.stopLoss,
      timeStopDTE: ep.timeStopDTE,
      ivFlipMode,
      holdToExpiry: false,
    },
  });

  // 7. Earnings minus 1 — only if earnings is in range
  if (marketState.earningsDays != null && marketState.earningsDays > 0 && marketState.earningsDays < dte) {
    candidates.push({
      id: 'earnings_minus_1',
      name: 'Exit day before earnings',
      entryCondition: 'Buy now',
      exitCondition: `Exit day before earnings (in ${marketState.earningsDays} days)`,
      params: {
        profitTargetDollars: ep.profitTarget,
        stopLossDollars: ep.stopLoss,
        timeStopDTE: ep.timeStopDTE,
        exitOnEarningsMinus1: true,
        holdToExpiry: false,
      },
    });
  }

  return candidates;
}

// ---------- Single proposal simulation ----------
function simulateProposal(strategy, candidate, marketState, nPaths, rng) {
  const params = candidate.params;
  const days = strategy.dte || 14;
  const iv = strategy.iv || marketState.avgIV || 0.3;
  const spot0 = marketState.price;
  const pnls = [];
  const holdDays = [];

  for (let i = 0; i < nPaths; i++) {
    const path = simulateGBMPath(spot0, iv, days, rng);
    let exitDay = null;
    let exitPnl = null;

    for (let d = 1; d <= days; d++) {
      const dteRemaining = days - d;
      const pnl = valueStrategyAtPrice(strategy, path[d], dteRemaining, iv);

      // 1. Earnings trigger (highest priority — don't hold through earnings on short premium)
      if (params.exitOnEarningsMinus1 && marketState.earningsDays != null && d >= marketState.earningsDays - 1) {
        exitDay = d;
        exitPnl = pnl;
        break;
      }
      // 2. Profit target
      if (params.profitTargetDollars != null && pnl >= params.profitTargetDollars) {
        exitDay = d;
        exitPnl = pnl;
        break;
      }
      // 3. Stop loss
      if (params.stopLossDollars != null && pnl <= params.stopLossDollars) {
        exitDay = d;
        exitPnl = pnl;
        break;
      }
      // 4. Time stop (skip if holdToExpiry)
      if (!params.holdToExpiry && params.timeStopDTE != null && dteRemaining <= params.timeStopDTE) {
        exitDay = d;
        exitPnl = pnl;
        break;
      }
      // 5. IV flip — proxy via rolling realized vol
      if (params.ivFlipMode && d >= 10) {
        const rv = rollingRealizedVol(path, d - 10, d);
        if (params.ivFlipMode === 'high_to_low' && rv < iv * 0.7) {
          exitDay = d;
          exitPnl = pnl;
          break;
        }
        if (params.ivFlipMode === 'low_to_high' && rv > iv * 1.3) {
          exitDay = d;
          exitPnl = pnl;
          break;
        }
      }
    }

    if (exitDay === null) {
      // Held to expiry
      exitDay = days;
      exitPnl = valueStrategyAtPrice(strategy, path[days], 0, iv);
    }
    pnls.push(exitPnl);
    holdDays.push(exitDay);
  }

  pnls.sort((a, b) => a - b);
  const mean = pnls.reduce((a, b) => a + b, 0) / nPaths;
  const wins = pnls.filter(p => p > 0).length;
  const p5Idx = Math.max(0, Math.floor(nPaths * 0.05));
  const p95Idx = Math.min(nPaths - 1, Math.floor(nPaths * 0.95));
  const p5 = pnls[p5Idx];
  const p95 = pnls[p95Idx];
  const avgHold = holdDays.reduce((a, b) => a + b, 0) / nPaths;

  return {
    meanPnl: mean,
    winRate: wins / nPaths,
    expectedHoldDays: Math.round(avgHold),
    percentile5: p5,
    percentile95: p95,
  };
}

// ---------- Orchestrator ----------
function optimizeTimings(strategy, marketState, opts) {
  opts = opts || {};
  const nPaths = opts.nPaths || 1000;
  const nProposals = opts.nProposals || 5;
  const seedStr = `${marketState.symbol || ''}|${strategy.name}|${strategy.expirationDate || ''}|${marketState.entryDate || ''}`;
  const seed = opts.seed || hashSeed(seedStr);

  const candidates = generateCandidates(strategy, marketState);

  // Each candidate uses its own seeded RNG so order doesn't bias the results.
  // (Sharing one RNG would mean later candidates use later samples, which can leak structure.)
  const results = candidates.map((c, i) => {
    const rng = mulberry32(seed + i);
    return {
      candidate: c,
      simulation: simulateProposal(strategy, c, marketState, nPaths, rng),
    };
  });

  const baseline = results.find(r => r.candidate.id === 'baseline');
  const baselineMean = baseline ? baseline.simulation.meanPnl : 0;

  results.forEach(r => {
    r.deltaVsDefault = r.simulation.meanPnl - baselineMean;
  });

  results.sort((a, b) => b.simulation.meanPnl - a.simulation.meanPnl);

  let ranked = results.slice(0, nProposals).map((r, i) => Object.assign({ rank: i + 1 }, r));

  // Force baseline into the list if it was cut
  if (!ranked.find(r => r.candidate.id === 'baseline') && baseline) {
    ranked[ranked.length - 1] = Object.assign({ rank: ranked.length }, baseline);
  }
  return ranked;
}

// ---------- Dual export ----------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalCDF,
    blackScholesValue,
    valueStrategyAtPrice,
    mulberry32,
    hashSeed,
    sampleGaussian,
    simulateGBMPath,
    rollingRealizedVol,
    generateCandidates,
    simulateProposal,
    optimizeTimings,
  };
}
if (typeof window !== 'undefined') {
  window.valueStrategyAtPrice = valueStrategyAtPrice;
  window.simulateGBMPath = simulateGBMPath;
  window.generateCandidates = generateCandidates;
  window.simulateProposal = simulateProposal;
  window.optimizeTimings = optimizeTimings;
}
