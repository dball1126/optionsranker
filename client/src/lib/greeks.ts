import type { StrategyLeg } from '@optionsranker/shared';

/**
 * Standard normal cumulative distribution function
 */
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal probability density function
 */
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * d1 in the Black-Scholes formula
 */
export function d1(S: number, K: number, T: number, r: number, sigma: number): number {
  return (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
}

/**
 * d2 in the Black-Scholes formula
 */
export function d2(S: number, K: number, T: number, r: number, sigma: number): number {
  return d1(S, K, T, r, sigma) - sigma * Math.sqrt(T);
}

/**
 * Black-Scholes call option price
 */
export function callPrice(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return Math.max(S - K, 0);
  const d1Val = d1(S, K, T, r, sigma);
  const d2Val = d2(S, K, T, r, sigma);
  return S * normalCDF(d1Val) - K * Math.exp(-r * T) * normalCDF(d2Val);
}

/**
 * Black-Scholes put option price
 */
export function putPrice(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return Math.max(K - S, 0);
  const d1Val = d1(S, K, T, r, sigma);
  const d2Val = d2(S, K, T, r, sigma);
  return K * Math.exp(-r * T) * normalCDF(-d2Val) - S * normalCDF(-d1Val);
}

/**
 * Delta: rate of change of option price with respect to underlying price
 */
export function delta(
  type: 'call' | 'put',
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
): number {
  if (T <= 0) {
    if (type === 'call') return S > K ? 1 : 0;
    return S < K ? -1 : 0;
  }
  const d1Val = d1(S, K, T, r, sigma);
  return type === 'call' ? normalCDF(d1Val) : normalCDF(d1Val) - 1;
}

/**
 * Gamma: rate of change of delta with respect to underlying price
 */
export function gamma(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return 0;
  const d1Val = d1(S, K, T, r, sigma);
  return normalPDF(d1Val) / (S * sigma * Math.sqrt(T));
}

/**
 * Theta: rate of change of option price with respect to time (per day)
 */
export function theta(
  type: 'call' | 'put',
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
): number {
  if (T <= 0) return 0;
  const d1Val = d1(S, K, T, r, sigma);
  const d2Val = d2(S, K, T, r, sigma);
  const sqrtT = Math.sqrt(T);

  const term1 = -(S * normalPDF(d1Val) * sigma) / (2 * sqrtT);

  if (type === 'call') {
    return (term1 - r * K * Math.exp(-r * T) * normalCDF(d2Val)) / 365;
  }
  return (term1 + r * K * Math.exp(-r * T) * normalCDF(-d2Val)) / 365;
}

/**
 * Vega: rate of change of option price with respect to volatility (per 1% change)
 */
export function vega(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return 0;
  const d1Val = d1(S, K, T, r, sigma);
  return (S * normalPDF(d1Val) * Math.sqrt(T)) / 100;
}

/**
 * Rho: rate of change of option price with respect to interest rate (per 1% change)
 */
export function rho(
  type: 'call' | 'put',
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
): number {
  if (T <= 0) return 0;
  const d2Val = d2(S, K, T, r, sigma);
  if (type === 'call') {
    return (K * T * Math.exp(-r * T) * normalCDF(d2Val)) / 100;
  }
  return (-K * T * Math.exp(-r * T) * normalCDF(-d2Val)) / 100;
}

/**
 * Calculate all Greeks at once
 */
export function calculateGreeks(
  type: 'call' | 'put',
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
): { delta: number; gamma: number; theta: number; vega: number; rho: number } {
  return {
    delta: delta(type, S, K, T, r, sigma),
    gamma: gamma(S, K, T, r, sigma),
    theta: theta(type, S, K, T, r, sigma),
    vega: vega(S, K, T, r, sigma),
    rho: rho(type, S, K, T, r, sigma),
  };
}

/**
 * Calculate P&L across a range of underlying prices for a set of strategy legs.
 * Returns array of { price, pnl } data points for charting.
 */
export function calculatePnL(
  legs: StrategyLeg[],
  underlyingPrice: number,
  priceRange: [number, number] = [underlyingPrice * 0.7, underlyingPrice * 1.3],
): { price: number; pnl: number }[] {
  const [minPrice, maxPrice] = priceRange;
  const steps = 100;
  const stepSize = (maxPrice - minPrice) / steps;
  const data: { price: number; pnl: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const price = minPrice + i * stepSize;
    let totalPnl = 0;

    for (const leg of legs) {
      const multiplier = leg.direction === 'buy' ? 1 : -1;
      const qty = leg.quantity;
      const premium = leg.premium ?? 0;

      if (leg.type === 'stock') {
        totalPnl += multiplier * qty * (price - underlyingPrice);
      } else if (leg.type === 'call') {
        const intrinsic = Math.max(price - (leg.strike ?? underlyingPrice), 0);
        totalPnl += multiplier * qty * 100 * (intrinsic - premium);
      } else if (leg.type === 'put') {
        const intrinsic = Math.max((leg.strike ?? underlyingPrice) - price, 0);
        totalPnl += multiplier * qty * 100 * (intrinsic - premium);
      }
    }

    data.push({ price: Math.round(price * 100) / 100, pnl: Math.round(totalPnl * 100) / 100 });
  }

  return data;
}
