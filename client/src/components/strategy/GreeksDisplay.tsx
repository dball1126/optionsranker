import { Card, CardBody } from '@/components/ui/Card';
import { useStrategyStore } from '@/stores/strategyStore';
import { calculateGreeks as calcGreeks } from '@/lib/greeks';
import { formatGreek } from '@/lib/formatters';

export function GreeksDisplay() {
  const { legs, underlyingPrice, volatility, riskFreeRate, expiration, analysisResult } =
    useStrategyStore();

  // Use server analysis if available, otherwise calculate locally
  let greeks = { delta: 0, gamma: 0, theta: 0, vega: 0 };

  if (analysisResult?.greeks) {
    greeks = analysisResult.greeks;
  } else if (legs.length > 0) {
    const now = new Date();
    const exp = new Date(expiration);
    const T = Math.max((exp.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000), 0.001);

    for (const leg of legs) {
      if (leg.type === 'stock') {
        const multiplier = leg.direction === 'buy' ? 1 : -1;
        greeks.delta += multiplier * leg.quantity;
        continue;
      }

      const type = leg.type as 'call' | 'put';
      const strike = leg.strike ?? underlyingPrice;
      const legGreeks = calcGreeks(type, underlyingPrice, strike, T, riskFreeRate, volatility);
      const multiplier = (leg.direction === 'buy' ? 1 : -1) * leg.quantity;

      greeks.delta += legGreeks.delta * multiplier;
      greeks.gamma += legGreeks.gamma * multiplier;
      greeks.theta += legGreeks.theta * multiplier;
      greeks.vega += legGreeks.vega * multiplier;
    }
  }

  const greekCards = [
    {
      label: 'Delta',
      value: greeks.delta,
      description: 'Directional exposure',
      color: 'text-blue-400',
    },
    {
      label: 'Gamma',
      value: greeks.gamma,
      description: 'Delta change rate',
      color: 'text-emerald-400',
    },
    {
      label: 'Theta',
      value: greeks.theta,
      description: 'Time decay / day',
      color: 'text-rose-400',
    },
    {
      label: 'Vega',
      value: greeks.vega,
      description: 'Volatility sensitivity',
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {greekCards.map(({ label, value, description, color }) => (
        <Card key={label}>
          <CardBody className="p-3">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{formatGreek(value)}</p>
            <p className="text-xs text-slate-600 mt-0.5">{description}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
