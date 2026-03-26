import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface PortfolioChartProps {
  data: { date: string; value: number }[];
  height?: number;
}

export function PortfolioChart({ data, height = 300 }: PortfolioChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/30"
        style={{ height }}
      >
        <p className="text-slate-500 text-sm">No portfolio data available</p>
      </div>
    );
  }

  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value;
  const color = isPositive ? '#10b981' : '#f43f5e';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          fontSize={11}
        />
        <YAxis
          stroke="#64748b"
          fontSize={11}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            color: '#f1f5f9',
          }}
          formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill="url(#portfolioGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
