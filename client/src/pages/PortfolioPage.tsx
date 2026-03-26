import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { PortfolioSummaryCards } from '@/components/portfolio/PortfolioSummary';
import { PositionTable } from '@/components/portfolio/PositionTable';
import { TradeHistory } from '@/components/portfolio/TradeHistory';
import { TradeForm } from '@/components/portfolio/TradeForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

const POSITION_TABS = [
  { id: 'open', label: 'Open Positions' },
  { id: 'history', label: 'Trade History' },
];

function PortfolioContent() {
  const {
    portfolios,
    selectedPortfolioId,
    trades,
    isLoadingPortfolios,
    isLoadingTrades,
    fetchPortfolios,
    selectPortfolio,
    fetchTrades,
  } = usePortfolioStore();

  const [showTradeForm, setShowTradeForm] = useState(false);
  const [activeTab, setActiveTab] = useState('open');

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolioId) {
      fetchTrades({ portfolioId: selectedPortfolioId });
    }
  }, [selectedPortfolioId]);

  const selectedPortfolio = portfolios.find((p) => p.id === selectedPortfolioId) ?? null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Portfolio</h1>
          <p className="text-sm text-slate-400 mt-1">Track and manage your options trades</p>
        </div>
        <div className="flex items-center gap-3">
          {portfolios.length > 0 && (
            <Select
              value={String(selectedPortfolioId ?? '')}
              onChange={(e) => selectPortfolio(Number(e.target.value))}
              options={portfolios.map((p) => ({
                value: String(p.id),
                label: p.name,
              }))}
            />
          )}
          <Button onClick={() => setShowTradeForm(true)} disabled={!selectedPortfolioId}>
            <Plus className="h-4 w-4" />
            New Trade
          </Button>
        </div>
      </div>

      {/* Portfolio summary */}
      {isLoadingPortfolios ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <PortfolioSummaryCards portfolio={selectedPortfolio} />
      )}

      {/* Positions tabs */}
      <Tabs tabs={POSITION_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Position content */}
      {isLoadingTrades ? (
        <SkeletonTable rows={5} />
      ) : activeTab === 'open' ? (
        <PositionTable trades={trades} />
      ) : (
        <TradeHistory trades={trades} />
      )}

      {/* Trade form modal */}
      {selectedPortfolioId && (
        <TradeForm
          isOpen={showTradeForm}
          onClose={() => setShowTradeForm(false)}
          portfolioId={selectedPortfolioId}
        />
      )}
    </div>
  );
}

export function PortfolioPage() {
  return (
    <ProtectedRoute>
      <PortfolioContent />
    </ProtectedRoute>
  );
}
