# Thai HD30 Vision

泰國 SET HD30 指數即時監控與分析平台

---

## 專案概述

Thai HD30 Vision 是一個專為泰國股市 SETHD 30 成分股設計的即時監控與分析平台。系統整合了 11 種智能警報類型、即時跑馬燈、WebSocket 推送、技術指標分析等功能,為投資者提供全方位的市場洞察。

### 核心特色

**即時監控**
- 30 檔 SETHD 成分股即時價格追蹤
- WebSocket 推送技術,毫秒級更新
- 自動化價格抓取 (每 15 分鐘)

**11 種智能警報**
- 價格異動: 大漲、大跌、成交量爆增
- 基本面: 高殖利率、財報發布、股息公告
- 法人動向: 內部人交易、外資買賣超、法說會
- 技術指標: RSI 超買超賣、MACD 金叉死叉、新聞快訊

**專業分析**
- 估值雷達圖 (殖利率、本益比、淨值比、成長性、穩定性)
- 歷史價格圖表
- 警報歷史記錄 (最近 10 筆)

**使用者體驗**
- 響應式設計,支援桌面與行動裝置
- 深色主題,專業金融介面
- Hover 暫停跑馬燈
- 一鍵查看股票詳情

---

## 技術堆疊

### 前端框架
- **Next.js 16** - React 框架 (App Router)
- **TypeScript** - 型別安全
- **Tailwind CSS** - 樣式系統
- **Lucide React** - 圖示庫

### 後端服務
- **Supabase** - PostgreSQL 資料庫 + Realtime
- **Vercel** - 部署平台
- **Cron Jobs** - 定時任務

### 資料來源
- **Google Finance** - 即時股價
- **SET (泰國證交所)** - 官方資料 (預留整合)

### 開發工具
- **Axios** - HTTP 請求
- **Cheerio** - HTML 解析
- **Recharts** - 圖表庫

---

## 快速開始

### 環境需求

- Node.js 18+
- npm 或 yarn
- Supabase 帳號

### 安裝步驟

1. **Clone 專案**
```bash
git clone https://github.com/lawrence555-dev/thai-hd30-vision.git
cd thai-hd30-vision
```

2. **安裝依賴**
```bash
npm install
```

3. **設定環境變數**

建立 `.env.local` 檔案:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. **執行資料庫 Migration**

在 Supabase Dashboard 的 SQL Editor 執行:
- `supabase/migrations/001_news_and_alerts.sql`
- `supabase/migrations/002_advanced_alerts.sql`

5. **啟動開發伺服器**
```bash
npm run dev
```

開啟 http://localhost:3000

### 手動更新價格

```bash
curl http://localhost:3000/api/cron/update-prices
```

---

## 專案結構

```
thai-hd30-vision/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 主頁面
│   │   ├── layout.tsx         # 全域佈局
│   │   └── api/               # API 路由
│   │       └── cron/          # Cron Job API
│   ├── components/            # React 元件
│   │   ├── MarketTicker.tsx   # 跑馬燈
│   │   ├── AlertHistory.tsx   # 警報歷史
│   │   ├── StockCard.tsx      # 股票卡片
│   │   ├── StockChart.tsx     # 價格圖表
│   │   └── StockDetailPanel.tsx # 詳情面板
│   └── lib/                   # 工具函數
│       ├── supabase.ts        # Supabase 客戶端
│       ├── ticker-utils.ts    # 警報邏輯
│       ├── realtime.ts        # WebSocket 訂閱
│       └── valuation.ts       # 估值計算
├── supabase/
│   └── migrations/            # 資料庫 Schema
├── docs/                      # 技術文檔
└── public/                    # 靜態資源
```

---

## 主要功能

### 1. 即時跑馬燈

顯示最重要的 15 筆警報,包含:
- 股票代號
- 警報訊息
- 變動百分比
- 圖示 (依警報類型)

**特色**:
- 自動滾動 (可調速度)
- Hover 暫停
- 點擊查看詳情

### 2. 警報歷史

右上角鈴鐺圖示,顯示最近 10 筆警報:
- 時間戳記 (相對時間)
- 警報類型圖示
- 詳細訊息
- 點擊跳轉股票詳情

### 3. 股票卡片

30 檔 SETHD 成分股,每張卡片顯示:
- 即時價格
- 漲跌幅 (顏色標示)
- 殖利率
- 估值分數 (0-100)

### 4. 估值雷達圖

5 個維度的視覺化分析:
- 殖利率 (Yield)
- 本益比 (P/E)
- 淨值比 (P/B)
- 成長性 (Growth)
- 穩定性 (Stability)

### 5. 價格圖表

互動式價格走勢圖:
- 最近 10 個交易日
- Hover 顯示詳細資訊
- 響應式設計

---

## 警報類型

系統支援 11 種警報類型,詳見 [FEATURES.md](docs/FEATURES.md)

---

## API 文檔

詳細的 API 端點說明,請參閱 [API.md](docs/API.md)

---

## 資料庫設計

完整的 Schema 設計與關聯圖,請參閱 [DATABASE.md](docs/DATABASE.md)

---

## 部署指南

Vercel 部署步驟與環境設定,請參閱 [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 系統架構

架構圖與技術決策說明,請參閱 [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 開發指南

### 新增警報類型

1. 更新 `MarketTicker.tsx` 的 `TickerItem` 類型
2. 在 `AlertHistory.tsx` 新增對應圖示
3. 在 `ticker-utils.ts` 實作 fetch 函數
4. 更新 `generateCombinedTickerItems()` 整合新警報

### 測試

```bash
npm run build    # 檢查 TypeScript 錯誤
npm run dev      # 啟動開發伺服器
```

### 程式碼風格

- 使用 TypeScript 嚴格模式
- 遵循 ESLint 規則
- 元件使用 PascalCase
- 函數使用 camelCase

---

## 授權

MIT License

---

## 聯絡方式

- GitHub: [@lawrence555-dev](https://github.com/lawrence555-dev)
- 專案連結: [thai-hd30-vision](https://github.com/lawrence555-dev/thai-hd30-vision)

---

## 更新日誌

### v2.0.0 (2026-02-17)
- 新增 5 種進階警報類型
- 完整技術文檔
- 自動儲存警報到資料庫
- 修復 changePercent null 錯誤

### v1.0.0 (2026-02-16)
- 初始版本
- 基本跑馬燈功能
- 6 種警報類型
- WebSocket 即時更新
