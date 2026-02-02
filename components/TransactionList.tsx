
import React from 'react';
import { Transaction, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionList: React.FC<Props> = ({ transactions, onEdit, onDelete }) => {
  const formatCurrency = (num: number) => 
    new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }).format(num);

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-50">
        <h3 className="font-black text-slate-800 text-lg">歷史交易紀錄</h3>
      </div>

      {/* 手機版清單 */}
      <div className="md:hidden divide-y divide-slate-50">
        {transactions.map(tx => (
          <div key={tx.id} className="p-6 active:bg-slate-50 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                  tx.type === TransactionType.BUY ? 'bg-blue-100 text-blue-600' :
                  tx.type === TransactionType.SELL ? 'bg-rose-100 text-rose-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {tx.type === TransactionType.BUY ? '買' : tx.type === TransactionType.SELL ? '賣' : '息'}
                </span>
                <div>
                  <h4 className="font-black text-slate-800">{tx.currency}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{tx.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800">{tx.amount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold">RATE: {tx.type === TransactionType.INTEREST ? '-' : tx.rate.toFixed(4)}</p>
              </div>
            </div>
            
            {tx.realizedPL !== undefined && (
              <div className="mb-4 bg-slate-50 px-4 py-2 rounded-xl flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">實現盈虧</span>
                <span className={`font-black text-sm ${tx.realizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(tx.realizedPL)}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => onEdit(tx)} className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-blue-600 font-black text-xs rounded-xl transition-all">修改</button>
              <button onClick={() => onDelete(tx.id)} className="flex-1 py-3 bg-slate-50 hover:bg-rose-50 text-rose-600 font-black text-xs rounded-xl transition-all">刪除</button>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="p-12 text-center text-slate-300 font-bold">尚無歷史紀錄</div>
        )}
      </div>

      {/* 桌面版表格 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <th className="px-8 py-4">日期</th>
              <th className="px-8 py-4">幣別</th>
              <th className="px-8 py-4">類型</th>
              <th className="px-8 py-4">匯率</th>
              <th className="px-8 py-4">數量</th>
              <th className="px-8 py-4">實現盈虧</th>
              <th className="px-8 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 text-slate-400 font-medium">{tx.date}</td>
                <td className="px-8 py-5 font-black text-slate-800">{tx.currency}</td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                    tx.type === TransactionType.BUY ? 'bg-blue-50 text-blue-600' :
                    tx.type === TransactionType.SELL ? 'bg-rose-50 text-rose-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {tx.type === TransactionType.BUY ? '買進' : 
                     tx.type === TransactionType.SELL ? '賣出' : '利息'}
                  </span>
                </td>
                <td className="px-8 py-5 font-mono text-slate-600">{tx.type === TransactionType.INTEREST ? '-' : tx.rate.toFixed(4)}</td>
                <td className="px-8 py-5 font-bold text-slate-700">{tx.amount.toLocaleString()}</td>
                <td className={`px-8 py-5 font-black ${
                    tx.realizedPL && tx.realizedPL > 0 ? 'text-emerald-600' : 
                    tx.realizedPL && tx.realizedPL < 0 ? 'text-rose-600' : 'text-slate-300'
                }`}>
                  {tx.realizedPL ? formatCurrency(tx.realizedPL) : '-'}
                </td>
                <td className="px-8 py-5 text-right space-x-4">
                  <button onClick={() => onEdit(tx)} className="text-blue-600 hover:text-blue-800 font-bold transition-colors">修改</button>
                  <button onClick={() => onDelete(tx.id)} className="text-rose-600 hover:text-rose-800 font-bold transition-colors">刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
