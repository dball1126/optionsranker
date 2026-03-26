import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { StrategyLeg } from '@optionsranker/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useStrategyStore } from '@/stores/strategyStore';
import { cn } from '@/lib/utils';

export function LegBuilder() {
  const { legs, addLeg, updateLeg, removeLeg } = useStrategyStore();

  const [newLeg, setNewLeg] = useState<StrategyLeg>({
    type: 'call',
    direction: 'buy',
    quantity: 1,
    strike: 175,
    premium: 5,
  });

  const handleAddLeg = () => {
    addLeg({ ...newLeg });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">Option Legs</h3>

      {/* Existing legs */}
      {legs.map((leg, index) => (
        <LegRow
          key={index}
          leg={leg}
          index={index}
          onChange={(updated) => updateLeg(index, updated)}
          onRemove={() => removeLeg(index)}
        />
      ))}

      {/* Add new leg form */}
      <div className="p-3 rounded-lg border border-dashed border-slate-700 space-y-3">
        <p className="text-xs text-slate-500 font-medium">Add Leg</p>
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Type"
            value={newLeg.type}
            onChange={(e) => setNewLeg({ ...newLeg, type: e.target.value as 'call' | 'put' | 'stock' })}
            options={[
              { value: 'call', label: 'Call' },
              { value: 'put', label: 'Put' },
              { value: 'stock', label: 'Stock' },
            ]}
          />
          <Select
            label="Direction"
            value={newLeg.direction}
            onChange={(e) => setNewLeg({ ...newLeg, direction: e.target.value as 'buy' | 'sell' })}
            options={[
              { value: 'buy', label: 'Buy (Long)' },
              { value: 'sell', label: 'Sell (Short)' },
            ]}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {newLeg.type !== 'stock' && (
            <Input
              label="Strike"
              type="number"
              value={newLeg.strike ?? ''}
              onChange={(e) => setNewLeg({ ...newLeg, strike: parseFloat(e.target.value) || undefined })}
            />
          )}
          {newLeg.type !== 'stock' && (
            <Input
              label="Premium"
              type="number"
              step="0.01"
              value={newLeg.premium ?? ''}
              onChange={(e) => setNewLeg({ ...newLeg, premium: parseFloat(e.target.value) || undefined })}
            />
          )}
          <Input
            label="Quantity"
            type="number"
            min={1}
            value={newLeg.quantity}
            onChange={(e) => setNewLeg({ ...newLeg, quantity: parseInt(e.target.value) || 1 })}
          />
        </div>
        <Button size="sm" onClick={handleAddLeg} className="w-full">
          <Plus className="h-4 w-4" />
          Add Leg
        </Button>
      </div>
    </div>
  );
}

function LegRow({
  leg,
  index,
  onChange,
  onRemove,
}: {
  leg: StrategyLeg;
  index: number;
  onChange: (leg: StrategyLeg) => void;
  onRemove: () => void;
}) {
  const isBuy = leg.direction === 'buy';

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        isBuy
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-rose-500/5 border-rose-500/20',
      )}
    >
      <div className="flex-1 grid grid-cols-5 gap-2 items-center">
        <span className={cn(
          'text-xs font-bold uppercase',
          isBuy ? 'text-emerald-400' : 'text-rose-400',
        )}>
          {leg.direction} {leg.type}
        </span>

        {leg.type !== 'stock' ? (
          <>
            <div className="text-xs text-slate-300">
              <span className="text-slate-500">K:</span>{' '}
              <input
                type="number"
                value={leg.strike ?? ''}
                onChange={(e) => onChange({ ...leg, strike: parseFloat(e.target.value) || undefined })}
                className="w-16 bg-transparent border-b border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-500">P:</span>{' '}
              <input
                type="number"
                step="0.01"
                value={leg.premium ?? ''}
                onChange={(e) => onChange({ ...leg, premium: parseFloat(e.target.value) || undefined })}
                className="w-16 bg-transparent border-b border-slate-600 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </>
        ) : (
          <>
            <div className="text-xs text-slate-500">N/A</div>
            <div className="text-xs text-slate-500">N/A</div>
          </>
        )}

        <div className="text-xs text-slate-300">
          <span className="text-slate-500">Qty:</span> {leg.quantity}
        </div>

        <button
          onClick={onRemove}
          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors justify-self-end"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
