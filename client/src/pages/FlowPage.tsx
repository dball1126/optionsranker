import React, { useState, useEffect } from 'react';
import { WhaleAlert } from '../components/flow/WhaleAlert';
import { OptionsFlow } from '../components/flow/OptionsFlow';
import { Card } from '../components/ui/Card';

// Mock data for demonstration
const generateMockFlow = () => {
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'AMD'];
  const types: ('CALL' | 'PUT')[] = ['CALL', 'PUT'];
  const directions: ('BUY' | 'SELL')[] = ['BUY', 'SELL'];
  const sentiments: ('BULLISH' | 'BEARISH' | 'NEUTRAL')[] = ['BULLISH', 'BEARISH', 'NEUTRAL'];

  return Array.from({ length: 50 }, (_, i) => {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const basePrice = Math.random() * 300 + 50;
    const strike = Math.round((basePrice + (Math.random() - 0.5) * 50) / 5) * 5;
    const premium = Math.random() * 500000 + 10000;
    const volume = Math.floor(Math.random() * 5000) + 100;
    const whaleScore = Math.floor(Math.random() * 100);

    return {
      id: `flow-${i}`,
      symbol,
      type,
      strike,
      expiry: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      premium,
      volume,
      openInterest: Math.floor(Math.random() * 10000),
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      direction: directions[Math.floor(Math.random() * directions.length)],
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      whaleScore,
      isSweep: Math.random() > 0.7
    };
  });
};

export default function FlowPage() {
  const [flows, setFlows] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPremium: 0,
    totalVolume: 0,
    whaleCount: 0,
    bullishRatio: 0
  });

  useEffect(() => {
    const mockFlows = generateMockFlow();
    setFlows(mockFlows);

    // Calculate stats
    const totalPremium = mockFlows.reduce((sum, flow) => sum + flow.premium, 0);
    const totalVolume = mockFlows.reduce((sum, flow) => sum + flow.volume, 0);
    const whaleCount = mockFlows.filter(flow => flow.whaleScore >= 80).length;
    const bullish = mockFlows.filter(flow => flow.sentiment === 'BULLISH').length;
    const bullishRatio = (bullish / mockFlows.length) * 100;

    setStats({
      totalPremium,
      totalVolume,
      whaleCount,
      bullishRatio
    });

    // Simulate real-time updates
    const interval = setInterval(() => {
      const newFlow = generateMockFlow()[0];
      newFlow.timestamp = new Date();
      setFlows(prev => [newFlow, ...prev.slice(0, 49)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Options Flow</h1>
        <p className="text-muted-foreground">
          Real-time options trading activity and whale alerts
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Total Premium</span>
            <span className="text-2xl font-bold text-primary">
              ${(stats.totalPremium / 1000000).toFixed(1)}M
            </span>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Total Volume</span>
            <span className="text-2xl font-bold">
              {(stats.totalVolume / 1000).toFixed(1)}K
            </span>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Whale Alerts</span>
            <span className="text-2xl font-bold text-amber-500">
              {stats.whaleCount}
            </span>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Bullish Flow</span>
            <span className={`text-2xl font-bold ${stats.bullishRatio > 50 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.bullishRatio.toFixed(0)}%
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <WhaleAlert flows={flows} />
        </div>
        
        <div className="lg:col-span-2">
          <OptionsFlow flows={flows} />
        </div>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">📈 Flow Analytics</h3>
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>Note:</strong> This is demo data. In production, this would connect to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Real-time options data feeds (OPRA)</li>
            <li>Block trade detection algorithms</li>
            <li>Smart money flow identification</li>
            <li>Cross-exchange aggregation</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}