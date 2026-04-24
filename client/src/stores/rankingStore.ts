import { create } from 'zustand';
import type { RankedStrategy, RankingMode } from '@optionsranker/shared';
import { rankingsApi } from '@/api/rankings';

interface RankingState {
  symbol: string | null;
  rankingMode: RankingMode;
  underlyingPrice: number;
  expiration: string;
  rankedStrategies: RankedStrategy[];
  isLoading: boolean;
  error: string | null;

  fetchRankings: (symbol: string, mode?: RankingMode) => Promise<void>;
  setRankingMode: (mode: RankingMode) => void;
  clear: () => void;
}

export const useRankingStore = create<RankingState>((set) => ({
  symbol: null,
  rankingMode: 'current',
  underlyingPrice: 0,
  expiration: '',
  rankedStrategies: [],
  isLoading: false,
  error: null,

  fetchRankings: async (symbol: string, mode = 'current') => {
    set({ isLoading: true, error: null, symbol: symbol.toUpperCase(), rankingMode: mode });
    try {
      const response = await rankingsApi.getRankings(symbol, mode);
      const data = response.data;
      set({
        rankingMode: data.rankingMode,
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

  setRankingMode: (mode) => set({ rankingMode: mode }),

  clear: () => {
    set({ symbol: null, rankingMode: 'current', underlyingPrice: 0, expiration: '', rankedStrategies: [], error: null });
  },
}));
