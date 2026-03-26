import type { 
  Signal, 
  SignalPerformance, 
  CreateSignalRequest, 
  ResolveSignalRequest 
} from '@optionsranker/shared';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';

export class SignalService {
  static createSignal(data: CreateSignalRequest): Signal {
    const db = getDb();
    
    const stmt = db.prepare(`
      INSERT INTO paper_signals (
        symbol, signal_type, confidence, suggested_strike, suggested_expiry,
        suggested_direction, target_price, stop_loss, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      data.symbol,
      data.signalType,
      data.confidence,
      data.suggestedStrike || null,
      data.suggestedExpiry || null,
      data.suggestedDirection,
      data.targetPrice || null,
      data.stopLoss || null,
      data.notes || null
    );
    
    return this.getSignalById(info.lastInsertRowid as number)!;
  }

  static getSignalById(id: number): Signal | null {
    const db = getDb();
    
    const stmt = db.prepare(`
      SELECT 
        id, symbol, signal_type as signalType, confidence,
        suggested_strike as suggestedStrike, suggested_expiry as suggestedExpiry,
        suggested_direction as suggestedDirection, target_price as targetPrice,
        stop_loss as stopLoss, created_at as createdAt, resolved_at as resolvedAt,
        outcome, pnl_percent as pnlPercent, notes
      FROM paper_signals 
      WHERE id = ?
    `);
    
    return stmt.get(id) as Signal | undefined || null;
  }

  static getSignals(limit: number = 50, offset: number = 0): Signal[] {
    const db = getDb();
    
    const stmt = db.prepare(`
      SELECT 
        id, symbol, signal_type as signalType, confidence,
        suggested_strike as suggestedStrike, suggested_expiry as suggestedExpiry,
        suggested_direction as suggestedDirection, target_price as targetPrice,
        stop_loss as stopLoss, created_at as createdAt, resolved_at as resolvedAt,
        outcome, pnl_percent as pnlPercent, notes
      FROM paper_signals 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(limit, offset) as Signal[];
  }

  static getHighConfidenceSignals(threshold: number = 80, limit: number = 10): Signal[] {
    const db = getDb();
    
    const stmt = db.prepare(`
      SELECT 
        id, symbol, signal_type as signalType, confidence,
        suggested_strike as suggestedStrike, suggested_expiry as suggestedExpiry,
        suggested_direction as suggestedDirection, target_price as targetPrice,
        stop_loss as stopLoss, created_at as createdAt, resolved_at as resolvedAt,
        outcome, pnl_percent as pnlPercent, notes
      FROM paper_signals 
      WHERE confidence >= ? AND resolved_at IS NULL
      ORDER BY confidence DESC, created_at DESC
      LIMIT ?
    `);
    
    return stmt.all(threshold, limit) as Signal[];
  }

  static resolveSignal(id: number, data: ResolveSignalRequest): Signal {
    const db = getDb();
    
    const stmt = db.prepare(`
      UPDATE paper_signals 
      SET resolved_at = datetime('now'), outcome = ?, pnl_percent = ?, notes = ?
      WHERE id = ?
    `);
    
    stmt.run(data.outcome, data.pnlPercent, data.notes || null, id);
    
    return this.getSignalById(id)!;
  }

  static getSignalPerformance(): SignalPerformance {
    const db = getDb();
    
    // Get overall stats
    const overallStats = db.prepare(`
      SELECT 
        COUNT(*) as totalSignals,
        COUNT(CASE WHEN outcome = 'win' THEN 1 END) as wins,
        AVG(CASE WHEN pnl_percent IS NOT NULL THEN pnl_percent END) as avgPnL,
        AVG(CASE WHEN outcome = 'win' AND pnl_percent IS NOT NULL THEN pnl_percent END) as avgWinPnL,
        AVG(CASE WHEN outcome = 'loss' AND pnl_percent IS NOT NULL THEN pnl_percent END) as avgLossPnL
      FROM paper_signals 
      WHERE resolved_at IS NOT NULL
    `).get() as any;

    // Get high confidence win rate
    const highConfStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN outcome = 'win' THEN 1 END) as wins
      FROM paper_signals 
      WHERE resolved_at IS NOT NULL AND confidence >= 80
    `).get() as any;

    // Get recent signal counts
    const weeklyCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM paper_signals 
      WHERE created_at >= datetime('now', '-7 days')
    `).get() as any;

    const monthlyCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM paper_signals 
      WHERE created_at >= datetime('now', '-30 days')
    `).get() as any;

    return {
      totalSignals: overallStats.totalSignals || 0,
      winRate: overallStats.totalSignals > 0 ? (overallStats.wins / overallStats.totalSignals) * 100 : 0,
      avgPnL: overallStats.avgPnL || 0,
      avgWinPnL: overallStats.avgWinPnL || 0,
      avgLossPnL: overallStats.avgLossPnL || 0,
      highConfidenceWinRate: highConfStats.total > 0 ? (highConfStats.wins / highConfStats.total) * 100 : 0,
      weeklySignals: weeklyCount.count || 0,
      monthlySignals: monthlyCount.count || 0
    };
  }

  // Mock signal generation for demo purposes
  static generateMockSignals(): void {
    const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'SPY'];
    const signalTypes: Array<'bullish' | 'bearish' | 'neutral'> = ['bullish', 'bearish', 'neutral'];
    const directions: Array<'call' | 'put'> = ['call', 'put'];

    // Generate 10 random signals
    for (let i = 0; i < 10; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
      const confidence = Math.floor(Math.random() * 40) + 60; // 60-100
      const direction = signalType === 'bearish' ? 'put' : 
                       signalType === 'bullish' ? 'call' : 
                       directions[Math.floor(Math.random() * directions.length)];

      const mockSignal: CreateSignalRequest = {
        symbol,
        signalType,
        confidence,
        suggestedDirection: direction,
        notes: `AI-generated ${signalType} signal for ${symbol}`
      };

      this.createSignal(mockSignal);
    }

    // Resolve some older signals with random outcomes
    const unresolvedSignals = this.getSignals(5, 0).filter(s => !s.resolvedAt);
    unresolvedSignals.forEach(signal => {
      const outcomes: Array<'win' | 'loss' | 'breakeven'> = ['win', 'loss', 'breakeven'];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      const pnlPercent = outcome === 'win' ? Math.random() * 50 + 10 : 
                        outcome === 'loss' ? -(Math.random() * 30 + 5) : 
                        Math.random() * 4 - 2;

      this.resolveSignal(signal.id, {
        outcome,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
        notes: `Resolved with ${outcome}`
      });
    });

    logger.info('Mock signals generated and resolved');
  }
}