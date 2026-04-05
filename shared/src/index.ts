// Types
export type { User, AuthTokens, LoginRequest, RegisterRequest, AuthResponse } from './types/user.js';
export type { OptionsContract, Greeks, OptionsChain, Quote } from './types/options.js';
export type { Portfolio, CreatePortfolioRequest, PortfolioSummary } from './types/portfolio.js';
export type { Trade, CreateTradeRequest, CloseTradeRequest, OptionType, TradeDirection, TradeStatus } from './types/trade.js';
export type { StrategyType, StrategyLeg, StrategyDefinition, StrategyAnalysisRequest, StrategyAnalysisResponse, RankedStrategy, RankingResponse } from './types/strategy.js';
export type { Watchlist, WatchlistItem, WatchlistWithItems, CreateWatchlistRequest, AddWatchlistItemRequest } from './types/watchlist.js';
export type { LearningModule, LearningProgress, UserLearningOverview, ModuleContent, ContentSection, QuizQuestion, LearningCategory, Difficulty, ProgressStatus } from './types/learning.js';
export type { Signal, SignalPerformance, CreateSignalRequest, ResolveSignalRequest, NotificationPreferences, UserNotification, CreateNotificationRequest } from './types/signal.js';
export type { ApiResponse, ApiError, PaginatedResponse } from './types/api.js';

// Validation schemas
export * from './validation/schemas.js';

// Constants
export { STRATEGY_TEMPLATES } from './constants/strategies.js';
export type { StrategyTemplate } from './constants/strategies.js';
