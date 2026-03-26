/**
 * Black-Scholes Option Pricing Model
 *
 * S = Current stock price (spot)
 * K = Strike price
 * T = Time to expiration in years
 * r = Risk-free interest rate (annualized)
 * sigma = Volatility (annualized)
 */

/**
 * Cumulative standard normal distribution function.
 * Uses the Abramowitz & Stegun rational approximation (formula 26.2.17).
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
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal probability density function.
 */
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate d1 parameter of the Black-Scholes formula.
 */
export function d1(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) return S > K ? Infinity : -Infinity;
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

/**
 * Calculate d2 parameter of the Black-Scholes formula.
 */
export function d2(S: number, K: number, T: number, r: number, sigma: number): number {
  return d1(S, K, T, r, sigma) - sigma * Math.sqrt(T);
}

/**
 * Calculate the price of a European call option.
 */
export function callPrice(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return Math.max(0, S - K);
  const d1Val = d1(S, K, T, r, sigma);
  const d2Val = d2(S, K, T, r, sigma);
  return S * normalCDF(d1Val) - K * Math.exp(-r * T) * normalCDF(d2Val);
}

/**
 * Calculate the price of a European put option.
 */
export function putPrice(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return Math.max(0, K - S);
  const d1Val = d1(S, K, T, r, sigma);
  const d2Val = d2(S, K, T, r, sigma);
  return K * Math.exp(-r * T) * normalCDF(-d2Val) - S * normalCDF(-d1Val);
}

/**
 * Calculate delta (sensitivity of option price to underlying price).
 * Call delta: N(d1), range [0, 1]
 * Put delta: N(d1) - 1, range [-1, 0]
 */
export function delta(type: 'call' | 'put', S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) {
    if (type === 'call') return S > K ? 1 : 0;
    return S < K ? -1 : 0;
  }
  const d1Val = d1(S, K, T, r, sigma);
  return type === 'call' ? normalCDF(d1Val) : normalCDF(d1Val) - 1;
}

/**
 * Calculate gamma (rate of change of delta).
 * Same for both calls and puts.
 */
export function gamma(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) return 0;
  const d1Val = d1(S, K, T, r, sigma);
  return normalPDF(d1Val) / (S * sigma * Math.sqrt(T));
}

/**
 * Calculate theta (time decay, expressed as per-day value).
 * Returns negative values for long option positions (options lose value over time).
 */
export function theta(type: 'call' | 'put', S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return 0;
  const d1Val = d1(S, K, T, r, sigma);
  const d2Val = d2(S, K, T, r, sigma);

  const term1 = -(S * normalPDF(d1Val) * sigma) / (2 * Math.sqrt(T));

  if (type === 'call') {
    const term2 = -r * K * Math.exp(-r * T) * normalCDF(d2Val);
    return (term1 + term2) / 365;
  } else {
    const term2 = r * K * Math.exp(-r * T) * normalCDF(-d2Val);
    return (term1 + term2) / 365;
  }
}

/**
 * Calculate vega (sensitivity to volatility changes).
 * Expressed as change per 1 percentage point change in IV.
 * Same for both calls and puts.
 */
export function vega(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) return 0;
  const d1Val = d1(S, K, T, r, sigma);
  return (S * normalPDF(d1Val) * Math.sqrt(T)) / 100;
}

/**
 * Calculate rho (sensitivity to interest rate changes).
 * Expressed as change per 1 percentage point change in interest rate.
 */
export function rho(type: 'call' | 'put', S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return 0;
  const d2Val = d2(S, K, T, r, sigma);

  if (type === 'call') {
    return (K * T * Math.exp(-r * T) * normalCDF(d2Val)) / 100;
  } else {
    return -(K * T * Math.exp(-r * T) * normalCDF(-d2Val)) / 100;
  }
}

/**
 * Calculate all Greeks at once for efficiency.
 */
export function calculateGreeks(
  type: 'call' | 'put',
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
} {
  if (T <= 0 || sigma <= 0) {
    const price = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return {
      price,
      delta: type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    };
  }

  const d1Val = d1(S, K, T, r, sigma);
  const d2Val = d2(S, K, T, r, sigma);
  const sqrtT = Math.sqrt(T);
  const expRT = Math.exp(-r * T);
  const nd1 = normalCDF(d1Val);
  const nd2 = normalCDF(d2Val);
  const npd1 = normalPDF(d1Val);

  let optionPrice: number;
  let optionDelta: number;
  let optionTheta: number;
  let optionRho: number;

  if (type === 'call') {
    optionPrice = S * nd1 - K * expRT * nd2;
    optionDelta = nd1;
    optionTheta = (-(S * npd1 * sigma) / (2 * sqrtT) - r * K * expRT * nd2) / 365;
    optionRho = (K * T * expRT * nd2) / 100;
  } else {
    optionPrice = K * expRT * normalCDF(-d2Val) - S * normalCDF(-d1Val);
    optionDelta = nd1 - 1;
    optionTheta = (-(S * npd1 * sigma) / (2 * sqrtT) + r * K * expRT * normalCDF(-d2Val)) / 365;
    optionRho = -(K * T * expRT * normalCDF(-d2Val)) / 100;
  }

  return {
    price: optionPrice,
    delta: optionDelta,
    gamma: npd1 / (S * sigma * sqrtT),
    theta: optionTheta,
    vega: (S * npd1 * sqrtT) / 100,
    rho: optionRho,
  };
}
