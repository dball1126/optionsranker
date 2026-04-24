import type { RankedStrategy } from '@optionsranker/shared';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn, formatCurrency, formatPercent, formatDate } from '@/lib/utils';

interface RankedStrategyCardProps {
  strategy: RankedStrategy;
  onBuild?: (strategy: RankedStrategy) => void;
}

const SENTIMENT_MAP: Record<string, { label: string; variant: 'profit' | 'loss' | 'neutral' | 'warning' }> = {
  long_call: { label: 'Bullish', variant: 'profit' },
  long_put: { label: 'Bearish', variant: 'loss' },
  covered_call: { label: 'Neutral', variant: 'neutral' },
  protective_put: { label: 'Bullish', variant: 'profit' },
  bull_call_spread: { label: 'Bullish', variant: 'profit' },
  bear_put_spread: { label: 'Bearish', variant: 'loss' },
  iron_condor: { label: 'Neutral', variant: 'neutral' },
  iron_butterfly: { label: 'Neutral', variant: 'neutral' },
  straddle: { label: 'Volatile', variant: 'warning' },
  strangle: { label: 'Volatile', variant: 'warning' },
};

function rankColor(rank: number): string {
  if (rank === 1) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (rank === 2) return 'text-slate-300 bg-slate-400/10 border-slate-400/30';
  if (rank === 3) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  return 'text-slate-500 bg-slate-600/10 border-slate-600/30';
}

function scoreColor(score: number): string {
  if (score >= 0.6) return 'bg-emerald-500';
  if (score >= 0.4) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function RankedStrategyCard({ strategy, onBuild }: RankedStrategyCardProps) {
  const s = strategy;
  const sentiment = SENTIMENT_MAP[s.strategyType] || { label: 'Custom', variant: 'neutral' as const };
  const maxProfit = s.maxProfit === 'unlimited' ? 'Unlimited' : formatCurrency(s.maxProfit);
  const maxLoss = s.maxLoss === 'unlimited' ? 'Unlimited' : formatCurrency(s.maxLoss);
  const showAeroc = s.rankingMode === 'aeroc';
  const strikes = s.strikes || [];

  return (
    <Card className="hover:border-slate-600 transition-colors" data-testid="ranked-strategy-card">
      <div className="p-5">
        {/* Header: Rank + Name + Sentiment */}
        <div className="flex items-center gap-3 mb-4">
          <span className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold border',
            rankColor(s.rank),
          )} data-testid="rank-badge">
            #{s.rank}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-100">{s.strategyName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
              {showAeroc && <Badge variant="warning">AEROC</Badge>}
              <span className="text-xs text-slate-500">Exp: {formatDate(s.expiration)}</span>
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{showAeroc ? 'Relative AEROC' : 'Score'}</span>
            <span className="font-mono">{(s.score * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', scoreColor(s.score))}
              style={{ width: `${Math.min(s.score * 100, 100)}%` }}
              data-testid="score-bar"
            />
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <div className="text-xs text-slate-500">Prob. of Profit</div>
            <div className={cn('text-sm font-semibold', s.probabilityOfProfit >= 0.5 ? 'text-emerald-400' : 'text-slate-300')}>
              {(s.probabilityOfProfit * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Expected Value</div>
            <div className={cn('text-sm font-semibold', s.expectedValue >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
              {formatCurrency(s.expectedValue)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{showAeroc ? 'AEROC' : 'Risk/Reward'}</div>
            <div className="text-sm font-semibold text-slate-300">
              {showAeroc && s.aeroc != null ? `${(s.aeroc * 100).toFixed(1)}%` : `${s.riskRewardRatio.toFixed(2)}x`}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{showAeroc ? 'Debit Paid' : 'Net Cost'}</div>
            <div className={cn('text-sm font-semibold', s.netDebit > 0 ? 'text-rose-400' : 'text-emerald-400')}>
              {showAeroc ? formatCurrency(s.debitPaid ?? s.netDebit) : (s.netDebit > 0 ? formatCurrency(s.netDebit) : `+${formatCurrency(Math.abs(s.netDebit))}`)}
            </div>
          </div>
        </div>

        {showAeroc && (
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2 text-xs text-slate-400 mb-4">
            <span>EROC: <span className="font-mono text-slate-200">{s.eroc != null ? `${(s.eroc * 100).toFixed(1)}%` : '—'}</span></span>
            <span>Strikes: <span className="font-mono text-slate-200">{strikes.length ? strikes.map((strike) => `$${strike.toFixed(0)}`).join(' / ') : '—'}</span></span>
          </div>
        )}

        {/* Legs */}
        <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
          <div className="text-xs text-slate-500 mb-1.5">Trade Legs</div>
          <div className="space-y-1">
            {s.legs.map((leg, i) => (
              <div key={i} className="flex items-center text-sm text-slate-300">
                <Badge variant={leg.direction === 'buy' ? 'profit' : 'loss'} className="text-[10px] mr-2 uppercase">
                  {leg.direction}
                </Badge>
                <span className="capitalize">{leg.type}</span>
                {leg.strike && <span className="ml-1 font-mono">${leg.strike}</span>}
                {leg.premium != null && <span className="ml-auto text-slate-500 font-mono text-xs">@${leg.premium.toFixed(2)}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Max P/L + Breakeven */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
          <span>Max Profit: <span className="text-emerald-400 font-medium">{maxProfit}</span></span>
          <span>Max Loss: <span className="text-rose-400 font-medium">{maxLoss}</span></span>
          {s.breakeven.length > 0 && (
            <span>BE: <span className="text-slate-300 font-mono">{s.breakeven.map(b => `$${b.toFixed(2)}`).join(', ')}</span></span>
          )}
        </div>

        {/* Action */}
        {onBuild && (
          <button
            onClick={() => onBuild(s)}
            className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            data-testid="build-button"
          >
            Build This Strategy
          </button>
        )}
      </div>
    </Card>
  );
}
