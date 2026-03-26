import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '@optionsranker/shared';
import * as authService from '../services/auth.service.js';
import type { ApiResponse, AuthResponse } from '@optionsranker/shared';

const router = Router();

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: result,
      message: 'Registration successful',
    };
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: result,
      message: 'Login successful',
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token is required' });
      return;
    }

    const result = await authService.refreshTokens(refreshToken);
    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      authService.logout(refreshToken);
    }
    res.json({ success: true, data: null, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
