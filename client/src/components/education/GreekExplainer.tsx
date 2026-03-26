import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { calculateGreeks } from '@/lib/greeks';
import { formatGreek } from '@/lib/formatters';

interface GreekExplainerProps {
  greekName: 'delta' | 'gamma' | 'theta' | 'vega';
}

const greekInfo: Record<string, { description: string; explanation: string; color: string }> = {
  delta: {
    description: 'Rate of change of option price relative to the underlying price',
    explanation:
      'Delta measures how much the option price moves for each $1 move in the underlying. A delta of 0.5 means the option moves $0.50 for every $1.00 change in the stock.',
    color: 'text-blue-400',
  },
  gamma: {
    description: 'Rate of change of delta relative to the underlying price',
    explanation:
      'Gamma tells you how fast delta is changing. High gamma means delta will change rapidly, making the option more sensitive to large price moves.',
    color: 'text-emerald-400',
  },
  theta: {
    description: 'Rate of time decay per day',
    explanation:
      'Theta measures how much value the option loses each day. It is usually negative for long options -- time is working against you.',
    color: 'text-rose-400',
  },
  vega: {
    description: 'Sensitivity to a 1% change in implied volatility',
    explanation:
      'Vega measures how much the option price changes when implied volatility changes by 1%. Higher vega means the option is more sensitive to volatility changes.',
    color: 'text-amber-400',
  },
};

export function GreekExplainer({ greekName }: GreekExplainerProps) {
  const [spotPrice, setSpotPrice] = useState(175);
  const [strike] = useState(175);
  const [timeToExpiry] = useState(0.082); // ~30 days
  const [volatility] = useState(0.30);
  const [riskFreeRate] = useState(0.05);

  const info = greekInfo[greekName];

  const greeks = useMemo(
    () => calculateGreeks('call', spotPrice, strike, timeToExpiry, riskFreeRate, volatility),
    [spotPrice, strike, timeToExpiry, riskFreeRate, volatility],
  );

  const value = greeks[greekName as keyof typeof greeks];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <h3 className={`text-lg font-bold ${info.color}`}>{greekName.charAt(0).toUpperCase() + greekName.slice(1)}</h3>
          <span className="text-xs text-slate-500">Greek Explorer</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{info.description}</p>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-300 leading-relaxed">{info.explanation}</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-400">Underlying Price</label>
            <span className="text-sm font-mono text-slate-200">${spotPrice.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={strike * 0.7}
            max={strike * 1.3}
            step={0.5}
            value={spotPrice}
            onChange={(e) => setSpotPrice(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none bg-slate-700 accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-slate-600">
            <span>${(strike * 0.7).toFixed(0)}</span>
            <span>Strike: ${strike}</span>
            <span>${(strike * 1.3).toFixed(0)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">{greekName}</p>
            <p className={`text-3xl font-bold font-mono ${info.color}`}>
              {formatGreek(value)}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
