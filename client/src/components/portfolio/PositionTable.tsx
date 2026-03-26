import { useState } from 'react';
import type { Trade } from '@optionsranker/shared';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface PositionTableProps {
  trades: Trade[];
}

export function PositionTable({ trades }: PositionTableProps) {
  const { closeTrade } = usePortfolioStore();
  const [closingTradeId, setClosingTradeId] = useState<number | null>(null);
  const [exitPrice, setExitPrice] = useState('');

  const openTrades = trades.filter((t) => t.status === 'open');

  const handleClose = async () => {
    if (closingTradeId && exitPrice) {
      await closeTrade(closingTradeId, parseFloat(exitPrice));
      setClosingTradeId(null);
      setExitPrice('');
    }
  };

  if (openTrades.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 bg-slate-800 rounded-xl border border-slate-700/50">
        <p className="text-slate-500 text-sm">No open positions</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <TableHeader>Symbol</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Direction</TableHeader>
            <TableHeader>Qty</TableHeader>
            <TableHeader>Strike</TableHeader>
            <TableHeader>Entry</TableHeader>
            <TableHeader>Opened</TableHeader>
            <TableHeader>Strategy</TableHeader>
            <TableHeader>Actions</TableHeader>
          </tr>
        </TableHead>
        <TableBody>
          {openTrades.map((trade) => (
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
              <TableCell>{trade.strikePrice ? formatCurrency(trade.strikePrice) : '-'}</TableCell>
              <TableCell>{formatCurrency(trade.entryPrice)}</TableCell>
              <TableCell className="text-xs">{formatDate(trade.openedAt)}</TableCell>
              <TableCell>
                {trade.strategyTag ? (
                  <Badge variant="info">{trade.strategyTag}</Badge>
                ) : (
                  <span className="text-slate-600">-</span>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setClosingTradeId(trade.id)}
                >
                  Close
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={closingTradeId !== null}
        onClose={() => setClosingTradeId(null)}
        title="Close Position"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Exit Price"
            type="number"
            step="0.01"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            placeholder="Enter exit price"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setClosingTradeId(null)}>
              Cancel
            </Button>
            <Button onClick={handleClose} disabled={!exitPrice}>
              Close Position
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
