
import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, DashboardStats } from './types';
import { fetchExchangeRates, saveTransactions, loadTransactions, verifyPasswordWithBackend } from './services/api';
import { calculatePortfolio } from './services/finance';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [displayTransactions, setDisplayTransactions] = useState<Transaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [showForm, setShowForm] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsLoggingIn(true);
    setError('');
    try {
      const success = await verifyPasswordWithBackend(password);
      if (success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('fx_auth', 'true');
      } else {
        setError('密碼驗證失敗，請檢查後端設定。');
      }
    } catch (err) {
      setError('連線至驗證伺服器失敗。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('fx_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const initializeData = useCallback(async () => {
    setLoading(true);
    try {
      const [savedTxs, currentRates] = await Promise.all([
        loadTransactions(),
        fetchExchangeRates()
      ]);
      const sanitizedTxs = (Array.isArray(savedTxs) ? savedTxs : []).map(tx => ({
        ...tx,
        id: tx.id || Math.random().toString(36).substr(2, 9)
      }));
      setTransactions(sanitizedTxs);
      setRates(currentRates);
    } catch (err) {
      console.error("Initialization failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      initializeData();
    }
  }, [isAuthenticated, initializeData]);

  useEffect(() => {
    const { stats: newStats, enrichedTransactions } = calculatePortfolio(transactions, rates);
    setStats(newStats);
    setDisplayTransactions(enrichedTransactions);
  }, [transactions, rates]);

  const handleAddOrUpdate = async (tx: Transaction) => {
    setTransactions(prev => {
      let next;
      if (editingTransaction) {
        next = prev.map(t => t.id === tx.id ? tx : t);
      } else {
        next = [...prev, tx];
      }
      saveTransactions(next);
      return next;
    });
    setEditingTransaction(null);
    setShowForm(false);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    setTransactions(prev => {
      const next = prev.filter(t => t.id !== deletingId);
      saveTransactions(next);
      return next;
    });
    setDeletingId(null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('fx_auth');
    setPassword('');
    setShowLogoutConfirm(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-200 mb-6 transform -rotate-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Forex Pro</h1>
            <p className="text-slate-500 mt-2 font-medium">個人外幣投資管理系統</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <input 
                type="password"
                placeholder="輸入安全密碼"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoggingIn}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-center tracking-[0.5em] text-xl font-bold placeholder:tracking-normal placeholder:font-normal"
                autoFocus
              />
              {error && <p className="text-rose-500 text-sm mt-3 text-center font-medium animate-bounce">{error}</p>}
            </div>
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isLoggingIn ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : '進入儀表板'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col">
      {/* 桌面端與手機端共用 Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-[60]">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-100">FX</div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-slate-900 leading-tight">Forex Tracker</h1>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Premium Access</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* 新增交易按鈕 - 始終顯示在 Header 右側，手機端僅顯示圖示 */}
            <button 
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-2.5 sm:px-5 sm:py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-100 active:scale-95"
              title="新增交易"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">新增交易</span>
            </button>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full transition-all"
              title="登出系統"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 w-full flex-1 pb-24 md:pb-12">
        {loading && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-top-4">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-slate-100 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-600">同步最新匯率...</span>
            </div>
          </div>
        )}

        {/* 手機版標籤切換 */}
        <div className="flex md:hidden bg-white p-1 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
          >
            資產概覽
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
          >
            交易歷史
          </button>
        </div>

        {/* 內容區塊 */}
        <div className={`${activeTab === 'overview' ? 'block' : 'hidden md:block'}`}>
          {stats && <Dashboard stats={stats} />}
        </div>

        <div className={`${activeTab === 'history' ? 'block' : 'hidden md:block'} mt-8`}>
          <TransactionList 
            transactions={displayTransactions}
            onEdit={(tx) => { setEditingTransaction(tx); setShowForm(true); }}
            onDelete={setDeletingId}
          />
        </div>
      </main>

      {/* 手機版底部導覽列 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-8 py-4 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('overview')} className={`flex flex-col items-center gap-1 ${activeTab === 'overview' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-[10px] font-bold">資產概覽</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span className="text-[10px] font-bold">交易紀錄</span>
        </button>
      </nav>

      {/* 新增/修改彈窗 */}
      {(showForm || editingTransaction) && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingTransaction(null); }}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <TransactionForm 
                onSave={handleAddOrUpdate} 
                editingTransaction={editingTransaction}
                onCancel={() => { setShowForm(false); setEditingTransaction(null); }}
                holdings={stats?.items || []}
              />
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">確定刪除？</h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">此動作將會從雲端永久移除這筆投資紀錄。</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 transition-all">確認刪除</button>
                <button onClick={() => setDeletingId(null)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 登出確認 Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">確定要登出？</h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">登出後需要重新輸入密碼才能存取您的投資數據。</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleLogout} className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg transition-all">是，我要登出</button>
                <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all">否，繼續使用</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
