import type { Trade } from '@optionsranker/shared';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface TradeHistoryProps {
  trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  const closedTrades = trades.filter((t) => t.status === 'closed' || t.status === 'expired');

  if (closedTrades.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 bg-slate-800 rounded-xl border border-slate-700/50">
        <p className="text-slate-500 text-sm">No trade history</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeader>Symbol</TableHeader>
          <TableHeader>Type</TableHeader>
          <TableHeader>Direction</TableHeader>
          <TableHeader>Qty</TableHeader>
          <TableHeader>Entry</TableHeader>
          <TableHeader>Exit</TableHeader>
          <TableHeader>P&L</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Closed</TableHeader>
        </tr>
      </TableHead>
      <TableBody>
        {closedTrades.map((trade) => {
          const pnl = trade.exitPrice
            ? (trade.direction === 'buy' ? 1 : -1) *
              trade.quantity *
              (trade.exitPrice - trade.entryPrice) *
              (trade.optionType !== 'stock' ? 100 : 1)
            : 0;

          return (
            <TableRow key={trade.id}>
              <TableCell className="font-medium text-slate-100">{trade.symbol}</TableCell>
              <TableCell>
                <Badge variant={trade.optionType === 'call' ? 'profit' : trade.optionType === 'put' ? 'loss' : 'neutral'}>
                  {trade.optionType.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={cn(
                  'text-xs font-medium uppercase',
                  trade.direction === 'buy' ? 'text-emerald-400' : 'text-rose-400',
                )}>
                  {trade.direction}
                </span>
              </TableCell>
              <TableCell>{trade.quantity}</TableCell>
              <TableCell>{formatCurrency(trade.entryPrice)}</TableCell>
              <TableCell>{trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}</TableCell>
              <TableCell>
                <span className={cn(
                  'font-medium',
                  pnl >= 0 ? 'text-emerald-400' : 'text-rose-400',
                )}>
                  {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={trade.status === 'closed' ? 'neutral' : 'warning'}>
                  {trade.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {trade.closedAt ? formatDate(trade.closedAt) : '-'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
