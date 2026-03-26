import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { calculateGreeks } from '@/lib/greeks';

interface GreeksChartProps {
  type: 'call' | 'put';
  strike: number;
  underlyingPrice: number;
  timeToExpiry: number;
  riskFreeRate: number;
  volatility: number;
  height?: number;
}

export function GreeksChart({
  type,
  strike,
  underlyingPrice,
  timeToExpiry,
  riskFreeRate,
  volatility,
  height = 300,
}: GreeksChartProps) {
  const minPrice = underlyingPrice * 0.7;
  const maxPrice = underlyingPrice * 1.3;
  const steps = 60;
  const stepSize = (maxPrice - minPrice) / steps;

  const data = Array.from({ length: steps + 1 }, (_, i) => {
    const price = minPrice + i * stepSize;
    const greeks = calculateGreeks(type, price, strike, timeToExpiry, riskFreeRate, volatility);
    return {
      price: Math.round(price * 100) / 100,
      delta: greeks.delta,
      gamma: greeks.gamma,
      theta: greeks.theta,
      vega: greeks.vega,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
        <XAxis
          dataKey="price"
          stroke="#64748b"
          fontSize={11}
          tickFormatter={(v) => `$${v}`}
        />
        <YAxis stroke="#64748b" fontSize={11} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            color: '#f1f5f9',
          }}
          labelFormatter={(label: number) => `Price: $${label.toFixed(2)}`}
          formatter={(value: number, name: string) => [value.toFixed(4), name]}
        />
        <Legend />
        <Line type="monotone" dataKey="delta" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="gamma" stroke="#10b981" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="theta" stroke="#f43f5e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="vega" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
