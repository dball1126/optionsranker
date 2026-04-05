import type { Quote, OptionsChain, OptionsContract, Greeks } from '@optionsranker/shared';
import { calculateGreeks } from '../utils/blackScholes.js';
import https from 'node:https';
import http from 'node:http';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ChartNova proxy (port 8777) reliably handles Yahoo Finance requests.
// tsx's undici/fetch gets rate-limited by Yahoo — route through the proxy instead.
const PROXY_BASE = process.env.YAHOO_PROXY_URL || 'http://localhost:8777';

/** Fetch JSON via HTTP(S) using Node's native modules */
function httpGet(url: string, extraHeaders?: Record<string, string>): Promise<{ status: number; body: string }> {
  const mod = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { 'User-Agent': UA, ...extraHeaders };
    mod.get(url, { headers }, (res: any) => {
      let data = '';
      res.on('data', (chunk: Buffer) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
    }).on('error', reject);
  });
}

function httpJSON(url: string, extraHeaders?: Record<string, string>): Promise<any> {
  return httpGet(url, extraHeaders).then(({ status, body }) => {
    if (status !== 200) throw new Error(`HTTP ${status}: ${body.substring(0, 50)}`);
    return JSON.parse(body);
  });
}

class RealMarketDataService {
  private alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 60000; // 1 minute cache

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  // ── Quotes ────────────────────────────────────────────────────────

  /**
   * Fetch quote from Yahoo Finance chart endpoint (NO crumb needed)
   */
  private async fetchYahooQuote(symbol: string): Promise<Quote | null> {
    const cacheKey = `quote_${symbol}`;
    const cached = this.requestCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) return cached.data;

    try {
      // Route through ChartNova proxy to avoid Yahoo rate limits on tsx/undici
      const data = await httpJSON(`${PROXY_BASE}/api/chart/${symbol}`);
      if (!data.chart?.result?.[0]) return null;

      const meta = data.chart.result[0].meta;
      const result: Quote = {
        symbol: symbol.toUpperCase(),
        name: meta.shortName || meta.longName || symbol,
        price: meta.regularMarketPrice || meta.previousClose || 0,
        change: meta.regularMarketPrice ? meta.regularMarketPrice - meta.previousClose : 0,
        changePercent: meta.regularMarketPrice && meta.previousClose
          ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 : 0,
        volume: meta.regularMarketVolume || 0,
        high: meta.regularMarketDayHigh || meta.regularMarketPrice || 0,
        low: meta.regularMarketDayLow || meta.regularMarketPrice || 0,
        open: meta.regularMarketOpen || meta.previousClose || 0,
        previousClose: meta.previousClose || 0,
        marketCap: meta.marketCap,
        timestamp: new Date().toISOString(),
      };

      this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error(`[RealData] Yahoo quote error for ${symbol}:`, error);
      return null;
    }
  }

  private async fetchAlphaVantageQuote(symbol: string): Promise<Quote | null> {
    if (!this.alphaVantageKey || this.alphaVantageKey === 'your_alpha_vantage_key_here') return null;

    const cacheKey = `av_${symbol}`;
    const cached = this.requestCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) return cached.data;

    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
      const data = await httpJSON(url);
      const gq = data['Global Quote'];
      if (!gq?.['05. price']) return null;

      const result: Quote = {
        symbol: symbol.toUpperCase(),
        name: symbol,
        price: parseFloat(gq['05. price']),
        change: parseFloat(gq['09. change']),
        changePercent: parseFloat(gq['10. change percent'].replace('%', '')),
        volume: parseInt(gq['06. volume']),
        high: parseFloat(gq['03. high']),
        low: parseFloat(gq['04. low']),
        open: parseFloat(gq['02. open']),
        previousClose: parseFloat(gq['08. previous close']),
        timestamp: new Date().toISOString(),
      };
      this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch {
      return null;
    }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    let quote = await this.fetchYahooQuote(symbol);
    if (quote) return quote;
    quote = await this.fetchAlphaVantageQuote(symbol);
    if (quote) return quote;
    console.warn(`[RealData] No data for ${symbol}`);
    return null;
  }

  // ── Search ────────────────────────────────────────────────────────

  /**
   * Search symbols via Yahoo Finance (NO crumb needed)
   */
  async searchSymbols(query: string): Promise<Quote[]> {
    if (!query || query.length < 1) return [];

    try {
      const data = await httpJSON(`${PROXY_BASE}/api/search?q=${encodeURIComponent(query)}&quotesCount=10`);
      if (!data.quotes) return [];

      const symbols = data.quotes
        .filter((item: any) => ['EQUITY', 'ETF', 'INDEX'].includes(item.quoteType))
        .slice(0, 10)
        .map((item: any) => item.symbol);

      const results = await Promise.all(symbols.map((s: string) => this.getQuote(s)));
      return results.filter((q): q is Quote => q !== null);
    } catch (error) {
      console.error('[RealData] Search error:', error);
      return [];
    }
  }

  // ── Options (via ChartNova proxy) ──────────────────────────────────

  async getOptionsChain(symbol: string): Promise<OptionsChain | null> {
    const cacheKey = `options_${symbol}`;
    const cached = this.requestCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) return cached.data;

    try {
      // Route through ChartNova proxy which handles crumb auth reliably
      const data = await httpJSON(`${PROXY_BASE}/api/options/${symbol}`);
      const result = data.optionChain?.result?.[0];
      if (!result) return null;

      const underlyingPrice = result.quote?.regularMarketPrice || 0;
      const allExpirationEpochs: number[] = result.expirationDates || [];
      const expirationEpochs = allExpirationEpochs.slice(0, 3);
      const expirations = expirationEpochs.map((e: number) =>
        new Date(e * 1000).toISOString().split('T')[0]
      );

      const chain: OptionsChain['chain'] = {};

      // First expiration is already in the response
      if (result.options?.[0]) {
        const expStr = expirations[0];
        chain[expStr] = {
          calls: this.mapContracts(result.options[0].calls || [], symbol, 'call', expStr, underlyingPrice),
          puts: this.mapContracts(result.options[0].puts || [], symbol, 'put', expStr, underlyingPrice),
        };
      }

      // Fetch remaining expirations
      for (let i = 1; i < expirationEpochs.length; i++) {
        try {
          const expData = await httpJSON(`${PROXY_BASE}/api/options/${symbol}?date=${expirationEpochs[i]}`);
          const expResult = expData.optionChain?.result?.[0];
          if (expResult?.options?.[0]) {
            const expStr = expirations[i];
            chain[expStr] = {
              calls: this.mapContracts(expResult.options[0].calls || [], symbol, 'call', expStr, underlyingPrice),
              puts: this.mapContracts(expResult.options[0].puts || [], symbol, 'put', expStr, underlyingPrice),
            };
          }
        } catch { /* skip failed expiration */ }
      }

      const optionsChain: OptionsChain = { underlying: symbol.toUpperCase(), underlyingPrice, expirations, chain };
      this.requestCache.set(cacheKey, { data: optionsChain, timestamp: Date.now() });
      console.log(`[RealData] Options ${symbol}: ${expirations.length} exps, $${underlyingPrice}`);
      return optionsChain;
    } catch (error) {
      console.error(`[RealData] Options error for ${symbol}:`, error);
      return null;
    }
  }

  private mapContracts(
    yahooContracts: any[], underlying: string, type: 'call' | 'put',
    expiration: string, underlyingPrice: number,
  ): OptionsContract[] {
    const r = 0.05;
    const T = Math.max(0.01, (new Date(expiration).getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000));

    return yahooContracts.map((c: any) => {
      const iv = c.impliedVolatility || 0.3;
      const strike = c.strike || 0;
      const greeksCalc = calculateGreeks(type, underlyingPrice, strike, T, r, iv);

      return {
        symbol: c.contractSymbol || '',
        underlying: underlying.toUpperCase(),
        type,
        strike,
        expiration,
        bid: c.bid || 0,
        ask: c.ask || 0,
        last: c.lastPrice || 0,
        volume: c.volume || 0,
        openInterest: c.openInterest || 0,
        impliedVolatility: round4(iv),
        greeks: {
          delta: round4(greeksCalc.delta),
          gamma: round4(greeksCalc.gamma),
          theta: round4(greeksCalc.theta),
          vega: round4(greeksCalc.vega),
          rho: round4(greeksCalc.rho),
        },
      };
    });
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const realMarketDataService = new RealMarketDataService();
