import type {
  ApiResponse,
  StrategyAnalysisRequest,
  StrategyAnalysisResponse,
  StrategyTemplate,
} from '@optionsranker/shared';
import { apiClient } from './client';

export const strategiesApi = {
  analyze(data: StrategyAnalysisRequest) {
    return apiClient.post<ApiResponse<StrategyAnalysisResponse>>('/strategies/analyze', data);
  },

  getTemplates() {
    return apiClient.get<ApiResponse<StrategyTemplate[]>>('/strategies/templates');
  },
};
