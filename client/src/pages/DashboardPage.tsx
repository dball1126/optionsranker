import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, GraduationCap, Briefcase, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MarketOverview } from '@/components/market/MarketOverview';
import { useAuthStore } from '@/stores/authStore';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

const quickActions = [
  {
    to: '/strategy-builder',
    icon: Wrench,
    label: 'Strategy Builder',
    description: 'Analyze options strategies with P&L diagrams',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    to: '/education',
    icon: GraduationCap,
    label: 'Learn Options',
    description: 'Interactive lessons on Greeks, strategies, and risk',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    to: '/portfolio',
    icon: Briefcase,
    label: 'Portfolio',
    description: 'Track your trades and monitor performance',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    to: '/market',
    icon: TrendingUp,
    label: 'Market Data',
    description: 'View quotes, options chains, and analysis',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { trades, fetchTrades } = usePortfolioStore();
  const isAuthenticated = !!accessToken;

  useEffect(() => {
    if (isAuthenticated) {
      fetchTrades({ status: 'open' });
    }
  }, [isAuthenticated]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          {user ? `Welcome back, ${user.displayName || user.username}` : 'Welcome to OptionsRanker'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Your options analysis and learning platform
        </p>
      </div>

      {/* Market overview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">Market Overview</h2>
          <Link
            to="/market"
            className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <MarketOverview />
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(({ to, icon: Icon, label, description, color, bg, border }) => (
            <Link key={to} to={to}>
              <Card className={cn('h-full hover:bg-slate-700/50 transition-all duration-200 border', border)}>
                <CardBody className="space-y-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
                    <Icon className={cn('h-5 w-5', color)} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{label}</h3>
                    <p className="text-xs text-slate-400 mt-1">{description}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent trades (if authenticated) */}
      {isAuthenticated && trades.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">Recent Open Positions</h2>
            <Link
              to="/portfolio"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              View Portfolio <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Card>
            <CardBody className="p-0">
              <div className="divide-y divide-slate-700/50">
                {trades.slice(0, 5).map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-100">{trade.symbol}</span>
                      <Badge variant={trade.optionType === 'call' ? 'profit' : trade.optionType === 'put' ? 'loss' : 'neutral'}>
                        {trade.optionType}
                      </Badge>
                      <span className={cn(
                        'text-xs',
                        trade.direction === 'buy' ? 'text-emerald-400' : 'text-rose-400',
                      )}>
                        {trade.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-300">{formatCurrency(trade.entryPrice)}</span>
                      <span className="text-xs text-slate-500">{formatDate(trade.openedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </section>
      )}
    </div>
  );
}
