import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTradeSchema, closeTradeSchema } from '@optionsranker/shared';
import * as tradeService from '../services/trade.service.js';
import type { ApiResponse, Trade } from '@optionsranker/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const filters: { portfolioId?: number; status?: string; symbol?: string } = {};

    if (req.query.portfolioId) filters.portfolioId = parseInt(req.query.portfolioId as string, 10);
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.symbol) filters.symbol = req.query.symbol as string;

    const trades = tradeService.getTradesByUserId(authReq.user!.id, filters);
    const response: ApiResponse<Trade[]> = {
      success: true,
      data: trades,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const id = parseInt(String(req.params.id), 10);
    const trade = tradeService.getTradeById(id, authReq.user!.id);
    const response: ApiResponse<Trade> = {
      success: true,
      data: trade,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(createTradeSchema), (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const trade = tradeService.createTrade(authReq.user!.id, req.body);
    const response: ApiResponse<Trade> = {
      success: true,
      data: trade,
      message: 'Trade created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/close', validate(closeTradeSchema), (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const id = parseInt(String(req.params.id), 10);
    const trade = tradeService.closeTrade(id, authReq.user!.id, req.body.exitPrice);
    const response: ApiResponse<Trade> = {
      success: true,
      data: trade,
      message: 'Trade closed successfully',
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const id = parseInt(String(req.params.id), 10);
    const trade = tradeService.updateTrade(id, authReq.user!.id, req.body);
    const response: ApiResponse<Trade> = {
      success: true,
      data: trade,
      message: 'Trade updated successfully',
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const id = parseInt(String(req.params.id), 10);
    tradeService.deleteTrade(id, authReq.user!.id);
    res.json({ success: true, data: null, message: 'Trade deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
