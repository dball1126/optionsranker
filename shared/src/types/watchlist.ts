export interface Watchlist {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
}

export interface WatchlistItem {
  id: number;
  watchlistId: number;
  symbol: string;
  addedAt: string;
  notes: string | null;
}

export interface WatchlistWithItems extends Watchlist {
  items: WatchlistItem[];
}

export interface CreateWatchlistRequest {
  name: string;
}

export interface AddWatchlistItemRequest {
  symbol: string;
  notes?: string;
}
