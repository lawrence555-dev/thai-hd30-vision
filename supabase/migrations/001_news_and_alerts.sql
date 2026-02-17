-- ============================================
-- Thai HD30 Vision - 資料庫 Migration
-- 執行方式: 複製此 SQL 到 Supabase Dashboard > SQL Editor 執行
-- ============================================

-- 1. 建立市場新聞表 (支援中文翻譯)
CREATE TABLE IF NOT EXISTS market_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE,
  title_original TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  content_original TEXT,
  content_zh TEXT,
  source TEXT,
  news_type TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立警報歷史表
CREATE TABLE IF NOT EXISTS ticker_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  value NUMERIC,
  change_percent NUMERIC,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 建立索引
CREATE INDEX IF NOT EXISTS idx_market_news_stock_id ON market_news(stock_id);
CREATE INDEX IF NOT EXISTS idx_market_news_published ON market_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticker_alerts_stock_id ON ticker_alerts(stock_id);
CREATE INDEX IF NOT EXISTS idx_ticker_alerts_created ON ticker_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticker_alerts_type ON ticker_alerts(alert_type);

-- 4. 啟用 RLS (Row Level Security)
ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticker_alerts ENABLE ROW LEVEL SECURITY;

-- 5. 建立 RLS 政策 (允許公開讀取)
DROP POLICY IF EXISTS "Allow public read on news" ON market_news;
CREATE POLICY "Allow public read on news" ON market_news FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on alerts" ON ticker_alerts;
CREATE POLICY "Allow public read on alerts" ON ticker_alerts FOR SELECT USING (true);

-- 6. 建立自動清理函數 (保留每支股票最近 100 筆警報)
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

-- 7. 建立 Trigger (插入新警報時自動清理舊警報)
DROP TRIGGER IF EXISTS trigger_cleanup_alerts ON ticker_alerts;
CREATE TRIGGER trigger_cleanup_alerts
AFTER INSERT ON ticker_alerts
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_alerts();

-- ============================================
-- 測試資料 (可選)
-- ============================================

-- 插入測試新聞
INSERT INTO market_news (stock_id, title_original, title_zh, source, news_type, published_at)
SELECT 
  id,
  'PTT announces Q4 earnings report',
  'PTT 公布第四季財報',
  'SET News',
  'earnings',
  NOW()
FROM stocks WHERE symbol = 'PTT'
LIMIT 1;

-- 插入測試警報
INSERT INTO ticker_alerts (stock_id, alert_type, message, change_percent, severity)
SELECT 
  id,
  'price_surge',
  '大漲 8.50%',
  8.50,
  'warning'
FROM stocks WHERE symbol = 'SCB'
LIMIT 1;

-- ============================================
-- 驗證
-- ============================================

-- 檢查表格是否建立成功
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('market_news', 'ticker_alerts');

-- 檢查索引
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('market_news', 'ticker_alerts')
ORDER BY tablename, indexname;

-- 檢查 RLS 政策
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('market_news', 'ticker_alerts');
