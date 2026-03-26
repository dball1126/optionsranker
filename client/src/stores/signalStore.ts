import { create } from 'zustand';
import type { Signal, SignalPerformance } from '@optionsranker/shared';
import { signalsApi } from '@/api/signals';

interface SignalState {
  signals: Signal[];
  highConfidenceSignals: Signal[];
  performance: SignalPerformance | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSignals: (params?: { limit?: number; offset?: number }) => Promise<void>;
  fetchHighConfidenceSignals: (params?: { threshold?: number; limit?: number }) => Promise<void>;
  fetchPerformance: () => Promise<void>;
  generateMockSignals: () => Promise<void>;
  clearError: () => void;
}

export const useSignalStore = create<SignalState>((set, get) => ({
  signals: [],
  highConfidenceSignals: [],
  performance: null,
  isLoading: false,
  error: null,

  fetchSignals: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await signalsApi.getSignals(params);
      set({ 
        signals: response.data.signals,
        isLoading: false 
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch signals',
        isLoading: false 
      });
    }
  },

  fetchHighConfidenceSignals: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await signalsApi.getHighConfidenceSignals(params);
      set({ 
        highConfidenceSignals: response.data,
        isLoading: false 
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch high-confidence signals',
        isLoading: false 
      });
    }
  },

  fetchPerformance: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await signalsApi.getPerformance();
      set({ 
        performance: response.data,
        isLoading: false 
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch performance',
        isLoading: false 
      });
    }
  },

  generateMockSignals: async () => {
    set({ isLoading: true, error: null });
    try {
      await signalsApi.generateMockSignals();
      // Refresh signals after generating mock data
      await get().fetchSignals();
      await get().fetchHighConfidenceSignals();
      await get().fetchPerformance();
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to generate mock signals',
        isLoading: false 
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));