import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, LogIn } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useMarketStore } from '@/stores/marketStore';
import { cn } from '@/lib/utils';

export function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const { searchSymbols, searchResults, clearSearch } = useMarketStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAuthenticated = !!accessToken;

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.length >= 1) {
        searchSymbols(query);
        setShowDropdown(true);
      } else {
        clearSearch();
        setShowDropdown(false);
      }
    },
    [searchSymbols, clearSearch],
  );

  const handleSelectSymbol = (symbol: string) => {
    setSearchQuery('');
    setShowDropdown(false);
    clearSearch();
    navigate(`/market?symbol=${symbol}`);
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-700/50 flex items-center justify-between px-6">
      {/* Search bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search symbols..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchQuery && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent"
        />

        {/* Search dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.symbol}
                onClick={() => handleSelectSymbol(result.symbol)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-700/50 transition-colors"
              >
                <span className="font-medium text-slate-100">{result.symbol}</span>
                <span className="text-slate-400 truncate ml-2">{result.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 ml-4">
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                <User className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="hidden md:inline">{user?.displayName || user?.username || 'User'}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl z-50">
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                    navigate('/');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
