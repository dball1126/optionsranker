import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProgressSchema } from '@optionsranker/shared';
import * as learningService from '../services/learning.service.js';
import type { ApiResponse, LearningModule, LearningProgress, UserLearningOverview } from '@optionsranker/shared';

const router = Router();

// Public routes
router.get('/modules', (_req, res, next) => {
  try {
    const category = (_req.query.category as string) || undefined;
    const modules = learningService.getAllModules(category);
    const response: ApiResponse<LearningModule[]> = {
      success: true,
      data: modules,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/modules/:idOrSlug', (req, res, next) => {
  try {
    const param = String(req.params.idOrSlug);
    const id = parseInt(param, 10);
    const module = isNaN(id)
      ? learningService.getModuleBySlug(param)
      : learningService.getModuleById(id);

    const response: ApiResponse<LearningModule> = {
      success: true,
      data: module,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.get('/progress', authenticate, (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const overview = learningService.getUserLearningOverview(authReq.user!.id);
    const response: ApiResponse<UserLearningOverview> = {
      success: true,
      data: overview,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.put('/progress/:moduleId', authenticate, validate(updateProgressSchema), (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const moduleId = parseInt(String(req.params.moduleId), 10);
    const progress = learningService.updateProgress(authReq.user!.id, moduleId, req.body);
    const response: ApiResponse<LearningProgress> = {
      success: true,
      data: progress,
      message: 'Progress updated successfully',
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
