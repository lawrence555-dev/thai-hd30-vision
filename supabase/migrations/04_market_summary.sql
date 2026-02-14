-- Migration: Create market_summary table for global indices
CREATE TABLE IF NOT EXISTS market_summary (
    key text PRIMARY KEY,
    value numeric,
    description text,
    updated_at timestamp with time zone default now()
);

-- Insert initial rows
INSERT INTO market_summary (key, value, description)
VALUES 
    ('set_index', 0, 'SET Index Value'),
    ('set_change', 0, 'SET Index Change'),
    ('set_change_percent', 0, 'SET Index Change Percent')
ON CONFLICT (key) DO NOTHING;
