import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';

interface TickerCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  onClick?: () => void;
}

export function TickerCard({ symbol, name, price, change, changePercent, onClick }: TickerCardProps) {
  const isPositive = change >= 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-slate-800 border border-slate-700/50 rounded-xl p-4',
        'hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{symbol}</h3>
          <p className="text-xs text-slate-500 truncate max-w-[120px]">{name}</p>
        </div>
        <div
          className={cn(
            'p-1 rounded-md',
            isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10',
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-400" />
          )}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-lg font-semibold text-slate-100">{formatCurrency(price)}</p>
        <p
          className={cn(
            'text-sm font-medium',
            isPositive ? 'text-emerald-400' : 'text-rose-400',
          )}
        >
          {isPositive ? '+' : ''}{formatCurrency(change)} ({formatPercent(changePercent)})
        </p>
      </div>
    </button>
  );
}
