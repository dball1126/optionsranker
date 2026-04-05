import React from 'react';
import { Card } from '../components/ui/Card';

export default function FlowPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Options Flow</h1>
        <p className="text-muted-foreground">
          Real-time options trading activity and whale alerts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Total Premium</span>
            <span className="text-2xl font-bold text-primary">--</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Total Volume</span>
            <span className="text-2xl font-bold">--</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Whale Alerts</span>
            <span className="text-2xl font-bold text-amber-500">--</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Bullish Flow</span>
            <span className="text-2xl font-bold">--</span>
          </div>
        </Card>
      </div>

      <Card className="p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold mb-2">Options Flow Coming Soon</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Real-time options flow requires an OPRA data feed subscription.
          This feature will show block trades, whale activity, and smart money flow
          once connected to a live data provider.
        </p>
      </Card>
    </div>
  );
}
