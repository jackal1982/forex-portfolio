
import { Transaction } from '../types';
import { BOT_CURRENCIES, GOOGLE_SHEET_WEBAPP_URL } from '../constants';

export const verifyPasswordWithBackend = async (password: string): Promise<boolean> => {
  if (!GOOGLE_SHEET_WEBAPP_URL) return false;
  try {
    const response = await fetch(GOOGLE_SHEET_WEBAPP_URL, {
      method: 'POST',
      mode: 'cors', // 注意：驗證需要回應，所以這裡不用 no-cors，但 Apps Script 回應 cors 有時較難處理
      body: JSON.stringify({ type: 'auth', password })
    });
    // 如果 Apps Script 沒設定好 CORS，fetch 可能會失敗
    // 另一種方式是讓 App Script 成功才回傳資料，失敗報錯
    const result = await response.json();
    return result.success === true;
  } catch (e) {
    // 備選方案：如果發生 CORS 問題，通常我們會假設本地開發或環境受限
    console.warn('驗證 API 調用失敗，請確認 Apps Script 已正確部署並開啟所有人存取');
    return false;
  }
};

/**
 * 透過台灣銀行官方 CSV 獲取即時匯率
 */
export const fetchExchangeRates = async (): Promise<Record<string, number>> => {
  const BOT_CSV_URL = 'https://rate.bot.com.tw/xrt/flcsv/0/day';
  
  const proxies = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  ];

  const fallbackRates: Record<string, number> = {
    'USD': 32.20, 'HKD': 4.10, 'GBP': 40.80, 'AUD': 21.10,
    'CAD': 23.40, 'SGD': 24.00, 'CHF': 36.30, 'JPY': 0.210,
    'EUR': 34.80, 'CNY': 4.43
  };

  const parseBOTCsv = (csvText: string): Record<string, number> => {
    const rates: Record<string, number> = {};
    const lines = csvText.split(/\r?\n/);
    
    lines.forEach((line, index) => {
      if (index === 0 || !line.trim()) return;
      
      const columns = line.split(',');
      if (columns.length < 15) return;

      const currencyCode = columns[0].trim();
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

      let csvContent = "";
      if (proxyUrl.includes('allorigins')) {
        const json = await response.json();
        csvContent = json.contents;
      } else {
        csvContent = await response.text();
      }

      if (!csvContent || csvContent.length < 100) continue;

      const rates = parseBOTCsv(csvContent);
      if (rates['USD']) {
        BOT_CURRENCIES.forEach(c => {
          if (!rates[c.code]) {
            rates[c.code] = fallbackRates[c.code] || 30;
          }
        });
        return rates;
      }
    } catch (err) {
      console.warn(`Proxy failed:`, err);
    }
  }

  return fallbackRates;
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
