import type { 
  NotificationPreferences, 
  UserNotification, 
  CreateNotificationRequest 
} from '@optionsranker/shared';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';

export class NotificationService {
  static getUserNotifications(userId: number, limit: number = 20, offset: number = 0): UserNotification[] {
    const db = getDb();
    
    const stmt = db.prepare(`
      SELECT 
        id, user_id as userId, signal_id as signalId,
        notification_type as notificationType, title, message,
        read_at as readAt, created_at as createdAt
      FROM user_notifications 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(userId, limit, offset) as UserNotification[];
  }

  static getUnreadNotificationCount(userId: number): number {
    const db = getDb();
    
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_notifications 
      WHERE user_id = ? AND read_at IS NULL
    `);
    
    const result = stmt.get(userId) as any;
    return result.count || 0;
  }

  static markNotificationAsRead(notificationId: number, userId: number): boolean {
    const db = getDb();
    
    const stmt = db.prepare(`
      UPDATE user_notifications 
      SET read_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    
    const info = stmt.run(notificationId, userId);
    return info.changes > 0;
  }

  static markAllNotificationsAsRead(userId: number): number {
    const db = getDb();
    
    const stmt = db.prepare(`
      UPDATE user_notifications 
      SET read_at = datetime('now')
      WHERE user_id = ? AND read_at IS NULL
    `);
    
    const info = stmt.run(userId);
    return info.changes;
  }

  static createNotification(data: CreateNotificationRequest): UserNotification {
    const db = getDb();
    
    const stmt = db.prepare(`
      INSERT INTO user_notifications (
        user_id, signal_id, notification_type, title, message
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      data.userId,
      data.signalId || null,
      data.notificationType,
      data.title,
      data.message
    );
    
    return this.getNotificationById(info.lastInsertRowid as number)!;
  }

  private static getNotificationById(id: number): UserNotification | null {
    const db = getDb();
    
    const stmt = db.prepare(`
      SELECT 
        id, user_id as userId, signal_id as signalId,
        notification_type as notificationType, title, message,
        read_at as readAt, created_at as createdAt
      FROM user_notifications 
      WHERE id = ?
    `);
    
    return stmt.get(id) as UserNotification | undefined || null;
  }

  static getNotificationPreferences(userId: number): NotificationPreferences | null {
    const db = getDb();
    
    const stmt = db.prepare(`
      SELECT 
        id, user_id as userId, email_notifications as emailNotifications,
        browser_notifications as browserNotifications, signal_threshold as signalThreshold,
        created_at as createdAt, updated_at as updatedAt
      FROM notification_preferences 
      WHERE user_id = ?
    `);
    
    return stmt.get(userId) as NotificationPreferences | undefined || null;
  }

  static createDefaultNotificationPreferences(userId: number): NotificationPreferences {
    const db = getDb();
    
    const stmt = db.prepare(`
      INSERT INTO notification_preferences (
        user_id, email_notifications, browser_notifications, signal_threshold
      ) VALUES (?, 1, 1, 70)
    `);
    
    const info = stmt.run(userId);
    return this.getNotificationPreferences(userId)!;
  }

  static updateNotificationPreferences(
    userId: number, 
    preferences: Partial<Pick<NotificationPreferences, 'emailNotifications' | 'browserNotifications' | 'signalThreshold'>>
  ): NotificationPreferences {
    const db = getDb();
    
    // Get current preferences
    let current = this.getNotificationPreferences(userId);
    if (!current) {
      current = this.createDefaultNotificationPreferences(userId);
    }

    const stmt = db.prepare(`
      UPDATE notification_preferences 
      SET email_notifications = ?, browser_notifications = ?, signal_threshold = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `);
    
    stmt.run(
      preferences.emailNotifications ?? current.emailNotifications,
      preferences.browserNotifications ?? current.browserNotifications,
      preferences.signalThreshold ?? current.signalThreshold,
      userId
    );
    
    return this.getNotificationPreferences(userId)!;
  }

  // Broadcast high-confidence signals to eligible users
  static broadcastSignalNotification(signalId: number, signal: any): void {
    const db = getDb();
    
    // Get users who should receive this notification based on their preferences
    const stmt = db.prepare(`
      SELECT u.id, u.email, u.tier, np.signal_threshold, np.email_notifications, np.browser_notifications
      FROM users u
      LEFT JOIN notification_preferences np ON u.id = np.user_id
      WHERE 
        (np.signal_threshold IS NULL AND ? >= 70) OR 
        (np.signal_threshold IS NOT NULL AND ? >= np.signal_threshold)
        AND (np.browser_notifications = 1 OR np.browser_notifications IS NULL)
    `);
    
    const eligibleUsers = stmt.all(signal.confidence, signal.confidence) as any[];
    
    eligibleUsers.forEach(user => {
      const title = `🎯 High-Confidence ${signal.signalType.toUpperCase()} Signal`;
      const message = `${signal.symbol}: ${signal.confidence}% confidence ${signal.suggestedDirection} signal detected`;
      
      this.createNotification({
        userId: user.id,
        signalId,
        notificationType: 'signal',
        title,
        message
      });
    });
    
    logger.info(`Signal notification sent to ${eligibleUsers.length} users`);
  }

  // Send educational content notifications
  static sendEducationalNotification(userId: number, title: string, message: string): UserNotification {
    return this.createNotification({
      userId,
      notificationType: 'educational',
      title,
      message
    });
  }

  // Send system notifications (upgrades, maintenance, etc.)
  static sendSystemNotification(userId: number, title: string, message: string): UserNotification {
    return this.createNotification({
      userId,
      notificationType: 'system',
      title,
      message
    });
  }
}