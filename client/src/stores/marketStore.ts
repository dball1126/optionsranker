import { create } from 'zustand';
import type { Quote, OptionsChain } from '@optionsranker/shared';
import { marketApi } from '@/api/market';

interface MarketState {
  quotes: Record<string, Quote>;
  selectedSymbol: string | null;
  optionsChain: OptionsChain | null;
  searchResults: { symbol: string; name: string }[];
  isLoadingQuote: boolean;
  isLoadingChain: boolean;
  isSearching: boolean;
  error: string | null;

  setSelectedSymbol: (symbol: string) => void;
  fetchQuote: (symbol: string) => Promise<void>;
  fetchOptionsChain: (symbol: string, expiration?: string) => Promise<void>;
  searchSymbols: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  quotes: {},
  selectedSymbol: null,
  optionsChain: null,
  searchResults: [],
  isLoadingQuote: false,
  isLoadingChain: false,
  isSearching: false,
  error: null,

  setSelectedSymbol: (symbol: string) => {
    set({ selectedSymbol: symbol });
  },

  fetchQuote: async (symbol: string) => {
    set({ isLoadingQuote: true, error: null });
    try {
      const response = await marketApi.getQuote(symbol);
      set((state) => ({
        quotes: { ...state.quotes, [symbol]: response.data },
        isLoadingQuote: false,
      }));
    } catch (err) {
      set({
        isLoadingQuote: false,
        error: err instanceof Error ? err.message : 'Failed to fetch quote',
      });
    }
  },

  fetchOptionsChain: async (symbol: string, expiration?: string) => {
    set({ isLoadingChain: true, error: null });
    try {
      const response = await marketApi.getOptionsChain(symbol, expiration);
      set({
        optionsChain: response.data,
        isLoadingChain: false,
      });
    } catch (err) {
      set({
        isLoadingChain: false,
        error: err instanceof Error ? err.message : 'Failed to fetch options chain',
      });
    }
  },

  searchSymbols: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const response = await marketApi.searchSymbols(query);
      set({ searchResults: response.data, isSearching: false });
    } catch {
      set({ isSearching: false, searchResults: [] });
    }
  },

  clearSearch: () => {
    set({ searchResults: [] });
  },
}));
