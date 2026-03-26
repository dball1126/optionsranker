import type { 
  ApiResponse, 
  UserNotification, 
  NotificationPreferences 
} from '@optionsranker/shared';
import { apiClient } from './client';

export const notificationsApi = {
  // Get user notifications
  async getNotifications(params?: { limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    return apiClient.get<ApiResponse<{
      notifications: UserNotification[];
      unreadCount: number;
      pagination: any;
    }>>(`/notifications?${searchParams}`);
  },

  // Get unread notification count
  async getUnreadCount() {
    return apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  },

  // Mark notification as read
  async markAsRead(notificationId: number) {
    return apiClient.patch<ApiResponse<{ message: string }>>(
      `/notifications/${notificationId}/read`
    );
  },

  // Mark all notifications as read
  async markAllAsRead() {
    return apiClient.patch<ApiResponse<{ updatedCount: number }>>(
      '/notifications/read-all'
    );
  },

  // Get notification preferences
  async getPreferences() {
    return apiClient.get<ApiResponse<NotificationPreferences>>('/notifications/preferences');
  },

  // Update notification preferences
  async updatePreferences(preferences: Partial<Pick<NotificationPreferences, 'emailNotifications' | 'browserNotifications' | 'signalThreshold'>>) {
    return apiClient.patch<ApiResponse<NotificationPreferences>>(
      '/notifications/preferences',
      preferences
    );
  },
};