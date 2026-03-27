import type { Quote, OptionsChain, OptionsContract, Greeks } from '@optionsranker/shared';
import { calculateGreeks } from '../utils/blackScholes.js';

/**
 * Real Market Data Service
 * 
 * This service integrates with multiple data providers to fetch real-time 
 * stock quotes and options data. For launch, we'll use a combination of:
 * 
 * 1. Alpha Vantage - Free tier for basic quotes
 * 2. Yahoo Finance API (unofficial) - Backup for quotes
 * 3. CBOE for options data (when available)
 * 
 * Note: For production, consider paid APIs like:
 * - Polygon.io
 * - IEX Cloud  
 * - Quandl/Nasdaq Data Link
 * - TradingView/TradierAPI
 */

interface AlphaVantageQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

interface YahooFinanceQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  marketCap: number;
}

class RealMarketDataService {
  private alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 60000; // 1 minute cache

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Fetch real-time quote using Alpha Vantage
   */
  private async fetchAlphaVantageQuote(symbol: string): Promise<Quote | null> {
    try {
      if (!this.alphaVantageKey) {
        console.warn('Alpha Vantage API key not configured');
        return null;
      }

      const cacheKey = `av_quote_${symbol}`;
      const cached = this.requestCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }

      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`;
      const response = await fetch(url);
      const data: AlphaVantageQuoteResponse = await response.json();

      if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
        return null;
      }

      const quote = data['Global Quote'];
      const result: Quote = {
        symbol: symbol.toUpperCase(),
        name: symbol, // Alpha Vantage doesn't return company name in this endpoint
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        previousClose: parseFloat(quote['08. previous close']),
        marketCap: undefined, // Not available in this endpoint
        timestamp: new Date().toISOString(),
      };

      this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Alpha Vantage API error:', error);
      return null;
    }
  }

  /**
   * Fetch quote using Yahoo Finance (unofficial API)
   */
  private async fetchYahooFinanceQuote(symbol: string): Promise<Quote | null> {
    try {
      const cacheKey = `yahoo_quote_${symbol}`;
      const cached = this.requestCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }

      // Using a public Yahoo Finance API proxy
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.chart?.result?.[0]) {
        return null;
      }

      const chartData = data.chart.result[0];
      const meta = chartData.meta;
      const quote = meta;

      const result: Quote = {
        symbol: symbol.toUpperCase(),
        name: meta.shortName || symbol,
        price: quote.regularMarketPrice || quote.previousClose || 0,
        change: quote.regularMarketPrice ? quote.regularMarketPrice - quote.previousClose : 0,
        changePercent: quote.regularMarketPrice ? ((quote.regularMarketPrice - quote.previousClose) / quote.previousClose) * 100 : 0,
        volume: quote.regularMarketVolume || 0,
        high: quote.regularMarketDayHigh || quote.regularMarketPrice || 0,
        low: quote.regularMarketDayLow || quote.regularMarketPrice || 0,
        open: quote.regularMarketOpen || quote.previousClose || 0,
        previousClose: quote.previousClose || 0,
        marketCap: quote.marketCap,
        timestamp: new Date().toISOString(),
      };

      this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Yahoo Finance API error:', error);
      return null;
    }
  }

  /**
   * Get quote with fallback to multiple providers
   */
  async getQuote(symbol: string): Promise<Quote | null> {
    // Try Yahoo Finance first (more reliable and free)
    let quote = await this.fetchYahooFinanceQuote(symbol);
    
    if (!quote && this.alphaVantageKey) {
      // Fallback to Alpha Vantage
      quote = await this.fetchAlphaVantageQuote(symbol);
    }

    return quote;
  }

  /**
   * Search for symbols (using Yahoo Finance search)
   */
  async searchSymbols(query: string): Promise<Quote[]> {
    try {
      if (!query || query.length < 1) return [];

      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.quotes) return [];

      const promises = data.quotes
        .filter((item: any) => item.typeDisp === 'Equity' && item.exchDisp)
        .slice(0, 10)
        .map((item: any) => this.getQuote(item.symbol));

      const results = await Promise.all(promises);
      return results.filter((quote): quote is Quote => quote !== null);
    } catch (error) {
      console.error('Symbol search error:', error);
      return [];
    }
  }

  /**
   * Generate options chain using real stock price and Black-Scholes
   * Note: For real options data, you'd need a paid provider like:
   * - CBOE DataShop
   * - Tradier
   * - Interactive Brokers API
   * - ThetaData
   */
  async getOptionsChain(symbol: string): Promise<OptionsChain | null> {
    const quote = await this.getQuote(symbol);
    if (!quote) return null;

    // Use Black-Scholes to generate theoretical options prices
    // This is for demonstration - real production apps need actual options market data
    return this.generateTheoreticalOptionsChain(quote);
  }

  private generateTheoreticalOptionsChain(quote: Quote): OptionsChain {
    const S = quote.price;
    const r = 0.05; // risk-free rate
    const baseVol = this.estimateImpliedVolatility(quote);

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

      // Generate strikes around the current price
      const strikeInterval = this.getStrikeInterval(S);
      const atm = Math.round(S / strikeInterval) * strikeInterval;
      const strikes: number[] = [];
      for (let i = -4; i <= 5; i++) {
        strikes.push(atm + i * strikeInterval);
      }

      const calls: OptionsContract[] = [];
      const puts: OptionsContract[] = [];

      for (const K of strikes) {
        if (K <= 0) continue;

        // Apply volatility skew
        const moneyness = S / K;
        const skew = Math.abs(1 - moneyness) * 0.1;
        const sigma = baseVol + skew;

        const callGreeks = calculateGreeks('call', S, K, T, r, sigma);
        const putGreeks = calculateGreeks('put', S, K, T, r, sigma);

        calls.push(this.buildTheoreticalContract(quote.symbol, 'call', K, exp, callGreeks, sigma));
        puts.push(this.buildTheoreticalContract(quote.symbol, 'put', K, exp, putGreeks, sigma));
      }

      chain[exp] = { calls, puts };
    }

    return {
      underlying: quote.symbol,
      underlyingPrice: S,
      expirations,
      chain,
    };
  }

  private estimateImpliedVolatility(quote: Quote): number {
    // Estimate volatility based on price movement
    const dayMove = Math.abs(quote.change / quote.previousClose);
    const annualizedMove = dayMove * Math.sqrt(252); // 252 trading days
    
    // Clamp between reasonable bounds
    return Math.min(Math.max(annualizedMove, 0.15), 1.0);
  }

  private buildTheoreticalContract(
    underlying: string,
    type: 'call' | 'put',
    strike: number,
    expiration: string,
    greeks: { price: number; delta: number; gamma: number; theta: number; vega: number; rho: number },
    iv: number
  ): OptionsContract {
    const mid = Math.max(0.01, greeks.price);
    const spreadFactor = 0.05; // 5% spread
    const halfSpread = mid * spreadFactor;
    const bid = Math.max(0, Math.round((mid - halfSpread) * 100) / 100);
    const ask = Math.round((mid + halfSpread) * 100) / 100;
    const last = Math.round((bid + ask) / 2 * 100) / 100;

    const optSymbol = `${underlying}${expiration.replace(/-/g, '')}${type === 'call' ? 'C' : 'P'}${strike.toFixed(0).padStart(8, '0')}`;

    const contractGreeks: Greeks = {
      delta: Math.round(greeks.delta * 10000) / 10000,
      gamma: Math.round(greeks.gamma * 10000) / 10000,
      theta: Math.round(greeks.theta * 10000) / 10000,
      vega: Math.round(greeks.vega * 10000) / 10000,
      rho: Math.round(greeks.rho * 10000) / 10000,
    };

    return {
      symbol: optSymbol,
      underlying: underlying,
      type,
      strike,
      expiration,
      bid,
      ask,
      last,
      volume: Math.floor(Math.random() * 5000) + 10,
      openInterest: Math.floor(Math.random() * 20000) + 100,
      impliedVolatility: Math.round(iv * 10000) / 10000,
      greeks: contractGreeks,
    };
  }

  private getStrikeInterval(price: number): number {
    if (price < 25) return 1;
    if (price < 50) return 2.5;
    if (price < 200) return 5;
    if (price < 500) return 10;
    return 25;
  }
}

export const realMarketDataService = new RealMarketDataService();