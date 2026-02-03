
import { Transaction } from '../types';
import { BOT_CURRENCIES, GOOGLE_SHEET_WEBAPP_URL } from '../constants';
import { GoogleGenAI } from "@google/genai";

export const verifyPasswordWithBackend = async (password: string): Promise<boolean> => {
  if (!GOOGLE_SHEET_WEBAPP_URL) return false;
  try {
    const response = await fetch(GOOGLE_SHEET_WEBAPP_URL, {
      method: 'POST',
      body: JSON.stringify({ type: 'auth', password })
    });
    const result = await response.json();
    return result.success === true;
  } catch (e) {
    console.warn('驗證 API 調用失敗');
    return false;
  }
};

/**
 * 透過 Google Search 工具利用 Gemini 獲取最新匯率 (作為最終備援)
 */
export const fetchRatesViaAI = async (): Promise<{rates: Record<string, number>, source: string}> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "請查詢台灣銀行目前的即時匯率(Spot Buy Rate)，並以 JSON 格式回傳主要幣別(USD, HKD, GBP, AUD, CAD, SGD, CHF, JPY, EUR, CNY)對台幣的匯率。格式如: {\"USD\": 32.12, ...}",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      },
    });
    
    const text = response.text;
    if (text) {
      const cleanedText = text.replace(/```json|```/g, '').trim();
      const rates = JSON.parse(cleanedText);
      return { rates, source: 'Gemini AI Search' };
    }
  } catch (e) {
    console.error("AI 獲取匯率失敗", e);
  }
  return { rates: {}, source: 'Error' };
};

/**
 * 透過台灣銀行官方 CSV 獲取即時匯率 (增加更多 Proxy 並優化解析)
 */
export const fetchExchangeRates = async (): Promise<{rates: Record<string, number>, source: string}> => {
  const BOT_CSV_URL = 'https://rate.bot.com.tw/xrt/flcsv/0/day';
  
  const proxies = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  const fallbackRates: Record<string, number> = {
    'USD': 32.25, 'HKD': 4.12, 'GBP': 40.85, 'AUD': 21.15,
    'CAD': 23.45, 'SGD': 24.10, 'CHF': 36.35, 'JPY': 0.211,
    'EUR': 34.85, 'CNY': 4.45
  };

  const parseBOTCsv = (csvText: string): Record<string, number> => {
    const rates: Record<string, number> = {};
    const lines = csvText.split(/\r?\n/);
    
    lines.forEach((line) => {
      const columns = line.split(',');
      if (columns.length < 15) return;

      const currencyCode = columns[0].trim();
      // 台銀 CSV 第 13 欄是即時買入價 (Spot Buy)，即我們賣給銀行的價格
      const spotBuy = parseFloat(columns[13]);

      if (currencyCode && !isNaN(spotBuy) && spotBuy > 0) {
        rates[currencyCode] = spotBuy;
      }
    });
    return rates;
  };

  for (const getProxyUrl of proxies) {
    try {
      const proxyUrl = getProxyUrl(BOT_CSV_URL);
      const response = await fetch(proxyUrl);
      if (!response.ok) continue;

      const csvContent = await response.text();
      if (!csvContent || csvContent.length < 50) continue;

      const rates = parseBOTCsv(csvContent);
      if (rates['USD']) {
        return { rates, source: '台銀官方資料 (Live)' };
      }
    } catch (err) {
      console.warn(`Proxy failed:`, err);
    }
  }

  return { rates: fallbackRates, source: '預設/快取資料 (Offline)' };
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
