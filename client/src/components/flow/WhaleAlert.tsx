import React from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface WhaleFlow {
  id: string;
  symbol: string;
  type: 'CALL' | 'PUT';
  strike: number;
  expiry: string;
  premium: number;
  volume: number;
  openInterest: number;
  timestamp: Date;
  whaleScore: number;
  isSweep: boolean;
  direction: 'BUY' | 'SELL';
}

export function WhaleAlert({ flows }: { flows: WhaleFlow[] }) {
  const whales = flows.filter(f => f.whaleScore >= 80).slice(0, 8);

  if (whales.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-amber-500 mb-2 flex items-center gap-1">
          🐋 Whale Alerts
        </h3>
        <div className="text-xs text-muted-foreground">
          No significant whale activity detected
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-amber-500/20">
      <h3 className="text-sm font-semibold text-amber-500 mb-3 flex items-center gap-1">
        🐋 Whale Alerts
      </h3>
      <div className="space-y-2">
        {whales.map(flow => (
          <div 
            key={flow.id} 
            className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/10"
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${
                flow.type === 'CALL' ? 'text-green-500' : 'text-red-500'
              }`}>
                {flow.symbol} ${flow.strike}{flow.type[0]}
              </span>
              {flow.isSweep && (
                <Badge variant="secondary" className="text-[10px] bg-amber-500/20">
                  SWEEP
                </Badge>
              )}
              <Badge variant={flow.direction === 'BUY' ? 'default' : 'destructive'} className="text-[10px]">
                {flow.direction}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-amber-500">
                ${(flow.premium / 1000).toFixed(0)}K
              </span>
              <span className="text-muted-foreground">
                {new Date(flow.timestamp).toLocaleTimeString('en-US', { 
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}