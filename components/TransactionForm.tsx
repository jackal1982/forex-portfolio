
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, PortfolioSummary } from '../types';
import { BOT_CURRENCIES } from '../constants';

interface Props {
  onSave: (tx: Transaction) => void;
  editingTransaction: Transaction | null;
  onCancel: () => void;
  holdings: PortfolioSummary[];
}

const TransactionForm: React.FC<Props> = ({ onSave, editingTransaction, onCancel, holdings }) => {
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: TransactionType.BUY,
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    rate: 0,
    amount: 0
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // 獲取目前選中幣別的庫存數量
  const currentHoldings = useMemo(() => {
    const holding = holdings.find(h => h.currency === formData.currency);
    return holding ? holding.totalQuantity : 0;
  }, [holdings, formData.currency]);

  useEffect(() => {
    if (editingTransaction) {
      setFormData(editingTransaction);
    }
  }, [editingTransaction]);

  // 當切換為利息時，匯率自動設為 0
  useEffect(() => {
    if (formData.type === TransactionType.INTEREST) {
      setFormData(prev => ({ ...prev, rate: 0 }));
    }
  }, [formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const rate = Number(formData.rate);
    const amount = Number(formData.amount);

    if (isNaN(rate) || isNaN(amount) || amount <= 0) {
      setValidationError('請輸入有效的數字且數量需大於 0');
      return;
    }

    // 賣出防呆：數量不能超過庫存
    if (formData.type === TransactionType.SELL) {
      let maxAvailable = currentHoldings;
      
      // 如果是編輯模式，需要把原本這筆賣出的數量加回去考慮
      if (editingTransaction && editingTransaction.type === TransactionType.SELL && editingTransaction.currency === formData.currency) {
        maxAvailable += editingTransaction.amount;
      }

      if (amount > maxAvailable) {
        setValidationError(`餘額不足。該幣別目前最大可賣出數量為 ${maxAvailable.toLocaleString()}。`);
        return;
      }
    }
    
    onSave({
      ...formData as Transaction,
      id: formData.id || Math.random().toString(36).substr(2, 9),
      rate,
      amount
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-800">
          {editingTransaction ? '修改交易' : '新增交易'}
        </h3>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 交易類型切換 - 三個按鈕並列 */}
        <div className="grid grid-cols-3 gap-2">
          <button 
            type="button"
            onClick={() => setFormData({ ...formData, type: TransactionType.BUY })}
            className={`py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all border-2 ${formData.type === TransactionType.BUY ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}
          >
            買進
          </button>
          <button 
            type="button"
            onClick={() => setFormData({ ...formData, type: TransactionType.SELL })}
            className={`py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all border-2 ${formData.type === TransactionType.SELL ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}
          >
            賣出
          </button>
          <button 
            type="button"
            onClick={() => setFormData({ ...formData, type: TransactionType.INTEREST })}
            className={`py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all border-2 ${formData.type === TransactionType.INTEREST ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}
          >
            利息
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">交易幣別</label>
            <select 
              value={formData.currency}
              onChange={e => setFormData({ ...formData, currency: e.target.value })}
              className="w-full bg-transparent font-black text-xl text-slate-800 outline-none appearance-none"
            >
              {BOT_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </select>
            <div className="absolute right-4 bottom-4 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md">
              持倉: {currentHoldings.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">交易日期</label>
            <input 
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-transparent font-black text-xl text-slate-800 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border-2 border-transparent transition-all ${formData.type === TransactionType.INTEREST ? 'bg-slate-100 opacity-60' : 'bg-slate-50 focus-within:border-blue-500 focus-within:bg-white'}`}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">成交匯率 {formData.type === TransactionType.INTEREST && '(利息不計匯率)'}</label>
              <input 
                type="number"
                step="0.0001"
                value={formData.type === TransactionType.INTEREST ? 0 : (formData.rate || '')}
                onChange={e => setFormData({ ...formData, rate: Number(e.target.value) })}
                className="w-full bg-transparent font-black text-2xl text-slate-800 outline-none placeholder:text-slate-200"
                placeholder="0.0000"
                disabled={formData.type === TransactionType.INTEREST}
                required
              />
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">交易數量</label>
              <input 
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full bg-transparent font-black text-2xl text-slate-800 outline-none placeholder:text-slate-200"
                placeholder="0.00"
                required
              />
            </div>
          </div>
        </div>

        {validationError && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-bold text-rose-600 leading-tight">{validationError}</p>
          </div>
        )}

        <div className="pt-4">
          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-lg"
          >
            {editingTransaction ? '確認更新' : '儲存交易紀錄'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
