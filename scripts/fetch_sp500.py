"""
Fetch S&P 500 (^GSPC) daily closing prices from Yahoo Finance and store in Supabase.

Usage:
  python fetch_sp500.py --backfill 1825   # Backfill last 5 years
  python fetch_sp500.py --daily            # Fetch last 5 days (for cron)
"""

import argparse
from datetime import datetime, timedelta
import yfinance as yf
from supabase import create_client

# ── Supabase config ──
SUPABASE_URL = 'https://lenjxstmgwcqmbpjjfoa.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlbmp4c3RtZ3djcW1icGpqZm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0MTA4OCwiZXhwIjoyMDg1NzE3MDg4fQ.7Utc05OtoGYzf1Hkofchbsv_P4jXELwu73Vr5zB-8Yg'

sb = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_sp500(start: str, end: str):
    """Fetch S&P 500 closing prices and upsert to sp500_prices table."""
    print(f"[SP500] Fetching {start} → {end} ...")

    try:
        ticker = yf.Ticker('^GSPC')
        df = ticker.history(start=start, end=end)
    except Exception as e:
        print(f"[SP500] yfinance error: {e}")
        return 0

    if df.empty:
        print("[SP500] No data returned")
        return 0

    print(f"[SP500] Got {len(df)} trading days")

    rows = []
    for date_idx, row in df.iterrows():
        date_str = date_idx.strftime('%Y-%m-%d')
        close = round(float(row['Close']), 2)
        rows.append({
            'date': date_str,
            'close_usd': close,
        })

    # Upsert in batches
    written = 0
    batch_size = 500
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            sb.table('sp500_prices').upsert(batch, on_conflict='date').execute()
            written += len(batch)
        except Exception as e:
            print(f"[SP500] DB error batch {i}: {e}")

    print(f"[SP500] Wrote {written} rows")
    return written


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Fetch S&P 500 prices')
    parser.add_argument('--backfill', type=int, metavar='DAYS', help='Backfill last N days')
    parser.add_argument('--daily', action='store_true', help='Fetch last 5 days')
    args = parser.parse_args()

    today = datetime.now()

    if args.backfill:
        start = (today - timedelta(days=args.backfill)).strftime('%Y-%m-%d')
        end = today.strftime('%Y-%m-%d')
        fetch_sp500(start, end)
    elif args.daily:
        start = (today - timedelta(days=5)).strftime('%Y-%m-%d')
        end = today.strftime('%Y-%m-%d')
        fetch_sp500(start, end)
    else:
        # Default: fetch last 5 days
        start = (today - timedelta(days=5)).strftime('%Y-%m-%d')
        end = today.strftime('%Y-%m-%d')
        fetch_sp500(start, end)
