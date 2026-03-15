-- Göstergeç Database Schema
-- Run this in Supabase SQL Editor to create the tables

-- Funds master table
CREATE TABLE funds (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  manager TEXT,
  inception_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fund daily prices (historical)
CREATE TABLE fund_prices (
  id BIGSERIAL PRIMARY KEY,
  fund_code TEXT NOT NULL REFERENCES funds(code),
  date DATE NOT NULL,
  price_try DECIMAL(18, 6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(fund_code, date)
);

-- Exchange rates (historical)
CREATE TABLE exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  usd_try DECIMAL(10, 4) NOT NULL,
  eur_try DECIMAL(10, 4) NOT NULL,
  gold_try_gram DECIMAL(10, 2) NOT NULL,
  gold_usd_oz DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time rates cache (updated every minute)
CREATE TABLE live_rates (
  id INTEGER PRIMARY KEY DEFAULT 1,
  usd_try DECIMAL(10, 4) NOT NULL,
  eur_try DECIMAL(10, 4) NOT NULL,
  gold_try_gram DECIMAL(10, 2) NOT NULL,
  gold_usd_oz DECIMAL(10, 2) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Pre-calculated fund returns (for leaderboard)
CREATE TABLE fund_returns (
  id BIGSERIAL PRIMARY KEY,
  fund_code TEXT NOT NULL REFERENCES funds(code),
  period TEXT NOT NULL, -- '1Y', '3Y', '5Y', '10Y'
  try_return DECIMAL(10, 2),
  usd_return DECIMAL(10, 2),
  eur_return DECIMAL(10, 2),
  gold_return DECIMAL(10, 2),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(fund_code, period)
);

-- Inflation data (monthly CPI indices)
CREATE TABLE inflation_data (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,           -- 'tuik', 'enag', 'fed', 'konut'
  year_month TEXT NOT NULL,       -- '2025-03'
  index_value DECIMAL(12,4),     -- raw CPI index (null for ENAG)
  monthly_change DECIMAL(8,4),   -- MoM % change
  annual_change DECIMAL(8,4),    -- rolling 12m YoY %
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, year_month)
);

-- Indexes for performance
CREATE INDEX idx_fund_prices_code_date ON fund_prices(fund_code, date);
CREATE INDEX idx_exchange_rates_date ON exchange_rates(date);
CREATE INDEX idx_fund_returns_period ON fund_returns(period);
CREATE INDEX idx_inflation_data_source ON inflation_data(source, year_month);

-- Row Level Security (optional, for public access)
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inflation_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access" ON funds FOR SELECT USING (true);
CREATE POLICY "Public read access" ON fund_prices FOR SELECT USING (true);
CREATE POLICY "Public read access" ON exchange_rates FOR SELECT USING (true);
CREATE POLICY "Public read access" ON fund_returns FOR SELECT USING (true);
CREATE POLICY "Public read access" ON live_rates FOR SELECT USING (true);
CREATE POLICY "Public read access" ON inflation_data FOR SELECT USING (true);
