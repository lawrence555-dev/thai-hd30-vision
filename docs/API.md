# API 文檔

Thai HD30 Vision 的 API 端點與資料格式說明。

---

## REST API

### Cron Job API

#### POST /api/cron/update-prices

**用途**: 更新所有 30 檔股票的即時價格

**執行方式**:
```bash
curl http://localhost:3000/api/cron/update-prices
```

**回應格式**:
```json
{
  "success": true,
  "updated": 30,
  "details": [
    {
      "symbol": "KBANK",
      "price": 205,
      "isSimulated": false,
      "status": "success"
    }
  ]
}
```

**執行頻率**: 每 15 分鐘 (Vercel Cron)

**資料來源**: Google Finance

**處理流程**:
1. 遍歷 30 檔股票
2. 從 Google Finance 抓取價格
3. 更新 `stocks` 表
4. 插入 `price_logs` 記錄
5. 回傳結果

---

## Supabase Realtime

### WebSocket 訂閱

**訂閱表格**:
- `price_logs` - 價格更新
- `market_news` - 新聞發布
- `dividend_history` - 股息公告

**程式碼範例**:
```typescript
import { supabase } from '@/lib/supabase';

// 訂閱價格更新
const channel = supabase
  .channel('price-updates')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'price_logs'
    },
    (payload) => {
      console.log('New price:', payload.new);
    }
  )
  .subscribe();

// 取消訂閱
channel.unsubscribe();
```

**事件類型**:
- `INSERT` - 新增記錄
- `UPDATE` - 更新記錄
- `DELETE` - 刪除記錄

---

## Supabase Client API

### 查詢股票資料

```typescript
const { data, error } = await supabase
  .from('stocks')
  .select(`
    *,
    price_logs (
      price,
      change,
      change_percent
    )
  `)
  .order('symbol', { ascending: true });
```

### 查詢警報歷史

```typescript
const { data, error } = await supabase
  .from('ticker_alerts')
  .select(`
    *,
    stocks (symbol)
  `)
  .order('created_at', { ascending: false })
  .limit(10);
```

### 插入警報

```typescript
const { error } = await supabase
  .from('ticker_alerts')
  .insert({
    stock_id: 'uuid',
    alert_type: 'price_surge',
    message: '大漲 5.5%',
    value: 205,
    change_percent: 5.5,
    severity: 'warning'
  });
```

---

## 資料格式

### TickerItem

```typescript
interface TickerItem {
  id: string;
  type: 'price_surge' | 'price_drop' | 'volume_spike' | 
        'high_yield' | 'dividend' | 'news_flash' | 
        'earnings_report' | 'investor_conference' | 
        'insider_trading' | 'foreign_flow' | 'technical_signal';
  symbol: string;
  message: string;
  value?: number;
  changePercent?: number;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
}
```

### StockData

```typescript
interface StockData {
  id: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  yield: number;
  volume?: number;
  avgVolume?: number;
}
```

---

## 錯誤處理

### HTTP 錯誤碼

- `200` - 成功
- `400` - 請求錯誤
- `401` - 未授權
- `500` - 伺服器錯誤

### Supabase 錯誤

```typescript
if (error) {
  console.error('Supabase error:', error.message);
  // 處理錯誤
}
```

---

## 速率限制

- Vercel: 每月 100GB 頻寬
- Supabase: 每月 500MB 資料庫
- Google Finance: 無官方限制,建議間隔 500ms

---

## 環境變數

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```
