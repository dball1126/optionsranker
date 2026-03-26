import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Star, 
  ArrowRight, 
  Target,
  DollarSign,
  Calendar,
  BarChart3
} from 'lucide-react';

interface MobileSignalCardProps {
  signal: {
    id: number;
    symbol: string;
    signalType: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    suggestedDirection: 'call' | 'put';
    suggestedStrike?: number;
    suggestedExpiry?: string;
    targetPrice?: number;
    currentPrice: number;
    timeRemaining: string;
    priceChange: number;
    priceChangePercent: number;
  };
  onViewDetails: (signalId: number) => void;
  onTrade: (signal: any) => void;
  compact?: boolean;
}

export function MobileSignalCard({ 
  signal, 
  onViewDetails, 
  onTrade, 
  compact = false 
}: MobileSignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const isProfit = signal.priceChange >= 0;
  const isHighConfidence = signal.confidence >= 80;
  
  const getSignalColor = () => {
    switch (signal.signalType) {
      case 'bullish': return 'text-green-600 bg-green-50 border-green-200';
      case 'bearish': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getSignalIcon = () => {
    switch (signal.signalType) {
      case 'bullish': return <TrendingUp className="h-4 w-4" />;
      case 'bearish': return <TrendingDown className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <Card className="p-4 relative overflow-hidden">
      {/* High Confidence Badge */}
      {isHighConfidence && (
        <div className="absolute top-2 right-2">
          <Star className="h-4 w-4 text-yellow-500 fill-current" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-xl font-bold">{signal.symbol}</div>
          <Badge className={`${getSignalColor()} text-xs px-2 py-1 flex items-center space-x-1`}>
            {getSignalIcon()}
            <span>{signal.signalType.toUpperCase()}</span>
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">${signal.currentPrice}</div>
          <div className={`text-sm ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            {isProfit ? '+' : ''}{signal.priceChangePercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-medium">{signal.confidence}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              signal.confidence >= 80 ? 'bg-green-500' :
              signal.confidence >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${signal.confidence}%` }}
          ></div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-muted-foreground">Direction</div>
          <div className="font-medium mt-1">
            <Badge variant={signal.suggestedDirection === 'call' ? 'success' : 'destructive'}>
              {signal.suggestedDirection.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        {signal.suggestedStrike && (
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-muted-foreground">Strike</div>
            <div className="font-medium mt-1">${signal.suggestedStrike}</div>
          </div>
        )}
        
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-muted-foreground">Time Left</div>
          <div className="font-medium mt-1 flex items-center justify-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{signal.timeRemaining}</span>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {expanded && !compact && (
        <div className="border-t pt-3 mb-3 space-y-3">
          {signal.suggestedExpiry && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Expiry</span>
              </span>
              <span className="font-medium">
                {new Date(signal.suggestedExpiry).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {signal.targetPrice && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center space-x-1">
                <Target className="h-4 w-4" />
                <span>Target</span>
              </span>
              <span className="font-medium text-green-600">${signal.targetPrice}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center space-x-1">
              <DollarSign className="h-4 w-4" />
              <span>Potential</span>
            </span>
            <span className="font-medium text-green-600">
              +{((signal.targetPrice || signal.currentPrice * 1.2) - signal.currentPrice).toFixed(2)} 
              ({(((signal.targetPrice || signal.currentPrice * 1.2) / signal.currentPrice - 1) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpanded(!expanded)}
          className="flex-1"
        >
          {expanded ? 'Less' : 'Details'}
          <ArrowRight className={`h-3 w-3 ml-1 transform transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </Button>
        
        <Button
          size="sm"
          onClick={() => onTrade(signal)}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          Paper Trade
        </Button>
      </div>

      {/* Upgrade CTA for high confidence signals */}
      {isHighConfidence && (
        <div className="mt-3 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded text-xs">
          <div className="flex items-center justify-between">
            <span className="text-yellow-800">⭐ High-confidence signal!</span>
            <Button size="sm" variant="ghost" className="text-xs h-6 px-2 text-yellow-700">
              Upgrade for real trades
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}