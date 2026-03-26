import type { ApiResponse, Signal, SignalPerformance } from '@optionsranker/shared';
import { apiClient } from './client';

export const signalsApi = {
  // Get all signals
  async getSignals(params?: { limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    return apiClient.get<ApiResponse<{ signals: Signal[]; pagination: any }>>(
      `/signals?${searchParams}`
    );
  },

  // Get high confidence signals
  async getHighConfidenceSignals(params?: { threshold?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.threshold) searchParams.set('threshold', params.threshold.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    return apiClient.get<ApiResponse<Signal[]>>(
      `/signals/high-confidence?${searchParams}`
    );
  },

  // Get signal performance metrics
  async getPerformance() {
    return apiClient.get<ApiResponse<SignalPerformance>>('/signals/performance');
  },

  // Generate mock signals (dev only)
  async generateMockSignals() {
    return apiClient.post<ApiResponse<{ message: string }>>('/signals/mock');
  },
};