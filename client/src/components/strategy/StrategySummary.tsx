import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useStrategyStore } from '@/stores/strategyStore';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function StrategySummary() {
  const { legs, pnlData, analysisResult } = useStrategyStore();

  if (legs.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p className="text-slate-500 text-sm">
            Add legs to see strategy summary
          </p>
        </CardBody>
      </Card>
    );
  }

  // Calculate from pnl data if no server result
  let maxProfit: number | 'unlimited' = 0;
  let maxLoss: number | 'unlimited' = 0;
  let breakevens: number[] = [];
  let probabilityOfProfit: number | null = null;

  if (analysisResult) {
    maxProfit = analysisResult.maxProfit;
    maxLoss = analysisResult.maxLoss;
    breakevens = analysisResult.breakeven;
    probabilityOfProfit = analysisResult.probabilityOfProfit;
  } else if (pnlData.length > 0) {
    const profits = pnlData.map((d) => d.pnl);
    const maxP = Math.max(...profits);
    const maxL = Math.min(...profits);
    maxProfit = maxP > 1_000_000 ? 'unlimited' : maxP;
    maxLoss = maxL < -1_000_000 ? 'unlimited' : maxL;

    // Find breakeven points (where pnl crosses 0)
    for (let i = 1; i < pnlData.length; i++) {
      if (
        (pnlData[i - 1].pnl <= 0 && pnlData[i].pnl >= 0) ||
        (pnlData[i - 1].pnl >= 0 && pnlData[i].pnl <= 0)
      ) {
        // Linear interpolation
        const ratio = Math.abs(pnlData[i - 1].pnl) / (Math.abs(pnlData[i - 1].pnl) + Math.abs(pnlData[i].pnl));
        const be = pnlData[i - 1].price + ratio * (pnlData[i].price - pnlData[i - 1].price);
        breakevens.push(Math.round(be * 100) / 100);
      }
    }

    // Estimate probability of profit from data range
    const profitablePoints = pnlData.filter((d) => d.pnl > 0).length;
    probabilityOfProfit = (profitablePoints / pnlData.length) * 100;
  }

  const summaryItems = [
    {
      label: 'Max Profit',
      value: maxProfit === 'unlimited' ? 'Unlimited' : formatCurrency(maxProfit),
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Max Loss',
      value: maxLoss === 'unlimited' ? 'Unlimited' : formatCurrency(Math.abs(maxLoss as number)),
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
    {
      label: 'Breakeven',
      value: breakevens.length > 0 ? breakevens.map((b) => `$${b.toFixed(2)}`).join(', ') : 'N/A',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Est. Prob. of Profit',
      value: probabilityOfProfit !== null ? `${probabilityOfProfit.toFixed(1)}%` : 'N/A',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-100">Strategy Summary</h3>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-slate-700/50">
          {summaryItems.map(({ label, value, color, bg }) => (
            <div key={label} className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-slate-400">{label}</span>
              <span className={cn('text-sm font-semibold px-3 py-1 rounded-md', color, bg)}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
