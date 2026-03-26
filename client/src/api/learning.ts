import type {
  ApiResponse,
  LearningModule,
  LearningProgress,
  UserLearningOverview,
} from '@optionsranker/shared';
import { apiClient } from './client';

export const learningApi = {
  getModules() {
    return apiClient.get<ApiResponse<LearningModule[]>>('/learning/modules');
  },

  getModule(slug: string) {
    return apiClient.get<ApiResponse<LearningModule>>(`/learning/modules/${slug}`);
  },

  getProgress() {
    return apiClient.get<ApiResponse<UserLearningOverview>>('/learning/progress');
  },

  updateProgress(moduleId: number, data: { status: string; quizScore?: number }) {
    return apiClient.put<ApiResponse<LearningProgress>>(`/learning/progress/${moduleId}`, data);
  },
};
