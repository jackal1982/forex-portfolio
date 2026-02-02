
export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  INTEREST = 'INTEREST'
}

export interface Transaction {
  id: string;
  date: string;
  currency: string;
  rate: number;
  amount: number;
  type: TransactionType;
  realizedPL?: number; // Only for SELL transactions
}

export interface ExchangeRate {
  currency: string;
  buyRate: number; // The rate at which the bank buys from us (our sell rate)
  sellRate: number; // The rate at which the bank sells to us (our buy rate)
  updateTime: string;
}

export interface PortfolioSummary {
  currency: string;
  totalQuantity: number;
  avgCost: number;
  currentRate: number;
  unrealizedPL: number;
  realizedPL: number;
}

export interface DashboardStats {
  totalUnrealizedPL: number;
  totalRealizedPL: number;
  items: PortfolioSummary[];
}
