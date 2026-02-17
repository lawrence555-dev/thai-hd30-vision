# 系統架構

Thai HD30 Vision 的技術架構與設計決策說明。

---

## 架構總覽

```
┌─────────────────────────────────────────────────────────┐
│                    使用者介面層                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 跑馬燈   │  │ 股票卡片 │  │ 警報歷史 │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    應用程式層                            │
│  ┌──────────────────────────────────────────────┐      │
│  │  Next.js 16 (App Router + TypeScript)       │      │
│  │  - React Server Components                   │      │
│  │  - Client Components                         │      │
│  │  - API Routes                                │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    資料存取層                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Supabase │  │ Realtime │  │ RLS      │              │
│  │ Client   │  │ WebSocket│  │ Policies │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    資料庫層                              │
│  ┌──────────────────────────────────────────────┐      │
│  │  PostgreSQL (Supabase)                       │      │
│  │  - 11 個表格                                 │      │
│  │  - 索引優化                                  │      │
│  │  - Trigger 自動清理                          │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    外部資料源                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Google   │  │ SET API  │  │ News API │              │
│  │ Finance  │  │ (預留)   │  │ (預留)   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

---

## 元件架構

### 頁面元件

- `app/page.tsx` - 主頁面
- `app/layout.tsx` - 全域佈局
- `app/globals.css` - 全域樣式

### UI 元件

- `MarketTicker.tsx` - 跑馬燈
- `AlertHistory.tsx` - 警報歷史
- `StockCard.tsx` - 股票卡片
- `StockChart.tsx` - 價格圖表
- `StockDetailPanel.tsx` - 詳情面板
- `ValuationCard.tsx` - 估值卡片

### 工具模組

- `lib/supabase.ts` - Supabase 客戶端
- `lib/ticker-utils.ts` - 警報邏輯
- `lib/realtime.ts` - WebSocket 訂閱
- `lib/valuation.ts` - 估值計算

---

## 資料流程

### 頁面載入流程

```
1. 使用者訪問 /
   ↓
2. Next.js SSR 渲染頁面
   ↓
3. 客戶端 hydration
   ↓
4. useEffect 觸發 fetchStocks()
   ↓
5. Supabase 查詢 stocks + price_logs
   ↓
6. generateCombinedTickerItems()
   - 生成即時警報
   - 抓取新聞、股息、財報等
   ↓
7. 自動儲存前 10 筆警報到 ticker_alerts
   ↓
8. 訂閱 WebSocket (price_logs, market_news)
   ↓
9. 渲染 UI
```

### WebSocket 更新流程

```
1. 資料庫有新記錄 (INSERT)
   ↓
2. Supabase Realtime 推送事件
   ↓
3. 前端接收 payload
   ↓
4. 生成新 TickerItem
   ↓
5. 更新 tickerItems state
   ↓
6. React 重新渲染跑馬燈
```

### Cron Job 流程

```
1. Vercel Cron 觸發 (每 15 分鐘)
   ↓
2. /api/cron/update-prices
   ↓
3. 遍歷 30 檔股票
   ↓
4. Axios + Cheerio 抓取 Google Finance
   ↓
5. 更新 stocks 表
   ↓
6. 插入 price_logs 記錄
   ↓
7. Realtime 推送給所有訂閱者
```

---

## 技術決策

### 為什麼選擇 Next.js?

- Server Components 減少客戶端 bundle
- App Router 提供更好的路由體驗
- API Routes 簡化後端邏輯
- Vercel 無縫部署

### 為什麼選擇 Supabase?

- PostgreSQL 強大的關聯式資料庫
- Realtime 內建 WebSocket 支援
- RLS 提供安全的資料存取
- 免費額度適合 MVP

### 為什麼選擇 TypeScript?

- 型別安全減少 runtime 錯誤
- 更好的 IDE 支援
- 重構更容易
- 團隊協作更順暢

### 為什麼選擇 Tailwind CSS?

- Utility-first 快速開發
- 響應式設計簡單
- 深色模式支援
- 檔案大小小

---

## 效能優化

### 前端優化

- React.memo 避免不必要的重新渲染
- useMemo 快取計算結果
- 圖片 lazy loading
- Code splitting

### 資料庫優化

- 索引加速查詢
- LATERAL JOIN 取得最新記錄
- LIMIT 限制結果數量
- Trigger 自動清理舊資料

### 網路優化

- Vercel Edge Network CDN
- Gzip 壓縮
- HTTP/2
- 快取策略

---

## 安全性

### RLS 政策

所有表格啟用 Row Level Security,控制資料存取權限。

### 環境變數

敏感資訊儲存在環境變數,不提交到 Git。

### CORS

API Routes 設定適當的 CORS 標頭。

---

## 可擴展性

### 水平擴展

- Vercel 自動擴展
- Supabase 支援讀取副本

### 垂直擴展

- 升級 Supabase 方案
- 增加資料庫資源

### 功能擴展

- 模組化設計易於新增功能
- 警報類型可輕鬆擴充
- 支援多市場 (預留介面)

---

## 監控與日誌

### Vercel Analytics

- 頁面效能
- 使用者行為
- 錯誤追蹤

### Supabase Logs

- 資料庫查詢
- API 請求
- Realtime 連線

### Console Logs

- 開發環境除錯
- 生產環境移除

---

## 部署架構

```
GitHub Repo
    ↓
Vercel (自動部署)
    ↓
Edge Network (全球 CDN)
    ↓
使用者
```

**優點**:
- Git push 自動部署
- Preview 環境
- 零停機時間
- 全球低延遲
