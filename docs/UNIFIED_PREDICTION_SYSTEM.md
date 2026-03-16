# Göstergeç Tahmin Merkezi
## Birleşik Prediktif Sistem Mimarisi

---
---

# 1. TASARIM FELSEFESİ

## Neden birleştirme?

5 ayrı araç = 5 ayrı pipeline, 5 ayrı cron, 5 ayrı veri akışı, 5 ayrı UI.
Kullanıcı 5 sayfa arasında dolaşıp kendisi sentez yapmak zorunda kalır.

Birleşik sistem = **tek pipeline, tek sinyal formatı, tek dashboard**.
Her araç bağımsız bir **sinyal üretici (signal producer)** olur.
Hepsinin çıktısı aynı formata (Signal) dönüşür.
Ensemble katmanı bunları birleştirir.
Kullanıcı tek sayfada her şeyi görür, isterse derine iner.

## Temel ilke: Signal Bus

```
Her araç bu formatta çıktı üretir:

Signal {
  source:     "momentum" | "sentiment" | "flow" | "regime"
  target:     "category" | "fund"
  target_id:  "Altın" | "TYH" | ...
  score:      -100 .. +100
  confidence: 0 .. 100
  direction:  "up" | "neutral" | "down"
  metadata:   { ... araca özel detaylar }
  timestamp:  ISO datetime
}
```

Bu standart format sayesinde:
- Ensemble katmanı kaynağı bilmeden toplayabilir
- UI aynı component ile farklı sinyalleri gösterebilir
- Yeni sinyal kaynağı eklemek = sadece yeni bir producer yazmak
- Back-test sistemi her sinyali aynı şekilde değerlendirebilir

---
---

# 2. BİRLEŞİK VERİTABANI ŞEMASI

## Mevcut tablolar (değişmez)

```sql
funds              -- Fon master
fund_prices        -- Günlük fiyat
exchange_rates     -- Günlük döviz/altın
fund_returns       -- Dönemsel getiriler
fund_details       -- Piyasa değeri, yatırımcı sayısı
live_rates         -- Anlık kurlar
```

## Yeni tablolar (7 tablo)

```sql
-- ═══════════════════════════════════════════════
-- 1. HABER DEPOSU
-- ═══════════════════════════════════════════════

CREATE TABLE news_items (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL,           -- 'kap', 'bloomberght', 'tcmb', 'reuters'
  title         TEXT NOT NULL,
  body          TEXT,
  url           TEXT,
  published_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  scraped_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, url)
);

CREATE INDEX idx_news_published ON news_items(published_at DESC);


-- ═══════════════════════════════════════════════
-- 2. FON AKIŞLARI (GÜNLÜK SNAPSHOT)
-- ═══════════════════════════════════════════════

CREATE TABLE fund_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  fund_code       TEXT NOT NULL REFERENCES funds(code),
  date            DATE NOT NULL,
  market_cap      DECIMAL(18,2),
  investor_count  INTEGER,
  price_try       DECIMAL(18,6),
  UNIQUE(fund_code, date)
);

CREATE INDEX idx_snapshots_date ON fund_snapshots(date DESC);


-- ═══════════════════════════════════════════════
-- 3. BİRLEŞİK SİNYAL TABLOSU (Signal Bus)
-- ═══════════════════════════════════════════════
-- Tüm araçlar buraya yazar. Ensemble buradan okur.

CREATE TABLE signals (
  id              BIGSERIAL PRIMARY KEY,
  source          TEXT NOT NULL,             -- 'momentum', 'sentiment', 'flow', 'regime'
  source_version  TEXT NOT NULL DEFAULT '1.0', -- V4: sinyal versiyonlama (A/B test için)
  target_type     TEXT NOT NULL,             -- 'category' veya 'fund'
  target_id       TEXT NOT NULL,             -- 'Altın', 'TYH', vs.
  score           DECIMAL(6,2) NOT NULL,     -- -100.00 .. +100.00
  confidence      DECIMAL(5,2) NOT NULL,     -- 0.00 .. 100.00
  direction       TEXT NOT NULL,             -- 'up', 'neutral', 'down'
  is_delayed      BOOLEAN DEFAULT FALSE,     -- V4: AOF gecikme flag'i (bugünün fiyatı gelmediyse true)
  metadata        JSONB,                     -- kaynak-spesifik detaylar
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, target_type, target_id, created_at::date)
);

CREATE INDEX idx_signals_source    ON signals(source, created_at DESC);
CREATE INDEX idx_signals_target    ON signals(target_type, target_id, created_at DESC);
CREATE INDEX idx_signals_latest    ON signals(created_at DESC);


-- ═══════════════════════════════════════════════
-- 4. REJİM DURUMU
-- ═══════════════════════════════════════════════

CREATE TABLE regime_state (
  id                BIGSERIAL PRIMARY KEY,
  date              DATE NOT NULL UNIQUE,
  regime            TEXT NOT NULL,         -- 'low_vol', 'high_vol', 'crisis'
  confidence        DECIMAL(5,2) NOT NULL,
  transition_probs  JSONB NOT NULL,        -- {"low_vol": 0.15, "high_vol": 0.62, "crisis": 0.23}
  avg_duration_days INTEGER,
  indicators        JSONB                  -- {"usdtry_vol": 12.3, "bist_trend": -0.5, "cds_5y": 350, ...}
);


-- ═══════════════════════════════════════════════
-- 5. ENSEMBLE TAHMİNLER
-- ═══════════════════════════════════════════════

CREATE TABLE predictions (
  id                  BIGSERIAL PRIMARY KEY,
  target_type         TEXT NOT NULL,
  target_id           TEXT NOT NULL,
  predicted_direction TEXT NOT NULL,       -- 'up', 'neutral', 'down'
  predicted_strength  TEXT NOT NULL,       -- 'strong', 'moderate', 'weak'
  confidence          DECIMAL(5,2) NOT NULL,
  score               DECIMAL(6,2) NOT NULL,
  range_low           DECIMAL(6,2),       -- tahmini haftalık getiri alt sınır
  range_high          DECIMAL(6,2),       -- tahmini haftalık getiri üst sınır
  signal_breakdown    JSONB NOT NULL,      -- {"momentum": 82, "sentiment": 45, ...}
  valid_from          DATE NOT NULL,
  valid_until         DATE NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(target_type, target_id, valid_from)
);


-- ═══════════════════════════════════════════════
-- 6. TAHMİN SONUÇLARI (BACK-TEST)
-- ═══════════════════════════════════════════════

CREATE TABLE prediction_results (
  id              BIGSERIAL PRIMARY KEY,
  prediction_id   BIGINT NOT NULL REFERENCES predictions(id),
  actual_return   DECIMAL(6,2),
  hit             BOOLEAN NOT NULL,
  evaluated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prediction_id)
);


-- ═══════════════════════════════════════════════
-- 7. SİNYAL AĞIRLIKLARI (DİNAMİK)
-- ═══════════════════════════════════════════════

CREATE TABLE signal_weights (
  source          TEXT PRIMARY KEY,       -- 'momentum', 'sentiment', 'flow', 'regime'
  current_weight  DECIMAL(4,3) NOT NULL DEFAULT 0.250,
  hit_rate_12w    DECIMAL(5,2),
  total_calls     INTEGER DEFAULT 0,
  correct_calls   INTEGER DEFAULT 0,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Başlangıç ağırlıkları
INSERT INTO signal_weights (source, current_weight) VALUES
  ('momentum',  0.250),
  ('sentiment', 0.250),
  ('flow',      0.250),
  ('regime',    0.250);


-- Row Level Security
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE regime_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON news_items FOR SELECT USING (true);
CREATE POLICY "Public read" ON fund_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read" ON signals FOR SELECT USING (true);
CREATE POLICY "Public read" ON regime_state FOR SELECT USING (true);
CREATE POLICY "Public read" ON predictions FOR SELECT USING (true);
CREATE POLICY "Public read" ON prediction_results FOR SELECT USING (true);
CREATE POLICY "Public read" ON signal_weights FOR SELECT USING (true);
```

## Tablo ilişki diyagramı

```
                    ┌─────────────┐
                    │   funds     │
                    │  (mevcut)   │
                    └──────┬──────┘
                           │ code
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │ fund_prices │  │fund_details │  │fund_snapshots│
   │  (mevcut)   │  │  (mevcut)   │  │   (YENİ)    │
   └──────┬──────┘  └─────────────┘  └──────┬──────┘
          │                                 │
          │         ┌─────────────┐         │
          │         │ news_items  │         │
          │         │   (YENİ)    │         │
          │         └──────┬──────┘         │
          │                │                │
    ┌─────▼────────────────▼────────────────▼─────┐
    │            SINYAL ÜRETİCİLERİ                │
    │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────┐│
    │  │Momentum  │ │Sentiment │ │ Flow   │ │Reg.││
    │  │Producer  │ │Producer  │ │Producer│ │Pro.││
    │  └────┬─────┘ └────┬─────┘ └───┬────┘ └─┬──┘│
    └───────┼────────────┼───────────┼────────┼───┘
            │            │           │        │
            ▼            ▼           ▼        ▼
    ┌──────────────────────────────────────────────┐
    │              signals (Signal Bus)             │
    │  source | target | score | confidence | ...   │
    └────────────────────┬─────────────────────────┘
                         │
                         ▼
    ┌──────────────────────────────────────────────┐
    │           ENSEMBLE ENGINE                     │
    │  signal_weights → weighted merge → predict    │
    └────────────────────┬─────────────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼                     ▼
    ┌──────────────┐      ┌──────────────────┐
    │  predictions │      │prediction_results│
    │   (haftalık) │──────│   (back-test)    │
    └──────────────┘      └──────────────────┘
```

---
---

# 3. BİRLEŞİK PYTHON PIPELINE

## Mevcut durum

```
GitHub Actions (08:00 UTC)
    └── fetch_rates.py --daily     ← sadece döviz kurları
```

## Yeni durum: Tek orchestrator script

```
GitHub Actions (09:30 UTC, Türkiye saat 12:30)
    └── pipeline.py --daily
         │
         ├── Adım 1: Veri Toplama    (paralel)
         │   ├── fetch_rates.py       → exchange_rates
         │   ├── fetch_prices.py      → fund_prices
         │   ├── fetch_snapshots.py   → fund_snapshots
         │   ├── fetch_bist_foreign.py → BIST yabancı takas oranı
         │   ├── fetch_cds.py         → cds_5y (Yahoo Finance / banka bülteni)
         │   └── fetch_news.py        → news_items
         │
         ├── Adım 2: Sinyal Üretimi  (paralel)
         │   ├── produce_momentum()   → signals
         │   ├── produce_sentiment()  → signals
         │   ├── produce_flow()       → signals
         │   └── produce_regime()     → signals + regime_state
         │
         ├── Adım 3: Ensemble        (sıralı)
         │   ├── merge_signals()      → predictions
         │   └── evaluate_past()      → prediction_results
         │
         ├── Adım 4: Temizlik
         │   ├── archive_old_signals()
         │   └── log_run_status()
         │
         └── Adım 5: Retry (13:30 TR — eksik fonlar için)
             └── retry_missing_prices()  → geç NAV yayınlayan fonları tekrar çek

V4 — GECE YARISI PİPELINE (23:59 TR / 20:59 UTC):
    └── pipeline.py --night
         ├── fetch_cds.py            → CDS 5Y akşam güncellemesi
         ├── fetch_global_macro.py   → VIX + DXY + Brent Petrol + GPR
         └── pre_calculate_regime()  → ertesi gün için ön rejim hesaplama
         NOT: Ana sinyal üretimi YAPMAZ, sadece makro veri günceller.
              12:30 pipeline'ı bu verileri kullanarak sinyal üretir.
```

## pipeline.py — Orchestrator detayı

```python
#!/usr/bin/env python3
"""
Göstergeç Tahmin Merkezi — Günlük Pipeline Orchestrator

Çalışma sırası:
  1. Veri toplama (paralel) — Dış kaynaklardan veri çek
  2. Sinyal üretimi (paralel) — Her producer signal tablosuna yazar
  3. Ensemble birleştirme (sıralı) — Signal'lerden tahmin üret
  4. Back-test değerlendirme (sıralı) — Geçmiş tahminleri kontrol et

Kullanım:
  python pipeline.py --daily          # Normal günlük çalıştırma
  python pipeline.py --step collect   # Sadece veri toplama
  python pipeline.py --step signals   # Sadece sinyal üretimi
  python pipeline.py --step ensemble  # Sadece ensemble
  python pipeline.py --step backtest  # Sadece back-test
  python pipeline.py --full           # Tüm adımlar + geçmiş doldur
"""

import argparse
import asyncio
import logging
from datetime import datetime, date

# ── Modül yapısı ──
#
# scripts/
# ├── pipeline.py              ← BU DOSYA (orchestrator)
# ├── config.py                ← Supabase bağlantı, sabitler
# ├── collectors/
# │   ├── __init__.py
# │   ├── rates.py             ← Döviz kuru toplama
# │   ├── prices.py            ← Fon fiyatı toplama (TEFAS)
# │   ├── snapshots.py         ← Fon büyüklük/yatırımcı snapshot
# │   └── news.py              ← Haber toplama (KAP, Bloomberg HT, vs.)
# ├── producers/
# │   ├── __init__.py
# │   ├── base.py              ← SignalProducer base class
# │   ├── momentum.py          ← RSI, MACD, MA crossover
# │   ├── sentiment.py         ← NLP duygu analizi
# │   ├── flow.py              ← Akış/sürü z-score
# │   └── regime.py            ← HMM rejim tespiti
# ├── ensemble/
# │   ├── __init__.py
# │   ├── merger.py            ← Ağırlıklı sinyal birleştirme
# │   └── evaluator.py         ← Back-test & ağırlık güncelleme
# └── models/
#     ├── signal.py            ← Signal dataclass
#     └── prediction.py        ← Prediction dataclass


# ═══════════════════════════════════════════
# Adım 1: Veri Toplama
# ═══════════════════════════════════════════
#
# Paralel çalışır. Her collector bağımsız.
# Biri başarısız olursa diğerleri devam eder.
#
# rates.py:
#   - frankfurter.app'den günlük USD/EUR kuru
#   - TCMB'den altın fiyatı
#   → exchange_rates tablosuna upsert
#
# prices.py:
#   - TEFAS API'den tüm fonların günlük fiyatları
#   - Session management (re-init every 200 funds)
#   → fund_prices tablosuna upsert
#
# snapshots.py:
#   - TEFAS'tan market_cap + investor_count
#   - Mevcut fund_details tablosundaki verinin günlük kopyası
#   → fund_snapshots tablosuna insert
#
# news.py:
#   - KAP RSS feed parse
#   - Bloomberg HT RSS feed parse
#   - TCMB duyuruları scrape
#   - Dedupe: (source, url) unique constraint
#   → news_items tablosuna insert
#
# Hata yönetimi:
#   - Her collector try/except ile sarılı
#   - Başarısız collector log'lanır ama pipeline durmaz
#   - Retry: 3 deneme, exponential backoff
#
# V4 — TATİL TAKVİMİ + SESSİZ DÖNEM FİLTRESİ:
#   Pipeline başlamadan önce:
#     1. is_market_open(today) → Türkiye resmi tatil takvimi kontrolü
#        Tatilse → pipeline çalışmaz, log "Piyasa kapalı" yazar
#     2. Yarım gün kontrolü (31 Aralık, bayram arası vb.)
#     3. Hacim kontrolü: son 30 günün medyan hacminin %10'undan düşükse
#        → momentum sinyali DONDURULUR (yanlış sinyal üretmemesi için)
#
# V4 — AOF GECİKME KONTROLÜ:
#   prices.py topladıktan sonra:
#     "Bugünün fiyatı geldi mi?" → fon bazında kontrol
#     Gelmediyse → dünkü fiyatla hesaplama yapılır ama
#     is_delayed = true flag'i ile sinyal işaretlenir
#
# V4 — VERİ KALİTESİ RAPORU (her pipeline sonunda):
#   Otomatik kontroller:
#     - Null oran > %20 → ALARM
#     - CDS verisi 3 gün üst üste gelmezse → ALARM
#     - Tek sinyal ağırlığı > %40 → ALARM (tek kaynağa aşırı bağımlılık)
#   Bildirim: Telegram bot veya email (opsiyonel)
#   Kritik alarm: pipeline duraklatılabilir (manual override)


# ═══════════════════════════════════════════
# Adım 2: Sinyal Üretimi
# ═══════════════════════════════════════════
#
# Her producer aynı base class'tan türer:
#
#   class SignalProducer:
#     name: str
#     def produce(self, date) -> list[Signal]:
#       ...
#
# Tüm producer'lar paralel çalışır.
# Her biri kendi Signal listesini signals tablosuna yazar.
#
# momentum.py:
#   Girdi:  fund_prices (son 60 gün) + exchange_rates + KATEGORİ BAZLI benchmark
#   İşlem:  Relative Strength (RS) vs benchmark, MA(20) vs MA(50), 30d trend, streak
#   NOT:    RSI yerine RS kullanılır — fonun getirisini benchmark ile
#           kıyaslayan momentum skoru, tek başına fiyat hareketinden daha değerlidir.
#           Fon NAV'ı gecikmeli hesaplandığından RSI "trend teyidi" olarak kalır.
#
#   KATEGORİ BAZLI BENCHMARK EŞLEŞMESİ:
#     Hisse Fonları     → BIST100 (XU100 proxy: hisse fonları ortalaması)
#     Altın/Emtia       → ONS Altın (USD) veya Gram Altın (TRY)
#     Para Piy./Borç.   → Gecelik Repo (ON) veya Mevduat Faizi
#     Döviz             → USD/TRY kuru
#     Yab. Hisse        → S&P 500 (USD)
#     Karma/Değişken    → %50 BIST100 + %50 Mevduat blend
#
#   RS HESAPLAMA BAZI:
#     Benchmark TL bazlıysa → RS de TL getiriler üzerinden hesaplanır
#     (çift kur dönüşümü gürültü yaratır, TL-TL karşılaştırma daha temiz)
#
#   Çıktı:  ~500 sinyal (her fon için 1 tane)
#   Hedef:  target_type='fund', target_id='TYH'
#   Meta:   {rs_vs_benchmark: 1.15, benchmark: 'XU100', ma_cross: 'golden', streak: 12}
#
# sentiment.py:
#   Girdi:  news_items (son 24 saat)
#   İşlem:  Sözlük tabanlı (VADER benzeri) tüm haberler için +
#           distilbert-base-turkish-cased sadece kritik haberler için
#
#   KRİTİK HABER FİLTRESİ (Kaynak + Keyword kesişimi):
#     Kaynak: TCMB sitesi, KAP "Yatırımcı Duyuruları"
#     Keyword: faiz, enflasyon, para politikası, karar, kredi notu
#     Tetikleme: kaynak KRİTİK VE keyword eşleşiyorsa → distilbert
#     Diğer tüm haberler → sözlük tabanlı (hızlı, ucuz)
#
#   V4 — HABER TIME-DECAY:
#     Haberlerin etkisi zamanla azalır (saat bazlı çarpan):
#       0-24 saat  → 1.0 (tam etki)
#       24-48 saat → 0.5 (yarı etki)
#       72+ saat   → 0.1 (minimal etki)
#     Kategori skoru hesaplanırken her haber bu çarpanla ağırlıklanır.
#
#   ETKİ MATRİSİ GÜNCELLEMESİ:
#     Başlangıç: uzman kalibrasyonu (14 × 7)
#     Sonra: haftalık Pearson korelasyonu (90 gün pencere)
#     haber_duygu vs kategori_getiri korelasyonu → matris otomatik güncellenir
#
#   Çıktı:  7 sinyal (her kategori için 1 tane)
#   Hedef:  target_type='category', target_id='Altın'
#   Meta:   {news_count: 12, top_news: [...], method: 'lexicon'|'distilbert', ...}
#
# flow.py:
#   Girdi:  fund_snapshots (son 30 gün)
#   İşlem:  Flow proxy, çift pencere z-score (10 gün + 30 gün), herd score
#   NOT:    10 günlük kısa pencere eklendi — Türkiye'de sürü psikolojisi (FOMO)
#           çok hızlı gelişir, 30 gün tek başına yavaş kalır.
#           z_score_short: hızlı anomali tespiti, z_score_long: trend teyidi
#
#   V4 — ANOMALİ EŞİK KURALLARI (net threshold):
#     "Ani Şişme" etiketi için TÜM koşullar sağlanmalı:
#       |z_long| > 2.0 VE |z_short| > 1.5 VE zıt yön
#     Bu durumda: güven = %50'ye düşürülür
#     Kullanıcıya: "Sürü giriyor ama henüz kalıcı değil" mesajı.
#
#     Tek z_score yüksekse (diğeri düşük, aynı yön):
#       z_long > 2.0 ama z_short < 1.5 → normal trend, güven korunur
#       z_short > 2.0 ama z_long < 1.0 → anlık spike, güven düşür ama "Ani Şişme" değil
#   V5 — BIST YABANCI TAKAS ORANI (güven modifikatörü):
#     Hisse kategorisi sinyali için "akıllı para" teyidi:
#       Yabancı takas oranı ↑ VE herd_score pozitif → güven ↑ (yabancı da aynı yönde)
#       Yabancı takas oranı ↓ VE herd_score pozitif → güven ↓ (sadece yerli FOMO)
#     Ayrı sinyal DEĞİL — mevcut flow sinyalinin confidence'ını modifiye eder.
#     Sadece Hisse kategorisine uygulanır (diğer kategorilerde etkisiz).
#     Kaynak: BIST günlük bülteni, günlük collector ile toplanır.
#
#   Çıktı:  7 sinyal (kategori) + ~500 sinyal (fon)
#   Hedef:  target_type='category' ve target_type='fund'
#   Meta:   {flow_proxy: 1200000, z_score_10d: 3.2, z_score_30d: 1.8, investor_delta: 340,
#            foreign_ratio: 0.23, foreign_trend: 'increasing', ...}
#
# regime.py:
#   Girdi:  exchange_rates (son 5 yıl) + fund_prices (proxy BIST) + CDS 5Y verisi
#   İşlem:  HMM inference → mevcut rejim (3 durum) + geçiş olasılıkları
#   NOT:    4 rejim yerine 3 rejim: Düşük Volatilite, Yüksek Volatilite, Kriz.
#           "Sakin Boğa" Türkiye için nadir bir lüks — kaldırıldı.
#           CDS 5Y verisi gözlem vektörüne eklendi — Türkiye risk algısının
#           en iyi öncü göstergesi. Kaynak: Yahoo Finance (^TURKISHCDS5Y) veya
#           banka günlük bültenleri (Akbank/İş Yatırım), günlük EOD.
#           Gözlem: [usdtry_ret, bist_ret, gold_ret, vol_30d, rate_level, cds_5y,
#                    brent_ret, gpr_zscore]
#           V5 — Brent Petrol: Türkiye enerji ithalatçısı, petrol ↑ → cari açık ↑,
#                 enflasyon ↑. Hisse/tahvil negatif, altın/döviz pozitif.
#                 Kaynak: Yahoo Finance (BZ=F), gece pipeline'dan güncellenir.
#           V5 — GPR (Jeopolitik Risk Endeksi): Matteo Iacoviello endeksi, aylık.
#                 GPR ↑ → kriz rejimini erkenden tetikler (güvenli liman sinyali).
#                 Z-score normalize (aylık güncelleme, günlük interpolasyon).
#                 Kaynak: matteoiacoviello.com/gpr.htm
#           NOT: Yeni sinyal kaynağı DEĞİL — mevcut HMM'in gözlem boyutunu zenginleştirir.
#                Sinyal sayısı artmaz, rejim tespiti hassaslaşır.
#
#   HMM OVERFİTTİNG KORUMASI:
#     CDS ve volatilite kriz anında birbirine çok benzer sinyal verir.
#     Tüm gözlem değişkenleri Z-score normalize edildikten sonra HMM'e verilir.
#     Bu, HMM'in iki veriyi "tek bir değişken" gibi algılamasını önler.
#
#   V4 — HMM HİSTEREZİS (rejim flip-flop önleme):
#     Rejim değişikliği için minimum 5 gün kalma şartı.
#     HMM "bugün kriz, yarın düşük vol" derse → eski rejim korunur.
#     Ancak 5 gün üst üste yeni rejim çıkarsa → geçiş onaylanır.
#
#   V4 — VALÖR MALİYETİ KERPIMI:
#     T+2/T+3 fonlar (yabancı hisse vb.) için rejim bazlı skor kırpımı:
#     Kriz rejiminde T+3 fonlara -10 puan (geç çıkış maliyeti yansıtılır)
#
#   V4 — KATEGORİ BAZLI HMM (ileri faz):
#     Her kategori için ayrı gözlem vektörü:
#       Hisse → [BIST_ret, CDS, vol_30d, rate_level, brent_ret, gpr_z]
#       Altın → [ONS_ret, USD_ret, CDS, vol_30d, brent_ret]
#       Döviz → [USD_ret, EUR_ret, CDS, rate_level, brent_ret]
#     Faz 3'te tek HMM ile başla, Faz 5+ sonrası kategori bazlı ayrıştır.
#   Çıktı:  7 sinyal (kategori × rejim back-test getirisi)
#   Hedef:  target_type='category'
#   Meta:   {regime: 'high_vol', transition: {...}, historical_return: 3.5, cds_5y: 350}
#   Ekstra: regime_state tablosuna da yazar


# ═══════════════════════════════════════════
# Adım 3: Ensemble Birleştirme
# ═══════════════════════════════════════════
#
# merger.py:
#
# 1. signals tablosundan bugünün tüm sinyallerini çek
# 2. Kategori bazında grupla
# 3. Her kategori için:
#    a. signal_weights tablosundan ağırlıkları oku
#    b. Exponential Decay ağırlıklı ortalama hesapla:
#       - Son haftanın isabeti 12 hafta öncesinden daha ağır basar
#       - V4/V5 — ADAPTİF DECAY:
#         if regime == "crisis" or (kategori == "YabHisse" and VIX > 25)
#            or brent_change_30d > 20%:
#             decay = 0.85  (daha hızlı unut, yeni veriye adapte ol)
#         else:
#             decay = 0.90  (standart)
#         NOT: Brent %20+ aylık artış = enerji şoku, tüm sinyaller hızlı adapte olmalı
#       - decay_factor = decay^(hafta_farkı)
#       - w_i = Σ(hit_k × decay^k) / Σ(decay^k)  (k=0..11 hafta)
#       - score = Σ(w_i × score_i) / Σ(w_i)
#    c. Güven hesapla:
#       agreement = aynı yönü gösteren sinyal oranı
#       confidence = agreement × avg(individual_confidences)
#    d. Yön ve güç belirle:
#       score > 30  → up    / strong eğer > 60
#       score < -30 → down  / strong eğer < -60
#       arası       → neutral
#    e. Getiri aralığı tahmin et:
#       Rejim back-test verisi + mevcut skor ile ölçekle
# 4. predictions tablosuna yaz
#    valid_from = bugün, valid_until = bugün + 7 gün
#
# NOT: Statik+Dinamik 50/50 karışım KALDIRILDI.
#      Sadece exponential decay dinamik ağırlıklandırma kullanılır.
#      Bu, dinamik öğrenmeyi yavaşlatan 50/50 darboğazını ortadan kaldırır.


# ═══════════════════════════════════════════
# Adım 4: Back-test Değerlendirme
# ═══════════════════════════════════════════
#
# evaluator.py:
#
# 1. valid_until < bugün olan prediction'ları bul
# 2. Her biri için gerçekleşen USD getiriyi hesapla
# 3. MAE (Mean Absolute Error) hesapla:
#    mae_i = |predicted_score_normalized - actual_return_normalized|
#    NOT: Binary yön isabeti (hit/miss) YETERSİZ.
#         MAE kullanmak tahmin büyüklüğünü de ölçer.
#         "Güçlü yukarı dedik ama %0.1 arttı" artık düşük puan alır.
# 4. prediction_results tablosuna yaz (hit + mae her ikisi de kaydedilir)
# 5. signal_weights tablosunu güncelle:
#    - Exponential Decay: son haftalar daha ağır (decay=0.9)
#    - inverse_mae_i = 1 / (1 + mae_i)  (düşük hata → yüksek ağırlık)
#    - weighted_score = Σ(inverse_mae_k × decay^k) / Σ(decay^k)
#    - Yeni ağırlık = weighted_score_i / Σ(weighted_score_all)
#    - Minimum ağırlık = 0.10 (hiçbir sinyal sıfırlanmaz)
```

## Python dosya yapısı (son hali)

```
scripts/
├── pipeline.py                    ← Orchestrator (ana giriş noktası)
├── config.py                      ← Supabase client, sabitler, env vars
│
├── collectors/                    ← Adım 1: Veri toplama
│   ├── __init__.py
│   ├── rates.py                   ← Döviz/altın kurları (mevcut fetch_rates.py refactor)
│   ├── prices.py                  ← TEFAS fon fiyatları (mevcut scraper.py refactor)
│   ├── snapshots.py               ← Günlük piyasa değeri + yatırımcı sayısı
│   ├── cds.py                     ← CDS 5Y (Yahoo Finance / banka bültenleri)
│   ├── global_macro.py            ← V4/V5: VIX + DXY + Brent + GPR (gece pipeline)
│   ├── bist_foreign.py            ← V5: BIST yabancı takas oranı (günlük)
│   ├── holidays.py                ← V4: Türkiye tatil takvimi + is_market_open()
│   └── news.py                    ← KAP/Bloomberg HT/TCMB haber toplama
│
├── producers/                     ← Adım 2: Sinyal üretimi
│   ├── __init__.py
│   ├── base.py                    ← SignalProducer abstract base class
│   ├── momentum.py                ← RS (Relative Strength vs benchmark), MA crossover → Signal
│   ├── sentiment.py               ← Sözlük + distilbert (kritik) → Etki matrisi → Signal
│   ├── flow.py                    ← Flow proxy, z-score → Signal
│   └── regime.py                  ← HMM → Rejim → Kategori getiri → Signal
│
├── ensemble/                      ← Adım 3-4: Birleştirme & değerlendirme
│   ├── __init__.py
│   ├── merger.py                  ← Ağırlıklı birleştirme → Prediction
│   └── evaluator.py               ← Back-test, hit rate, ağırlık güncelleme
│
├── quality/                       ← V4: Veri kalitesi & monitoring
│   ├── __init__.py
│   ├── health_check.py            ← Null oranı, CDS kontrolü, ağırlık dengesi
│   └── alerting.py                ← Telegram/email bildirim (opsiyonel)
│
├── models/                        ← Veri yapıları
│   ├── __init__.py
│   ├── signal.py                  ← Signal dataclass
│   └── prediction.py              ← Prediction dataclass
│
└── legacy/                        ← Eski scriptler (referans için)
    ├── scraper.py
    ├── fetch_rates.py
    ├── import_all_tefas.py
    └── import_csv.py
```

## requirements.txt (güncellenmiş)

```
# Mevcut
requests>=2.31.0
supabase>=2.0.0
python-dotenv>=1.0.0
pandas>=2.0.0

# Yeni — Sinyal üretimi
numpy>=1.24.0
scikit-learn>=1.3.0         # Volatilite, normalizasyon
hmmlearn>=0.3.0             # Hidden Markov Model (rejim)

# Yeni — NLP
transformers>=4.35.0        # HuggingFace distilbert (sadece kritik haberler için)
torch>=2.1.0                # PyTorch (distilbert inference — %40 daha hafif)
feedparser>=6.0.0           # RSS parsing
beautifulsoup4>=4.12.0      # HTML scraping

# Yeni — Pipeline
asyncio                     # Paralel collector çalıştırma (stdlib)
```

## GitHub Actions güncelleme

```yaml
# .github/workflows/daily-pipeline.yml
name: Göstergeç Daily Pipeline

on:
  schedule:
    - cron: '30 9 * * 1-5'   # Pazartesi-Cuma 09:30 UTC (12:30 TR — TEFAS NAV oturması için)
  workflow_dispatch:           # Manuel tetikleme

jobs:
  pipeline:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: pip install -r scripts/requirements.txt

      - name: Download distilbert model (cached)
        uses: actions/cache@v4
        with:
          path: ~/.cache/huggingface
          key: distilbert-turkish-${{ hashFiles('scripts/requirements.txt') }}
          restore-keys: distilbert-turkish-

      - name: Run pipeline
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: python scripts/pipeline.py --daily

      - name: Run retry (13:30 TR — geç NAV fonları)
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          sleep 3600  # 1 saat bekle (12:30 → 13:30)
          python scripts/pipeline.py --retry

      - name: Log status
        if: always()
        run: echo "Pipeline finished at $(date)"

  # V4 — Gece Yarısı Pipeline (makro veri güncelleme)
  night-pipeline:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - name: Install dependencies
        run: pip install -r scripts/requirements.txt
      - name: Run night pipeline
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: python scripts/pipeline.py --night
```

```yaml
# V4 — Gece pipeline ayrı workflow
# .github/workflows/night-pipeline.yml
name: Göstergeç Night Pipeline

on:
  schedule:
    - cron: '59 20 * * 1-5'   # Pazartesi-Cuma 20:59 UTC (23:59 TR)
  workflow_dispatch:

jobs:
  night:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r scripts/requirements.txt
      - name: Fetch global macro (CDS, VIX, DXY)
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: python scripts/pipeline.py --night
```

---
---

# 4. BİRLEŞİK FRONTEND MİMARİSİ

## Sayfa yapısı

```
src/app/
├── predict/                       ← YENİ: Tahmin Merkezi
│   ├── page.tsx                   ← Ana dashboard (Tahmin Merkezi)
│   ├── momentum/page.tsx          ← Momentum Radar detay
│   ├── sentiment/page.tsx         ← Haber Nabzı detay
│   ├── flows/page.tsx             ← Sürü Barometresi detay
│   ├── regime/page.tsx            ← Rejim Dedektörü detay
│   └── layout.tsx                 ← Paylaşımlı layout (sub-nav)
│
├── (mevcut sayfalar değişmez)
│   ├── funds/
│   ├── compare/
│   ├── leaderboard/
│   └── ...
```

## Predict layout — ortak navigasyon

```
src/app/predict/layout.tsx:

┌──────────────────────────────────────────────────┐
│  Header (mevcut)                                 │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌── Predict Sub-Navigation ──────────────────┐  │
│  │                                            │  │
│  │  [Genel Bakış]  [Momentum]  [Haberler]     │  │
│  │  [Akışlar]  [Rejim]                        │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  {children}  ← Alt sayfa burada render olur      │
│                                                  │
├──────────────────────────────────────────────────┤
│  Footer (mevcut)                                 │
└──────────────────────────────────────────────────┘
```

---
---

# 5. ANA DASHBOARD: TAHMİN MERKEZİ

## `/predict` sayfası — wireframe

```
┌══════════════════════════════════════════════════════════════════════┐
║  TAHMİN MERKEZİ                                 Son: 12:30 16 Mar  ║
║  Tüm sinyaller tek bakışta                                         ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  ┌─── A. Rejim Bandı (sayfa genişliğinde) ────────────────────┐    ║
║  │                                                            │    ║
║  │  Mevcut Rejim:  🟠 YÜKSEK VOLATİLİTE   Güven: %78   23 gündür│    ║
║  │                                                            │    ║
║  │  2024 ████████████████████████████████████████████████████  │    ║
║  │       🟡🟡🟢🟢🟢🟢🟡🟡🟠🟠🟠🟡                            │    ║
║  │  2025 ████████████████████████████████████████████████████  │    ║
║  │       🟡🟡🟡🟠🟠🟠🟠🟡🟡🟢🟢🟢                            │    ║
║  │  2026 ████████████                                         │    ║
║  │       🟢🟡🟠●                                              │    ║
║  │             ↑bugün                                         │    ║
║  │                                                            │    ║
║  │  Geçiş tahmini: 🟠kalır %62 │ 🟢düşük vol %27 │ 🔴kriz %11│    ║
║  │                                    ──── detay → /regime    │    ║
║  └────────────────────────────────────────────────────────────┘    ║
║                                                                    ║
║                                                                    ║
║  ┌─── B. Sinyal Matrisi (çekirdek tablo) ─────────────────────┐    ║
║  │                                                            │    ║
║  │             Momentum  Haber   Sürü    Rejim  │ BİRLEŞİK    │    ║
║  │  Kategori    Skor      Skor   Skor    Skor   │ Tahmin       │    ║
║  │  ──────────  ───────  ──────  ──────  ────── │ ──────────── │    ║
║  │  Altın        +82 🟢   +45 🟢  +91 🟢  +65 🟢│  ▲▲ %92     │    ║
║  │  Döviz        +34 🟢   +15 🟡  +28 🟡  +45 🟢│  ▲  %71     │    ║
║  │  Tahvil       +12 🟡   +72 🟢  -10 🟡  -18 🔴│  ─  %55     │    ║
║  │  Karma        -05 🟡   +18 🟡  +08 🟡  -12 🟡│  ─  %48     │    ║
║  │  Yab.Hisse    +45 🟢   -28 🔴  -15 🔴  -15 🔴│  ▼  %63     │    ║
║  │  Hisse        -23 🔴   -12 🔴  -40 🔴  -32 🔴│  ▼▼ %85     │    ║
║  │  Para Piy.    -67 🔴   +31 🟢  -55 🔴  -21 🔴│  ▼  %42     │    ║
║  │                                                            │    ║
║  │  Renk kodu: 🟢 >+25  🟡 -25..+25  🔴 <-25                 │    ║
║  │  Her hücre tıklanabilir → detay sayfasına yönlendirir       │    ║
║  │                                                            │    ║
║  │  📱 MOBİL: 5 sütun mobilde sığmaz. Mobilde matris           │    ║
║  │  "Kategori Kartları"na dönüşür. Her kartın içinde           │    ║
║  │  4 küçük ikon (M, S, F, R) + birleşik skor gösterilir.     │    ║
║  └────────────────────────────────────────────────────────────┘    ║
║                                                                    ║
║                                                                    ║
║  ┌─── C. Hızlı Bakış Kartları (3 sütun) ──────────────────────┐   ║
║  │                                                            │    ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │    ║
║  │  │ EN GÜÇLÜ     │  │ EN ZAYIF     │  │ EN ANOMALİ    │      │    ║
║  │  │ SİNYAL       │  │ SİNYAL       │  │ HAREKET       │      │    ║
║  │  │              │  │              │  │              │      │    ║
║  │  │ Altın  ▲▲    │  │ Hisse  ▼▼    │  │ TYH  z:3.2   │      │    ║
║  │  │ Güven: %92   │  │ Güven: %85   │  │ Yatırımcı %8↑│      │    ║
║  │  │ 4/4 sinyal ▲ │  │ 4/4 sinyal ▼ │  │ 30gün rekoru  │      │    ║
║  │  └──────────────┘  └──────────────┘  └──────────────┘      │    ║
║  └────────────────────────────────────────────────────────────┘    ║
║                                                                    ║
║                                                                    ║
║  ┌─── D. Son Haberler & Etki (canlı akış) ────────────────────┐   ║
║  │                                                            │    ║
║  │  14:20  TCMB: Faiz %37'ye indi                      +0.8  │    ║
║  │         Tahvil ▲  Altın ▲  Döviz ▼                         │    ║
║  │                                                            │    ║
║  │  13:45  Altın ons rekor                              +0.6  │    ║
║  │         Altın ▲▲                                           │    ║
║  │                                                            │    ║
║  │  11:30  BIST 100 %2.3 düştü                          -0.7  │    ║
║  │         Hisse ▼▼  Tahvil ▲                                 │    ║
║  │                                          ──── tümü → /sent │    ║
║  └────────────────────────────────────────────────────────────┘    ║
║                                                                    ║
║                                                                    ║
║  ┌─── E. İsabet Karnesi ──────────────────────────────────────┐   ║
║  │                                                            │    ║
║  │  Son 12 Hafta:  9/12 isabetli (%75)                        │    ║
║  │                                                            │    ║
║  │  ✓ ✓ ✗ ✓ ✓ ✓ ✗ ✓ ✓ ✓ ✗ ✓                                 │    ║
║  │  H1 H2 H3 H4 H5 H6 H7 H8 H9 H10 H11 H12                │    ║
║  │                                                            │    ║
║  │  Sinyal bazında:                                           │    ║
║  │  Momentum %58 ▒▒▒▒▒▒░░░░  Haber %67 ▒▒▒▒▒▒▒░░░           │    ║
║  │  Sürü     %75 ▒▒▒▒▒▒▒▒░░  Rejim %83 ▒▒▒▒▒▒▒▒▒░           │    ║
║  │                                                            │    ║
║  │  ⚠️ Bu tahminler geçmiş veriye dayalıdır.                  │    ║
║  │  Yatırım tavsiyesi niteliği taşımaz.                       │    ║
║  └────────────────────────────────────────────────────────────┘    ║
║                                                                    ║
║                                                                    ║
║  ┌─── F. Günün Sepeti (V4 — düşük korelasyon) ──────────────────┐ ║
║  │                                                            │    ║
║  │  Önerilen 3-4 Fon (en düşük korelasyon, yüksek skor):      │    ║
║  │                                                            │    ║
║  │  1. TYH (Altın)    RS: 1.32  Skor: +82  🟢                │    ║
║  │  2. MAC (Hisse)    RS: 1.08  Skor: +45  🟢                │    ║
║  │  3. IPB (Döviz)    RS: 1.05  Skor: +34  🟢                │    ║
║  │                                                            │    ║
║  │  Korelasyon matrisi: TYH↔MAC: 0.12  TYH↔IPB: 0.08         │    ║
║  │  ⚠️ Yatırım tavsiyesi değildir.                           │    ║
║  └────────────────────────────────────────────────────────────┘    ║
║                                                                    ║
╠══════════════════════════════════════════════════════════════════════╣
║  Footer (mevcut)                                                   ║
╚══════════════════════════════════════════════════════════════════════╝
```

## Dashboard bölümlerinin anatomisi

### A. Rejim Bandı
- Tam genişlik, sayfanın en üstünde
- Mevcut rejimi büyük badge ile gösterir
- 3 yıllık rejim timeline (renk şeridi)
- Geçiş olasılıkları mini bar
- Tıkla → `/predict/regime`

### B. Sinyal Matrisi
- **Dashboard'un kalbi**
- 7 kategori × 4 sinyal + 1 birleşik = 35 hücre
- Her hücre renk kodlu (-100..+100 → kırmızı..yeşil)
- Her hücre tıklanabilir → ilgili detay sayfasına git
- Birleşik sütun: yön + güç + güven birlikte
- Sıralama: birleşik skora göre (en iyi üstte)
- **V4 — XAI (Explainability):** Güven skoru renk kodlu (🟢 >%70, 🟡 %40-70, 🔴 <%40). Tıklanınca sinyal breakdown: "Sürü +40, Momentum +30, Rejim +20, Haber +10"
- **V4 — Kategori Yüzdelik:** Her fon için kategorisi içindeki percentile gösterilir + stopaj sonrası net RS

### C. Hızlı Bakış Kartları
- 3 kart: En güçlü sinyal, en zayıf sinyal, en anormal hareket
- Anlık dikkat çeken noktalara odaklanır
- Tıkla → ilgili detaya git

### D. Son Haberler & Etki
- Son 5 haberin başlığı + duygu skoru + etkilenen kategoriler
- Canlı akış hissi (yeni haberler üstte)
- "Tümü" linki → `/predict/sentiment`

### E. İsabet Karnesi
- Son 12 haftanın ✓/✗ geçmişi
- Her sinyal kaynağının ayrı hit rate'i
- Yasal uyarı her zaman görünür

### F. Günün Sepeti (V4)
- Yüksek skorlu fonlar arasında korelasyon matrisi
- En düşük korelasyonlu 3-4 fonu "Günün Sepeti" olarak öner
- Tıkla → fon detayına git
- Yasal uyarı zorunlu

---
---

# 6. DETAY SAYFALARI

Her detay sayfası kendi aracının derin analizini gösterir.
Dashboard'dan tıklayarak ulaşılır.

## Ortak yapı

```
Her detay sayfası şu yapıda:

┌────────────────────────────────────────┐
│  Başlık + Son güncelleme zamanı        │
├────────────────────────────────────────┤
│  Ana görselleştirme (araça özel)       │
│  Scatter plot / gauge / heatmap / vs.  │
├────────────────────────────────────────┤
│  Veri tablosu (sıralanabilir)          │
├────────────────────────────────────────┤
│  Uyarılar & anomaliler                 │
├────────────────────────────────────────┤
│  Trend grafiği (7-30 gün)             │
├────────────────────────────────────────┤
│  Yasal uyarı                           │
└────────────────────────────────────────┘
```

## /predict/momentum — Momentum Radar

```
Ana görselleştirme: Scatter plot
  X: Momentum skor (-100..+100)
  Y: 30 günlük USD getiri (%)
  Nokta boyutu: piyasa değeri
  Nokta rengi: kategori

Tablo: Fon | RSI | MA Sinyal | Skor | Streak | Yön
Uyarılar: RSI aşırı alım/satım, golden/death cross
Trend: Son 30 günün momentum skoru çizgi grafik
```

## /predict/sentiment — Haber Nabzı

```
Ana görselleştirme: Gauge meter (genel piyasa duygusu)
  + Kategori bazında yatay bar chart

Tablo: Saat | Kaynak | Başlık | Duygu | Etkilenen kategoriler
Uyarılar: Ani duygu değişimi, yüksek etkili haber
Trend: 7 günlük duygu trendi çizgi grafik (kategori bazında)
```

## /predict/flows — Sürü Barometresi

```
Ana görselleştirme: Butterfly chart (giriş ◄══► çıkış)
  + Panik↔Açgözlülük termometresi

Tablo: Fon | Market Cap Δ | Yatırımcı Δ | Flow Proxy | Z-Score
Uyarılar: Z-score > 2 olan fonlar, kontrarian sinyaller
Trend: 30 günlük kümülatif akış (stacked area chart)
```

## /predict/regime — Rejim Dedektörü

```
Ana görselleştirme: Büyük rejim kartı + geçiş olasılıkları
  + Yıllık rejim timeline

Tablo: Kategori | Bu rejimde ort. aylık USD | Örnek sayısı | Güven
Uyarılar: Rejim değişim sinyali, yüksek geçiş olasılığı
Trend: Rejim göstergeleri (volatilite, USD/TRY, BIST proxy) zaman serisi
```

---
---

# 7. FRONTEND COMPONENT HİYERARŞİSİ

```
src/
├── lib/
│   ├── api/
│   │   ├── supabase.ts           (mevcut — değişmez)
│   │   ├── fundDetailsCache.ts   (mevcut — değişmez)
│   │   └── predict.ts            (YENİ — tüm predict API sorguları)
│   │       ├── getLatestSignals(source?, targetType?)
│   │       ├── getLatestPredictions()
│   │       ├── getRegimeState()
│   │       ├── getRecentNews(limit)
│   │       ├── getHitRates()
│   │       └── getSignalHistory(source, days)
│   │
│   ├── predict/                   (YENİ — hesaplama yardımcıları)
│   │   ├── formatters.ts          Skor → renk, yön → ikon, güven → bar
│   │   └── constants.ts           Kategori listesi, renk kodları, eşikler
│   │
│   └── context/
│       └── TefasFilterContext.tsx  (mevcut — değişmez)
│
├── components/
│   ├── predict/                   (YENİ — tüm predict bileşenleri)
│   │   │
│   │   ├── shared/                ← Paylaşılan alt bileşenler
│   │   │   ├── SignalBadge.tsx     Tekli sinyal skoru + renk + ikon
│   │   │   ├── ConfidenceBar.tsx   Güven çubuğu (%0-100)
│   │   │   ├── DirectionIcon.tsx   ▲▲ ▲ ─ ▼ ▼▼ ikon bileşeni
│   │   │   ├── ScoreCell.tsx       Matris hücresi (skor + renk)
│   │   │   ├── AlertCard.tsx       Uyarı kartı (anomali, sinyal)
│   │   │   ├── TrendMiniChart.tsx  Küçük sparkline (inline çizgi)
│   │   │   └── LegalDisclaimer.tsx Yasal uyarı metni
│   │   │
│   │   ├── dashboard/             ← Ana dashboard bileşenleri
│   │   │   ├── RegimeBand.tsx      A: Rejim bandı (tam genişlik)
│   │   │   ├── SignalMatrix.tsx    B: Sinyal matrisi tablosu
│   │   │   ├── QuickCards.tsx      C: Hızlı bakış 3 kart
│   │   │   ├── NewsFeed.tsx        D: Son haberler akışı
│   │   │   └── HitRateCard.tsx     E: İsabet karnesi
│   │   │
│   │   ├── momentum/              ← Momentum detay sayfası
│   │   │   ├── MomentumRadar.tsx   Scatter plot
│   │   │   └── MomentumTable.tsx   Sinyal tablosu
│   │   │
│   │   ├── sentiment/             ← Haber Nabzı detay
│   │   │   ├── SentimentGauge.tsx  Gauge meter
│   │   │   ├── CategoryBars.tsx    Kategori barları
│   │   │   ├── NewsTable.tsx       Haber + etki tablosu
│   │   │   └── SentimentTrend.tsx  7 günlük trend
│   │   │
│   │   ├── flows/                 ← Sürü Barometresi detay
│   │   │   ├── FlowThermometer.tsx Panik↔Açgözlülük
│   │   │   ├── ButterflyChart.tsx  Giriş/çıkış butterfly
│   │   │   ├── FlowTable.tsx       Fon bazında akış tablosu
│   │   │   └── FlowTrend.tsx       Stacked area trend
│   │   │
│   │   └── regime/                ← Rejim Dedektörü detay
│   │       ├── RegimeCard.tsx      Büyük rejim kartı
│   │       ├── TransitionProbs.tsx Geçiş olasılıkları
│   │       ├── RegimeReturns.tsx   Rejim × getiri tablosu
│   │       └── RegimeTimeline.tsx  Yıllık renk şeridi
│   │
│   ├── ui/                        (mevcut — değişmez)
│   ├── layout/                    (mevcut — değişmez)
│   └── charts/                    (mevcut — değişmez)
│
└── app/
    └── predict/
        ├── layout.tsx              Sub-nav layout
        ├── page.tsx                Dashboard (A+B+C+D+E)
        ├── momentum/page.tsx       Momentum detay
        ├── sentiment/page.tsx      Haber Nabzı detay
        ├── flows/page.tsx          Sürü Barometresi detay
        └── regime/page.tsx         Rejim Dedektörü detay
```

## Veri akışı (frontend)

```
Supabase  ──→  predict.ts (API katmanı)  ──→  React components
                    │
                    ├── getLatestSignals()
                    │     signals tablosu → bugünün sinyalleri
                    │     Tüm dashboard + detay sayfaları kullanır
                    │
                    ├── getLatestPredictions()
                    │     predictions tablosu → bu haftanın tahminleri
                    │     Dashboard SignalMatrix + QuickCards kullanır
                    │
                    ├── getRegimeState()
                    │     regime_state tablosu → mevcut rejim
                    │     Dashboard RegimeBand + Regime detay kullanır
                    │
                    ├── getRecentNews(limit)
                    │     news_items + join news ilişkili signals
                    │     Dashboard NewsFeed + Sentiment detay kullanır
                    │
                    ├── getHitRates()
                    │     signal_weights + prediction_results aggregate
                    │     Dashboard HitRateCard kullanır
                    │
                    └── getSignalHistory(source, days)
                          signals tablosu → geçmiş N gün
                          Trend grafikleri kullanır
```

---
---

# 8. VERİ AKIŞ DİYAGRAMI (UÇ UÇTAN)

```
09:30 UTC — GitHub Actions tetiklenir (12:30 TR — TEFAS NAV verisinin oturması için)
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                     pipeline.py --daily                      │
│                                                             │
│  ═══ ADIM 1: VERİ TOPLAMA (paralel, ~5 dk) ═══             │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐│
│  │frankfurter│ │ TEFAS    │ │ TEFAS    │ │KAP/BHT   │ │Yahoo││
│  │  .app    │ │ Prices   │ │ Details  │ │RSS Feeds  │ │Fin. ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬──┘│
│       │            │            │             │          │   │
│       ▼            ▼            ▼             ▼          ▼   │
│  exchange_    fund_        fund_         news_       cds_    │
│  rates        prices       snapshots     items       5y      │
│                                                             │
│  ═══ ADIM 2: SİNYAL ÜRETİMİ (paralel, ~3 dk) ═══          │
│                                                             │
│  fund_prices + exchange_rates                               │
│       │                                                     │
│       ├──→ momentum.py ──→ ┐                                │
│       │                    │                                │
│  news_items                │                                │
│       │                    │                                │
│       ├──→ sentiment.py ──→┤                                │
│       │                    │                                │
│  fund_snapshots            │      signals                   │
│       │                    ├────→ tablosu                    │
│       ├──→ flow.py ────────┤                                │
│       │                    │                                │
│  exchange_rates (5 yıl)    │                                │
│       │                    │                                │
│       └──→ regime.py ──────┘                                │
│                  │                                          │
│                  └──→ regime_state                           │
│                                                             │
│  ═══ ADIM 3: ENSEMBLE (sıralı, ~1 dk) ═══                  │
│                                                             │
│  signals + signal_weights                                   │
│       │                                                     │
│       ▼                                                     │
│  merger.py ──→ predictions                                  │
│                                                             │
│  ═══ ADIM 4: BACK-TEST (sıralı, ~30 sn) ═══                │
│                                                             │
│  predictions (geçmiş hafta) + fund_prices (gerçekleşen)     │
│       │                                                     │
│       ▼                                                     │
│  evaluator.py ──→ prediction_results                        │
│                   signal_weights (güncelleme)                │
│                                                             │
│  ═══ TOPLAM: ~10 dakika ═══                                 │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
    Supabase'de tüm veriler güncel
          │
          ▼
    Kullanıcı /predict açar
          │
          ▼
    Next.js → predict.ts → Supabase sorguları
          │
          ▼
    Dashboard render (client-side)
```

---
---

# 9. HEADER ENTEGRASYONU

Mevcut Header'a "Tahmin" navigasyon linki eklenir:

```
Mevcut nav:
  Analiz | Karşılaştır | Sıralama | Karneler | BES | Daha Fazla ▾

Yeni nav:
  Analiz | Karşılaştır | Sıralama | Karneler | BES | Tahmin | Daha Fazla ▾
                                                      ^^^^^^
                                                      YENİ (turuncu/amber renk)

"Tahmin" tıklanınca → /predict (ana dashboard)
Sub-nav ile detay sayfalarına geçiş
```

---
---

# 10. GELİŞTİRME YOLHARITALARI

## MVP (Faz 1 + 2): Altyapı + Momentum + Sürü + Dashboard

```
Yapılacaklar:
  ☐ Yeni Supabase tablolarını oluştur (7 tablo)
  ☐ scripts/ dizinini yeniden yapılandır (collectors/, producers/, ensemble/)
  ☐ config.py — merkezi Supabase bağlantı
  ☐ models/signal.py — Signal dataclass
  ☐ producers/base.py — SignalProducer base class
  ☐ producers/momentum.py — RS (Relative Strength) vs benchmark, MA crossover
  ☐ collectors/snapshots.py — günlük market_cap + investor_count
  ☐ producers/flow.py — flow proxy, çift pencere z-score (10d+30d), herd score
  ☐ pipeline.py — collect + momentum + flow adımlarını çalıştır
  ☐ lib/api/predict.ts — getLatestSignals()
  ☐ components/predict/shared/* — tüm paylaşılan bileşenler
  ☐ components/predict/momentum/* — radar + tablo
  ☐ components/predict/flows/* — thermometer, butterfly, tablo
  ☐ app/predict/layout.tsx — sub-nav
  ☐ app/predict/page.tsx — dashboard (momentum + sürü sütunları dolu)
  ☐ app/predict/momentum/page.tsx — detay sayfası
  ☐ app/predict/flows/page.tsx — detay sayfası
  ☐ Header'a "Tahmin" linki ekle

Neden birlikte (MVP):
  - Her ikisi de DETERMİNİSTİK — hata payı düşük, sonuçlar güvenilir
  - Momentum'un verisi zaten mevcut (fund_prices + exchange_rates)
  - Sürü'nün verisi kolay toplanır (TEFAS'tan market_cap zaten çekiliyor)
  - ML/NLP bağımlılığı YOK — numpy+pandas yeterli
  - Signal Bus pattern'ı 2 sinyal ile test edilir
  - Kullanıcı 1. günden 2 sütunlu dashboard görür

Bağımlılık: Yok
```

## Faz 3: Rejim Dedektörü + CDS Entegrasyonu

```
Yapılacaklar:
  ☐ CDS 5Y veri kaynağı bağlantısı (Investing.com scrape veya API)
  ☐ producers/regime.py — HMM eğitimi + inference (3 rejim: Düşük Vol, Yüksek Vol, Kriz)
  ☐ Gözlem vektörü: [usdtry_ret, bist_ret, gold_ret, vol_30d, rate_level, cds_5y]
  ☐ Rejim × Kategori back-test matrisi hesapla (1 seferlik)
  ☐ pipeline.py'ye regime producer ekle
  ☐ components/predict/regime/* — badge, geçiş, timeline
  ☐ app/predict/regime/page.tsx — detay sayfası
  ☐ Dashboard RegimeBand bileşenini aktifleştir
  ☐ Dashboard SignalMatrix'e "Rejim" sütunu ekle

Neden üçüncü:
  - HMM eğitimi dikkatli kalibrasyon ister
  - CDS 5Y verisi ayrı bir veri kaynağı gerektirir
  - 3 rejim (4 yerine) daha az veri ile daha güvenilir eğitim sağlar
  - Rejim tanımları uzman gözüyle doğrulanmalı

Bağımlılık: Faz 1+2 (altyapı)
```

## Faz 4: Haber Nabzı (en son — en çok gürültü üreten)

```
Yapılacaklar:
  ☐ collectors/news.py — KAP RSS, Bloomberg HT RSS, TCMB scraper
  ☐ Türkçe finans duygu sözlüğü oluştur (~1000 terim, VADER benzeri)
  ☐ distilbert-base-turkish-cased entegrasyonu (sadece kritik haberler için)
  ☐ Etki matrisi tanımla (14 haber tipi × 7 kategori)
  ☐ Etki matrisini Pearson korelasyonu ile periyodik güncelleme scripti
  ☐ producers/sentiment.py — sözlük + distilbert pipeline + etki matrisi
  ☐ pipeline.py'ye news collector + sentiment producer ekle
  ☐ components/predict/sentiment/* — gauge, barlar, haber tablosu
  ☐ app/predict/sentiment/page.tsx — detay sayfası
  ☐ Dashboard NewsFeed bileşenini aktifleştir
  ☐ Dashboard SignalMatrix'e "Haber" sütunu ekle

Neden en son:
  - En çok "gürültü" (noise) üretecek sinyal — kalibrasyon zor
  - Sözlük tabanlı başlayıp, distilbert sadece kritik haberler için (pratik yaklaşım)
  - Etki matrisi artık statik değil, Pearson korelasyonuyla güncellenir
  - distilbert (%40 daha hafif) GitHub Actions'da pratik çalışır
  - Diğer 3 sinyal yeterince güvenilir tahmin üretir

Bağımlılık: Faz 1+2 (altyapı)
```

## Faz 5: Ensemble + Back-test (tüm sinyaller hazır olmalı)

```
Yapılacaklar:
  ☐ ensemble/merger.py — Exponential Decay ağırlıklı birleştirme
  ☐ ensemble/evaluator.py — haftalık MAE bazlı back-test + ağırlık güncelleme
  ☐ pipeline.py'ye ensemble + backtest adımlarını ekle
  ☐ Dashboard SignalMatrix "BİRLEŞİK" sütununu aktifleştir
  ☐ Dashboard HitRateCard'ı aktifleştir
  ☐ QuickCards'ı tüm sinyallerle besle

Neden son:
  - Diğer 4 aracın tamamlanmış olması gerekir
  - En az 4-8 hafta veri birikmeli ki back-test anlamlı olsun
  - Exponential Decay ağırlıklar ancak yeterli veri ile çalışır
  - MAE bazlı değerlendirme tahmin büyüklüğünü de ölçer

Bağımlılık: Faz 1+2 + 3 + 4 (tümü)
```

## Faz diyagramı

```
Zaman ──────────────────────────────────────────────────►

MVP ████████████████████████
    Altyapı + Momentum + Sürü + Dashboard
                              │
                              ├── Faz 3 ████████████████
                              │   Rejim + CDS 5Y
                              │
                              └── Faz 4 ████████████████████
                                  Haber Nabzı (en çok gürültü)
                                                         │
                                                         ▼
                                              Faz 5 ████████████
                                              Ensemble + Back-test

Not: Faz 3 ve 4 birbirine bağımlı DEĞİL.
MVP bittikten sonra paralel geliştirilebilir.
Sadece Faz 5 hepsini bekler.

MVP neden Momentum + Sürü?
  → Her ikisi deterministik, hata payı düşük
  → ML/NLP bağımlılığı yok
  → 2 sinyal ile bile anlamlı tahmin üretilebilir
```

---
---

# 11. DASHBOARD'A KADEMELI GEÇİŞ

Dashboard ilk günden itibaren var olur ama kademeli olarak dolar:

```
MVP sonunda dashboard:
┌─────────────────────────────────────────────┐
│  Rejim: "Veri bekleniyor..."                │
│                                             │
│  Sinyal Matrisi:                            │
│          Momentum   Sürü    Haber   Rejim   │
│  Altın    +82 🟢    +91 🟢    ··     ··     │
│  Hisse    -23 🔴    -40 🔴    ··     ··     │
│  ...                                        │
│                                             │
│  ·· = "Bu sinyal henüz aktif değil"         │
│  (gri hücre, tooltip ile açıklama)          │
└─────────────────────────────────────────────┘

MVP (Faz 1+2) sonunda: Momentum + Sürü sütunları dolu
Faz 3 sonunda: Rejim sütunu + Rejim Bandı aktif
Faz 4 sonunda: Haber sütunu + haber akışı aktif
Faz 5 sonunda: BİRLEŞİK sütunu + hit rate kartı aktif
```

Bu yaklaşımın avantajları:
1. Kullanıcılar ilk günden dashboard'u kullanabilir
2. Her faz sonunda yeni bir sütun "ışıklandırılır" → heyecan yaratır
3. Gri hücreler "yakında geliyor" mesajı verir → beklenti oluşturur
4. Tek sayfada tüm ilerleme görünür

---
---

# 12. RİSK VE ZORLUKLAR

| Risk | Etki | Azaltma |
|------|------|---------|
| distilbert modeli GitHub Actions'da yavaş çalışabilir | Pipeline timeout | distilbert (%40 daha hafif), sözlük tabanlı öncelikli, model GitHub Cache'de |
| TEFAS API rate limit / değişiklik | Veri toplama kırılır | Retry + exponential backoff, birden fazla session |
| HMM yanlış rejim tespit eder | Güven kaybı | 3 rejim (4 yerine), CDS 5Y ile güçlendirilmiş gözlem vektörü, min güven %60 |
| Düşük hit rate (%50 civarı) | Kullanıcı güvensizliği | Şeffaf raporlama, "rastgele tahmin %50" referansı göster |
| KAP/Bloomberg HT scraping kırılır | Haber verisi boş | Graceful degradation: haber yoksa diğer 3 sinyal ile devam |
| Yasal risk (yatırım tavsiyesi algısı) | Hukuki sorun | Her sayfada uyarı, "tavsiye değildir" metni, SPK regülasyonu takibi |
| Supabase free tier limiti (50K satır) | Günlük ~500 satır, 100 günde dolar | signals tablosu 60 gün retention, sadece ensemble sonuçları uzun tutulur, upsert zorunlu |
| RS çift kur etkisi | Gürültülü momentum skoru | Benchmark TL bazlıysa RS de TL getiriler üzerinden hesaplanır (çift dönüşüm yok) |
| HMM overfitting (CDS + vol korelasyonu) | Yanlış rejim tespiti | Tüm gözlem değişkenleri Z-score normalize edildikten sonra HMM'e verilir |
| TEFAS NAV gecikmesi | Dünün verisiyle tahmin | Pipeline 12:30 TR + 13:30 retry + is_delayed flag |
| Tatil/yarım gün yanlış sinyal | Düşük hacimde sahte momentum | is_market_open() + hacim kontrolü (%10 eşik) → momentum dondurma |
| Rejim flip-flop | Güvensiz rejim sinyalleri | HMM histerezis: 5 gün minimum kalma şartı |
| Tek sinyal baskınlığı | Ensemble dengesizliği | Veri kalitesi raporu: tek sinyal > %40 ağırlık → alarm |
| VIX/DXY/Brent/GPR eksikliği | Makro katman eksik kalır | Gece pipeline (23:59 TR) global makro güncelleme, graceful degradation |

## Veri retention politikası

```sql
-- Aylık temizlik (pipeline.py --cleanup):

-- 60 günden eski sinyalleri sil (50K satır limitine karşı koruma)
DELETE FROM signals WHERE created_at < NOW() - INTERVAL '60 days';

-- 180 günden eski haberleri sil (başlıkları tut, body sil)
UPDATE news_items SET body = NULL WHERE published_at < NOW() - INTERVAL '180 days';

-- 1 yıldan eski snapshot'ları haftalık özete dönüştür
-- (ortalamaları ayrı tabloya taşı, günlükleri sil)
```

---
---

# 13. DOSYA SAYISI ÖZETİ

| Kategori | Dosya Sayısı | Detay |
|----------|-------------|-------|
| Python pipeline | 15 | pipeline.py + config + 5 collector (rates, prices, snapshots, cds, news) + 5 producer + base + 2 ensemble + 2 model |
| Supabase SQL | 1 | predict_schema.sql (7 tablo) |
| TypeScript API | 2 | predict.ts + constants.ts |
| React bileşenleri | 22 | 7 shared + 5 dashboard + 2 momentum + 4 sentiment + 4 flow + 4 regime |
| Next.js sayfaları | 6 | layout + dashboard + 4 detay |
| GitHub Actions | 1 | daily-pipeline.yml |
| **TOPLAM** | **46 dosya** | |

---
---

# 14. SONUÇ

Bu sistem 5 ayrı aracı "yapıştırmak" yerine, baştan **tek bir veri akışı** olarak tasarlar:

1. **Signal Bus** — Tüm araçlar aynı formatta çıktı üretir
2. **Tek pipeline** — Bir cron job, bir orchestrator, dört adım
3. **Tek dashboard** — Kullanıcı tek sayfada her şeyi görür
4. **Kademeli açılım** — Her faz yeni bir sütun ekler, dashboard hiç kırılmaz
5. **Kendi kendini değerlendiren sistem** — Hit rate şeffaf, ağırlıklar dinamik

Mevcut altyapıyı (Supabase, GitHub Actions, Python scraper'lar, Next.js) yeniden kullanır.
Yeni sadece: 7 tablo, 14 Python dosyası, 30 React bileşeni.
