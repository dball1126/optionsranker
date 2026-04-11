// OptionsRanker — Pro Analytics library
//
// Skew, VRP, GEX, skew-adjusted POP, Kelly sizing, earnings crush model.
// Used by both the lite SPA and the backtester. Dual-exported (CommonJS + window globals).

// ---------- normalCDF (local copy for Node) ----------
function _normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// ---------- IV Skew ----------
// Find the contract closest to a target absolute delta.
// Real desks define skew as the IV gap between equally OTM put and call (e.g. 25-delta).
// Returns null if data insufficient.
function _findByDelta(contracts, S, T, r, type, targetDelta) {
  if (!contracts || !contracts.length || !T || !S) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const c of contracts) {
    const sigma = c.impliedVolatility;
    if (!sigma || sigma < 0.01 || sigma > 5) continue;
    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / c.strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
    const delta = type === 'Call' ? _normalCDF(d1) : _normalCDF(d1) - 1;
    const absDiff = Math.abs(Math.abs(delta) - targetDelta);
    if (absDiff < bestDiff) {
      bestDiff = absDiff;
      best = { contract: c, iv: sigma, delta };
    }
  }
  return best;
}

function computeSkew(calls, puts, S, T) {
  const r = 0.05;
  if (!calls || !puts || !S || !T) {
    return { skew: 0, iv25dPut: null, iv25dCall: null, ivAtm: null, available: false };
  }
  const put25 = _findByDelta(puts, S, T, r, 'Put', 0.25);
  const call25 = _findByDelta(calls, S, T, r, 'Call', 0.25);
  // ATM IV: average of nearest call + nearest put
  const allOpts = [...calls, ...puts].filter(c => c.impliedVolatility > 0.01 && c.impliedVolatility < 5);
  if (!allOpts.length) {
    return { skew: 0, iv25dPut: null, iv25dCall: null, ivAtm: null, available: false };
  }
  const atmCall = calls.reduce((b, c) => (Math.abs(c.strike - S) < Math.abs(b.strike - S) ? c : b), calls[0]);
  const atmPut = puts.reduce((b, c) => (Math.abs(c.strike - S) < Math.abs(b.strike - S) ? c : b), puts[0]);
  const atmIvSamples = [atmCall.impliedVolatility, atmPut.impliedVolatility].filter(v => v > 0.01 && v < 5);
  if (!atmIvSamples.length || !put25 || !call25) {
    return { skew: 0, iv25dPut: null, iv25dCall: null, ivAtm: null, available: false };
  }
  const ivAtm = atmIvSamples.reduce((a, b) => a + b, 0) / atmIvSamples.length;
  const skew = (put25.iv - call25.iv) / ivAtm;
  return {
    skew,
    iv25dPut: put25.iv,
    iv25dCall: call25.iv,
    ivAtm,
    available: true,
  };
}

// ---------- Realized Volatility (annualized) ----------
function computeRealizedVol(closes) {
  if (!closes || closes.length < 5) return null;
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }
  if (returns.length < 3) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance * 252);
}

// ---------- VRP (Variance Risk Premium) ----------
// vrp = vix / realized_vol. >1.3 = sellers favored, <0.9 = buyers favored.
function computeVRP(vixCurrent, realizedVol) {
  if (!vixCurrent || !realizedVol || realizedVol === 0) return null;
  const vixDecimal = vixCurrent / 100;  // VIX is quoted in % points, convert to decimal
  return vixDecimal / realizedVol;
}

function vrpRegime(vrp) {
  if (vrp == null) return 'unknown';
  if (vrp > 1.3) return 'seller';
  if (vrp < 0.9) return 'buyer';
  return 'neutral';
}

// ---------- GEX (Gamma Exposure) ----------
// totalGex = sum of (gamma * open_interest * 100 * spot²) per strike,
// sign-flipped for puts (dealers are short calls / long puts to retail by convention).
// Returns total exposure and the gamma flip strike where the cumulative sign changes.
function computeGEX(chain, spot) {
  if (!chain || !spot) return { totalGex: 0, gammaFlipStrike: spot, regime: 'unknown', available: false };
  const calls = chain.calls || [];
  const puts = chain.puts || [];
  // Bin by strike
  const byStrike = new Map();
  const r = 0.05;
  // We need T for greeks — assume the chain is at its own expiration; approximate T from data
  // Use 30 DTE as a reasonable default if not provided (caller can override)
  const T = chain._T || 30 / 365;
  const sigma = chain._avgIV || 0.3;

  function gammaBS(K, type) {
    if (T <= 0 || sigma <= 0) return 0;
    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(spot / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
    return Math.exp(-d1 * d1 / 2) / (spot * sigma * sqrtT * Math.sqrt(2 * Math.PI));
  }

  for (const c of calls) {
    const oi = c.openInterest || 0;
    const g = gammaBS(c.strike, 'Call');
    const exposure = g * oi * 100 * spot * spot;  // dollars per 1% spot move
    const cur = byStrike.get(c.strike) || 0;
    byStrike.set(c.strike, cur + exposure);  // calls are positive (dealers long gamma when retail buys)
  }
  for (const p of puts) {
    const oi = p.openInterest || 0;
    const g = gammaBS(p.strike, 'Put');
    const exposure = g * oi * 100 * spot * spot;
    const cur = byStrike.get(p.strike) || 0;
    byStrike.set(p.strike, cur - exposure);  // puts are negative (dealers short gamma when retail buys)
  }

  const totalGex = Array.from(byStrike.values()).reduce((a, b) => a + b, 0);

  // Find the gamma flip strike — the price level where cumulative net GEX (from below) changes sign
  const sortedStrikes = Array.from(byStrike.keys()).sort((a, b) => a - b);
  let cumGex = 0;
  let gammaFlipStrike = spot;
  let prevCum = 0;
  for (const k of sortedStrikes) {
    prevCum = cumGex;
    cumGex += byStrike.get(k);
    if (prevCum * cumGex < 0) {
      // Sign changed between previous strike and this one — interpolate
      gammaFlipStrike = k;
      break;
    }
  }

  // Regime: above flip + total positive = dealers long gamma → mean reverting
  // Below flip OR total negative = dealers short gamma → trending
  const regime = (totalGex > 0 && spot > gammaFlipStrike) ? 'mean_reverting' : 'trending';
  return {
    totalGex,
    gammaFlipStrike,
    regime,
    spotVsFlipPct: ((spot - gammaFlipStrike) / spot) * 100,
    available: sortedStrikes.length > 0,
  };
}

// ---------- Skew-adjusted Probability ----------
// Lognormal CDF assumes symmetric tails. Real options markets price in put-skew so the
// downside has fatter tails than the upside. This adjusts the IV used for the breakeven
// CDF based on the direction (above/below current spot).
//
// breakeven: the spot price at which P&L = 0
// direction: 'above' or 'below' — the side of spot we're integrating from
// atmIV: the chain's ATM IV
// skew: from computeSkew (typically -0.05 to +0.10)
function skewAdjustedProb(spot, breakeven, T, atmIV, skew, direction) {
  if (!spot || !T || !atmIV || atmIV <= 0) return 0.5;
  const r = 0.05;
  // Adjust IV: downside breakevens use put-skew-inflated IV; upside use call-skew-deflated
  let adjustedIV = atmIV;
  if (skew && Math.abs(skew) > 0.01) {
    if (direction === 'below') {
      // Downside: inflate IV proportional to put skew (positive skew = puts richer = wider downside)
      adjustedIV = atmIV * (1 + Math.max(0, skew) * 0.6);
    } else {
      // Upside: deflate IV proportional to call skew (negative skew = calls richer)
      adjustedIV = atmIV * (1 + Math.min(0, skew) * 0.6);
    }
  }
  const sqrtT = Math.sqrt(T);
  // Standard log-moneyness with risk-neutral drift
  const x = (Math.log(breakeven / spot) + (r - 0.5 * adjustedIV * adjustedIV) * T) / (adjustedIV * sqrtT);
  // Probability spot ends ABOVE the breakeven = 1 - N(x); BELOW = N(x)
  const probAbove = 1 - _normalCDF(x);
  return direction === 'above' ? probAbove : (1 - probAbove);
}

// ---------- Kelly Criterion sizing ----------
// f* = (bp - q) / b  where b = profit/loss ratio, p = win prob, q = 1-p
// Returns half-Kelly capped at 2% (the standard "responsible Kelly" defaults).
function computeKellySize(maxProfit, maxLoss, prob, accountSize) {
  if (!accountSize || accountSize <= 0) accountSize = 10000;
  if (!maxProfit || !maxLoss || maxLoss <= 0 || !prob) {
    return { fraction: 0, riskDollars: 0, contracts: 0, kellyFraction: 0, capped: true };
  }
  const p = Math.max(0, Math.min(1, prob));
  const b = maxProfit / maxLoss;
  const fullKelly = (b * p - (1 - p)) / b;
  // Half-Kelly is the conventional safety net
  const halfKelly = fullKelly / 2;
  // Cap at 2% of account (responsible upper bound)
  const cappedFraction = Math.max(0, Math.min(0.02, halfKelly));
  const riskDollars = accountSize * cappedFraction;
  const contracts = Math.max(0, Math.floor(riskDollars / Math.max(1, maxLoss)));
  return {
    fraction: cappedFraction,
    riskDollars,
    contracts,
    kellyFraction: fullKelly,
    capped: cappedFraction < halfKelly,
  };
}

// ---------- Earnings IV Crush Edge ----------
// Compares the current ATM straddle implied move to historical 1-day moves around prior earnings dates.
// Returns the edge as a percentage (positive = current premium is rich vs history).
function computeEarningsCrushEdge(spot, atmStraddleMid, historicalMoves) {
  if (!spot || !atmStraddleMid || !historicalMoves || !historicalMoves.length) {
    return { impliedMove: null, historicalMedian: null, edgePct: null, recommendation: 'insufficient_data' };
  }
  const impliedMove = atmStraddleMid * 0.85; // standard rule-of-thumb
  const sortedMoves = [...historicalMoves].sort((a, b) => a - b);
  const median = sortedMoves[Math.floor(sortedMoves.length / 2)];
  const edgePct = ((impliedMove - median) / median) * 100;
  let recommendation;
  if (edgePct > 15) recommendation = 'sell_premium';      // implied > historical = overpriced
  else if (edgePct < -15) recommendation = 'buy_premium'; // implied < historical = underpriced
  else recommendation = 'neutral';
  return {
    impliedMove,
    historicalMedian: median,
    edgePct,
    recommendation,
    sampleSize: historicalMoves.length,
  };
}

// ---------- Dual export ----------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeSkew,
    computeRealizedVol,
    computeVRP,
    vrpRegime,
    computeGEX,
    skewAdjustedProb,
    computeKellySize,
    computeEarningsCrushEdge,
  };
}
if (typeof window !== 'undefined') {
  window.computeSkew = computeSkew;
  window.computeRealizedVol = computeRealizedVol;
  window.computeVRP = computeVRP;
  window.vrpRegime = vrpRegime;
  window.computeGEX = computeGEX;
  window.skewAdjustedProb = skewAdjustedProb;
  window.computeKellySize = computeKellySize;
  window.computeEarningsCrushEdge = computeEarningsCrushEdge;
}
