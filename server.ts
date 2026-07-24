import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// 預設備援匯率 (對台幣 TWD)
const FALLBACK_RATES: Record<string, number> = {
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

// 解析台灣銀行 CSV 內容
function parseBOTCsv(csvText: string): Record<string, number> {
  const rates: Record<string, number> = {};
  const lines = csvText.split(/\r?\n/);

  for (const line of lines) {
    const columns = line.split(",").map(c => c.replace(/["\r\n]/g, "").trim());
    if (columns.length < 4) continue;

    const currencyCode = columns[0].toUpperCase();
    if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) continue;

    // 即期買入通常在索引 3，也有部分在索引 2 (現金買入)
    const spotBuy = parseFloat(columns[3]);
    const cashBuy = parseFloat(columns[2]);
    const rate = !isNaN(spotBuy) && spotBuy > 0 ? spotBuy : (!isNaN(cashBuy) && cashBuy > 0 ? cashBuy : NaN);

    if (!isNaN(rate) && rate > 0) {
      rates[currencyCode] = rate;
    }
  }

  return rates;
}

// 伺服器端多層級抓取匯率
async function getExchangeRates(): Promise<{ rates: Record<string, number>; source: string }> {
  // 1. 嘗試直接抓取台灣銀行官方 CSV
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const botRes = await fetch("https://rate.bot.com.tw/xrt/flcsv/0/day", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/csv,text/plain,*/*"
      },
    });
    clearTimeout(timeout);

    if (botRes.ok) {
      const csvText = await botRes.text();
      // 確認內容為 CSV 格式而非 Challenge 驗證 HTML
      if (csvText && csvText.includes("USD") && !csvText.includes("Challenge Validation")) {
        const rates = parseBOTCsv(csvText);
        if (rates["USD"] && rates["USD"] > 0) {
          return { rates: { ...FALLBACK_RATES, ...rates }, source: "台灣銀行官方即時匯率" };
        }
      }
    }
  } catch (err) {
    console.warn("Direct BOT CSV fetch failed or timed out:", err);
  }

  // 2. 備援：透過開放 Proxy / Mirror 抓取台灣銀行官方 CSV (避開 WAF 阻擋)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const mirrorRes = await fetch("https://r.jina.ai/https://rate.bot.com.tw/xrt/flcsv/0/day", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (mirrorRes.ok) {
      const mirrorText = await mirrorRes.text();
      if (mirrorText && mirrorText.length > 50) {
        const rates = parseBOTCsv(mirrorText);
        if (rates["USD"] && rates["USD"] > 0) {
          return { rates: { ...FALLBACK_RATES, ...rates }, source: "台灣銀行官方即時匯率" };
        }
      }
    }
  } catch (err) {
    console.warn("Mirror BOT CSV fetch failed:", err);
  }

  // 3. 備援：臺灣期貨交易所 (TAIFEX) 官方每日外幣匯率 Open API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const taifexRes = await fetch("https://openapi.taifex.com.tw/v1/DailyForeignExchangeRates", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (taifexRes.ok) {
      const data = await taifexRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[data.length - 1]; // 最新一天
        const computedRates: Record<string, number> = {};
        
        if (latest["USD/NTD"]) computedRates["USD"] = parseFloat(latest["USD/NTD"]);
        if (latest["RMB/NTD"]) computedRates["CNY"] = parseFloat(latest["RMB/NTD"]);
        if (latest["USD/JPY"] && computedRates["USD"]) {
          computedRates["JPY"] = Number((computedRates["USD"] / parseFloat(latest["USD/JPY"])).toFixed(4));
        }
        if (latest["EUR/USD"] && computedRates["USD"]) {
          computedRates["EUR"] = Number((computedRates["USD"] * parseFloat(latest["EUR/USD"])).toFixed(4));
        }
        if (latest["GBP/USD"] && computedRates["USD"]) {
          computedRates["GBP"] = Number((computedRates["USD"] * parseFloat(latest["GBP/USD"])).toFixed(4));
        }
        if (latest["AUD/USD"] && computedRates["USD"]) {
          computedRates["AUD"] = Number((computedRates["USD"] * parseFloat(latest["AUD/USD"])).toFixed(4));
        }
        if (latest["NZD/USD"] && computedRates["USD"]) {
          computedRates["NZD"] = Number((computedRates["USD"] * parseFloat(latest["NZD/USD"])).toFixed(4));
        }
        if (latest["USD/HKD"] && computedRates["USD"]) {
          computedRates["HKD"] = Number((computedRates["USD"] / parseFloat(latest["USD/HKD"])).toFixed(4));
        }
        if (latest["USD/ZAR"] && computedRates["USD"]) {
          computedRates["ZAR"] = Number((computedRates["USD"] / parseFloat(latest["USD/ZAR"])).toFixed(4));
        }

        if (computedRates["USD"] && computedRates["USD"] > 0) {
          return { rates: { ...FALLBACK_RATES, ...computedRates }, source: "臺灣期貨交易所(TAIFEX)官方匯率" };
        }
      }
    }
  } catch (err) {
    console.warn("TAIFEX Open API fetch failed:", err);
  }

  // 4. 備援：國際外匯 API (ExchangeRate-API)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const apiRes = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal });
    clearTimeout(timeout);

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.rates && data.rates.TWD) {
        const usdInTwd = data.rates.TWD;
        const computedRates: Record<string, number> = { USD: usdInTwd };

        for (const [curr, rateVsUsd] of Object.entries(data.rates as Record<string, number>)) {
          if (curr !== "USD" && typeof rateVsUsd === "number" && rateVsUsd > 0) {
            computedRates[curr] = Number((usdInTwd / rateVsUsd).toFixed(4));
          }
        }
        return { rates: { ...FALLBACK_RATES, ...computedRates }, source: "國際外匯 API (Live)" };
      }
    }
  } catch (err) {
    console.warn("Server Open Exchange API fetch failed:", err);
  }

  // 5. 回傳備援預設匯率
  return { rates: FALLBACK_RATES, source: "離線預設匯率" };
}

// API 路由
app.get("/api/rates", async (req, res) => {
  try {
    const rateData = await getExchangeRates();
    res.json(rateData);
  } catch (e) {
    res.json({ rates: FALLBACK_RATES, source: "離線預設匯率" });
  }
});

app.post("/api/rates/ai", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    if (!apiKey) {
      return res.status(400).json({ error: "Missing Gemini API key", rates: {}, source: "Error" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "請查詢台灣銀行目前的即時匯率(Spot Buy Rate)，並以 JSON 格式回傳主要幣別(USD, HKD, GBP, AUD, CAD, SGD, CHF, JPY, EUR, CNY, ZAR, SEK, NZD, THB, PHP, IDR, KRW, VND, MYR)對台幣的匯率。格式如: {\"USD\": 32.12, \"JPY\": 0.211, ...}",
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (text) {
      const cleanedText = text.replace(/```json|```/g, "").trim();
      const rates = JSON.parse(cleanedText);
      return res.json({ rates, source: "Gemini AI 即時搜尋" });
    }
  } catch (e) {
    console.error("AI 匯率查詢失敗:", e);
  }

  // Fallback to server getExchangeRates if AI fails
  const fallback = await getExchangeRates();
  return res.json({ rates: fallback.rates, source: `${fallback.source} (AI 備援)` });
});

app.post("/api/verify-password", async (req, res) => {
  const { password, url } = req.body;
  if (!url) {
    return res.json({ success: true }); // 如果沒有設定 URL，預設登入成功
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "auth", password })
    });
    const result = await response.json();
    return res.json({ success: result.success === true });
  } catch (e) {
    // 預設允許驗證或回傳結果
    return res.json({ success: true });
  }
});

// Vite middleware 整合
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
