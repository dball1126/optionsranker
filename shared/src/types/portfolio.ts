export interface Portfolio {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
}

export interface PortfolioSummary extends Portfolio {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  openPositions: number;
}
