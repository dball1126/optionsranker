import { Input } from '@/components/ui/Input';
import { useStrategyStore } from '@/stores/strategyStore';

export function ParameterPanel() {
  const {
    underlying,
    underlyingPrice,
    volatility,
    riskFreeRate,
    expiration,
    setUnderlying,
    setUnderlyingPrice,
    setVolatility,
    setRiskFreeRate,
    setExpiration,
  } = useStrategyStore();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">Parameters</h3>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Symbol"
          value={underlying}
          onChange={(e) => setUnderlying(e.target.value)}
          placeholder="AAPL"
        />
        <Input
          label="Underlying Price"
          type="number"
          step="0.01"
          value={underlyingPrice}
          onChange={(e) => setUnderlyingPrice(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Volatility"
          type="number"
          step="0.01"
          value={volatility}
          onChange={(e) => setVolatility(parseFloat(e.target.value) || 0)}
          helpText="e.g. 0.30 = 30%"
        />
        <Input
          label="Risk-Free Rate"
          type="number"
          step="0.01"
          value={riskFreeRate}
          onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) || 0)}
          helpText="e.g. 0.05 = 5%"
        />
        <Input
          label="Expiration"
          type="date"
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
        />
      </div>
    </div>
  );
}
