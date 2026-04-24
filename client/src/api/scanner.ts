import type { ApiResponse, ScannerResponse } from '@optionsranker/shared';
import { apiClient } from './client';

export const scannerApi = {
  getScanner(sector?: string) {
    return apiClient.get<ApiResponse<ScannerResponse>>('/strategies/scan', sector ? { sector } : undefined);
  },
};

