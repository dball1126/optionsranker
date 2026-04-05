import type { ApiResponse, RankingResponse } from '@optionsranker/shared';
import { apiClient } from './client';

export const rankingsApi = {
  getRankings(symbol: string) {
    return apiClient.get<ApiResponse<RankingResponse>>(`/strategies/rank/${symbol}`);
  },
};
