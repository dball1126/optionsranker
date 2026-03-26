import { Router } from 'express';
import type { Request, Response } from 'express';
import { SignalService } from '../services/signalService.js';
import { NotificationService } from '../services/notificationService.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Get all signals (public for demo purposes)
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const signals = SignalService.getSignals(limit, offset);
    
    res.json({
      success: true,
      data: {
        signals,
        pagination: {
          limit,
          offset,
          hasMore: signals.length === limit
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching signals', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch signals'
    });
  }
});

// Get high confidence signals (public for demo)
router.get('/high-confidence', async (req: Request, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 80;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const signals = SignalService.getHighConfidenceSignals(threshold, limit);
    
    res.json({
      success: true,
      data: signals
    });
  } catch (error) {
    logger.error('Error fetching high-confidence signals', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch high-confidence signals'
    });
  }
});

// Get signal performance metrics (public for transparency)
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const performance = SignalService.getSignalPerformance();
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Error fetching signal performance', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch signal performance'
    });
  }
});

// Create a signal (protected - admin only for now)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const signal = SignalService.createSignal(req.body);
    
    // If high confidence, broadcast notification
    if (signal.confidence >= 80) {
      NotificationService.broadcastSignalNotification(signal.id, signal);
    }
    
    res.status(201).json({
      success: true,
      data: signal
    });
  } catch (error) {
    logger.error('Error creating signal', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create signal'
    });
  }
});

// Resolve a signal (protected - admin only for now)
router.patch('/:id/resolve', authenticate, async (req: Request, res: Response) => {
  try {
    const signalId = parseInt(req.params.id as string);
    const signal = SignalService.resolveSignal(signalId, req.body);
    
    res.json({
      success: true,
      data: signal
    });
  } catch (error) {
    logger.error('Error resolving signal', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve signal'
    });
  }
});

// Generate mock signals for demo (development only)
router.post('/mock', async (req: Request, res: Response) => {
  try {
    SignalService.generateMockSignals();
    
    res.json({
      success: true,
      message: 'Mock signals generated successfully'
    });
  } catch (error) {
    logger.error('Error generating mock signals', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate mock signals'
    });
  }
});

export default router;