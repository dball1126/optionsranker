import { DollarSign, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import type { PortfolioSummary as PortfolioSummaryType } from '@optionsranker/shared';
import { Card, CardBody } from '@/components/ui/Card';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';

interface PortfolioSummaryProps {
  portfolio: PortfolioSummaryType | null;
}

export function PortfolioSummaryCards({ portfolio }: PortfolioSummaryProps) {
  if (!portfolio) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardBody className="py-6 text-center">
              <p className="text-sm text-slate-500">No portfolio selected</p>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  const isProfit = portfolio.totalPnL >= 0;

  const cards = [
    {
      label: 'Total Value',
      value: formatCurrency(portfolio.totalValue),
      icon: DollarSign,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      iconBg: 'bg-blue-500/20',
    },
    {
      label: 'Total P&L',
      value: `${isProfit ? '+' : ''}${formatCurrency(portfolio.totalPnL)}`,
      icon: isProfit ? TrendingUp : TrendingDown,
      color: isProfit ? 'text-emerald-400' : 'text-rose-400',
      bg: isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      iconBg: isProfit ? 'bg-emerald-500/20' : 'bg-rose-500/20',
    },
    {
      label: 'P&L %',
      value: formatPercent(portfolio.totalPnLPercent),
      icon: isProfit ? TrendingUp : TrendingDown,
      color: isProfit ? 'text-emerald-400' : 'text-rose-400',
      bg: isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      iconBg: isProfit ? 'bg-emerald-500/20' : 'bg-rose-500/20',
    },
    {
      label: 'Open Positions',
      value: portfolio.openPositions.toString(),
      icon: BarChart3,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      iconBg: 'bg-amber-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg, iconBg }) => (
        <Card key={label}>
          <CardBody className="flex items-center gap-4">
            <div className={cn('p-3 rounded-xl', iconBg)}>
              <Icon className={cn('h-5 w-5', color)} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className={cn('text-xl font-bold', color)}>{value}</p>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
