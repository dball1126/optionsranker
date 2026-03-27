import app from './app.js';
import { config } from './config/env.js';
import { setupDatabase } from './db/setup.js';
import { logger } from './utils/logger.js';
import { setupGracefulShutdown } from './middleware/productionErrorHandler.js';

// Initialize database on startup
try {
  setupDatabase();
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
}

// Start server
const server = app.listen(config.PORT, () => {
  logger.info(`🚀 OptionsRanker server running on http://localhost:${config.PORT}`);
  logger.info(`📊 Environment: ${config.NODE_ENV}`);
  logger.info(`🌐 Client URL: ${config.CLIENT_URL}`);
  logger.info(`💳 Stripe configured: ${!!config.STRIPE_SECRET_KEY}`);
  logger.info(`📈 Real data enabled: ${process.env.USE_REAL_DATA === 'true'}`);
});

// Setup graceful shutdown
setupGracefulShutdown(server);
