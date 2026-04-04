import type { Quote, OptionsChain } from '@optionsranker/shared';
import { realMarketDataService } from './realMarketData.service.js';

export async function getQuote(symbol: string): Promise<Quote | null> {
  return realMarketDataService.getQuote(symbol);
}

export async function getOptionsChain(symbol: string): Promise<OptionsChain | null> {
  return realMarketDataService.getOptionsChain(symbol);
}

export async function searchSymbols(query: string): Promise<Quote[]> {
  return realMarketDataService.searchSymbols(query);
}
