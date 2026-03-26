import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import * as userService from '../services/user.service.js';
import type { ApiResponse, User } from '@optionsranker/shared';

const router = Router();

router.get('/me', authenticate, (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const user = userService.getUserById(authReq.user!.id);
    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    const user = userService.updateUser(authReq.user!.id, req.body);
    const response: ApiResponse<User> = {
      success: true,
      data: user,
      message: 'Profile updated successfully',
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
