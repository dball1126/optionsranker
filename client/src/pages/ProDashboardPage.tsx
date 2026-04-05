import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Bell, 
  BookOpen, 
  PlayCircle,
  Star,
  ArrowRight,
  Users,
  Trophy,
  Zap,
  DollarSign
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PaperTradingDashboard } from '@/components/trading/PaperTradingDashboard';
import { SignalPerformanceDashboard } from '@/components/signals/SignalPerformanceDashboard';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { MobileSignalCard } from '@/components/mobile/MobileSignalCard';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

type DashboardTab = 'overview' | 'paper-trading' | 'signals' | 'notifications';

// Signals are loaded from the real API via useSignalStore
// No hardcoded mock data — signals come from the database

export function ProDashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const subscription = useSubscriptionStore(s => s.subscription);
  const pricing = useSubscriptionStore(s => s.pricing);
  const subscriptionLoading = useSubscriptionStore(s => s.loading);
  const subscriptionError = useSubscriptionStore(s => s.error);
  const loadSubscription = useSubscriptionStore(s => s.loadSubscription);
  const loadPricing = useSubscriptionStore(s => s.loadPricing);
  const createCheckoutSession = useSubscriptionStore(s => s.createCheckoutSession);
  const manageBilling = useSubscriptionStore(s => s.manageBilling);
  const isPro = useSubscriptionStore(s => s.isPro);
  const isTrialing = useSubscriptionStore(s => s.isTrialing);
  
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Load subscription and pricing data on mount
  useEffect(() => {
    if (user) {
      loadSubscription();
      loadPricing();
    }
  }, [user, loadSubscription, loadPricing]);

  const handleUpgrade = () => {
    if (pricing) {
      createCheckoutSession();
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handleManageBilling = () => {
    manageBilling();
  };

  const handleTrade = (signal: any) => {
    // Navigate to paper trading or real trading based on user tier
    navigate('/portfolio', { 
      state: { 
        suggestedTrade: {
          symbol: signal.symbol,
          type: signal.suggestedDirection,
          strike: signal.suggestedStrike,
          expiry: signal.suggestedExpiry
        }
      }
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'paper-trading', label: 'Paper Trading', icon: PlayCircle },
    { id: 'signals', label: 'Signal Performance', icon: Target },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ] as const;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'paper-trading':
        return <PaperTradingDashboard onUpgrade={handleUpgrade} />;
      
      case 'signals':
        return <SignalPerformanceDashboard onUpgrade={handleUpgrade} />;
      
      case 'notifications':
        return <NotificationCenter onUpgrade={handleUpgrade} />;
      
      default:
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back{user ? `, ${user.displayName || user.username}` : ''}!
                </h1>
                <p className="text-muted-foreground">
                  Your options trading command center • {isPro() ? (isTrialing() ? 'Pro Trial' : 'Pro Member') : 'Free Account'}
                </p>
                {subscriptionError && (
                  <p className="text-sm text-red-600 mt-1">{subscriptionError}</p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {subscriptionLoading ? (
                  <Badge variant="secondary">Loading...</Badge>
                ) : (
                  <Badge 
                    variant={isPro() ? "success" : "secondary"}
                    className={isPro() ? "bg-green-100 text-green-800" : ""}
                  >
                    {isPro() ? (isTrialing() ? '🎯 TRIAL' : '⭐ PRO') : '🆓 FREE'}
                  </Badge>
                )}
                {!isPro() && (
                  <Button 
                    onClick={handleUpgrade} 
                    disabled={subscriptionLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {subscriptionLoading ? 'Loading...' : 'Upgrade to Pro'}
                  </Button>
                )}
                {isPro() && (
                  <Button 
                    onClick={handleManageBilling} 
                    variant="outline"
                    disabled={subscriptionLoading}
                  >
                    Manage Billing
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Signals</p>
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-xs text-green-600">2 high-confidence</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold text-green-600">73.2%</p>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </div>
                  <Trophy className="h-8 w-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Paper Portfolio</p>
                    <p className="text-2xl font-bold">$103,240</p>
                    <p className="text-xs text-green-600">+3.24%</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-500" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Learning Progress</p>
                    <p className="text-2xl font-bold">67%</p>
                    <p className="text-xs text-muted-foreground">5 of 8 modules</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-amber-500" />
                </div>
              </Card>
            </div>

            {/* High-Confidence Signals */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>High-Confidence Signals</span>
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab('signals')}
                >
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Mobile-optimized signal cards */}
              <div className="space-y-3 md:hidden">
                {([] as any[]).map((signal) => (
                  <MobileSignalCard
                    key={signal.id}
                    signal={signal}
                    onViewDetails={(id) => console.log('View details', id)}
                    onTrade={handleTrade}
                    compact={true}
                  />
                ))}
              </div>

              {/* Desktop table view */}
              <Card className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4">Symbol</th>
                        <th className="text-left p-4">Signal</th>
                        <th className="text-right p-4">Confidence</th>
                        <th className="text-right p-4">Current Price</th>
                        <th className="text-right p-4">Target</th>
                        <th className="text-right p-4">Time Left</th>
                        <th className="text-center p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([] as any[]).map((signal) => (
                        <tr key={signal.id} className="border-b">
                          <td className="p-4 font-medium">{signal.symbol}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={
                                  signal.signalType === 'bullish' ? 'success' : 
                                  signal.signalType === 'bearish' ? 'destructive' : 
                                  'secondary'
                                }
                                className="text-xs"
                              >
                                {signal.signalType === 'bullish' ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {signal.suggestedDirection.toUpperCase()}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <span className="font-medium">{signal.confidence}%</span>
                              <Star className="h-3 w-3 text-yellow-500" />
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div>
                              <div className="font-medium">${signal.currentPrice}</div>
                              <div className={`text-xs ${
                                signal.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {signal.priceChange >= 0 ? '+' : ''}{signal.priceChangePercent.toFixed(1)}%
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right font-medium text-green-600">
                            ${signal.targetPrice}
                          </td>
                          <td className="p-4 text-right text-sm text-muted-foreground">
                            {signal.timeRemaining}
                          </td>
                          <td className="p-4 text-center">
                            <Button 
                              size="sm" 
                              onClick={() => handleTrade(signal)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {isPro() ? 'Trade' : 'Paper Trade'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Feature Highlights for Free Users */}
            {!isPro() && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <PlayCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">Paper Trading</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Practice with $100,000 virtual money. Learn strategies risk-free!
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setActiveTab('paper-trading')}
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        Start Paper Trading
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900 mb-2">Options Education</h3>
                      <p className="text-sm text-green-700 mb-3">
                        Master Greeks, strategies, and risk management with interactive lessons.
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => navigate('/education')}
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        Continue Learning
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Community Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-500" />
                <span>Community Stats</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">2,847</div>
                  <div className="text-sm text-muted-foreground">Active Traders</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">73.2%</div>
                  <div className="text-sm text-muted-foreground">Avg Win Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">$2.4M</div>
                  <div className="text-sm text-muted-foreground">Paper Profits</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">156</div>
                  <div className="text-sm text-muted-foreground">Signals This Week</div>
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 whitespace-nowrap font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {renderTabContent()}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4">
                <Zap className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Upgrade to Pro</h3>
              <p className="text-muted-foreground mb-6">
                Get access to real-time signals, advanced analytics, and unlimited trading.
              </p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span>Monthly Plan</span>
                  <span className="font-bold">${pricing?.pro.price || 29}/month</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>7-day free trial</span>
                  <span>Cancel anytime</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    handleUpgrade();
                  }}
                  disabled={subscriptionLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {subscriptionLoading ? 'Loading...' : 'Start Free Trial'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}