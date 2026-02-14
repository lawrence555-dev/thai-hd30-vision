-- Migration 02: Add direct price columns to stocks table for caching
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS price numeric,
ADD COLUMN IF NOT EXISTS change numeric,
ADD COLUMN IF NOT EXISTS change_percent numeric;

COMMENT ON COLUMN stocks.price IS 'Latest cached price';
