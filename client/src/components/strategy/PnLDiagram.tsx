import { PnLChart } from '@/components/charts/PnLChart';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { useStrategyStore } from '@/stores/strategyStore';

export function PnLDiagram() {
  const { pnlData, analysisResult } = useStrategyStore();

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-100">Profit & Loss at Expiration</h3>
      </CardHeader>
      <CardBody>
        <PnLChart
          data={pnlData}
          breakevens={analysisResult?.breakeven}
          height={300}
        />
      </CardBody>
    </Card>
  );
}
