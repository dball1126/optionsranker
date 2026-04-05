import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Bell, 
  BellRing, 
  Settings, 
  Target, 
  BookOpen, 
  AlertCircle,
  CheckCircle2,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Notification {
  id: number;
  signalId?: number;
  notificationType: 'signal' | 'educational' | 'system';
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  browserNotifications: boolean;
  signalThreshold: number;
}

// Notifications loaded from API — no hardcoded mock data

interface NotificationCenterProps {
  onUpgrade: () => void;
}

export function NotificationCenter({ onUpgrade }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    browserNotifications: true,
    signalThreshold: 70
  });
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check browser notification permission
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }

    // No notifications API yet — show empty state
    setNotifications([]);
    setLoading(false);
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      
      if (permission === 'granted') {
        // Send test notification
        new Notification('OptionsRanker Notifications Enabled!', {
          body: 'You\'ll now receive real-time signal alerts',
          icon: '/favicon.ico',
          tag: 'optionsranker-test'
        });
      }
    }
  };

  const sendTestNotification = () => {
    if (browserPermission === 'granted') {
      new Notification('🎯 Test Signal Alert', {
        body: 'NVDA: 85% confidence CALL signal detected',
        icon: '/favicon.ico',
        tag: 'optionsranker-test-signal'
      });
    }
  };

  const markAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, readAt: new Date().toISOString() }
          : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
    );
  };

  const getNotificationIcon = (type: string, isRead: boolean) => {
    const className = `h-5 w-5 ${isRead ? 'text-gray-400' : 'text-blue-500'}`;
    switch (type) {
      case 'signal': return <Target className={className} />;
      case 'educational': return <BookOpen className={className} />;
      case 'system': return <AlertCircle className={className} />;
      default: return <Bell className={className} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.readAt).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bell className="h-8 w-8 text-blue-600" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Notifications</h2>
            <p className="text-muted-foreground">
              Stay updated with signals, education, and system updates
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
          <div className="space-y-6">
            {/* Browser Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center space-x-2">
                  {browserPermission === 'granted' ? (
                    <Volume2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-gray-400" />
                  )}
                  <span>Browser Notifications</span>
                </h4>
                <p className="text-sm text-muted-foreground">
                  Get instant alerts for high-confidence signals
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {browserPermission === 'denied' && (
                  <span className="text-xs text-red-500">Blocked</span>
                )}
                {browserPermission === 'default' && (
                  <Button size="sm" onClick={requestNotificationPermission}>
                    Enable
                  </Button>
                )}
                {browserPermission === 'granted' && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <Button size="sm" variant="outline" onClick={sendTestNotification}>
                      Test
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Signal Threshold */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Signal Confidence Threshold: {preferences.signalThreshold}%
              </label>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={preferences.signalThreshold}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  signalThreshold: parseInt(e.target.value)
                }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>50% (All signals)</span>
                <span>95% (Only highest confidence)</span>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Email Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Daily summary and important updates
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    emailNotifications: e.target.checked
                  }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Upgrade Notice for Pro Features */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BellRing className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-semibold text-blue-900">
                Real-Time Signal Alerts
              </h4>
              <p className="text-sm text-blue-700">
                Upgrade to Pro for instant notifications when high-confidence signals trigger
              </p>
            </div>
          </div>
          <Button onClick={onUpgrade} className="bg-blue-600 hover:bg-blue-700">
            Upgrade
          </Button>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-600">No notifications yet</h3>
            <p className="text-sm text-muted-foreground">
              We'll notify you when new signals and updates are available
            </p>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`p-4 cursor-pointer transition-colors ${
                !notification.readAt 
                  ? 'border-blue-200 bg-blue-50/50' 
                  : 'border-gray-200'
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.notificationType, !!notification.readAt)}
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium ${
                      !notification.readAt ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {notification.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          notification.notificationType === 'signal' ? 'default' :
                          notification.notificationType === 'educational' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {notification.notificationType}
                      </Badge>
                      {!notification.readAt && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  <p className={`text-sm ${
                    !notification.readAt ? 'text-gray-700' : 'text-gray-500'
                  }`}>
                    {notification.message}
                  </p>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>

                {!notification.readAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Load More */}
      {notifications.length > 0 && (
        <div className="text-center">
          <Button variant="outline" size="sm">
            Load More Notifications
          </Button>
        </div>
      )}
    </div>
  );
}