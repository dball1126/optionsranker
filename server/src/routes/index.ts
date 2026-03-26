import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import portfoliosRoutes from './portfolios.routes.js';
import tradesRoutes from './trades.routes.js';
import watchlistsRoutes from './watchlists.routes.js';
import marketRoutes from './market.routes.js';
import strategiesRoutes from './strategies.routes.js';
import learningRoutes from './learning.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/portfolios', portfoliosRoutes);
router.use('/trades', tradesRoutes);
router.use('/watchlists', watchlistsRoutes);
router.use('/market', marketRoutes);
router.use('/strategies', strategiesRoutes);
router.use('/learning', learningRoutes);

export default router;
