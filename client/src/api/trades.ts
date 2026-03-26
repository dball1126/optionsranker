import type {
  ApiResponse,
  PaginatedResponse,
  Trade,
  CreateTradeRequest,
  CloseTradeRequest,
} from '@optionsranker/shared';
import { apiClient } from './client';

export const tradesApi = {
  list(params?: { portfolioId?: number; status?: string; page?: number; limit?: number }) {
    return apiClient.get<PaginatedResponse<Trade>>('/trades', params as Record<string, string | number | undefined>);
  },

  create(data: CreateTradeRequest) {
    return apiClient.post<ApiResponse<Trade>>('/trades', data);
  },

  close(id: number, data: CloseTradeRequest) {
    return apiClient.put<ApiResponse<Trade>>(`/trades/${id}/close`, data);
  },

  remove(id: number) {
    return apiClient.del<ApiResponse<null>>(`/trades/${id}`);
  },
};
