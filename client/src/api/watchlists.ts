import type {
  ApiResponse,
  Watchlist,
  WatchlistWithItems,
  CreateWatchlistRequest,
  AddWatchlistItemRequest,
} from '@optionsranker/shared';
import { apiClient } from './client';

export const watchlistsApi = {
  list() {
    return apiClient.get<ApiResponse<WatchlistWithItems[]>>('/watchlists');
  },

  create(data: CreateWatchlistRequest) {
    return apiClient.post<ApiResponse<Watchlist>>('/watchlists', data);
  },

  remove(id: number) {
    return apiClient.del<ApiResponse<null>>(`/watchlists/${id}`);
  },

  addItem(watchlistId: number, data: AddWatchlistItemRequest) {
    return apiClient.post<ApiResponse<WatchlistWithItems>>(`/watchlists/${watchlistId}/items`, data);
  },

  removeItem(watchlistId: number, itemId: number) {
    return apiClient.del<ApiResponse<null>>(`/watchlists/${watchlistId}/items/${itemId}`);
  },
};
