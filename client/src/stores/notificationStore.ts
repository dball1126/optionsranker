import { create } from 'zustand';
import type { UserNotification, NotificationPreferences } from '@optionsranker/shared';
import { notificationsApi } from '@/api/notifications';

interface NotificationState {
  notifications: UserNotification[];
  preferences: NotificationPreferences | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNotifications: (params?: { limit?: number; offset?: number }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<Pick<NotificationPreferences, 'emailNotifications' | 'browserNotifications' | 'signalThreshold'>>) => Promise<void>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  preferences: null,
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationsApi.getNotifications(params);
      set({ 
        notifications: response.data.notifications,
        unreadCount: response.data.unreadCount,
        isLoading: false 
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch notifications',
        isLoading: false 
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      set({ unreadCount: response.data.count });
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      
      // Update local state
      set(state => ({
        notifications: state.notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, readAt: new Date().toISOString() }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to mark notification as read'
      });
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await notificationsApi.markAllAsRead();
      
      // Update local state
      const now = new Date().toISOString();
      set(state => ({
        notifications: state.notifications.map(notification => ({
          ...notification,
          readAt: notification.readAt || now
        })),
        unreadCount: 0
      }));
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to mark all notifications as read'
      });
    }
  },

  fetchPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationsApi.getPreferences();
      set({ 
        preferences: response.data,
        isLoading: false 
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to fetch preferences',
        isLoading: false 
      });
    }
  },

  updatePreferences: async (newPreferences) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationsApi.updatePreferences(newPreferences);
      set({ 
        preferences: response.data,
        isLoading: false 
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to update preferences',
        isLoading: false 
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));