"""
Göstergeç Daily Updater
Fetches all fund prices from TEFAS and exchange rates, writes to Supabase.
Designed to run as a daily cron job on the VPS.

Usage:
  python daily_update.py                # Normal daily update
  python daily_update.py --backfill 30  # Backfill last 30 days
"""

import argparse
import time
import requests
from datetime import datetime, timedelta
from tefas import Crawler
from supabase import create_client
import yfinance as yf

# ── Supabase config ──
SUPABASE_URL = 'https://lenjxstmgwcqmbpjjfoa.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlbmp4c3RtZ3djcW1icGpqZm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0MTA4OCwiZXhwIjoyMDg1NzE3MDg4fQ.7Utc05OtoGYzf1Hkofchbsv_P4jXELwu73Vr5zB-8Yg'

sb = create_client(SUPABASE_URL, SUPABASE_KEY)
crawler = Crawler()

# All asset allocation columns from tefas BreakdownSchema
ALLOCATION_FIELDS = [
    'stock', 'foreign_equity', 'government_bond', 'treasury_bill', 'eurobonds',
    'private_sector_bond', 'term_deposit', 'term_deposit_tl', 'term_deposit_d',
    'term_deposit_au', 'repo', 'reverse_repo', 'fund_participation_certificate',
    'precious_metals', 'derivatives', 'real_estate_certificate',
    'participation_account', 'participation_account_tl', 'participation_account_d',
    'participation_account_au', 'government_lease_certificates',
    'government_lease_certificates_tl', 'government_lease_certificates_d',
    'government_lease_certificates_foreign', 'private_sector_lease_certificates',
    'private_sector_international_lease_certificate', 'exchange_traded_fund',
    'foreign_exchange_traded_funds', 'real_estate_investment_fund_participation',
    'venture_capital_investment_fund_participation',
    'foreign_investment_fund_participation_shares',
    'public_domestic_debt_instruments', 'foreign_debt_instruments',
    'foreign_domestic_debt_instruments', 'foreign_private_sector_debt_instruments',
    'government_bonds_and_bills_fx', 'bank_bills', 'asset_backed_securities',
    'fx_payable_bills', 'foreign_currency_bills', 'commercial_paper',
    'precious_metals_byf', 'precious_metals_kba', 'precious_metals_kks',
    'tmm', 'futures_cash_collateral', 'foreign_securities',
    'private_sector_foreign_debt_instruments', 'other',
]


def upsert_fund_details(df):
    """Extract latest fund details from full TEFAS DataFrame and upsert to fund_details."""
    print("[DETAILS] Extracting fund details ...")

    # For each fund, keep only the most recent date's row
    latest = df.sort_values('date', ascending=False).drop_duplicates(subset='code', keep='first')

    rows = []
    for _, row in latest.iterrows():
        code = row['code']

        # Build asset allocation dict (only non-zero values)
        allocation = {}
        for field in ALLOCATION_FIELDS:
            if field in row.index:
                val = row[field]
                try:
                    val = float(val)
                except (ValueError, TypeError):
                    continue
                if val != 0.0:
                    allocation[field] = round(val, 4)

        detail = {
            'fund_code': code,
            'asset_allocation': allocation,
            'updated_at': datetime.now().isoformat(),
        }

        # Optional numeric fields
        if 'market_cap' in row.index and row['market_cap'] is not None:
            try:
                detail['market_cap'] = float(row['market_cap'])
            except (ValueError, TypeError):
                pass

        if 'number_of_shares' in row.index and row['number_of_shares'] is not None:
            try:
                detail['number_of_shares'] = float(row['number_of_shares'])
            except (ValueError, TypeError):
                pass

        if 'number_of_investors' in row.index and row['number_of_investors'] is not None:
            try:
                detail['number_of_investors'] = int(row['number_of_investors'])
            except (ValueError, TypeError):
                pass

        rows.append(detail)

    # Batch upsert
    written = 0
    for i in range(0, len(rows), 500):
        batch = rows[i:i + 500]
        try:
            sb.table('fund_details').upsert(batch, on_conflict='fund_code').execute()
            written += len(batch)
        except Exception as e:
            print(f"[DETAILS] DB error batch {i}: {e}")

    print(f"[DETAILS] Wrote {written} fund detail rows")
    return written


def fetch_fund_prices(start: str, end: str):
    """Fetch all fund prices from TEFAS for a date range and write to Supabase."""
    print(f"[FUNDS] Fetching {start} → {end} ...")

    try:
        df = crawler.fetch(start=start, end=end)
    except Exception as e:
        print(f"[FUNDS] TEFAS error: {e}")
        return 0

    if df.empty:
        print("[FUNDS] No data returned")
        return 0

    print(f"[FUNDS] Got {len(df)} rows for {df['code'].nunique()} funds")

    # Step 1: Update funds master table FIRST (foreign key dependency)
    funds_seen = {}
    for _, row in df.iterrows():
        code = row['code']
        if code not in funds_seen:
            title = row['title'] if 'title' in df.columns else code
            funds_seen[code] = {
                'code': code,
                'name': str(title),
                'category': categorize_fund(str(title)),
                'manager': extract_manager(str(title)),
            }

    fund_rows = list(funds_seen.values())
    for i in range(0, len(fund_rows), 500):
        batch = fund_rows[i:i + 500]
        try:
            sb.table('funds').upsert(batch, on_conflict='code').execute()
        except Exception as e:
            print(f"[FUNDS] Master table error: {e}")

    print(f"[FUNDS] Updated {len(fund_rows)} funds in master table")

    # Step 2: Upsert fund details (market_cap, investors, allocation)
    upsert_fund_details(df)

    # Step 3: Now insert fund prices
    rows = []
    for _, row in df.iterrows():
        rows.append({
            'fund_code': row['code'],
            'date': row['date'].strftime('%Y-%m-%d') if hasattr(row['date'], 'strftime') else str(row['date']),
            'price_try': float(row['price']),
        })

    batch_size = 500
    written = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            sb.table('fund_prices').upsert(batch, on_conflict='fund_code,date').execute()
            written += len(batch)
        except Exception as e:
            print(f"[FUNDS] DB error batch {i}: {e}")

    print(f"[FUNDS] Wrote {written} price rows")
    return written


def categorize_fund(name: str) -> str:
    """Simple category detection from fund name."""
    n = name.upper()
    if 'ALTIN' in n or 'GOLD' in n:
        return 'Altın'
    if 'HİSSE' in n or 'EQUITY' in n or 'BIST' in n:
        return 'Hisse'
    if 'TAHVİL' in n or 'BONO' in n or 'BOND' in n or 'BORÇLANMA' in n:
        return 'Tahvil'
    if 'PARA PİYASASI' in n or 'MONEY MARKET' in n or 'LİKİT' in n:
        return 'Para Piyasası'
    if 'DÖVİZ' in n or 'EURO' in n or 'DOLAR' in n or 'FOREIGN' in n or 'YABANCI' in n:
        return 'Döviz'
    if 'KATILIM' in n or 'PARTICIPATION' in n:
        return 'Katılım'
    if 'EMEKLİLİK' in n or 'BES' in n or 'PENSION' in n:
        return 'Emeklilik'
    if 'SERBEST' in n or 'HEDGE' in n:
        return 'Serbest'
    if 'KARMA' in n or 'MIXED' in n or 'DENGELİ' in n or 'BALANCED' in n:
        return 'Karma'
    if 'DEĞİŞKEN' in n or 'VARIABLE' in n:
        return 'Değişken'
    if 'FON SEPETİ' in n or 'FUND OF FUNDS' in n:
        return 'Fon Sepeti'
    return 'Diğer'


def extract_manager(name: str) -> str:
    """Extract portfolio manager from fund name."""
    managers = [
        'AK PORTFÖY', 'İŞ PORTFÖY', 'YAPI KREDİ PORTFÖY', 'GARANTİ PORTFÖY',
        'HALK PORTFÖY', 'ZİRAAT PORTFÖY', 'TEB PORTFÖY', 'QNB FİNANS PORTFÖY',
        'DENİZ PORTFÖY', 'VAKIF PORTFÖY', 'FİBABANKA PORTFÖY', 'HSBC PORTFÖY',
        'ING PORTFÖY', 'ECZACIBAŞI PORTFÖY', 'ATA PORTFÖY', 'ATLAS PORTFÖY',
        'İSTANBUL PORTFÖY', 'AZIMUT PORTFÖY', 'MEKSA PORTFÖY', 'ALLBATROSS PORTFÖY',
        'AK ASSET', 'İŞ ASSET', 'ISTANBUL ASSET', 'ATA ASSET', 'GARANTI ASSET',
    ]
    upper = name.upper()
    for m in managers:
        if m in upper:
            return m.title()
    # Fallback: first two words
    parts = name.split()
    return ' '.join(parts[:2]) if len(parts) >= 2 else name


def fetch_exchange_rates(start: str, end: str):
    """Fetch exchange rates from frankfurter.app and gold price."""
    print(f"[RATES] Fetching {start} → {end} ...")

    start_dt = datetime.strptime(start, '%Y-%m-%d')
    end_dt = datetime.strptime(end, '%Y-%m-%d')
    current = start_dt
    count = 0

    while current <= end_dt:
        if current.weekday() < 5:  # Skip weekends
            date_str = current.strftime('%Y-%m-%d')
            try:
                r = requests.get(
                    f'https://api.frankfurter.app/{date_str}?from=USD&to=TRY,EUR',
                    timeout=10
                )
                if r.status_code == 200:
                    data = r.json()
                    usd_try = data['rates']['TRY']
                    eur_try = usd_try / data['rates']['EUR']

                    # Gold price
                    gold_usd = fetch_gold_price()

                    rate = {
                        'date': date_str,
                        'usd_try': round(usd_try, 4),
                        'eur_try': round(eur_try, 4),
                        'gold_usd_oz': round(gold_usd, 2),
                        'gold_try_gram': round((gold_usd * usd_try) / 31.1035, 2),
                    }
                    sb.table('exchange_rates').upsert(rate, on_conflict='date').execute()
                    count += 1

                time.sleep(0.15)  # Rate limit
            except Exception as e:
                print(f"[RATES] Error {date_str}: {e}")

        current += timedelta(days=1)

    print(f"[RATES] Wrote {count} exchange rate rows")
    return count


def fetch_gold_price() -> float:
    """Fetch live gold price from gold-api.com."""
    try:
        r = requests.get('https://api.gold-api.com/price/XAU', timeout=10)
        if r.status_code == 200:
            price = r.json().get('price', 0)
            if price and price > 0:
                return float(price)
    except Exception:
        pass
    return 2900.0  # Fallback


def fetch_sp500_daily(start: str, end: str):
    """Fetch S&P 500 closing prices and upsert to sp500_prices."""
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

    rows = []
    for date_idx, row in df.iterrows():
        rows.append({
            'date': date_idx.strftime('%Y-%m-%d'),
            'close_usd': round(float(row['Close']), 2),
        })

    written = 0
    for i in range(0, len(rows), 500):
        batch = rows[i:i + 500]
        try:
            sb.table('sp500_prices').upsert(batch, on_conflict='date').execute()
            written += len(batch)
        except Exception as e:
            print(f"[SP500] DB error: {e}")

    print(f"[SP500] Wrote {written} rows")
    return written


def compute_fund_returns():
    """Pre-calculate fund returns for all periods: 1M, 6M, 1Y, 2Y, 3Y, 5Y, 10Y."""
    from datetime import date

    PERIODS = {
        '1M': 30,
        '6M': 182,
        '1Y': 365,
        '2Y': 730,
        '3Y': 1095,
        '5Y': 1825,
        '10Y': 3650,
    }

    # Maximum reasonable absolute TRY return per period (skip anything above)
    MAX_RETURN = {
        '1M': 100,
        '6M': 500,
        '1Y': 1000,
        '2Y': 2000,
        '3Y': 3000,
        '5Y': 5000,
        '10Y': 50000,
    }

    today = date.today()
    print(f"[RETURNS] Computing fund returns for {len(PERIODS)} periods ...")

    # Get all fund codes (paginate to avoid Supabase 1000-row default limit)
    all_codes = []
    offset = 0
    page_size = 1000
    while True:
        funds_resp = sb.table('funds').select('code').range(offset, offset + page_size - 1).execute()
        batch = [f['code'] for f in (funds_resp.data or [])]
        all_codes.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    print(f"[RETURNS] Found {len(all_codes)} funds")

    for period_key, days in PERIODS.items():
        start_date = (today - timedelta(days=days)).strftime('%Y-%m-%d')
        end_date = today.strftime('%Y-%m-%d')
        print(f"\n[RETURNS] {period_key}: {start_date} → {end_date}")

        # Get exchange rates for start and end
        start_rates = sb.table('exchange_rates') \
            .select('usd_try, eur_try, gold_try_gram') \
            .gte('date', start_date) \
            .order('date', desc=False) \
            .limit(1).execute()

        end_rates = sb.table('exchange_rates') \
            .select('usd_try, eur_try, gold_try_gram') \
            .lte('date', end_date) \
            .order('date', desc=True) \
            .limit(1).execute()

        # Get S&P 500 prices for start and end
        start_sp500 = sb.table('sp500_prices') \
            .select('close_usd') \
            .gte('date', start_date) \
            .order('date', desc=False) \
            .limit(1).execute()

        end_sp500 = sb.table('sp500_prices') \
            .select('close_usd') \
            .lte('date', end_date) \
            .order('date', desc=True) \
            .limit(1).execute()

        if not start_rates.data or not end_rates.data:
            print(f"[RETURNS] No exchange rate data for {period_key}, skipping")
            continue

        sr = start_rates.data[0]
        er = end_rates.data[0]

        # S&P 500 TRY prices (may be None if no data yet)
        sp500_start_try = None
        sp500_end_try = None
        if start_sp500.data and end_sp500.data:
            sp500_start_try = start_sp500.data[0]['close_usd'] * sr['usd_try']
            sp500_end_try = end_sp500.data[0]['close_usd'] * er['usd_try']

        # Delete existing returns for this period (clean slate avoids stale bad data)
        try:
            sb.table('fund_returns').delete().eq('period', period_key).execute()
            print(f"[RETURNS] {period_key}: cleared old data")
        except Exception as e:
            print(f"[RETURNS] {period_key}: clear error: {e}")

        # Process funds in batches
        results = []
        batch_size = 100

        for i in range(0, len(all_codes), batch_size):
            batch_codes = all_codes[i:i + batch_size]

            # Get start prices (closest to start_date, within 10-day window)
            start_prices = sb.table('fund_prices') \
                .select('fund_code, price_try, date') \
                .in_('fund_code', batch_codes) \
                .gte('date', start_date) \
                .lte('date', (datetime.strptime(start_date, '%Y-%m-%d') + timedelta(days=10)).strftime('%Y-%m-%d')) \
                .order('date', desc=False) \
                .limit(5000) \
                .execute()

            # Get end prices (closest to end_date, within 10-day window)
            end_prices = sb.table('fund_prices') \
                .select('fund_code, price_try, date') \
                .in_('fund_code', batch_codes) \
                .lte('date', end_date) \
                .gte('date', (datetime.strptime(end_date, '%Y-%m-%d') - timedelta(days=10)).strftime('%Y-%m-%d')) \
                .order('date', desc=True) \
                .limit(5000) \
                .execute()

            # Build lookup: first occurrence per fund_code (price + date)
            start_lookup = {}
            for p in (start_prices.data or []):
                if p['fund_code'] not in start_lookup:
                    start_lookup[p['fund_code']] = {'price': p['price_try'], 'date': p['date']}

            end_lookup = {}
            for p in (end_prices.data or []):
                if p['fund_code'] not in end_lookup:
                    end_lookup[p['fund_code']] = {'price': p['price_try'], 'date': p['date']}

            max_ret = MAX_RETURN[period_key]
            skipped = 0

            for code in batch_codes:
                if code not in start_lookup or code not in end_lookup:
                    continue

                sp = start_lookup[code]['price']
                ep = end_lookup[code]['price']

                if sp <= 0:
                    continue

                # Skip funds with suspiciously low start prices (inception artifacts)
                if sp < 2.0 and ep > sp * 10:
                    skipped += 1
                    continue

                try_ret = ((ep - sp) / sp) * 100

                # Sanity check: skip unrealistic returns
                if abs(try_ret) > max_ret:
                    skipped += 1
                    continue

                # USD return
                start_usd = sp / sr['usd_try']
                end_usd = ep / er['usd_try']
                usd_ret = ((end_usd - start_usd) / start_usd) * 100

                # EUR return
                start_eur = sp / sr['eur_try']
                end_eur = ep / er['eur_try']
                eur_ret = ((end_eur - start_eur) / start_eur) * 100

                # Gold return
                start_gold = sp / sr['gold_try_gram']
                end_gold = ep / er['gold_try_gram']
                gold_ret = ((end_gold - start_gold) / start_gold) * 100

                # S&P 500 return (fund value measured in S&P 500 units)
                sp500_ret = None
                if sp500_start_try and sp500_end_try and sp500_start_try > 0 and sp500_end_try > 0:
                    start_sp500_units = sp / sp500_start_try
                    end_sp500_units = ep / sp500_end_try
                    sp500_ret = round(((end_sp500_units - start_sp500_units) / start_sp500_units) * 100, 2)

                row_data = {
                    'fund_code': code,
                    'period': period_key,
                    'try_return': round(try_ret, 2),
                    'usd_return': round(usd_ret, 2),
                    'eur_return': round(eur_ret, 2),
                    'gold_return': round(gold_ret, 2),
                }
                if sp500_ret is not None:
                    row_data['sp500_return'] = sp500_ret
                results.append(row_data)

            if skipped:
                print(f"[RETURNS] {period_key}: skipped {skipped} funds with unrealistic returns")

        # Upsert results
        written = 0
        for j in range(0, len(results), 500):
            batch = results[j:j + 500]
            try:
                sb.table('fund_returns').upsert(batch, on_conflict='fund_code,period').execute()
                written += len(batch)
            except Exception as e:
                print(f"[RETURNS] DB error: {e}")

        print(f"[RETURNS] {period_key}: wrote {written} fund returns")

    print(f"\n[RETURNS] Done")


def daily_update():
    """Run the daily update: fetch yesterday's and today's data."""
    today = datetime.now()
    # Fetch last 3 days to catch any missed days
    start = (today - timedelta(days=3)).strftime('%Y-%m-%d')
    end = today.strftime('%Y-%m-%d')

    print(f"=== Daily Update: {today.strftime('%Y-%m-%d %H:%M')} ===\n")

    fetch_fund_prices(start, end)
    print()
    fetch_exchange_rates(start, end)
    print()
    fetch_sp500_daily(start, end)
    print()
    compute_fund_returns()

    print(f"\n=== Done ===")


def backfill(days: int):
    """Backfill the last N days of data."""
    today = datetime.now()
    start = (today - timedelta(days=days)).strftime('%Y-%m-%d')
    end = today.strftime('%Y-%m-%d')

    print(f"=== Backfill: last {days} days ({start} → {end}) ===\n")

    fetch_fund_prices(start, end)
    print()
    fetch_exchange_rates(start, end)
    print()
    fetch_sp500_daily(start, end)

    print(f"\n=== Done ===")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Göstergeç Daily Updater')
    parser.add_argument('--backfill', type=int, metavar='DAYS', help='Backfill last N days')
    parser.add_argument('--compute-returns', action='store_true', help='Only compute fund returns')
    args = parser.parse_args()

    if args.compute_returns:
        compute_fund_returns()
    elif args.backfill:
        backfill(args.backfill)
    else:
        daily_update()
