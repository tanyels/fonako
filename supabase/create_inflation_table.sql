-- Run this in Supabase SQL Editor to create the inflation_data table

CREATE TABLE IF NOT EXISTS inflation_data (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,           -- 'tuik', 'enag', 'fed', 'konut'
  year_month TEXT NOT NULL,       -- '2025-03'
  index_value DECIMAL(12,4),     -- raw CPI index (null for ENAG)
  monthly_change DECIMAL(8,4),   -- MoM % change
  annual_change DECIMAL(8,4),    -- rolling 12m YoY %
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, year_month)
);

CREATE INDEX IF NOT EXISTS idx_inflation_data_source ON inflation_data(source, year_month);

ALTER TABLE inflation_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON inflation_data FOR SELECT USING (true);
