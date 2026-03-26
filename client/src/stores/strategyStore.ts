import { create } from 'zustand';
import type { StrategyLeg, StrategyAnalysisResponse, StrategyTemplate, StrategyType } from '@optionsranker/shared';
import { STRATEGY_TEMPLATES } from '@optionsranker/shared';
import { strategiesApi } from '@/api/strategies';
import { calculatePnL } from '@/lib/greeks';

interface StrategyState {
  selectedStrategy: StrategyTemplate | null;
  strategyType: StrategyType | 'custom';
  legs: StrategyLeg[];
  underlying: string;
  underlyingPrice: number;
  volatility: number;
  riskFreeRate: number;
  expiration: string;
  analysisResult: StrategyAnalysisResponse | null;
  pnlData: { price: number; pnl: number }[];
  isAnalyzing: boolean;
  error: string | null;

  selectStrategy: (template: StrategyTemplate) => void;
  setCustom: () => void;
  setUnderlying: (symbol: string) => void;
  setUnderlyingPrice: (price: number) => void;
  setVolatility: (vol: number) => void;
  setRiskFreeRate: (rate: number) => void;
  setExpiration: (exp: string) => void;
  addLeg: (leg: StrategyLeg) => void;
  updateLeg: (index: number, leg: StrategyLeg) => void;
  removeLeg: (index: number) => void;
  setLegs: (legs: StrategyLeg[]) => void;
  analyze: () => Promise<void>;
  calculateLocalPnL: () => void;
  reset: () => void;
}

const getDefaultExpiration = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
};

export const useStrategyStore = create<StrategyState>((set, get) => ({
  selectedStrategy: null,
  strategyType: 'custom',
  legs: [],
  underlying: 'AAPL',
  underlyingPrice: 175,
  volatility: 0.3,
  riskFreeRate: 0.05,
  expiration: getDefaultExpiration(),
  analysisResult: null,
  pnlData: [],
  isAnalyzing: false,
  error: null,

  selectStrategy: (template: StrategyTemplate) => {
    const price = get().underlyingPrice;
    const legs: StrategyLeg[] = template.legs.map((legTemplate, i) => {
      let strike: number | undefined;
      if (legTemplate.type !== 'stock') {
        // Set strikes relative to underlying price
        if (template.type === 'bull_call_spread') {
          strike = i === 0 ? price : price * 1.05;
        } else if (template.type === 'bear_put_spread') {
          strike = i === 0 ? price : price * 0.95;
        } else if (template.type === 'iron_condor') {
          const offsets = [0.9, 0.95, 1.05, 1.1];
          strike = price * offsets[i];
        } else if (template.type === 'iron_butterfly') {
          const offsets = [0.9, 1.0, 1.0, 1.1];
          strike = price * offsets[i];
        } else if (template.type === 'strangle') {
          strike = i === 0 ? price * 1.05 : price * 0.95;
        } else {
          strike = price;
        }
        strike = Math.round(strike * 100) / 100;
      }

      return {
        type: legTemplate.type,
        direction: legTemplate.direction,
        quantity: legTemplate.quantity,
        strike,
        premium: legTemplate.type !== 'stock' ? 5 : undefined,
        expiration: get().expiration,
      };
    });

    set({
      selectedStrategy: template,
      strategyType: template.type,
      legs,
      error: null,
    });

    get().calculateLocalPnL();
  },

  setCustom: () => {
    set({
      selectedStrategy: null,
      strategyType: 'custom',
      legs: [],
      analysisResult: null,
      pnlData: [],
    });
  },

  setUnderlying: (symbol: string) => {
    set({ underlying: symbol.toUpperCase() });
  },

  setUnderlyingPrice: (price: number) => {
    set({ underlyingPrice: price });
    if (get().legs.length > 0) {
      get().calculateLocalPnL();
    }
  },

  setVolatility: (vol: number) => set({ volatility: vol }),
  setRiskFreeRate: (rate: number) => set({ riskFreeRate: rate }),
  setExpiration: (exp: string) => set({ expiration: exp }),

  addLeg: (leg: StrategyLeg) => {
    set((state) => ({ legs: [...state.legs, leg] }));
    get().calculateLocalPnL();
  },

  updateLeg: (index: number, leg: StrategyLeg) => {
    set((state) => {
      const legs = [...state.legs];
      legs[index] = leg;
      return { legs };
    });
    get().calculateLocalPnL();
  },

  removeLeg: (index: number) => {
    set((state) => ({
      legs: state.legs.filter((_, i) => i !== index),
    }));
    get().calculateLocalPnL();
  },

  setLegs: (legs: StrategyLeg[]) => {
    set({ legs });
    get().calculateLocalPnL();
  },

  analyze: async () => {
    const state = get();
    if (state.legs.length === 0) return;

    set({ isAnalyzing: true, error: null });
    try {
      const response = await strategiesApi.analyze({
        underlying: state.underlying,
        underlyingPrice: state.underlyingPrice,
        legs: state.legs,
        riskFreeRate: state.riskFreeRate,
        volatility: state.volatility,
      });
      set({
        analysisResult: response.data,
        pnlData: response.data.pnlData,
        isAnalyzing: false,
      });
    } catch (err) {
      // Fall back to local calculation
      get().calculateLocalPnL();
      set({
        isAnalyzing: false,
        error: err instanceof Error ? err.message : 'Analysis failed, using local calculation',
      });
    }
  },

  calculateLocalPnL: () => {
    const state = get();
    if (state.legs.length === 0) {
      set({ pnlData: [] });
      return;
    }
    const pnlData = calculatePnL(state.legs, state.underlyingPrice);
    set({ pnlData });
  },

  reset: () => {
    set({
      selectedStrategy: null,
      strategyType: 'custom',
      legs: [],
      analysisResult: null,
      pnlData: [],
      error: null,
    });
  },
}));
