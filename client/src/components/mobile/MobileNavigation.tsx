import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  TrendingUp, 
  BookOpen, 
  BarChart3, 
  Wallet, 
  Search,
  Menu,
  X,
  Bell,
  User
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const logout = useAuthStore(s => s.logout);
  const isPro = useSubscriptionStore(s => s.isPro);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/market', icon: Search, label: 'Market' },
    { path: '/scanner', icon: TrendingUp, label: 'Scanner' },
    { path: '/strategy-builder', icon: BarChart3, label: 'Strategies' },
    { path: '/portfolio', icon: Wallet, label: 'Portfolio' },
    { path: '/education', icon: BookOpen, label: 'Learn' },
    { path: '/flow', icon: TrendingUp, label: 'Flow' },
  ];

  const isActivePath = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/' && location.pathname === '/dashboard') return true;
    return location.pathname.startsWith(path) && path !== '/';
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="font-bold text-lg text-blue-600">
              OptionsRanker
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isAuthenticated && (
              <>
                <Badge 
                  variant={isPro() ? "success" : "secondary"}
                  className="text-xs px-2 py-1"
                >
                  {isPro() ? 'PRO' : 'FREE'}
                </Badge>
                <Button variant="ghost" size="sm" className="p-2">
                  <Bell className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative flex flex-col w-64 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-bold text-lg text-blue-600">
                OptionsRanker
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* User Info */}
            {isAuthenticated && user && (
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{user.displayName || user.username}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <Badge 
                      variant={isPro() ? "success" : "secondary"}
                      className="text-xs mt-1"
                    >
                      {isPro() ? '⭐ Pro Member' : '🆓 Free Account'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <div className="space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `
                      flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors
                      ${isActivePath(item.path) || isActive
                        ? 'bg-blue-100 text-blue-700 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t">
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start"
                >
                  Logout
                </Button>
              ) : (
                <div className="space-y-2">
                  <NavLink
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="block"
                  >
                    <Button size="sm" className="w-full">
                      Login
                    </Button>
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="block"
                  >
                    <Button size="sm" variant="outline" className="w-full">
                      Register
                    </Button>
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-lg">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors
                ${isActivePath(item.path) || isActive
                  ? 'text-blue-600' 
                  : 'text-gray-500'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Mobile content padding */}
      <div className="lg:hidden h-14" /> {/* Top spacing */}
      <div className="lg:hidden h-16" /> {/* Bottom spacing */}
    </>
  );
}
