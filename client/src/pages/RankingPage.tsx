import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRankingStore } from '@/stores/rankingStore';
import { useMarketStore } from '@/stores/marketStore';
import { RankedStrategyCard } from '@/components/ranking/RankedStrategyCard';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import type { RankedStrategy } from '@optionsranker/shared';

export default function RankingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { searchResults, isSearching, searchSymbols, clearSearch } = useMarketStore();
  const { symbol, underlyingPrice, expiration, rankedStrategies, isLoading, error, fetchRankings } = useRankingStore();
  const quote = useMarketStore((s) => symbol ? s.quotes[symbol] : null);
  const fetchQuote = useMarketStore((s) => s.fetchQuote);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.length >= 1) {
      searchSymbols(value);
    } else {
      clearSearch();
    }
  }, [searchSymbols, clearSearch]);

  const handleSelect = useCallback((sym: string) => {
    setQuery(sym);
    clearSearch();
    fetchQuote(sym);
    fetchRankings(sym);
  }, [clearSearch, fetchQuote, fetchRankings]);

  const handleBuild = useCallback((strategy: RankedStrategy) => {
    // Navigate to strategy builder with legs pre-loaded via URL params
    const params = new URLSearchParams({
      symbol: symbol || '',
      strategy: strategy.strategyType,
    });
    navigate(`/strategy-builder?${params.toString()}`);
  }, [navigate, symbol]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Strategy Ranker</h1>
        <p className="text-slate-400 mt-1">Find the best options strategy for any stock based on real market data</p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Enter a ticker symbol (e.g. NVDA, AAPL, TSLA)"
            className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-lg"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.length >= 1) {
                handleSelect(query.toUpperCase());
              }
            }}
            data-testid="symbol-search"
          />
        </div>

        {/* Search dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            {searchResults.map((r: any) => (
              <button
                key={r.symbol}
                className="w-full px-4 py-3 text-left hover:bg-slate-700 flex justify-between items-center"
                onClick={() => handleSelect(r.symbol)}
                data-testid="search-result"
              >
                <span className="font-medium text-slate-100">{r.symbol}</span>
                <span className="text-sm text-slate-400 truncate ml-4">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quote bar */}
      {symbol && quote && (
        <Card className="p-4" data-testid="quote-bar">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-xl font-bold text-slate-100">{symbol}</span>
              <span className="text-sm text-slate-400 ml-2">{quote.name}</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">{formatCurrency(quote.price)}</div>
            <div className={quote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {formatCurrency(quote.change)} ({formatPercent(quote.changePercent)})
            </div>
            {expiration && (
              <div className="text-sm text-slate-500 ml-auto">
                Ranking for {formatDate(expiration)} expiration
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4" data-testid="loading-state">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="p-6 text-center">
          <div className="text-rose-400 text-lg font-medium">Failed to rank strategies</div>
          <div className="text-slate-500 mt-1">{error}</div>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && symbol && rankedStrategies.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-slate-400">No strategies available for {symbol} at this time.</div>
          <div className="text-slate-500 text-sm mt-1">The options chain may not have enough liquidity or expirations.</div>
        </Card>
      )}

      {/* Ranked strategies */}
      {!isLoading && rankedStrategies.length > 0 && (
        <div className="space-y-4" data-testid="rankings-list">
          {rankedStrategies.map((s) => (
            <RankedStrategyCard
              key={s.rank}
              strategy={s}
              onBuild={handleBuild}
            />
          ))}
        </div>
      )}

      {/* Initial state */}
      {!symbol && !isLoading && (
        <Card className="p-12 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-xl font-semibold text-slate-200 mb-2">Rank Options Strategies</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Enter a ticker symbol above to scan the real options chain and rank all 10 strategy
            types by expected profitability, probability of profit, and risk/reward ratio.
          </p>
        </Card>
      )}
    </div>
  );
}
