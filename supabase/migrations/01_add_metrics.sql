-- Migration: Add financial metrics to stocks table
-- Run this in Supabase SQL Editor or via migration script

ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS pe_ratio numeric,
ADD COLUMN IF NOT EXISTS pb_ratio numeric,
ADD COLUMN IF NOT EXISTS payout_ratio numeric,
ADD COLUMN IF NOT EXISTS revenue_growth_yoy numeric,
ADD COLUMN IF NOT EXISTS profit_growth_yoy numeric;

-- Comment on columns for clarity
COMMENT ON COLUMN stocks.pe_ratio IS 'Price-to-Earnings Ratio';
COMMENT ON COLUMN stocks.pb_ratio IS 'Price-to-Book Ratio';
COMMENT ON COLUMN stocks.payout_ratio IS 'Dividend Payout Ratio (%)';
COMMENT ON COLUMN stocks.revenue_growth_yoy IS 'Revenue Growth Year-over-Year (%)';
COMMENT ON COLUMN stocks.profit_growth_yoy IS 'Net Profit Growth Year-over-Year (%)';
