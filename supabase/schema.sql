-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: stocks
-- Stores basic information about the SETHD 30 stocks
create table stocks (
  id uuid primary key default uuid_generate_v4(),
  symbol text not null unique,
  name_en text,
  name_th text,
  sector text,
  market_cap numeric, -- in THB
  description text,
  logo_url text,
  currency text default 'THB',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Table: dividend_history
-- Stores historical dividend payouts for analysis
create table dividend_history (
  id uuid primary key default uuid_generate_v4(),
  stock_id uuid references stocks(id) on delete cascade not null,
  ex_date date not null,
  payment_date date,
  amount numeric not null, -- Dividend per share
  type text, -- e.g., 'Cash', 'Stock'
  created_at timestamp with time zone default now()
);

-- Table: price_logs
-- Stores intraday or daily price snapshots for charting
create table price_logs (
  id uuid primary key default uuid_generate_v4(),
  stock_id uuid references stocks(id) on delete cascade not null,
  price numeric not null,
  change numeric,
  change_percent numeric,
  volume numeric,
  captured_at timestamp with time zone default now()
);

-- Indexing for performance
create index idx_dividend_stock_id on dividend_history(stock_id);
create index idx_price_logs_stock_id_time on price_logs(stock_id, captured_at desc);

-- RLS Policies (Optional: Enable if needed for public read)
alter table stocks enable row level security;
create policy "Allow public read on stocks" on stocks for select using (true);

alter table dividend_history enable row level security;
create policy "Allow public read on dividends" on dividend_history for select using (true);

alter table price_logs enable row level security;
create policy "Allow public read on prices" on price_logs for select using (true);
