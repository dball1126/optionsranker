import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { strategyAnalysisSchema } from '@optionsranker/shared';
import * as strategyService from '../services/strategy.service.js';
import type { ApiResponse, StrategyAnalysisResponse } from '@optionsranker/shared';
import type { StrategyTemplate } from '@optionsranker/shared';

const router = Router();

router.post('/analyze', validate(strategyAnalysisSchema), (req, res, next) => {
  try {
    const result = strategyService.analyzeStrategy(req.body);
    const response: ApiResponse<StrategyAnalysisResponse> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/templates', (_req, res, next) => {
  try {
    const templates = strategyService.getTemplates();
    const response: ApiResponse<StrategyTemplate[]> = {
      success: true,
      data: templates,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
