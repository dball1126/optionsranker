import { useState, type FormEvent } from 'react';
import type { OptionType, TradeDirection } from '@optionsranker/shared';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { usePortfolioStore } from '@/stores/portfolioStore';

interface TradeFormProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: number;
}

export function TradeForm({ isOpen, onClose, portfolioId }: TradeFormProps) {
  const { createTrade } = usePortfolioStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    optionType: 'call' as OptionType,
    direction: 'buy' as TradeDirection,
    quantity: 1,
    strikePrice: '',
    expirationDate: '',
    entryPrice: '',
    strategyTag: '',
    notes: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createTrade({
        portfolioId,
        symbol: formData.symbol.toUpperCase(),
        optionType: formData.optionType,
        direction: formData.direction,
        quantity: formData.quantity,
        strikePrice: formData.strikePrice ? parseFloat(formData.strikePrice) : undefined,
        expirationDate: formData.expirationDate || undefined,
        entryPrice: parseFloat(formData.entryPrice),
        strategyTag: formData.strategyTag || undefined,
        notes: formData.notes || undefined,
      });
      onClose();
      // Reset form
      setFormData({
        symbol: '',
        optionType: 'call',
        direction: 'buy',
        quantity: 1,
        strikePrice: '',
        expirationDate: '',
        entryPrice: '',
        strategyTag: '',
        notes: '',
      });
    } catch {
      // Error handled in store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Trade" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Symbol"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            placeholder="AAPL"
            required
          />
          <Select
            label="Option Type"
            value={formData.optionType}
            onChange={(e) => setFormData({ ...formData, optionType: e.target.value as OptionType })}
            options={[
              { value: 'call', label: 'Call' },
              { value: 'put', label: 'Put' },
              { value: 'stock', label: 'Stock' },
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Direction"
            value={formData.direction}
            onChange={(e) => setFormData({ ...formData, direction: e.target.value as TradeDirection })}
            options={[
              { value: 'buy', label: 'Buy (Long)' },
              { value: 'sell', label: 'Sell (Short)' },
            ]}
          />
          <Input
            label="Quantity"
            type="number"
            min={1}
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            required
          />
          <Input
            label="Entry Price"
            type="number"
            step="0.01"
            value={formData.entryPrice}
            onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        {formData.optionType !== 'stock' && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Strike Price"
              type="number"
              step="0.01"
              value={formData.strikePrice}
              onChange={(e) => setFormData({ ...formData, strikePrice: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Expiration Date"
              type="date"
              value={formData.expirationDate}
              onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
            />
          </div>
        )}

        <Input
          label="Strategy Tag"
          value={formData.strategyTag}
          onChange={(e) => setFormData({ ...formData, strategyTag: e.target.value })}
          placeholder="e.g. iron_condor, covered_call"
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional notes about this trade..."
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create Trade
          </Button>
        </div>
      </form>
    </Modal>
  );
}
