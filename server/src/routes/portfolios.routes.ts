import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPortfolioSchema } from '@optionsranker/shared';
import * as portfolioService from '../services/portfolio.service.js';
import type { ApiResponse, Portfolio, PortfolioSummary } from '@optionsranker/shared';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const portfolios = portfolioService.getPortfoliosByUserId(authReq.user!.id);
    const response: ApiResponse<Portfolio[]> = {
      success: true,
      data: portfolios,
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
    const portfolio = portfolioService.getPortfolioSummary(id, authReq.user!.id);
    const response: ApiResponse<PortfolioSummary> = {
      success: true,
      data: portfolio,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(createPortfolioSchema), (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const portfolio = portfolioService.createPortfolio(authReq.user!.id, req.body);
    const response: ApiResponse<Portfolio> = {
      success: true,
      data: portfolio,
      message: 'Portfolio created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validate(createPortfolioSchema), (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const id = parseInt(String(req.params.id), 10);
    const portfolio = portfolioService.updatePortfolio(id, authReq.user!.id, req.body);
    const response: ApiResponse<Portfolio> = {
      success: true,
      data: portfolio,
      message: 'Portfolio updated successfully',
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
    portfolioService.deletePortfolio(id, authReq.user!.id);
    res.json({ success: true, data: null, message: 'Portfolio deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
