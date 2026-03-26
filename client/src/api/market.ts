import type { ApiResponse, Quote, OptionsChain } from '@optionsranker/shared';
import { apiClient } from './client';

export const marketApi = {
  getQuote(symbol: string) {
    return apiClient.get<ApiResponse<Quote>>(`/market/quote/${symbol}`);
  },

  getOptionsChain(symbol: string, expiration?: string) {
    return apiClient.get<ApiResponse<OptionsChain>>(`/market/chain/${symbol}`, { expiration });
  },

  searchSymbols(query: string) {
    return apiClient.get<ApiResponse<{ symbol: string; name: string }[]>>('/market/search', { q: query });
  },
};
