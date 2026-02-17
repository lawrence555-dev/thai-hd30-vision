-- =====================================================
-- Migration 002: Advanced Alert System
-- =====================================================
-- 建立進階警報系統所需的資料表
-- 包含: 財報、法說會、內部人交易、外資動向、技術指標

-- =====================================================
-- 1. 財報資料表 (Earnings Reports)
-- =====================================================
CREATE TABLE IF NOT EXISTS earnings_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  report_date DATE NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year INTEGER NOT NULL,
  revenue NUMERIC(15, 2),
  revenue_yoy_growth NUMERIC(5, 2), -- 年增率 (%)
  net_income NUMERIC(15, 2),
  eps NUMERIC(10, 2),
  eps_estimate NUMERIC(10, 2),
  eps_surprise NUMERIC(5, 2), -- EPS 驚喜度 (%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_earnings_stock_date ON earnings_reports(stock_id, report_date DESC);
CREATE INDEX idx_earnings_date ON earnings_reports(report_date DESC);

-- =====================================================
-- 2. 法人說明會資料表 (Investor Conferences)
-- =====================================================
CREATE TABLE IF NOT EXISTS investor_conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  conference_date TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  is_online BOOLEAN DEFAULT false,
  webcast_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conferences_stock_date ON investor_conferences(stock_id, conference_date DESC);
CREATE INDEX idx_conferences_date ON investor_conferences(conference_date DESC);

-- =====================================================
-- 3. 內部人交易資料表 (Insider Trading)
-- =====================================================
CREATE TABLE IF NOT EXISTS insider_trading (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  transaction_date DATE NOT NULL,
  insider_name TEXT NOT NULL,
  insider_position TEXT, -- 董事長、總經理、董事等
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  shares BIGINT NOT NULL,
  price NUMERIC(10, 2),
  total_value NUMERIC(15, 2),
  ownership_after NUMERIC(5, 2), -- 交易後持股比例 (%)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insider_stock_date ON insider_trading(stock_id, transaction_date DESC);
CREATE INDEX idx_insider_date ON insider_trading(transaction_date DESC);
CREATE INDEX idx_insider_type ON insider_trading(transaction_type);

-- =====================================================
-- 4. 外資動向資料表 (Foreign Investor Flow)
-- =====================================================
CREATE TABLE IF NOT EXISTS foreign_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  trade_date DATE NOT NULL,
  buy_volume BIGINT DEFAULT 0,
  sell_volume BIGINT DEFAULT 0,
  net_volume BIGINT, -- 淨買賣超 (正數為買超，負數為賣超)
  buy_value NUMERIC(15, 2),
  sell_value NUMERIC(15, 2),
  net_value NUMERIC(15, 2),
  ownership_percent NUMERIC(5, 2), -- 外資持股比例 (%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stock_id, trade_date)
);

CREATE INDEX idx_foreign_stock_date ON foreign_flow(stock_id, trade_date DESC);
CREATE INDEX idx_foreign_date ON foreign_flow(trade_date DESC);
CREATE INDEX idx_foreign_net ON foreign_flow(net_volume DESC);

-- =====================================================
-- 5. 技術指標資料表 (Technical Indicators)
-- =====================================================
CREATE TABLE IF NOT EXISTS technical_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  indicator_date DATE NOT NULL,
  rsi_14 NUMERIC(5, 2), -- RSI (14日)
  macd NUMERIC(10, 4),
  macd_signal NUMERIC(10, 4),
  macd_histogram NUMERIC(10, 4),
  ma_5 NUMERIC(10, 2), -- 5日均線
  ma_20 NUMERIC(10, 2), -- 20日均線
  ma_60 NUMERIC(10, 2), -- 60日均線
  bb_upper NUMERIC(10, 2), -- 布林通道上軌
  bb_middle NUMERIC(10, 2), -- 布林通道中軌
  bb_lower NUMERIC(10, 2), -- 布林通道下軌
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stock_id, indicator_date)
);

CREATE INDEX idx_technical_stock_date ON technical_indicators(stock_id, indicator_date DESC);
CREATE INDEX idx_technical_date ON technical_indicators(indicator_date DESC);
CREATE INDEX idx_technical_rsi ON technical_indicators(rsi_14);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE earnings_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE insider_trading ENABLE ROW LEVEL SECURITY;
ALTER TABLE foreign_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_indicators ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read on earnings" ON earnings_reports FOR SELECT USING (true);
CREATE POLICY "Allow public read on conferences" ON investor_conferences FOR SELECT USING (true);
CREATE POLICY "Allow public read on insider" ON insider_trading FOR SELECT USING (true);
CREATE POLICY "Allow public read on foreign" ON foreign_flow FOR SELECT USING (true);
CREATE POLICY "Allow public read on technical" ON technical_indicators FOR SELECT USING (true);

-- Allow public insert (for cron jobs)
CREATE POLICY "Allow public insert on earnings" ON earnings_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on conferences" ON investor_conferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on insider" ON insider_trading FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on foreign" ON foreign_flow FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on technical" ON technical_indicators FOR INSERT WITH CHECK (true);

-- =====================================================
-- 測試資料 (Sample Data)
-- =====================================================

-- 財報測試資料
INSERT INTO earnings_reports (stock_id, report_date, quarter, year, revenue, revenue_yoy_growth, net_income, eps, eps_estimate, eps_surprise)
SELECT 
  id,
  CURRENT_DATE - INTERVAL '30 days',
  4,
  2025,
  50000000000,
  25.5,
  8000000000,
  12.50,
  10.00,
  25.0
FROM stocks WHERE symbol = 'KBANK'
ON CONFLICT DO NOTHING;

-- 法說會測試資料
INSERT INTO investor_conferences (stock_id, conference_date, title, description, is_online, webcast_url)
SELECT 
  id,
  CURRENT_DATE + INTERVAL '7 days',
  '2026 Q1 法人說明會',
  '說明 2026 年第一季營運狀況與未來展望',
  true,
  'https://example.com/webcast'
FROM stocks WHERE symbol = 'PTT'
ON CONFLICT DO NOTHING;

-- 內部人交易測試資料
INSERT INTO insider_trading (stock_id, transaction_date, insider_name, insider_position, transaction_type, shares, price, total_value, ownership_after)
SELECT 
  id,
  CURRENT_DATE - INTERVAL '5 days',
  '董事長 陳XX',
  '董事長',
  'buy',
  1000000,
  205.00,
  205000000,
  5.2
FROM stocks WHERE symbol = 'KBANK'
ON CONFLICT DO NOTHING;

-- 外資動向測試資料
INSERT INTO foreign_flow (stock_id, trade_date, buy_volume, sell_volume, net_volume, buy_value, sell_value, net_value, ownership_percent)
SELECT 
  id,
  CURRENT_DATE - INTERVAL '1 day',
  5000000,
  2000000,
  3000000,
  1025000000,
  410000000,
  615000000,
  42.5
FROM stocks WHERE symbol = 'SCB'
ON CONFLICT (stock_id, trade_date) DO NOTHING;

-- 技術指標測試資料
INSERT INTO technical_indicators (stock_id, indicator_date, rsi_14, macd, macd_signal, macd_histogram, ma_5, ma_20, ma_60, bb_upper, bb_middle, bb_lower)
SELECT 
  id,
  CURRENT_DATE,
  72.5, -- RSI 超買
  2.5,
  1.8,
  0.7, -- MACD 金叉
  206.0,
  202.0,
  198.0,
  210.0,
  205.0,
  200.0
FROM stocks WHERE symbol = 'KBANK'
ON CONFLICT (stock_id, indicator_date) DO NOTHING;

-- =====================================================
-- 自動清理舊資料的 Trigger (保留最近 1 年)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_technical_data()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM technical_indicators
  WHERE indicator_date < CURRENT_DATE - INTERVAL '1 year';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_technical
AFTER INSERT ON technical_indicators
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_old_technical_data();
