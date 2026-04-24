import type { ApiResponse, RankingMode, RankingResponse } from '@optionsranker/shared';
import { apiClient } from './client';

export const rankingsApi = {
  getRankings(symbol: string, mode: RankingMode = 'current') {
    return apiClient.get<ApiResponse<RankingResponse>>(`/strategies/rank/${symbol}?mode=${mode}`);
  },
};
