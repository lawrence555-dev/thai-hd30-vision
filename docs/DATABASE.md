# 資料庫設計

Thai HD30 Vision 使用 Supabase (PostgreSQL) 作為主要資料庫。

---

## Schema 總覽

### 核心表格

- `stocks` - 股票基本資料
- `price_logs` - 價格歷史記錄
- `market_summary` - 市場統計資料

### 警報系統表格

- `ticker_alerts` - 警報歷史記錄
- `market_news` - 市場新聞
- `dividend_history` - 股息歷史

### 進階警報表格

- `earnings_reports` - 財報資料
- `investor_conferences` - 法說會資料
- `insider_trading` - 內部人交易
- `foreign_flow` - 外資動向
- `technical_indicators` - 技術指標

---

## 表格詳細設計

### stocks (股票基本資料)

**用途**: 儲存 SETHD 30 成分股的基本資訊

**欄位**:

| 欄位名稱 | 型別 | 說明 | 約束 |
|---------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| symbol | TEXT | 股票代號 | UNIQUE, NOT NULL |
| name_en | TEXT | 英文名稱 | |
| name_th | TEXT | 泰文名稱 | |
| sector | TEXT | 產業別 | |
| market_cap | NUMERIC(15,2) | 市值 | |
| current_yield | NUMERIC(5,2) | 目前殖利率 (%) | |
| avg_yield_5y | NUMERIC(5,2) | 5年平均殖利率 (%) | |
| created_at | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | 更新時間 | DEFAULT NOW() |

**索引**:
```sql
CREATE UNIQUE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_sector ON stocks(sector);
```

**範例資料**:
```sql
INSERT INTO stocks (symbol, name_en, sector, current_yield)
VALUES ('KBANK', 'Kasikornbank', 'Banking', 6.02);
```

---

### price_logs (價格歷史記錄)

**用途**: 儲存每次價格更新的歷史記錄

**欄位**:

| 欄位名稱 | 型別 | 說明 | 約束 |
|---------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| stock_id | UUID | 股票 ID | FOREIGN KEY → stocks(id) |
| price | NUMERIC(10,2) | 價格 | NOT NULL |
| change | NUMERIC(10,2) | 漲跌金額 | |
| change_percent | NUMERIC(5,2) | 漲跌幅 (%) | |
| captured_at | TIMESTAMPTZ | 抓取時間 | DEFAULT NOW() |

**索引**:
```sql
CREATE INDEX idx_price_logs_stock_time ON price_logs(stock_id, captured_at DESC);
```

**查詢範例**:
```sql
-- 取得 KBANK 最近 10 筆價格
SELECT * FROM price_logs
WHERE stock_id = (SELECT id FROM stocks WHERE symbol = 'KBANK')
ORDER BY captured_at DESC
LIMIT 10;
```

---

### ticker_alerts (警報歷史記錄)

**用途**: 儲存所有警報的歷史記錄

**欄位**:

| 欄位名稱 | 型別 | 說明 | 約束 |
|---------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| stock_id | UUID | 股票 ID | FOREIGN KEY → stocks(id) |
| alert_type | TEXT | 警報類型 | NOT NULL |
| message | TEXT | 警報訊息 | NOT NULL |
| value | NUMERIC | 數值 (如適用) | |
| change_percent | NUMERIC(5,2) | 變動百分比 | |
| severity | TEXT | 嚴重性 | DEFAULT 'info' |
| created_at | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |

**警報類型**:
- `price_surge` - 價格大漲
- `price_drop` - 價格大跌
- `volume_spike` - 成交量爆增
- `high_yield` - 高殖利率
- `dividend` - 股息公告
- `news_flash` - 新聞快訊
- `earnings_report` - 財報發布
- `investor_conference` - 法說會
- `insider_trading` - 內部人交易
- `foreign_flow` - 外資動向
- `technical_signal` - 技術指標

**索引**:
```sql
CREATE INDEX idx_alerts_stock_time ON ticker_alerts(stock_id, created_at DESC);
CREATE INDEX idx_alerts_type ON ticker_alerts(alert_type);
CREATE INDEX idx_alerts_time ON ticker_alerts(created_at DESC);
```

**自動清理 Trigger**:
```sql
CREATE OR REPLACE FUNCTION cleanup_old_alerts()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM ticker_alerts
  WHERE stock_id = NEW.stock_id
  AND id NOT IN (
    SELECT id FROM ticker_alerts
    WHERE stock_id = NEW.stock_id
    ORDER BY created_at DESC
    LIMIT 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_alerts
AFTER INSERT ON ticker_alerts
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_alerts();
```

---

### market_news (市場新聞)

**用途**: 儲存市場新聞與中文翻譯

**欄位**:

| 欄位名稱 | 型別 | 說明 | 約束 |
|---------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| stock_id | UUID | 股票 ID | FOREIGN KEY → stocks(id) |
| title_original | TEXT | 原文標題 | NOT NULL |
| title_zh | TEXT | 中文標題 | NOT NULL |
| content_original | TEXT | 原文內容 | |
| content_zh | TEXT | 中文內容 | |
| source | TEXT | 新聞來源 | |
| news_type | TEXT | 新聞類型 | |
| published_at | TIMESTAMPTZ | 發布時間 | NOT NULL |
| created_at | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |

**索引**:
```sql
CREATE INDEX idx_news_stock_time ON market_news(stock_id, published_at DESC);
CREATE INDEX idx_news_time ON market_news(published_at DESC);
```

---

### earnings_reports (財報資料)

**用途**: 儲存季度財報資料

**欄位**:

| 欄位名稱 | 型別 | 說明 | 約束 |
|---------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| stock_id | UUID | 股票 ID | FOREIGN KEY → stocks(id) |
| report_date | DATE | 財報日期 | NOT NULL |
| quarter | INTEGER | 季度 (1-4) | CHECK (1-4) |
| year | INTEGER | 年度 | NOT NULL |
| revenue | NUMERIC(15,2) | 營收 | |
| revenue_yoy_growth | NUMERIC(5,2) | 營收年增率 (%) | |
| net_income | NUMERIC(15,2) | 淨利 | |
| eps | NUMERIC(10,2) | 每股盈餘 | |
| eps_estimate | NUMERIC(10,2) | EPS 預估值 | |
| eps_surprise | NUMERIC(5,2) | EPS 驚喜度 (%) | |
| created_at | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |

**索引**:
```sql
CREATE INDEX idx_earnings_stock_date ON earnings_reports(stock_id, report_date DESC);
```

**計算 EPS 驚喜度**:
```sql
eps_surprise = ((eps - eps_estimate) / eps_estimate) * 100
```

---

### investor_conferences (法說會資料)

**用途**: 儲存法人說明會資訊

**欄位**:

| 欄位名稱 | 型別 | 說明 | 約束 |
|---------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| stock_id | UUID | 股票 ID | FOREIGN KEY → stocks(id) |
| conference_date | TIMESTAMPTZ | 會議時間 | NOT NULL |
| title | TEXT | 會議標題 | NOT NULL |
| description | TEXT | 會議說明 | |
| location | TEXT | 地點 | |
| is_online | BOOLEAN | 是否線上 | DEFAULT false |
| webcast_url | TEXT | 直播連結 | |
| created_at | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |

**索引**:
```sql
CREATE INDEX idx_conferences_stock_date ON investor_conferences(stock_id, conference_date DESC);
```

---

### insider_trading (內部人交易)

**用途**: 儲存董監事交易記錄

**欄位**:

| 欄位名稱 | 型別 | 說明 | 約束 |
|---------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| stock_id | UUID | 股票 ID | FOREIGN KEY → stocks(id) |
| transaction_date | DATE | 交易日期 | NOT NULL |
| insider_name | TEXT | 內部人姓名 | NOT NULL |
| insider_position | TEXT | 職位 | |
| transaction_type | TEXT | 交易類型 | CHECK (buy/sell) |
| shares | BIGINT | 股數 | NOT NULL |
| price | NUMERIC(10,2) | 成交價 | |
| total_value | NUMERIC(15,2) | 總金額 | |
| ownership_after | NUMERIC(5,2) | 交易後持股比例 (%) | |
| created_at | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |

**索引**:
```sql
CREATE INDEX idx_insider_stock_date ON insider_trading(stock_id, transaction_date DESC);
CREATE INDEX idx_insider_type ON insider_trading(transaction_type);
```

---

### foreign_flow (外資動向)

**用途**: 儲存外資每日買賣超資料

**欄位**:

| 欄位名稱 | 型別 | 說明 | 約束 |
|---------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| stock_id | UUID | 股票 ID | FOREIGN KEY → stocks(id) |
| trade_date | DATE | 交易日期 | NOT NULL |
| buy_volume | BIGINT | 買進股數 | DEFAULT 0 |
| sell_volume | BIGINT | 賣出股數 | DEFAULT 0 |
| net_volume | BIGINT | 淨買賣超 | |
| buy_value | NUMERIC(15,2) | 買進金額 | |
| sell_value | NUMERIC(15,2) | 賣出金額 | |
| net_value | NUMERIC(15,2) | 淨買賣超金額 | |
| ownership_percent | NUMERIC(5,2) | 外資持股比例 (%) | |
| created_at | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |

**約束**:
```sql
UNIQUE(stock_id, trade_date)
```

**索引**:
```sql
CREATE INDEX idx_foreign_stock_date ON foreign_flow(stock_id, trade_date DESC);
CREATE INDEX idx_foreign_net ON foreign_flow(net_volume DESC);
```

**計算淨買賣超**:
```sql
net_volume = buy_volume - sell_volume
net_value = buy_value - sell_value
```

---

### technical_indicators (技術指標)

**用途**: 儲存每日技術指標計算結果

**欄位**:

| 欄位名稱 | 型別 | 說明 | 約束 |
|---------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| stock_id | UUID | 股票 ID | FOREIGN KEY → stocks(id) |
| indicator_date | DATE | 指標日期 | NOT NULL |
| rsi_14 | NUMERIC(5,2) | RSI (14日) | |
| macd | NUMERIC(10,4) | MACD 值 | |
| macd_signal | NUMERIC(10,4) | MACD 訊號線 | |
| macd_histogram | NUMERIC(10,4) | MACD 柱狀圖 | |
| ma_5 | NUMERIC(10,2) | 5日均線 | |
| ma_20 | NUMERIC(10,2) | 20日均線 | |
| ma_60 | NUMERIC(10,2) | 60日均線 | |
| bb_upper | NUMERIC(10,2) | 布林通道上軌 | |
| bb_middle | NUMERIC(10,2) | 布林通道中軌 | |
| bb_lower | NUMERIC(10,2) | 布林通道下軌 | |
| created_at | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |

**約束**:
```sql
UNIQUE(stock_id, indicator_date)
```

**索引**:
```sql
CREATE INDEX idx_technical_stock_date ON technical_indicators(stock_id, indicator_date DESC);
CREATE INDEX idx_technical_rsi ON technical_indicators(rsi_14);
```

**自動清理 Trigger** (保留 1 年):
```sql
CREATE OR REPLACE FUNCTION cleanup_old_technical_data()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM technical_indicators
  WHERE indicator_date < CURRENT_DATE - INTERVAL '1 year';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Row Level Security (RLS)

所有表格都啟用 RLS,並設定公開讀取與寫入政策。

### 讀取政策

```sql
CREATE POLICY "Allow public read on [table]" ON [table]
FOR SELECT USING (true);
```

### 寫入政策

```sql
CREATE POLICY "Allow public insert on [table]" ON [table]
FOR INSERT WITH CHECK (true);
```

**適用表格**:
- ticker_alerts
- market_news
- earnings_reports
- investor_conferences
- insider_trading
- foreign_flow
- technical_indicators

---

## Migration 檔案

### 001_news_and_alerts.sql

建立基礎警報系統:
- `market_news` 表
- `ticker_alerts` 表
- 索引與 RLS 政策
- 自動清理 Trigger
- 測試資料

### 002_advanced_alerts.sql

建立進階警報系統:
- `earnings_reports` 表
- `investor_conferences` 表
- `insider_trading` 表
- `foreign_flow` 表
- `technical_indicators` 表
- 索引與 RLS 政策
- 自動清理 Trigger
- 測試資料

---

## 資料關聯圖

```
stocks (1) ──< (N) price_logs
stocks (1) ──< (N) ticker_alerts
stocks (1) ──< (N) market_news
stocks (1) ──< (N) dividend_history
stocks (1) ──< (N) earnings_reports
stocks (1) ──< (N) investor_conferences
stocks (1) ──< (N) insider_trading
stocks (1) ──< (N) foreign_flow
stocks (1) ──< (N) technical_indicators
```

所有警報相關表格都透過 `stock_id` 與 `stocks` 表關聯。

---

## 查詢範例

### 取得股票最新價格

```sql
SELECT 
  s.symbol,
  s.name_en,
  pl.price,
  pl.change_percent
FROM stocks s
LEFT JOIN LATERAL (
  SELECT price, change_percent
  FROM price_logs
  WHERE stock_id = s.id
  ORDER BY captured_at DESC
  LIMIT 1
) pl ON true
ORDER BY s.symbol;
```

### 取得最近 10 筆警報

```sql
SELECT 
  ta.*,
  s.symbol
FROM ticker_alerts ta
JOIN stocks s ON ta.stock_id = s.id
ORDER BY ta.created_at DESC
LIMIT 10;
```

### 取得 KBANK 財報歷史

```sql
SELECT 
  er.*
FROM earnings_reports er
JOIN stocks s ON er.stock_id = s.id
WHERE s.symbol = 'KBANK'
ORDER BY er.report_date DESC;
```

### 取得外資連續買超股票

```sql
SELECT 
  s.symbol,
  COUNT(*) as consecutive_days,
  SUM(ff.net_volume) as total_net_volume
FROM foreign_flow ff
JOIN stocks s ON ff.stock_id = s.id
WHERE ff.trade_date >= CURRENT_DATE - INTERVAL '5 days'
  AND ff.net_volume > 0
GROUP BY s.symbol
HAVING COUNT(*) >= 3
ORDER BY total_net_volume DESC;
```

### 取得 RSI 超賣股票

```sql
SELECT 
  s.symbol,
  ti.rsi_14,
  ti.indicator_date
FROM technical_indicators ti
JOIN stocks s ON ti.stock_id = s.id
WHERE ti.indicator_date = CURRENT_DATE
  AND ti.rsi_14 < 30
ORDER BY ti.rsi_14 ASC;
```

---

## 效能優化

### 索引策略

1. **複合索引**: `(stock_id, date DESC)` 用於時間序列查詢
2. **單欄索引**: `symbol`, `alert_type`, `rsi_14` 用於篩選
3. **唯一索引**: 避免重複資料

### 查詢優化

1. **LATERAL JOIN**: 取得每支股票的最新記錄
2. **LIMIT**: 限制結果數量
3. **WHERE 條件**: 使用索引欄位

### 資料清理

1. **Trigger 自動清理**: 避免手動維護
2. **保留期限**: 
   - ticker_alerts: 每股 100 筆
   - technical_indicators: 1 年

---

## 備份策略

### Supabase 自動備份

- 每日自動備份
- 保留 7 天
- 可手動還原

### 手動備份

```bash
pg_dump -h [host] -U [user] -d [database] > backup.sql
```

### 還原

```bash
psql -h [host] -U [user] -d [database] < backup.sql
```

---

## 監控指標

### 資料庫大小

```sql
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as db_size;
```

### 表格大小

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 索引使用率

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 常見問題

**Q: 如何新增股票?**

A: 在 `stocks` 表插入新記錄,確保 `symbol` 唯一。

**Q: 警報會自動刪除嗎?**

A: 是的,Trigger 會自動保留每股最近 100 筆警報。

**Q: 如何手動清理舊資料?**

A: 
```sql
DELETE FROM technical_indicators
WHERE indicator_date < CURRENT_DATE - INTERVAL '1 year';
```

**Q: RLS 政策如何運作?**

A: 允許所有人讀取和寫入,適合公開資料。生產環境建議加強權限控制。
