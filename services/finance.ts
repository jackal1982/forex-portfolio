
import { Transaction, TransactionType, DashboardStats, PortfolioSummary } from '../types';

export const calculatePortfolio = (
  transactions: Transaction[],
  currentRates: Record<string, number>
): { stats: DashboardStats; enrichedTransactions: Transaction[] } => {
  const summaries: Record<string, PortfolioSummary> = {};
  let totalRealizedPL = 0;

  // 使用副本避免影響原始狀態
  const enrichedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ).map(tx => ({ ...tx }));

  enrichedTransactions.forEach(tx => {
    if (!summaries[tx.currency]) {
      summaries[tx.currency] = {
        currency: tx.currency,
        totalQuantity: 0,
        avgCost: 0,
        currentRate: currentRates[tx.currency] || 0,
        unrealizedPL: 0,
        realizedPL: 0
      };
    }

    const s = summaries[tx.currency];

    if (tx.type === TransactionType.BUY || tx.type === TransactionType.INTEREST) {
      // 加權平均成本：(舊總價 + 新進總價) / 新總量
      // 利息視為 $0 成本
      const cost = tx.type === TransactionType.INTEREST ? 0 : tx.rate;
      const totalCostBefore = s.totalQuantity * s.avgCost;
      const totalCostAfter = totalCostBefore + (tx.amount * cost);
      
      s.totalQuantity += tx.amount;
      s.avgCost = s.totalQuantity > 0 ? totalCostAfter / s.totalQuantity : 0;
      tx.realizedPL = undefined;
    } 
    else if (tx.type === TransactionType.SELL) {
      // 已實現盈虧：(賣出匯率 - 當前加權平均成本) * 賣出數量
      const pnl = (tx.rate - s.avgCost) * tx.amount;
      s.realizedPL += pnl;
      totalRealizedPL += pnl;
      s.totalQuantity -= tx.amount;
      // 賣出不影響平均成本
      tx.realizedPL = pnl;
    }
  });

  const items = Object.values(summaries).map(s => {
    const currentRate = currentRates[s.currency] || 0;
    return {
      ...s,
      currentRate,
      // 未實現盈虧：(即期買入匯率 - 平均成本) * 持有數量
      unrealizedPL: (currentRate - s.avgCost) * s.totalQuantity
    };
  });

  const totalUnrealizedPL = items.reduce((sum, item) => sum + item.unrealizedPL, 0);

  return {
    stats: {
      totalUnrealizedPL,
      totalRealizedPL,
      items: items.filter(item => Math.abs(item.totalQuantity) > 0.001 || Math.abs(item.realizedPL) > 0.001)
    },
    enrichedTransactions: enrichedTransactions.reverse() // 返回倒序供列表顯示
  };
};
