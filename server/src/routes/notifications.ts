import { Router } from 'express';
import type { Response } from 'express';
import { NotificationService } from '../services/notificationService.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const notifications = NotificationService.getUserNotifications(userId, limit, offset);
    const unreadCount = NotificationService.getUnreadNotificationCount(userId);
    
    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          limit,
          offset,
          hasMore: notifications.length === limit
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching notifications', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// Get unread notification count
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = NotificationService.getUnreadNotificationCount(userId);
    
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error('Error fetching unread count', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id as string);
    const userId = req.user!.id;
    
    const success = NotificationService.markNotificationAsRead(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const updatedCount = NotificationService.markAllNotificationsAsRead(userId);
    
    res.json({
      success: true,
      data: { updatedCount }
    });
  } catch (error) {
    logger.error('Error marking all notifications as read', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

// Get notification preferences
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let preferences = NotificationService.getNotificationPreferences(userId);
    
    if (!preferences) {
      preferences = NotificationService.createDefaultNotificationPreferences(userId);
    }
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error fetching notification preferences', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification preferences'
    });
  }
});

// Update notification preferences
router.patch('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = NotificationService.updateNotificationPreferences(userId, req.body);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error updating notification preferences', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences'
    });
  }
});

export default router;