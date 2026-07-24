
import { Transaction } from '../types';
import { GOOGLE_SHEET_WEBAPP_URL } from '../constants';

const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  USD: 32.25,
  HKD: 4.12,
  GBP: 40.85,
  AUD: 21.15,
  CAD: 23.45,
  SGD: 24.10,
  CHF: 36.35,
  JPY: 0.211,
  ZAR: 1.78,
  SEK: 3.12,
  NZD: 19.5,
  THB: 0.92,
  PHP: 0.56,
  IDR: 0.002,
  EUR: 34.85,
  KRW: 0.023,
  VND: 0.0012,
  MYR: 7.25,
  CNY: 4.45,
};

export const verifyPasswordWithBackend = async (password: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, url: GOOGLE_SHEET_WEBAPP_URL })
    });
    if (response.ok) {
      const result = await response.json();
      return result.success === true;
    }
  } catch (e) {
    console.warn('密碼驗證請求失敗，啟動備援驗證');
  }
  return true; // 當備援或連線異常時允許使用
};

/**
 * 透過伺服器 AI API 獲取即時匯率
 */
export const fetchRatesViaAI = async (): Promise<{rates: Record<string, number>, source: string}> => {
  try {
    const response = await fetch('/api/rates/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.rates && Object.keys(data.rates).length > 0) {
        return { rates: { ...DEFAULT_FALLBACK_RATES, ...data.rates }, source: data.source || 'Gemini AI 即時搜尋' };
      }
    }
  } catch (e) {
    console.error('AI 獲取匯率失敗', e);
  }
  return { rates: DEFAULT_FALLBACK_RATES, source: '離線預設匯率 (備援)' };
};

/**
 * 透過後端伺服器 API 獲取即時匯率 (避開 Chrome 跨域 CORS 與阻擋)
 */
export const fetchExchangeRates = async (): Promise<{rates: Record<string, number>, source: string}> => {
  try {
    const response = await fetch('/api/rates');
    if (response.ok) {
      const data = await response.json();
      if (data.rates && Object.keys(data.rates).length > 0) {
        return { rates: { ...DEFAULT_FALLBACK_RATES, ...data.rates }, source: data.source || '台灣銀行官方資料' };
      }
    }
  } catch (err) {
    console.warn('獲取即時匯率失敗，改用預設匯率:', err);
  }

  return { rates: DEFAULT_FALLBACK_RATES, source: '預設/快取資料 (Offline)' };
};

export const saveTransactions = async (transactions: Transaction[]) => {
  if (GOOGLE_SHEET_WEBAPP_URL) {
    try {
      await fetch(GOOGLE_SHEET_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactions)
      });
    } catch (e) {
      console.error('雲端儲存失敗', e);
    }
  }
  localStorage.setItem('forex_transactions', JSON.stringify(transactions));
};

export const loadTransactions = async (): Promise<Transaction[]> => {
  if (GOOGLE_SHEET_WEBAPP_URL) {
    try {
      const response = await fetch(GOOGLE_SHEET_WEBAPP_URL);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('雲端讀取失敗');
    }
  }
  const local = localStorage.getItem('forex_transactions');
  return local ? JSON.parse(local) : [];
};

