import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRankingStore } from '../stores/rankingStore';
import type { RankedStrategy, RankingResponse } from '@optionsranker/shared';

// ── Mock API ────────────────────────────────────────────────────────

const mockRankingResponse: RankingResponse = {
  symbol: 'NVDA',
  rankingMode: 'current',
  underlyingPrice: 177.39,
  expiration: '2026-04-10',
  rankedStrategies: [
    {
      rank: 1,
      rankingMode: 'current',
      strategyType: 'strangle',
      strategyName: 'Long Strangle',
      score: 0.7273,
      legs: [
        { type: 'call', direction: 'buy', quantity: 1, strike: 180, premium: 0.68, expiration: '2026-04-10' },
        { type: 'put', direction: 'buy', quantity: 1, strike: 175, premium: 0.68, expiration: '2026-04-10' },
      ],
      strikes: [175, 180],
      maxProfit: 'unlimited',
      maxLoss: -136,
      breakeven: [173.64, 181.36],
      probabilityOfProfit: 0.723,
      expectedValue: 1087.65,
      riskRewardRatio: 8.98,
      liquidityScore: 38891,
      netDebit: 135.50,
      debitPaid: 135.50,
      eroc: null,
      aeroc: null,
      expiration: '2026-04-10',
    },
    {
      rank: 2,
      rankingMode: 'current',
      strategyType: 'straddle',
      strategyName: 'Long Straddle',
      score: 0.7151,
      legs: [
        { type: 'call', direction: 'buy', quantity: 1, strike: 177.5, premium: 1.63, expiration: '2026-04-10' },
        { type: 'put', direction: 'buy', quantity: 1, strike: 177.5, premium: 1.63, expiration: '2026-04-10' },
      ],
      strikes: [177.5, 177.5],
      maxProfit: 'unlimited',
      maxLoss: -326,
      breakeven: [174.24, 180.76],
      probabilityOfProfit: 0.734,
      expectedValue: 1105.82,
      riskRewardRatio: 6.71,
      liquidityScore: 14064,
      netDebit: 325.50,
      debitPaid: 325.50,
      eroc: null,
      aeroc: null,
      expiration: '2026-04-10',
    },
    {
      rank: 3,
      rankingMode: 'current',
      strategyType: 'iron_condor',
      strategyName: 'Iron Condor',
      score: 0.2978,
      legs: [
        { type: 'put', direction: 'buy', quantity: 1, strike: 170, premium: 0.15, expiration: '2026-04-10' },
        { type: 'put', direction: 'sell', quantity: 1, strike: 172.5, premium: 0.25, expiration: '2026-04-10' },
        { type: 'call', direction: 'sell', quantity: 1, strike: 182.5, premium: 0.35, expiration: '2026-04-10' },
        { type: 'call', direction: 'buy', quantity: 1, strike: 185, premium: 0.12, expiration: '2026-04-10' },
      ],
      strikes: [170, 172.5, 182.5, 185],
      maxProfit: 33,
      maxLoss: -217,
      breakeven: [172.17, 183.33],
      probabilityOfProfit: 0.258,
      expectedValue: -96.54,
      riskRewardRatio: 0.15,
      liquidityScore: 18338,
      netDebit: -33,
      debitPaid: 33,
      eroc: null,
      aeroc: null,
      expiration: '2026-04-10',
    },
  ],
};

vi.mock('../api/rankings', () => ({
  rankingsApi: {
    getRankings: vi.fn(),
  },
}));

import { rankingsApi } from '../api/rankings';
const mockedGetRankings = vi.mocked(rankingsApi.getRankings);

// ── Store Tests ─────────────────────────────────────────────────────

describe('Ranking Store', () => {
  beforeEach(() => {
    useRankingStore.setState({
      symbol: null, rankingMode: 'current', underlyingPrice: 0, expiration: '',
      rankedStrategies: [], isLoading: false, error: null,
    });
    vi.clearAllMocks();
  });

  it('starts with empty state', () => {
    const state = useRankingStore.getState();
    expect(state.symbol).toBeNull();
    expect(state.rankedStrategies).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchRankings sets loading state and stores results', async () => {
    mockedGetRankings.mockResolvedValueOnce({ success: true, data: mockRankingResponse });

    const store = useRankingStore.getState();
    const fetchPromise = store.fetchRankings('NVDA');

    // Should be loading
    expect(useRankingStore.getState().isLoading).toBe(true);
    expect(useRankingStore.getState().symbol).toBe('NVDA');

    await fetchPromise;

    const state = useRankingStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.rankedStrategies).toHaveLength(3);
    expect(state.underlyingPrice).toBe(177.39);
    expect(state.expiration).toBe('2026-04-10');
    expect(state.rankingMode).toBe('current');
    expect(state.error).toBeNull();
  });

  it('fetchRankings handles API errors', async () => {
    mockedGetRankings.mockRejectedValueOnce(new Error('Network error'));

    await useRankingStore.getState().fetchRankings('INVALID');

    const state = useRankingStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.rankedStrategies).toEqual([]);
    expect(state.error).toBe('Network error');
  });

  it('fetchRankings uppercases the symbol', async () => {
    mockedGetRankings.mockResolvedValueOnce({ success: true, data: mockRankingResponse });

    await useRankingStore.getState().fetchRankings('nvda');

    expect(useRankingStore.getState().symbol).toBe('NVDA');
    expect(mockedGetRankings).toHaveBeenCalledWith('nvda', 'current');
  });

  it('clear resets all state', async () => {
    mockedGetRankings.mockResolvedValueOnce({ success: true, data: mockRankingResponse });
    await useRankingStore.getState().fetchRankings('NVDA');
    expect(useRankingStore.getState().rankedStrategies).toHaveLength(3);

    useRankingStore.getState().clear();

    const state = useRankingStore.getState();
    expect(state.symbol).toBeNull();
    expect(state.rankedStrategies).toEqual([]);
    expect(state.underlyingPrice).toBe(0);
  });
});

// ── Ranking Data Integrity Tests ────────────────────────────────────

describe('Ranking Data Integrity', () => {
  it('strategies are sorted by score descending', () => {
    const strategies = mockRankingResponse.rankedStrategies;
    for (let i = 1; i < strategies.length; i++) {
      expect(strategies[i - 1].score).toBeGreaterThanOrEqual(strategies[i].score);
    }
  });

  it('rank numbers are sequential starting from 1', () => {
    const strategies = mockRankingResponse.rankedStrategies;
    strategies.forEach((s, i) => {
      expect(s.rank).toBe(i + 1);
    });
  });

  it('all strategies have required fields', () => {
    for (const s of mockRankingResponse.rankedStrategies) {
      expect(s.strategyType).toBeTruthy();
      expect(s.strategyName).toBeTruthy();
      expect(typeof s.score).toBe('number');
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
      expect(s.legs.length).toBeGreaterThan(0);
      expect(typeof s.probabilityOfProfit).toBe('number');
      expect(s.probabilityOfProfit).toBeGreaterThanOrEqual(0);
      expect(s.probabilityOfProfit).toBeLessThanOrEqual(1);
      expect(typeof s.expectedValue).toBe('number');
      expect(typeof s.riskRewardRatio).toBe('number');
      expect(typeof s.liquidityScore).toBe('number');
      expect(typeof s.netDebit).toBe('number');
      expect(s.expiration).toBeTruthy();
    }
  });

  it('legs have valid structure', () => {
    for (const s of mockRankingResponse.rankedStrategies) {
      for (const leg of s.legs) {
        expect(['call', 'put', 'stock']).toContain(leg.type);
        expect(['buy', 'sell']).toContain(leg.direction);
        expect(leg.quantity).toBeGreaterThan(0);
        if (leg.type !== 'stock') {
          expect(leg.strike).toBeDefined();
          expect(leg.strike!).toBeGreaterThan(0);
          expect(leg.premium).toBeDefined();
          expect(leg.premium!).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('credit strategies have negative netDebit', () => {
    const ironCondor = mockRankingResponse.rankedStrategies.find(s => s.strategyType === 'iron_condor');
    if (ironCondor) {
      expect(ironCondor.netDebit).toBeLessThanOrEqual(0);
    }
  });

  it('debit strategies have positive netDebit', () => {
    const longStrangle = mockRankingResponse.rankedStrategies.find(s => s.strategyType === 'strangle');
    if (longStrangle) {
      expect(longStrangle.netDebit).toBeGreaterThan(0);
    }
  });

  it('breakeven prices are between max loss and max profit zones', () => {
    for (const s of mockRankingResponse.rankedStrategies) {
      for (const be of s.breakeven) {
        expect(be).toBeGreaterThan(0);
        // Breakeven should be reasonably close to the underlying price
        expect(be).toBeGreaterThan(mockRankingResponse.underlyingPrice * 0.5);
        expect(be).toBeLessThan(mockRankingResponse.underlyingPrice * 2);
      }
    }
  });
});

// ── API Client Tests ────────────────────────────────────────────────

describe('Rankings API Client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls correct endpoint with symbol', async () => {
    mockedGetRankings.mockResolvedValueOnce({ success: true, data: mockRankingResponse });

    await rankingsApi.getRankings('AAPL');

    expect(mockedGetRankings).toHaveBeenCalledWith('AAPL');
    expect(mockedGetRankings).toHaveBeenCalledTimes(1);
  });
});
