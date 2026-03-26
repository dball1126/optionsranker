import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { TrendingUp, TrendingDown, DollarSign, Target, Trophy, BookOpen } from 'lucide-react';

interface PaperPortfolio {
  id: number;
  name: string;
  balance: number;
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  positions: PaperPosition[];
}

interface PaperPosition {
  id: number;
  symbol: string;
  type: 'CALL' | 'PUT';
  strike: number;
  expiry: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface PaperTradingDashboardProps {
  onUpgrade: () => void;
}

// Mock data generator
function generateMockPortfolio(): PaperPortfolio {
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'];
  const positions: PaperPosition[] = [];
  
  for (let i = 0; i < 5; i++) {
    const symbol = symbols[i];
    const type: 'CALL' | 'PUT' = Math.random() > 0.5 ? 'CALL' : 'PUT';
    const entryPrice = Math.random() * 20 + 5;
    const currentPrice = entryPrice * (0.8 + Math.random() * 0.4); // ±20% movement
    const quantity = Math.floor(Math.random() * 5) + 1;
    const pnl = (currentPrice - entryPrice) * quantity * 100;
    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

    positions.push({
      id: i + 1,
      symbol,
      type,
      strike: Math.round((150 + Math.random() * 200) / 5) * 5, // Strike prices in $5 increments
      expiry: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quantity,
      entryPrice,
      currentPrice,
      pnl,
      pnlPercent
    });
  }

  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalValue = 100000 + totalPnL;
  const totalPnLPercent = (totalPnL / 100000) * 100;

  return {
    id: 1,
    name: 'Paper Trading Portfolio',
    balance: Math.max(100000 - positions.reduce((sum, pos) => sum + pos.entryPrice * pos.quantity * 100, 0), 0),
    totalValue,
    totalPnL,
    totalPnLPercent,
    positions
  };
}

export function PaperTradingDashboard({ onUpgrade }: PaperTradingDashboardProps) {
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPortfolio(generateMockPortfolio());
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!portfolio) return null;

  const isProfit = portfolio.totalPnL >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">📝 Paper Trading Portfolio</h2>
          <p className="text-muted-foreground">
            Practice with $100,000 virtual money • Risk-free learning environment
          </p>
        </div>
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
          DEMO MODE
        </Badge>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
              <p className="text-2xl font-bold">
                ${portfolio.totalValue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <p className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : ''}${portfolio.totalPnL.toLocaleString()}
              </p>
            </div>
            {isProfit ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Return %</p>
              <p className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {isProfit ? '+' : ''}{portfolio.totalPnLPercent.toFixed(2)}%
              </p>
            </div>
            <Target className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Cash</p>
              <p className="text-2xl font-bold">
                ${portfolio.balance.toLocaleString()}
              </p>
            </div>
            <Trophy className="h-8 w-8 text-amber-500" />
          </div>
        </Card>
      </div>

      {/* Positions Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Open Positions</h3>
          <Button size="sm" variant="outline">
            + New Paper Trade
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Symbol</th>
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Strike</th>
                <th className="text-right py-2">Exp</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Entry</th>
                <th className="text-right py-2">Current</th>
                <th className="text-right py-2">P&L</th>
                <th className="text-right py-2">P&L %</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions.map((position) => (
                <tr key={position.id} className="border-b">
                  <td className="py-3 font-medium">{position.symbol}</td>
                  <td className="py-3">
                    <Badge 
                      variant={position.type === 'CALL' ? 'success' : 'destructive'}
                      className="text-xs"
                    >
                      {position.type}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">${position.strike}</td>
                  <td className="py-3 text-right text-sm text-muted-foreground">
                    {new Date(position.expiry).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">{position.quantity}</td>
                  <td className="py-3 text-right">${position.entryPrice.toFixed(2)}</td>
                  <td className="py-3 text-right">${position.currentPrice.toFixed(2)}</td>
                  <td className={`py-3 text-right font-medium ${
                    position.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toLocaleString()}
                  </td>
                  <td className={`py-3 text-right font-medium ${
                    position.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upgrade CTA */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Trophy className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-900">Ready for Real Trading?</h3>
              <p className="text-blue-700 mb-3">
                You've mastered paper trading! Upgrade to Pro for:
              </p>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• Real-time options data & signals</li>
                <li>• Advanced strategy analytics</li>
                <li>• Priority customer support</li>
              </ul>
            </div>
          </div>
          <div className="text-center">
            <Button onClick={onUpgrade} size="lg" className="bg-blue-600 hover:bg-blue-700">
              Upgrade to Pro
              <span className="ml-2 text-xs bg-blue-500 px-2 py-1 rounded">$29/mo</span>
            </Button>
            <p className="text-xs text-blue-600 mt-2">7-day free trial</p>
          </div>
        </div>
      </Card>

      {/* Learning Resources */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BookOpen className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold">Continue Learning</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Options Greeks</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Master Delta, Gamma, Theta, and Vega
            </p>
            <Button size="sm" variant="outline">Study Now</Button>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Risk Management</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Learn position sizing and stop losses
            </p>
            <Button size="sm" variant="outline">Learn More</Button>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Advanced Strategies</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Iron condors, butterflies, and more
            </p>
            <Button size="sm" variant="outline">Explore</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}