import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createWatchlistSchema, addWatchlistItemSchema } from '@optionsranker/shared';
import * as watchlistService from '../services/watchlist.service.js';
import type { ApiResponse, Watchlist, WatchlistWithItems, WatchlistItem } from '@optionsranker/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const watchlists = watchlistService.getWatchlistsByUserId(authReq.user!.id);
    const response: ApiResponse<Watchlist[]> = {
      success: true,
      data: watchlists,
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
    const watchlist = watchlistService.getWatchlistById(id, authReq.user!.id);
    const response: ApiResponse<WatchlistWithItems> = {
      success: true,
      data: watchlist,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(createWatchlistSchema), (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const watchlist = watchlistService.createWatchlist(authReq.user!.id, req.body);
    const response: ApiResponse<Watchlist> = {
      success: true,
      data: watchlist,
      message: 'Watchlist created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validate(createWatchlistSchema), (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const id = parseInt(String(req.params.id), 10);
    const watchlist = watchlistService.updateWatchlist(id, authReq.user!.id, req.body);
    const response: ApiResponse<Watchlist> = {
      success: true,
      data: watchlist,
      message: 'Watchlist updated successfully',
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
    watchlistService.deleteWatchlist(id, authReq.user!.id);
    res.json({ success: true, data: null, message: 'Watchlist deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Watchlist items
router.post('/:id/items', validate(addWatchlistItemSchema), (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const watchlistId = parseInt(String(req.params.id), 10);
    const item = watchlistService.addItem(watchlistId, authReq.user!.id, req.body);
    const response: ApiResponse<WatchlistItem> = {
      success: true,
      data: item,
      message: 'Item added to watchlist',
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/items/:itemId', (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const watchlistId = parseInt(String(req.params.id), 10);
    const itemId = parseInt(String(req.params.itemId), 10);
    watchlistService.removeItem(watchlistId, itemId, authReq.user!.id);
    res.json({ success: true, data: null, message: 'Item removed from watchlist' });
  } catch (error) {
    next(error);
  }
});

export default router;
