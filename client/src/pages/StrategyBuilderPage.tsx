import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ParameterPanel } from '@/components/strategy/ParameterPanel';
import { StrategySelector } from '@/components/strategy/StrategySelector';
import { LegBuilder } from '@/components/strategy/LegBuilder';
import { PnLDiagram } from '@/components/strategy/PnLDiagram';
import { GreeksDisplay } from '@/components/strategy/GreeksDisplay';
import { StrategySummary } from '@/components/strategy/StrategySummary';
import { GreeksChart } from '@/components/charts/GreeksChart';
import { useStrategyStore } from '@/stores/strategyStore';

export function StrategyBuilderPage() {
  const {
    legs,
    underlyingPrice,
    volatility,
    riskFreeRate,
    expiration,
    selectedStrategy,
    analyze,
    isAnalyzing,
    reset,
  } = useStrategyStore();

  // Calculate time to expiry in years
  const now = new Date();
  const exp = new Date(expiration);
  const timeToExpiry = Math.max((exp.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000), 0.001);

  // Determine the primary strike for Greeks chart
  const primaryLeg = legs.find((l) => l.type === 'call' || l.type === 'put');
  const primaryType = (primaryLeg?.type as 'call' | 'put') || 'call';
  const primaryStrike = primaryLeg?.strike ?? underlyingPrice;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Strategy Builder</h1>
          <p className="text-sm text-slate-400 mt-1">
            {selectedStrategy
              ? `Building: ${selectedStrategy.name}`
              : 'Design and analyze options strategies'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
          <Button
            onClick={analyze}
            loading={isAnalyzing}
            disabled={legs.length === 0}
          >
            Analyze Strategy
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-200">Configuration</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <ParameterPanel />
              <div className="border-t border-slate-700/50 pt-4">
                <StrategySelector />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-200">Legs</h2>
            </CardHeader>
            <CardBody>
              <LegBuilder />
            </CardBody>
          </Card>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-7 space-y-6">
          <PnLDiagram />

          <GreeksDisplay />

          <StrategySummary />
        </div>
      </div>

      {/* Greeks chart - full width below */}
      {legs.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-200">
              Greeks Sensitivity ({primaryType.toUpperCase()} @ ${primaryStrike.toFixed(2)})
            </h2>
          </CardHeader>
          <CardBody>
            <GreeksChart
              type={primaryType}
              strike={primaryStrike}
              underlyingPrice={underlyingPrice}
              timeToExpiry={timeToExpiry}
              riskFreeRate={riskFreeRate}
              volatility={volatility}
              height={300}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
