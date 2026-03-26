import type {
  ApiResponse,
  Portfolio,
  PortfolioSummary,
  CreatePortfolioRequest,
} from '@optionsranker/shared';
import { apiClient } from './client';

export const portfoliosApi = {
  list() {
    return apiClient.get<ApiResponse<PortfolioSummary[]>>('/portfolios');
  },

  getById(id: number) {
    return apiClient.get<ApiResponse<PortfolioSummary>>(`/portfolios/${id}`);
  },

  create(data: CreatePortfolioRequest) {
    return apiClient.post<ApiResponse<Portfolio>>('/portfolios', data);
  },

  update(id: number, data: Partial<CreatePortfolioRequest>) {
    return apiClient.put<ApiResponse<Portfolio>>(`/portfolios/${id}`, data);
  },

  remove(id: number) {
    return apiClient.del<ApiResponse<null>>(`/portfolios/${id}`);
  },
};
