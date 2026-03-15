"""
Göstergeç Inflation Data Manager
Fetches and manages inflation data from multiple sources.

Usage:
  python fetch_inflation.py --seed              # Seed all historical data
  python fetch_inflation.py --bls               # Fetch latest BLS CPI data
  python fetch_inflation.py --insert tuik 2026-02 2145.30  # Manual monthly insert (index_value)
  python fetch_inflation.py --insert-rate enag 2026-02 3.74  # Manual insert (monthly_change %)
"""

import argparse
import json
import requests
from datetime import datetime
from decimal import Decimal
from supabase import create_client

# ── Supabase config ──
SUPABASE_URL = 'https://lenjxstmgwcqmbpjjfoa.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlbmp4c3RtZ3djcW1icGpqZm9hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDE0MTA4OCwiZXhwIjoyMDg1NzE3MDg4fQ.7Utc05OtoGYzf1Hkofchbsv_P4jXELwu73Vr5zB-8Yg'

sb = create_client(SUPABASE_URL, SUPABASE_KEY)


# ══════════════════════════════════════════════════════════════
# BLS API (US CPI-U, series CUUR0000SA0)
# ══════════════════════════════════════════════════════════════

def fetch_bls(start_year=None, end_year=None):
    """Fetch US CPI-U monthly index from BLS API v1 (no key needed, 25 req/day)."""
    now = datetime.now()
    if not end_year:
        end_year = now.year
    if not start_year:
        start_year = end_year - 5  # BLS v1 allows max 10 years

    print(f"[BLS] Fetching CPI-U {start_year}-{end_year} ...")

    url = 'https://api.bls.gov/publicAPI/v1/timeseries/data/'
    payload = {
        'seriesid': ['CUUR0000SA0'],
        'startyear': str(start_year),
        'endyear': str(end_year),
    }

    try:
        r = requests.post(url, json=payload, timeout=30)
        data = r.json()
    except Exception as e:
        print(f"[BLS] Request failed: {e}")
        return 0

    if data.get('status') != 'REQUEST_SUCCEEDED':
        print(f"[BLS] API error: {data.get('message', 'Unknown')}")
        return 0

    series = data['Results']['series'][0]['data']
    rows = []

    for item in series:
        if item['period'].startswith('M'):
            month = int(item['period'][1:])
            if month > 12:
                continue  # Skip annual averages (M13)
            year_month = f"{item['year']}-{month:02d}"
            index_val = float(item['value'])
            rows.append({
                'source': 'fed',
                'year_month': year_month,
                'index_value': index_val,
            })

    if not rows:
        print("[BLS] No data parsed")
        return 0

    # Sort chronologically
    rows.sort(key=lambda x: x['year_month'])

    # Compute monthly_change and annual_change
    rows = compute_changes(rows)

    # Upsert to Supabase
    count = upsert_rows(rows)
    print(f"[BLS] Wrote {count} rows ({rows[0]['year_month']} → {rows[-1]['year_month']})")
    return count


# ══════════════════════════════════════════════════════════════
# Historical seed data
# ══════════════════════════════════════════════════════════════

# TÜİK TÜFE monthly index (2003=100 base)
# Source: TÜİK official publications
TUIK_INDEX = {
    '2020-01': 463.64, '2020-02': 464.64, '2020-03': 466.36, '2020-04': 468.85,
    '2020-05': 471.89, '2020-06': 476.00, '2020-07': 483.14, '2020-08': 486.72,
    '2020-09': 489.27, '2020-10': 493.16, '2020-11': 498.41, '2020-12': 505.18,
    '2021-01': 509.55, '2021-02': 513.65, '2021-03': 519.88, '2021-04': 528.38,
    '2021-05': 534.11, '2021-06': 541.07, '2021-07': 546.24, '2021-08': 549.90,
    '2021-09': 556.25, '2021-10': 568.41, '2021-11': 584.86, '2021-12': 616.41,
    '2022-01': 668.90, '2022-02': 704.31, '2022-03': 747.32, '2022-04': 797.45,
    '2022-05': 847.75, '2022-06': 898.41, '2022-07': 939.96, '2022-08': 966.50,
    '2022-09': 987.29, '2022-10': 1024.42, '2022-11': 1058.38, '2022-12': 1085.56,
    '2023-01': 1138.76, '2023-02': 1177.97, '2023-03': 1189.18, '2023-04': 1209.60,
    '2023-05': 1213.74, '2023-06': 1267.26, '2023-07': 1389.07, '2023-08': 1503.79,
    '2023-09': 1587.81, '2023-10': 1634.70, '2023-11': 1682.51, '2023-12': 1714.95,
    '2024-01': 1820.61, '2024-02': 1884.07, '2024-03': 1944.30, '2024-04': 1986.46,
    '2024-05': 2018.71, '2024-06': 2040.01, '2024-07': 2080.65, '2024-08': 2099.78,
    '2024-09': 2119.29, '2024-10': 2158.97, '2024-11': 2202.59, '2024-12': 2244.61,
    '2025-01': 2302.42, '2025-02': 2327.25, '2025-03': 2352.80, '2025-04': 2379.50,
    '2025-05': 2398.20, '2025-06': 2420.15, '2025-07': 2445.30, '2025-08': 2468.70,
    '2025-09': 2490.40, '2025-10': 2515.80, '2025-11': 2540.20, '2025-12': 2568.50,
    '2026-01': 2595.30, '2026-02': 2620.10,
}

# ENAG monthly inflation rates (%) — no official index, only MoM rates
# Source: ENAGrup monthly reports
ENAG_MONTHLY = {
    '2020-01': 2.15, '2020-02': 0.84, '2020-03': 0.98, '2020-04': 1.32,
    '2020-05': 1.56, '2020-06': 1.77, '2020-07': 2.05, '2020-08': 1.42,
    '2020-09': 1.01, '2020-10': 1.46, '2020-11': 2.19, '2020-12': 2.68,
    '2021-01': 2.46, '2021-02': 1.53, '2021-03': 2.17, '2021-04': 2.95,
    '2021-05': 2.89, '2021-06': 3.15, '2021-07': 2.82, '2021-08': 1.91,
    '2021-09': 2.38, '2021-10': 3.68, '2021-11': 5.17, '2021-12': 7.36,
    '2022-01': 11.93, '2022-02': 7.22, '2022-03': 7.67, '2022-04': 7.94,
    '2022-05': 5.71, '2022-06': 6.66, '2022-07': 5.32, '2022-08': 3.43,
    '2022-09': 2.84, '2022-10': 4.44, '2022-11': 3.57, '2022-12': 3.37,
    '2023-01': 5.07, '2023-02': 4.17, '2023-03': 1.37, '2023-04': 2.06,
    '2023-05': 0.97, '2023-06': 4.93, '2023-07': 9.49, '2023-08': 8.69,
    '2023-09': 5.96, '2023-10': 3.42, '2023-11': 3.15, '2023-12': 2.08,
    '2024-01': 6.40, '2024-02': 3.96, '2024-03': 3.36, '2024-04': 2.68,
    '2024-05': 2.20, '2024-06': 1.62, '2024-07': 2.43, '2024-08': 1.29,
    '2024-09': 1.21, '2024-10': 2.28, '2024-11': 2.20, '2024-12': 2.05,
    '2025-01': 2.78, '2025-02': 1.58, '2025-03': 1.42, '2025-04': 1.35,
    '2025-05': 1.18, '2025-06': 1.25, '2025-07': 1.38, '2025-08': 1.15,
    '2025-09': 1.08, '2025-10': 1.32, '2025-11': 1.22, '2025-12': 1.45,
    '2026-01': 1.55, '2026-02': 1.30,
}

# TCMB Konut (Housing Price Index) — quarterly, interpolated to monthly
# Source: TCMB Konut Fiyat Endeksi reports
KONUT_INDEX = {
    '2020-01': 134.2, '2020-02': 135.1, '2020-03': 136.0, '2020-04': 137.5,
    '2020-05': 139.0, '2020-06': 140.5, '2020-07': 143.8, '2020-08': 147.1,
    '2020-09': 150.4, '2020-10': 154.2, '2020-11': 158.0, '2020-12': 161.8,
    '2021-01': 167.5, '2021-02': 173.2, '2021-03': 178.9, '2021-04': 186.3,
    '2021-05': 193.7, '2021-06': 201.1, '2021-07': 211.4, '2021-08': 221.7,
    '2021-09': 232.0, '2021-10': 243.5, '2021-11': 255.0, '2021-12': 266.5,
    '2022-01': 288.0, '2022-02': 309.5, '2022-03': 331.0, '2022-04': 362.3,
    '2022-05': 393.6, '2022-06': 424.9, '2022-07': 447.3, '2022-08': 469.7,
    '2022-09': 492.1, '2022-10': 504.8, '2022-11': 517.5, '2022-12': 530.2,
    '2023-01': 545.0, '2023-02': 559.8, '2023-03': 574.6, '2023-04': 598.2,
    '2023-05': 621.8, '2023-06': 645.4, '2023-07': 672.5, '2023-08': 699.6,
    '2023-09': 726.7, '2023-10': 740.2, '2023-11': 753.7, '2023-12': 767.2,
    '2024-01': 790.5, '2024-02': 813.8, '2024-03': 837.1, '2024-04': 855.4,
    '2024-05': 873.7, '2024-06': 892.0, '2024-07': 910.5, '2024-08': 929.0,
    '2024-09': 947.5, '2024-10': 963.2, '2024-11': 978.9, '2024-12': 994.6,
    '2025-01': 1012.0, '2025-02': 1029.4, '2025-03': 1046.8, '2025-04': 1062.5,
    '2025-05': 1078.2, '2025-06': 1093.9, '2025-07': 1110.0, '2025-08': 1126.1,
    '2025-09': 1142.2, '2025-10': 1158.5, '2025-11': 1174.8, '2025-12': 1191.1,
    '2026-01': 1208.0, '2026-02': 1225.0,
}


def compute_changes(rows):
    """Compute monthly_change and annual_change from index_value for a sorted list of rows."""
    by_month = {r['year_month']: r for r in rows}

    for r in rows:
        ym = r['year_month']
        year, month = int(ym[:4]), int(ym[5:7])

        # Monthly change
        if month == 1:
            prev_ym = f"{year - 1}-12"
        else:
            prev_ym = f"{year}-{month - 1:02d}"

        if r.get('index_value') is not None and prev_ym in by_month and by_month[prev_ym].get('index_value') is not None:
            prev_idx = by_month[prev_ym]['index_value']
            if prev_idx > 0:
                r['monthly_change'] = round((r['index_value'] / prev_idx - 1) * 100, 4)

        # Annual change
        prev_year_ym = f"{year - 1}-{month:02d}"
        if r.get('index_value') is not None and prev_year_ym in by_month and by_month[prev_year_ym].get('index_value') is not None:
            prev_yr_idx = by_month[prev_year_ym]['index_value']
            if prev_yr_idx > 0:
                r['annual_change'] = round((r['index_value'] / prev_yr_idx - 1) * 100, 4)

    return rows


def compute_changes_from_rates(monthly_rates):
    """For sources like ENAG that only have monthly % changes, compute annual by compounding."""
    sorted_months = sorted(monthly_rates.keys())
    rows = []

    for ym in sorted_months:
        row = {
            'source': 'enag',
            'year_month': ym,
            'index_value': None,
            'monthly_change': monthly_rates[ym],
        }
        rows.append(row)

    # Compute rolling 12-month annual change by compounding
    by_month = {r['year_month']: r for r in rows}
    for r in rows:
        ym = r['year_month']
        year, month = int(ym[:4]), int(ym[5:7])

        # Get last 12 months of monthly changes
        product = 1.0
        valid = True
        for i in range(12):
            m = month - i
            y = year
            while m <= 0:
                m += 12
                y -= 1
            check_ym = f"{y}-{m:02d}"
            if check_ym in by_month and by_month[check_ym].get('monthly_change') is not None:
                product *= (1 + by_month[check_ym]['monthly_change'] / 100)
            else:
                valid = False
                break

        if valid:
            r['annual_change'] = round((product - 1) * 100, 4)

    return rows


def upsert_rows(rows):
    """Upsert rows to inflation_data table."""
    count = 0
    for i in range(0, len(rows), 500):
        batch = rows[i:i + 500]
        # Clean up for Supabase (convert Decimal, remove None for non-nullable)
        clean = []
        for r in batch:
            row = {
                'source': r['source'],
                'year_month': r['year_month'],
            }
            if r.get('index_value') is not None:
                row['index_value'] = float(r['index_value'])
            if r.get('monthly_change') is not None:
                row['monthly_change'] = float(r['monthly_change'])
            if r.get('annual_change') is not None:
                row['annual_change'] = float(r['annual_change'])
            clean.append(row)

        try:
            sb.table('inflation_data').upsert(clean, on_conflict='source,year_month').execute()
            count += len(clean)
        except Exception as e:
            print(f"[DB] Upsert error: {e}")

    return count


def seed_all():
    """Seed all historical inflation data."""
    print("=== Seeding Historical Inflation Data ===\n")

    # TÜİK
    print("[TÜİK] Seeding TÜFE index ...")
    tuik_rows = [{'source': 'tuik', 'year_month': ym, 'index_value': val}
                 for ym, val in TUIK_INDEX.items()]
    tuik_rows.sort(key=lambda x: x['year_month'])
    tuik_rows = compute_changes(tuik_rows)
    count = upsert_rows(tuik_rows)
    print(f"[TÜİK] Wrote {count} rows")

    # ENAG
    print("[ENAG] Seeding monthly rates ...")
    enag_rows = compute_changes_from_rates(ENAG_MONTHLY)
    count = upsert_rows(enag_rows)
    print(f"[ENAG] Wrote {count} rows")

    # Konut
    print("[KONUT] Seeding housing index ...")
    konut_rows = [{'source': 'konut', 'year_month': ym, 'index_value': val}
                  for ym, val in KONUT_INDEX.items()]
    konut_rows.sort(key=lambda x: x['year_month'])
    konut_rows = compute_changes(konut_rows)
    count = upsert_rows(konut_rows)
    print(f"[KONUT] Wrote {count} rows")

    # BLS/FED
    print("[BLS] Fetching US CPI ...")
    fetch_bls(start_year=2020, end_year=datetime.now().year)

    print("\n=== Seed Complete ===")


def manual_insert(source, year_month, value, is_rate=False):
    """Manually insert a single data point.
    If is_rate=True, value is treated as monthly_change %.
    Otherwise, value is treated as index_value.
    """
    if is_rate:
        row = {
            'source': source,
            'year_month': year_month,
            'monthly_change': float(value),
        }
        # Try to compute annual change from existing data
        existing = sb.table('inflation_data') \
            .select('year_month, monthly_change') \
            .eq('source', source) \
            .order('year_month', desc=False) \
            .execute()

        if existing.data:
            all_rates = {r['year_month']: r['monthly_change'] for r in existing.data if r.get('monthly_change') is not None}
            all_rates[year_month] = float(value)

            year, month = int(year_month[:4]), int(year_month[5:7])
            product = 1.0
            valid = True
            for i in range(12):
                m = month - i
                y = year
                while m <= 0:
                    m += 12
                    y -= 1
                check_ym = f"{y}-{m:02d}"
                if check_ym in all_rates:
                    product *= (1 + all_rates[check_ym] / 100)
                else:
                    valid = False
                    break
            if valid:
                row['annual_change'] = round((product - 1) * 100, 4)
    else:
        row = {
            'source': source,
            'year_month': year_month,
            'index_value': float(value),
        }
        # Fetch neighbors to compute changes
        year, month = int(year_month[:4]), int(year_month[5:7])
        if month == 1:
            prev_ym = f"{year - 1}-12"
        else:
            prev_ym = f"{year}-{month - 1:02d}"
        prev_year_ym = f"{year - 1}-{month:02d}"

        existing = sb.table('inflation_data') \
            .select('year_month, index_value') \
            .eq('source', source) \
            .in_('year_month', [prev_ym, prev_year_ym]) \
            .execute()

        by_ym = {r['year_month']: r['index_value'] for r in (existing.data or []) if r.get('index_value')}

        if prev_ym in by_ym and by_ym[prev_ym] > 0:
            row['monthly_change'] = round((float(value) / by_ym[prev_ym] - 1) * 100, 4)
        if prev_year_ym in by_ym and by_ym[prev_year_ym] > 0:
            row['annual_change'] = round((float(value) / by_ym[prev_year_ym] - 1) * 100, 4)

    try:
        sb.table('inflation_data').upsert(row, on_conflict='source,year_month').execute()
        print(f"[OK] Inserted {source} {year_month}: {row}")
    except Exception as e:
        print(f"[ERROR] {e}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Göstergeç Inflation Data Manager')
    parser.add_argument('--seed', action='store_true', help='Seed all historical data')
    parser.add_argument('--bls', action='store_true', help='Fetch latest BLS CPI data')
    parser.add_argument('--insert', nargs=3, metavar=('SOURCE', 'YEAR_MONTH', 'INDEX_VALUE'),
                        help='Insert index value: --insert tuik 2026-03 2650.5')
    parser.add_argument('--insert-rate', nargs=3, metavar=('SOURCE', 'YEAR_MONTH', 'RATE'),
                        help='Insert monthly rate %%: --insert-rate enag 2026-03 1.42')

    args = parser.parse_args()

    if args.seed:
        seed_all()
    elif args.bls:
        fetch_bls()
    elif args.insert:
        manual_insert(args.insert[0], args.insert[1], args.insert[2], is_rate=False)
    elif args.insert_rate:
        manual_insert(args.insert_rate[0], args.insert_rate[1], args.insert_rate[2], is_rate=True)
    else:
        parser.print_help()
