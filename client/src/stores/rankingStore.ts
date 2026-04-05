import { create } from 'zustand';
import type { RankedStrategy } from '@optionsranker/shared';
import { rankingsApi } from '@/api/rankings';

interface RankingState {
  symbol: string | null;
  underlyingPrice: number;
  expiration: string;
  rankedStrategies: RankedStrategy[];
  isLoading: boolean;
  error: string | null;

  fetchRankings: (symbol: string) => Promise<void>;
  clear: () => void;
}

export const useRankingStore = create<RankingState>((set) => ({
  symbol: null,
  underlyingPrice: 0,
  expiration: '',
  rankedStrategies: [],
  isLoading: false,
  error: null,

  fetchRankings: async (symbol: string) => {
    set({ isLoading: true, error: null, symbol: symbol.toUpperCase() });
    try {
      const response = await rankingsApi.getRankings(symbol);
      const data = response.data;
      set({
        underlyingPrice: data.underlyingPrice,
        expiration: data.expiration,
        rankedStrategies: data.rankedStrategies,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        rankedStrategies: [],
        error: err instanceof Error ? err.message : 'Failed to fetch rankings',
      });
    }
  },

  clear: () => {
    set({ symbol: null, underlyingPrice: 0, expiration: '', rankedStrategies: [], error: null });
  },
}));
