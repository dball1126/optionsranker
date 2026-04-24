import { useState, useEffect } from 'react';
import { Plus, X, Eye } from 'lucide-react';
import type { WatchlistWithItems } from '@optionsranker/shared';
import { watchlistsApi } from '@/api/watchlists';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

interface WatchlistPanelProps {
  onSelectSymbol?: (symbol: string) => void;
}

export function WatchlistPanel({ onSelectSymbol }: WatchlistPanelProps) {
  const [watchlists, setWatchlists] = useState<WatchlistWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const fetchWatchlists = async () => {
    if (!localStorage.getItem('accessToken')) {
      setWatchlists([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await watchlistsApi.list();
      setWatchlists(response.data);
    } catch {
      // Silently fail for unauthenticated users
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlists();
  }, []);

  const handleAddSymbol = async () => {
    if (!newSymbol.trim() || watchlists.length === 0) return;
    try {
      await watchlistsApi.addItem(watchlists[0].id, { symbol: newSymbol.toUpperCase() });
      setNewSymbol('');
      setShowAddInput(false);
      fetchWatchlists();
    } catch {
      // Handle error silently
    }
  };

  const handleRemoveItem = async (watchlistId: number, itemId: number) => {
    try {
      await watchlistsApi.removeItem(watchlistId, itemId);
      fetchWatchlists();
    } catch {
      // Handle error silently
    }
  };

  const activeWatchlist = watchlists[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-100">Watchlist</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddInput(!showAddInput)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardBody className="p-0">
        {showAddInput && (
          <div className="flex gap-2 p-3 border-b border-slate-700/50">
            <Input
              placeholder="Symbol"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddSymbol}>
              Add
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
        )}

        {!isLoading && (!activeWatchlist || activeWatchlist.items.length === 0) && (
          <div className="p-4 text-center text-slate-500 text-sm">
            No symbols in watchlist
          </div>
        )}

        {activeWatchlist?.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-0"
          >
            <button
              onClick={() => onSelectSymbol?.(item.symbol)}
              className="text-sm font-medium text-slate-100 hover:text-emerald-400 transition-colors"
            >
              {item.symbol}
            </button>
            <button
              onClick={() => handleRemoveItem(activeWatchlist.id, item.id)}
              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
