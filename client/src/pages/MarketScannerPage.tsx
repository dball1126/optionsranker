import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScannerResponse, ScannerResult } from '@optionsranker/shared';
import { scannerApi } from '@/api/scanner';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils';

export default function MarketScannerPage() {
  const navigate = useNavigate();
  const [scanner, setScanner] = useState<ScannerResponse | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await scannerApi.getScanner(selectedSector === 'all' ? undefined : selectedSector);
        if (!active) return;
        setScanner(response.data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load market scanner');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [selectedSector]);

  const sectorTabs = useMemo(() => {
    const sectors = scanner?.sectors || [];
    return [{ id: 'all', label: 'All Sectors' }, ...sectors.map((sector) => ({ id: sector.id, label: sector.label }))];
  }, [scanner]);

  const handleViewRankings = (symbol: string) => {
    navigate(`/rankings?symbol=${symbol}`);
  };

  const handleBuild = (result: ScannerResult) => {
    const params = new URLSearchParams({
      symbol: result.symbol,
      strategy: result.strategy.strategyType,
    });
    navigate(`/strategy-builder?${params.toString()}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Market Scanner</h1>
          <p className="text-slate-400 mt-1">
            Scan liquid names across sectors and surface the single best options strategy per stock.
          </p>
        </div>
        {scanner && (
          <div className="text-right text-xs text-slate-500">
            <div>{scanner.cached ? 'Cached snapshot' : 'Fresh scan'}</div>
            <div>{scanner.universeSize} symbols • {new Date(scanner.asOf).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
          </div>
        )}
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          {sectorTabs.map((sector) => (
            <button
              key={sector.id}
              type="button"
              onClick={() => setSelectedSector(sector.id)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                selectedSector === sector.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {sector.label}
            </button>
          ))}
        </div>
      </Card>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      )}

      {error && (
        <Card className="p-6 text-center">
          <div className="text-rose-400 text-lg font-medium">Failed to load market scanner</div>
          <div className="text-slate-500 mt-1">{error}</div>
        </Card>
      )}

      {!isLoading && !error && scanner && scanner.results.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-slate-400">No scanner results available for this sector filter.</div>
        </Card>
      )}

      {!isLoading && scanner && scanner.results.length > 0 && (
        <div className="space-y-4">
          {scanner.results.map((result) => (
            <Card key={`${result.symbol}-${result.strategy.strategyType}`} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-emerald-500/20 bg-emerald-600/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                      #{result.rank}
                    </span>
                    <span className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                      {result.sectorLabel} #{result.sectorRank}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-100">{result.symbol}</h2>
                    <span className="text-sm text-slate-400">{result.companyName}</span>
                    <span className={`text-sm font-medium ${result.priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(result.underlyingPrice)} ({formatPercent(result.priceChangePercent)})
                    </span>
                  </div>
                  <div className="mt-2 text-lg text-slate-200">{result.strategy.strategyName}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Expires {formatDate(result.strategy.expiration)} • POP {(result.strategy.probabilityOfProfit * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:min-w-[280px]">
                  <div>
                    <div className="text-xs text-slate-500">Scanner Score</div>
                    <div className="text-sm font-semibold text-emerald-400">{(result.scannerScore * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Base Score</div>
                    <div className="text-sm font-semibold text-slate-300">{(result.baseScore * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Expected Value</div>
                    <div className={`text-sm font-semibold ${result.strategy.expectedValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(result.strategy.expectedValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Risk / Reward</div>
                    <div className="text-sm font-semibold text-slate-300">{result.strategy.riskRewardRatio.toFixed(2)}x</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-900/60 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-slate-500">Strikes</div>
                    <div className="text-sm text-slate-300">
                      {(result.strategy.strikes || []).map((strike) => `$${strike.toFixed(0)}`).join(' / ') || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Max Profit / Loss</div>
                    <div className="text-sm text-slate-300">
                      {result.strategy.maxProfit === 'unlimited' ? 'Unlimited' : formatCurrency(result.strategy.maxProfit)}
                      {' / '}
                      {result.strategy.maxLoss === 'unlimited' ? 'Unlimited' : formatCurrency(result.strategy.maxLoss)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Breakeven</div>
                    <div className="text-sm text-slate-300">
                      {result.strategy.breakeven.map((value) => `$${value.toFixed(2)}`).join(', ') || '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleViewRankings(result.symbol)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
                >
                  View Rankings
                </button>
                <button
                  type="button"
                  onClick={() => handleBuild(result)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Build Strategy
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
