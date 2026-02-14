-- Migration: Add 52-week High/Low to stocks table
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS year_high numeric,
ADD COLUMN IF NOT EXISTS year_low numeric;

COMMENT ON COLUMN stocks.year_high IS '52-Week High Price';
COMMENT ON COLUMN stocks.year_low IS '52-Week Low Price';
