import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketStore } from '@/stores/marketStore';
import { TickerCard } from './TickerCard';
import { SkeletonCard } from '@/components/ui/Skeleton';

const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'SPY'];

export function MarketOverview() {
  const navigate = useNavigate();
  const { quotes, fetchQuote, isLoadingQuote } = useMarketStore();

  useEffect(() => {
    POPULAR_SYMBOLS.forEach((symbol) => {
      if (!quotes[symbol]) {
        fetchQuote(symbol);
      }
    });
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {POPULAR_SYMBOLS.map((symbol) => {
        const quote = quotes[symbol];
        if (!quote && isLoadingQuote) {
          return <SkeletonCard key={symbol} />;
        }
        if (!quote) {
          return (
            <div
              key={symbol}
              className="bg-slate-800 border border-slate-700/50 rounded-xl p-4"
            >
              <h3 className="text-sm font-bold text-slate-100">{symbol}</h3>
              <p className="text-xs text-slate-500 mt-1">Loading...</p>
            </div>
          );
        }
        return (
          <TickerCard
            key={symbol}
            symbol={quote.symbol}
            name={quote.name}
            price={quote.price}
            change={quote.change}
            changePercent={quote.changePercent}
            onClick={() => navigate(`/market?symbol=${symbol}`)}
          />
        );
      })}
    </div>
  );
}
