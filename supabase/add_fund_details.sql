-- fund_details: one row per fund, daily upsert with latest TEFAS metadata
CREATE TABLE fund_details (
  fund_code TEXT PRIMARY KEY REFERENCES funds(code),
  market_cap DECIMAL(18,2),
  number_of_shares DECIMAL(18,2),
  number_of_investors INTEGER,
  asset_allocation JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fund_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON fund_details
  FOR SELECT USING (true);

CREATE POLICY "Service role write" ON fund_details
  FOR ALL USING (auth.role() = 'service_role');
