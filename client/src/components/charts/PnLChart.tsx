import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface PnLChartProps {
  data: { price: number; pnl: number }[];
  breakevens?: number[];
  height?: number;
}

export function PnLChart({ data, breakevens = [], height = 350 }: PnLChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/30"
        style={{ height }}
      >
        <p className="text-slate-500 text-sm">No P&L data to display</p>
      </div>
    );
  }

  // Split data into positive and negative for dual coloring
  const chartData = data.map((d) => ({
    price: d.price,
    pnl: d.pnl,
    profit: d.pnl >= 0 ? d.pnl : 0,
    loss: d.pnl < 0 ? d.pnl : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
        <XAxis
          dataKey="price"
          stroke="#64748b"
          fontSize={11}
          tickFormatter={(v) => `$${v}`}
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
          formatter={(value: number) => [formatCurrency(value), 'P&L']}
          labelFormatter={(label: number) => `Price: $${label.toFixed(2)}`}
        />
        <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
        {breakevens.map((be, i) => (
          <ReferenceLine
            key={i}
            x={be}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{
              value: `BE: $${be.toFixed(2)}`,
              fill: '#f59e0b',
              fontSize: 11,
              position: 'top',
            }}
          />
        ))}
        <Area
          type="monotone"
          dataKey="profit"
          stroke="#10b981"
          fill="url(#profitGradient)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="loss"
          stroke="#f43f5e"
          fill="url(#lossGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
