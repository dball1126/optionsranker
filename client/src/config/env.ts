// Client environment configuration
export const config = {
  // API Base URL
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // Stripe
  STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51234567890123456789012345678901234567890123456789012345678901234567890',
  
  // App Info
  APP_NAME: 'OptionsRanker',
  APP_VERSION: '1.0.0',
  
  // Environment
  NODE_ENV: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
} as const;