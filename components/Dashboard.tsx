
import React from 'react';
import { DashboardStats } from '../types';

interface Props {
  stats: DashboardStats;
}

const Dashboard: React.FC<Props> = ({ stats }) => {
  const formatCurrency = (num: number) => 
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }).format(num);

  return (
    <div className="space-y-6">
      {/* 頂部數據概覽 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">未實現盈虧總額</h3>
          <p className={`text-4xl font-black tracking-tight ${stats.totalUnrealizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(stats.totalUnrealizedPL)}
          </p>
          <div className="mt-4 flex items-center gap-2">
             <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
             <span className="text-[10px] font-bold text-slate-400">REAL-TIME ESTIMATE</span>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">已實現盈虧總額</h3>
          <p className={`text-4xl font-black tracking-tight ${stats.totalRealizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(stats.totalRealizedPL)}
          </p>
          <div className="mt-4">
             <span className="text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-50 rounded-lg">ACCUMULATED HISTORY</span>
          </div>
        </div>
      </div>

      {/* 手機版橫向滑動庫存 */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-xl text-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-lg">目前持倉比例</h3>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/60">Swipe to view</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {stats.items.map(item => (
            <div key={item.currency} className="bg-white/5 border border-white/10 p-5 rounded-2xl min-w-[140px] snap-start">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">{item.currency.substring(0,2)}</span>
                <span className="font-black text-lg">{item.currency}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-white/40 block font-bold uppercase">持有數量</span>
                <span className="text-lg font-bold">{item.totalQuantity.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {stats.items.length === 0 && <p className="text-white/30 text-sm py-4">目前尚無庫存資料</p>}
        </div>
      </div>
      
      {/* 庫存詳情表格/清單 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-lg">資產明細</h3>
        </div>
        
        {/* 手機版列表視圖 */}
        <div className="md:hidden divide-y divide-slate-50">
          {stats.items.map(item => (
            <div key={item.currency} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-2xl font-black text-slate-800">{item.currency}</h4>
                  <p className="text-xs font-bold text-slate-400">平均成本: {item.avgCost.toFixed(4)}</p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-black ${item.unrealizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.unrealizedPL > 0 ? '+' : ''}{formatCurrency(item.unrealizedPL)}
                  </span>
                  <p className="text-[10px] font-bold text-blue-600 mt-1">即時匯率: {item.currentRate.toFixed(4)}</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-2/3"></div>
              </div>
            </div>
          ))}
        </div>

        {/* 桌面版表格視圖 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-4">幣別</th>
                <th className="px-8 py-4">持有數量</th>
                <th className="px-8 py-4">平均成本</th>
                <th className="px-8 py-4">台銀買入價</th>
                <th className="px-8 py-4 text-right">未實現盈虧</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {stats.items.map(item => (
                <tr key={item.currency} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-6 font-black text-slate-800 text-lg">{item.currency}</td>
                  <td className="px-8 py-6 text-slate-600 font-medium">{item.totalQuantity.toLocaleString()}</td>
                  <td className="px-8 py-6 text-slate-400 font-mono">{item.avgCost.toFixed(4)}</td>
                  <td className="px-8 py-6 font-mono text-blue-600 font-bold">{item.currentRate.toFixed(4)}</td>
                  <td className={`px-8 py-6 text-right font-black text-lg ${item.unrealizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(item.unrealizedPL)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
