import type { Quote, OptionsChain, OptionsContract, Greeks } from '@optionsranker/shared';
import { calculateGreeks } from '../utils/blackScholes.js';

// Hardcoded stock data for the mock service
const STOCK_DATA: Record<string, { name: string; basePrice: number; marketCap?: number }> = {
  AAPL: { name: 'Apple Inc.', basePrice: 178.50, marketCap: 2800000000000 },
  MSFT: { name: 'Microsoft Corporation', basePrice: 415.20, marketCap: 3100000000000 },
  GOOGL: { name: 'Alphabet Inc.', basePrice: 141.80, marketCap: 1750000000000 },
  AMZN: { name: 'Amazon.com Inc.', basePrice: 185.60, marketCap: 1920000000000 },
  META: { name: 'Meta Platforms Inc.', basePrice: 505.75, marketCap: 1300000000000 },
  TSLA: { name: 'Tesla Inc.', basePrice: 248.90, marketCap: 790000000000 },
  NVDA: { name: 'NVIDIA Corporation', basePrice: 875.30, marketCap: 2150000000000 },
  SPY: { name: 'SPDR S&P 500 ETF Trust', basePrice: 510.45, marketCap: 500000000000 },
  QQQ: { name: 'Invesco QQQ Trust', basePrice: 440.20, marketCap: 250000000000 },
  IWM: { name: 'iShares Russell 2000 ETF', basePrice: 205.30, marketCap: 65000000000 },
  JPM: { name: 'JPMorgan Chase & Co.', basePrice: 198.40, marketCap: 570000000000 },
  BAC: { name: 'Bank of America Corp.', basePrice: 37.85, marketCap: 295000000000 },
  JNJ: { name: 'Johnson & Johnson', basePrice: 156.20, marketCap: 376000000000 },
  V: { name: 'Visa Inc.', basePrice: 278.90, marketCap: 570000000000 },
  WMT: { name: 'Walmart Inc.', basePrice: 165.40, marketCap: 445000000000 },
  DIS: { name: 'Walt Disney Co.', basePrice: 112.30, marketCap: 205000000000 },
  NFLX: { name: 'Netflix Inc.', basePrice: 628.50, marketCap: 272000000000 },
  AMD: { name: 'Advanced Micro Devices', basePrice: 178.20, marketCap: 288000000000 },
  CRM: { name: 'Salesforce Inc.', basePrice: 272.60, marketCap: 264000000000 },
  INTC: { name: 'Intel Corporation', basePrice: 43.25, marketCap: 183000000000 },
};

/**
 * Simple deterministic hash function for a string.
 * Produces a consistent value between 0 and 1 for a given input.
 */
function seedRandom(str: string): () => number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  // Simple LCG seeded PRNG
  let seed = Math.abs(hash) || 1;
  return () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Add some session-stable "noise" to base prices to simulate market movement.
 */
const sessionSeed = Date.now().toString().slice(0, -4); // changes roughly every 10 seconds for testing

function getSessionPrice(symbol: string, basePrice: number): number {
  const rng = seedRandom(symbol + sessionSeed);
  const change = (rng() - 0.5) * 0.04; // +/- 2%
  return Math.round((basePrice * (1 + change)) * 100) / 100;
}

export function getQuote(symbol: string): Quote | null {
  const upperSymbol = symbol.toUpperCase();
  const stock = STOCK_DATA[upperSymbol];

  if (!stock) return null;

  const rng = seedRandom(upperSymbol + sessionSeed);
  const price = getSessionPrice(upperSymbol, stock.basePrice);
  const changePercent = (rng() - 0.5) * 4; // +/- 2%
  const change = Math.round((stock.basePrice * changePercent / 100) * 100) / 100;
  const previousClose = Math.round((price - change) * 100) / 100;
  const dayRange = price * 0.02;
  const volume = Math.floor(rng() * 50000000) + 5000000;

  return {
    symbol: upperSymbol,
    name: stock.name,
    price,
    change,
    changePercent: Math.round(changePercent * 100) / 100,
    volume,
    high: Math.round((price + dayRange * rng()) * 100) / 100,
    low: Math.round((price - dayRange * rng()) * 100) / 100,
    open: Math.round((previousClose + (rng() - 0.5) * dayRange) * 100) / 100,
    previousClose,
    marketCap: stock.marketCap,
    timestamp: new Date().toISOString(),
  };
}

export function getOptionsChain(symbol: string): OptionsChain | null {
  const quote = getQuote(symbol);
  if (!quote) return null;

  const S = quote.price;
  const r = 0.05; // risk-free rate
  const baseVol = 0.25 + seedRandom(symbol)() * 0.15; // 25-40% base IV

  // Generate 3 monthly expirations
  const now = new Date();
  const expirations: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const expDate = new Date(now);
    expDate.setMonth(expDate.getMonth() + i);
    // Third Friday of the month
    expDate.setDate(1);
    const dayOfWeek = expDate.getDay();
    const firstFriday = dayOfWeek <= 5 ? (5 - dayOfWeek + 1) : (5 + 7 - dayOfWeek + 1);
    expDate.setDate(firstFriday + 14); // Third Friday
    expirations.push(expDate.toISOString().split('T')[0]);
  }

  const chain: OptionsChain['chain'] = {};

  for (const exp of expirations) {
    const expDate = new Date(exp);
    const T = Math.max(0.01, (expDate.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    // Generate strikes around the current price (10 strikes centered at ATM)
    const strikeInterval = getStrikeInterval(S);
    const atm = Math.round(S / strikeInterval) * strikeInterval;
    const strikes: number[] = [];
    for (let i = -4; i <= 5; i++) {
      strikes.push(atm + i * strikeInterval);
    }

    const calls: OptionsContract[] = [];
    const puts: OptionsContract[] = [];

    for (const K of strikes) {
      if (K <= 0) continue;

      // Apply volatility skew: OTM options have slightly higher IV
      const moneyness = S / K;
      const skew = Math.abs(1 - moneyness) * 0.1;
      const sigma = baseVol + skew;

      const callGreeks = calculateGreeks('call', S, K, T, r, sigma);
      const putGreeks = calculateGreeks('put', S, K, T, r, sigma);

      const rng = seedRandom(`${symbol}-${exp}-${K}`);
      const spreadFactor = 0.05 + rng() * 0.1; // 5-15% spread

      calls.push(buildContract(symbol, 'call', K, exp, callGreeks, sigma, rng, spreadFactor));
      puts.push(buildContract(symbol, 'put', K, exp, putGreeks, sigma, rng, spreadFactor));
    }

    chain[exp] = { calls, puts };
  }

  return {
    underlying: symbol.toUpperCase(),
    underlyingPrice: S,
    expirations,
    chain,
  };
}

function buildContract(
  underlying: string,
  type: 'call' | 'put',
  strike: number,
  expiration: string,
  greeks: { price: number; delta: number; gamma: number; theta: number; vega: number; rho: number },
  iv: number,
  rng: () => number,
  spreadFactor: number
): OptionsContract {
  const mid = Math.max(0.01, greeks.price);
  const halfSpread = mid * spreadFactor;
  const bid = Math.max(0, Math.round((mid - halfSpread) * 100) / 100);
  const ask = Math.round((mid + halfSpread) * 100) / 100;
  const last = Math.round((bid + (ask - bid) * rng()) * 100) / 100;

  const optSymbol = `${underlying.toUpperCase()}${expiration.replace(/-/g, '')}${type === 'call' ? 'C' : 'P'}${strike.toFixed(0).padStart(8, '0')}`;

  const contractGreeks: Greeks = {
    delta: round4(greeks.delta),
    gamma: round4(greeks.gamma),
    theta: round4(greeks.theta),
    vega: round4(greeks.vega),
    rho: round4(greeks.rho),
  };

  return {
    symbol: optSymbol,
    underlying: underlying.toUpperCase(),
    type,
    strike,
    expiration,
    bid,
    ask,
    last,
    volume: Math.floor(rng() * 5000) + 10,
    openInterest: Math.floor(rng() * 20000) + 100,
    impliedVolatility: round4(iv),
    greeks: contractGreeks,
  };
}

function getStrikeInterval(price: number): number {
  if (price < 25) return 1;
  if (price < 50) return 2.5;
  if (price < 200) return 5;
  if (price < 500) return 10;
  return 25;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function searchSymbols(query: string): Quote[] {
  const q = query.toUpperCase().trim();
  if (!q) return [];

  const matches = Object.entries(STOCK_DATA)
    .filter(([symbol, data]) =>
      symbol.includes(q) || data.name.toUpperCase().includes(q)
    )
    .slice(0, 10);

  return matches
    .map(([symbol]) => getQuote(symbol))
    .filter((q): q is Quote => q !== null);
}
