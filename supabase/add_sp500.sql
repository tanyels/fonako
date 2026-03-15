-- S&P 500 daily prices table
CREATE TABLE IF NOT EXISTS sp500_prices (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  close_usd DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_sp500_prices_date ON sp500_prices (date);

-- Add sp500_return column to fund_returns
ALTER TABLE fund_returns
  ADD COLUMN IF NOT EXISTS sp500_return DECIMAL(10,2);

-- RLS policies for sp500_prices (read-only for anon)
ALTER TABLE sp500_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on sp500_prices"
  ON sp500_prices FOR SELECT
  USING (true);

CREATE POLICY "Allow service role insert/update on sp500_prices"
  ON sp500_prices FOR ALL
  USING (true)
  WITH CHECK (true);
