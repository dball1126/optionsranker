import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { useMarketStore } from '@/stores/marketStore';
import { OptionsChainView } from '@/components/market/OptionsChain';
import { WatchlistPanel } from '@/components/market/WatchlistPanel';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatPercent, formatNumber, cn } from '@/lib/utils';

export function MarketPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolParam = searchParams.get('symbol');

  const {
    quotes,
    selectedSymbol,
    optionsChain,
    searchResults,
    isLoadingQuote,
    isLoadingChain,
    setSelectedSymbol,
    fetchQuote,
    fetchOptionsChain,
    searchSymbols,
    clearSearch,
  } = useMarketStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpiration, setSelectedExpiration] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Initialize from URL params
  useEffect(() => {
    if (symbolParam) {
      selectSymbol(symbolParam);
    }
  }, [symbolParam]);

  const selectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    fetchQuote(symbol);
    fetchOptionsChain(symbol);
    setSearchParams({ symbol });
    setSearchQuery('');
    setShowSearchResults(false);
    clearSearch();
  };

  useEffect(() => {
    if (optionsChain?.expirations && optionsChain.expirations.length > 0 && !selectedExpiration) {
      setSelectedExpiration(optionsChain.expirations[0]);
    }
  }, [optionsChain]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 1) {
      searchSymbols(query);
      setShowSearchResults(true);
    } else {
      clearSearch();
      setShowSearchResults(false);
    }
  };

  const handleExpirationChange = (exp: string) => {
    setSelectedExpiration(exp);
    if (selectedSymbol) {
      fetchOptionsChain(selectedSymbol, exp);
    }
  };

  const quote = selectedSymbol ? quotes[selectedSymbol] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Market Data</h1>
        <p className="text-sm text-slate-400 mt-1">
          Search for stocks and explore options chains
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main content */}
        <div className="lg:col-span-9 space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by symbol or company name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700/50 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent text-sm"
            />

            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => selectSymbol(result.symbol)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="font-medium text-slate-100">{result.symbol}</span>
                    <span className="text-slate-400 truncate ml-3">{result.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quote display */}
          {isLoadingQuote && !quote && (
            <Card>
              <CardBody className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardBody>
            </Card>
          )}

          {quote && (
            <Card>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-slate-100">{quote.symbol}</h2>
                      <span className="text-sm text-slate-400">{quote.name}</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-100 mt-2">
                      {formatCurrency(quote.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {quote.change >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-rose-400" />
                      )}
                      <span
                        className={cn(
                          'text-sm font-medium',
                          quote.change >= 0 ? 'text-emerald-400' : 'text-rose-400',
                        )}
                      >
                        {quote.change >= 0 ? '+' : ''}{formatCurrency(quote.change)} ({formatPercent(quote.changePercent)})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <span className="text-slate-500">Open</span>
                      <p className="text-slate-200">{formatCurrency(quote.open)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Prev Close</span>
                      <p className="text-slate-200">{formatCurrency(quote.previousClose)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">High</span>
                      <p className="text-slate-200">{formatCurrency(quote.high)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Low</span>
                      <p className="text-slate-200">{formatCurrency(quote.low)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Volume</span>
                      <p className="text-slate-200">{formatNumber(quote.volume)}</p>
                    </div>
                    {quote.marketCap && (
                      <div>
                        <span className="text-slate-500">Market Cap</span>
                        <p className="text-slate-200">{formatNumber(quote.marketCap)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Options chain */}
          {selectedSymbol && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-200">Options Chain</h2>
                </div>
              </CardHeader>

              {optionsChain?.expirations && optionsChain.expirations.length > 0 && (
                <div className="px-6 pb-2">
                  <Tabs
                    tabs={optionsChain.expirations.map((exp) => ({
                      id: exp,
                      label: new Date(exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
                    }))}
                    activeTab={selectedExpiration}
                    onChange={handleExpirationChange}
                  />
                </div>
              )}

              <CardBody className="p-0 overflow-x-auto">
                {isLoadingChain ? (
                  <div className="p-6">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : optionsChain ? (
                  <OptionsChainView
                    chain={optionsChain}
                    selectedExpiration={selectedExpiration}
                  />
                ) : (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No options chain data available
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {!selectedSymbol && !isLoadingQuote && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <Search className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 text-lg font-medium">Search for a symbol</p>
                <p className="text-slate-600 text-sm mt-1">
                  Enter a stock ticker to view quotes and options chains
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar - Watchlist */}
        <div className="lg:col-span-3">
          <WatchlistPanel onSelectSymbol={selectSymbol} />
        </div>
      </div>
    </div>
  );
}
