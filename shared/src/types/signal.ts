export interface Signal {
  id: number;
  symbol: string;
  signalType: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  suggestedStrike: number | null;
  suggestedExpiry: string | null;
  suggestedDirection: 'call' | 'put';
  targetPrice: number | null;
  stopLoss: number | null;
  createdAt: string;
  resolvedAt: string | null;
  outcome: 'win' | 'loss' | 'breakeven' | null;
  pnlPercent: number | null;
  notes: string | null;
}

export interface SignalPerformance {
  totalSignals: number;
  winRate: number;
  avgPnL: number;
  avgWinPnL: number;
  avgLossPnL: number;
  highConfidenceWinRate: number; // signals >= 80 confidence
  weeklySignals: number;
  monthlySignals: number;
}

export interface CreateSignalRequest {
  symbol: string;
  signalType: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  suggestedStrike?: number;
  suggestedExpiry?: string;
  suggestedDirection: 'call' | 'put';
  targetPrice?: number;
  stopLoss?: number;
  notes?: string;
}

export interface ResolveSignalRequest {
  outcome: 'win' | 'loss' | 'breakeven';
  pnlPercent: number;
  notes?: string;
}

export interface NotificationPreferences {
  id: number;
  userId: number;
  emailNotifications: boolean;
  browserNotifications: boolean;
  signalThreshold: number; // minimum confidence level for notifications
  createdAt: string;
  updatedAt: string;
}

export interface UserNotification {
  id: number;
  userId: number;
  signalId: number | null;
  notificationType: 'signal' | 'educational' | 'system';
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface CreateNotificationRequest {
  userId: number;
  signalId?: number;
  notificationType: 'signal' | 'educational' | 'system';
  title: string;
  message: string;
}