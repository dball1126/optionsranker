import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface OptionsFlowEntry {
  id: string;
  symbol: string;
  type: 'CALL' | 'PUT';
  strike: number;
  expiry: string;
  premium: number;
  volume: number;
  openInterest: number;
  timestamp: Date;
  direction: 'BUY' | 'SELL';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  whaleScore: number;
  isSweep: boolean;
}

interface OptionsFlowProps {
  flows: OptionsFlowEntry[];
}

export function OptionsFlow({ flows }: OptionsFlowProps) {
  const [filter, setFilter] = useState<'ALL' | 'CALLS' | 'PUTS' | 'SWEEPS'>('ALL');
  const [sortBy, setSortBy] = useState<'time' | 'premium' | 'volume'>('time');

  const filteredFlows = flows
    .filter(flow => {
      switch (filter) {
        case 'CALLS': return flow.type === 'CALL';
        case 'PUTS': return flow.type === 'PUT';
        case 'SWEEPS': return flow.isSweep;
        default: return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'premium': return b.premium - a.premium;
        case 'volume': return b.volume - a.volume;
        default: return b.timestamp.getTime() - a.timestamp.getTime();
      }
    })
    .slice(0, 20);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH': return 'text-green-500';
      case 'BEARISH': return 'text-red-500';
      default: return 'text-amber-500';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">📊 Options Flow</h3>
        <div className="flex gap-2">
          <Select
            value={filter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as any)}
            options={[
              { value: 'ALL', label: 'All' },
              { value: 'CALLS', label: 'Calls' },
              { value: 'PUTS', label: 'Puts' },
              { value: 'SWEEPS', label: 'Sweeps' },
            ]}
          />
          <Select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as any)}
            options={[
              { value: 'time', label: 'Time' },
              { value: 'premium', label: 'Premium' },
              { value: 'volume', label: 'Volume' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-2">
        {filteredFlows.map(flow => (
          <div 
            key={flow.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-semibold text-sm">
                  {flow.symbol}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(flow.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Badge variant={flow.type === 'CALL' ? 'default' : 'destructive'} className="text-xs">
                  ${flow.strike}{flow.type[0]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {flow.expiry}
                </span>
              </div>

              {flow.isSweep && (
                <Badge variant="secondary" className="text-xs bg-amber-500/20">
                  ⚡ SWEEP
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex flex-col items-end">
                <span className="font-mono font-semibold">
                  ${(flow.premium / 1000).toFixed(1)}K
                </span>
                <span className="text-xs text-muted-foreground">
                  {flow.volume.toLocaleString()} vol
                </span>
              </div>
              
              <div className="flex flex-col items-end">
                <Badge variant={flow.direction === 'BUY' ? 'default' : 'outline'}>
                  {flow.direction}
                </Badge>
                <span className={`text-xs font-semibold ${getSentimentColor(flow.sentiment)}`}>
                  {flow.sentiment}
                </span>
              </div>

              {flow.whaleScore >= 60 && (
                <div className="text-amber-500">
                  🐋
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}