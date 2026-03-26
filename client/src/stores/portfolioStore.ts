import { create } from 'zustand';
import type { PortfolioSummary, Trade, CreateTradeRequest, CreatePortfolioRequest } from '@optionsranker/shared';
import { portfoliosApi } from '@/api/portfolios';
import { tradesApi } from '@/api/trades';

interface PortfolioState {
  portfolios: PortfolioSummary[];
  selectedPortfolioId: number | null;
  trades: Trade[];
  isLoadingPortfolios: boolean;
  isLoadingTrades: boolean;
  error: string | null;
  tradePagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;

  fetchPortfolios: () => Promise<void>;
  selectPortfolio: (id: number) => void;
  createPortfolio: (data: CreatePortfolioRequest) => Promise<void>;
  fetchTrades: (params?: { portfolioId?: number; status?: string; page?: number }) => Promise<void>;
  createTrade: (data: CreateTradeRequest) => Promise<void>;
  closeTrade: (id: number, exitPrice: number) => Promise<void>;
  removeTrade: (id: number) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  selectedPortfolioId: null,
  trades: [],
  isLoadingPortfolios: false,
  isLoadingTrades: false,
  error: null,
  tradePagination: null,

  fetchPortfolios: async () => {
    set({ isLoadingPortfolios: true, error: null });
    try {
      const response = await portfoliosApi.list();
      const portfolios = response.data;
      set({
        portfolios,
        isLoadingPortfolios: false,
        selectedPortfolioId: get().selectedPortfolioId ?? (portfolios.length > 0 ? portfolios[0].id : null),
      });
    } catch (err) {
      set({
        isLoadingPortfolios: false,
        error: err instanceof Error ? err.message : 'Failed to load portfolios',
      });
    }
  },

  selectPortfolio: (id: number) => {
    set({ selectedPortfolioId: id });
  },

  createPortfolio: async (data: CreatePortfolioRequest) => {
    try {
      await portfoliosApi.create(data);
      await get().fetchPortfolios();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create portfolio' });
      throw err;
    }
  },

  fetchTrades: async (params) => {
    set({ isLoadingTrades: true, error: null });
    try {
      const response = await tradesApi.list({
        portfolioId: params?.portfolioId ?? get().selectedPortfolioId ?? undefined,
        status: params?.status,
        page: params?.page,
        limit: 20,
      });
      set({
        trades: response.data,
        tradePagination: response.pagination,
        isLoadingTrades: false,
      });
    } catch (err) {
      set({
        isLoadingTrades: false,
        error: err instanceof Error ? err.message : 'Failed to load trades',
      });
    }
  },

  createTrade: async (data: CreateTradeRequest) => {
    try {
      await tradesApi.create(data);
      await get().fetchTrades();
      await get().fetchPortfolios();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create trade' });
      throw err;
    }
  },

  closeTrade: async (id: number, exitPrice: number) => {
    try {
      await tradesApi.close(id, { exitPrice });
      await get().fetchTrades();
      await get().fetchPortfolios();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to close trade' });
      throw err;
    }
  },

  removeTrade: async (id: number) => {
    try {
      await tradesApi.remove(id);
      await get().fetchTrades();
      await get().fetchPortfolios();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to remove trade' });
      throw err;
    }
  },
}));
