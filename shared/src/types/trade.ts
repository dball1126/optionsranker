export type OptionType = 'call' | 'put' | 'stock';
export type TradeDirection = 'buy' | 'sell';
export type TradeStatus = 'open' | 'closed' | 'expired';

export interface Trade {
  id: number;
  portfolioId: number;
  userId: number;
  symbol: string;
  optionType: OptionType;
  direction: TradeDirection;
  quantity: number;
  strikePrice: number | null;
  expirationDate: string | null;
  entryPrice: number;
  exitPrice: number | null;
  status: TradeStatus;
  strategyTag: string | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
}

export interface CreateTradeRequest {
  portfolioId: number;
  symbol: string;
  optionType: OptionType;
  direction: TradeDirection;
  quantity: number;
  strikePrice?: number;
  expirationDate?: string;
  entryPrice: number;
  strategyTag?: string;
  notes?: string;
}

export interface CloseTradeRequest {
  exitPrice: number;
}
