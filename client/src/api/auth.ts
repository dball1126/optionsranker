import type { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '@optionsranker/shared';
import { apiClient } from './client';

export const authApi = {
  login(data: LoginRequest) {
    return apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
  },

  register(data: RegisterRequest) {
    return apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
  },

  refreshTokens(refreshToken: string) {
    return apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken });
  },

  logout() {
    return apiClient.post<ApiResponse<null>>('/auth/logout');
  },
};
