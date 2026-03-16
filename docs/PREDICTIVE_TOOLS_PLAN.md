# Göstergeç — 5 Predictive Tools
## "Fonunuz Yarın Ne Yapar?"

---

# Tool 1: Momentum Radar
### Teknik Momentum Tarayıcı

---

## Problem
Yatırımcılar fon fiyatlarının ivme kazanıp kazanmadığını anlayamıyor. TL bazında "yükseliyor" görünen bir fon aslında USD bazında ivme kaybediyor olabilir.

## Çözüm
Her fon için çoklu zaman diliminde momentum sinyalleri hesapla, tüm fonları tek bir radar ekranında göster.

## Veri Kaynakları

| Kaynak | Veri | Nasıl |
|--------|------|-------|
| Supabase `fund_prices` | Günlük TL fiyatları | Mevcut veritabanı |
| Supabase `exchange_rates` | USD/EUR/Altın kurları | Mevcut veritabanı |
| TEFAS API | Güncel fon fiyatları | Scraper (mevcut script) |
| Hesaplama | RS (vs benchmark), MA cross | Client-side JS |

## Hesaplama Motoru

```
Her fon için şu sinyaller hesaplanır:

1. Relative Strength (RS) vs Kategori Bazlı Benchmark
   - Fonun getirisini KATEGORİSİNE UYGUN benchmark ile kıyaslar
   - RS > 1.0 = benchmark'tan iyi, RS < 1.0 = kötü
   - Benchmark TL bazlıysa → RS de TL getiriler üzerinden hesaplanır
     (çift kur dönüşümü gürültü yaratır)
   - Benchmark eşleşmesi:
     • Hisse Fonları → BIST100 (XU100)
     • Altın/Emtia → ONS/Gram Altın
     • Para Piy./Borçlanma → Gecelik Repo (ON)
     • Döviz → USD/TRY kuru
     • Yab. Hisse → S&P 500
     • Karma → %50 BIST100 + %50 Mevduat
   - NOT: RSI yerine RS kullanılır. Fon NAV'ı gecikmeli hesaplandığından
     RSI "momentum" yakalamaktan ziyade "trend teyidi" sağlar.
     Kategori bazlı benchmark kıyası çok daha güçlü sinyal verir.

2. Moving Average Crossover
   - 20-gün MA vs 50-gün MA (USD bazında)
   - Golden Cross = yukarı sinyal
   - Death Cross = aşağı sinyal

3. Momentum Score (özel formül)
   momentum = (0.4 × RS_normalized)
            + (0.3 × MA_cross_signal)
            + (0.2 × 30d_USD_trend)
            + (0.1 × streak_signal)

4. Streak Counter
   - Ardışık pozitif/negatif USD getiri günleri

5. V4 — Tatil & Sessiz Dönem Koruması
   - is_market_open(today) → Türkiye tatil takvimi kontrolü
   - Tatilse → pipeline çalışmaz
   - Yarım gün + düşük hacim: son 30 günün medyan hacminin %10'undan
     düşükse → momentum sinyali DONDURULUR (yanlış sinyal önlemi)

6. V4 — AOF Gecikme Flag'i
   - Bugünün NAV fiyatı gelmemişse → dünkü fiyat ile hesapla
   - Sinyal is_delayed=true flag'i ile işaretlenir
   - Dashboard'da gri ikon ile "gecikmeli veri" uyarısı

Sonuç: Her fon -100 ile +100 arası skor alır
```

## UI Tasarımı

```
┌─────────────────────────────────────────────────┐
│  MOMENTUM RADAR                    [TEFAS ▾]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─── Filtreler ──────────────────────────────┐ │
│  │ Baz: [TL] [USD●] [EUR] [Altın]             │ │
│  │ Kategori: [Tümü●] [Hisse] [Altın] [Döviz]  │ │
│  │ ☐ Özel fonları dahil et                     │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌─── Radar Haritası ─────────────────────────┐ │
│  │                                             │ │
│  │     ● TYH (+82)                             │ │
│  │           ● GAL (+71)                       │ │
│  │  ● MAC (+45)                                │ │
│  │              ─ ─ ─ 0 çizgisi ─ ─ ─          │ │
│  │                        ● AFA (-23)          │ │
│  │  ● IST (-67)                                │ │
│  │                                             │ │
│  │  X: Momentum Skor  Y: Hacim Değişimi        │ │
│  └─────────────────────────────────────────────┘ │
│                                                 │
│  ┌─── Sinyal Tablosu ─────────────────────────┐ │
│  │ Fon  │ RS   │ MA    │ Skor │ Streak │ Yön  │ │
│  │──────│──────│───────│──────│────────│──────│ │
│  │ TYH  │ 1.32 │ Gold  │ +82  │ 12gün↑ │  ▲▲ │ │
│  │ GAL  │ 1.22 │ Gold  │ +71  │ 8gün↑  │  ▲  │ │
│  │ MAC  │ 1.08 │ —     │ +45  │ 3gün↑  │  ▲  │ │
│  │ IPB  │ 1.01 │ —     │ +12  │ 1gün↓  │  ─  │ │
│  │ AFA  │ 0.88 │ Death │ -23  │ 5gün↓  │  ▼  │ │
│  │ IST  │ 0.72 │ Death │ -67  │ 14gün↓ │  ▼▼ │ │
│  └─────────────────────────────────────────────┘ │
│                                                 │
│  ┌─── Uyarılar ───────────────────────────────┐ │
│  │ ⚡ TYH: RS 1.32 — benchmark'ı %32 geçiyor    │ │
│  │ ⚡ IST: RS 0.72 — benchmark'ın %28 altında   │ │
│  │ ⚡ GAL: Golden Cross oluştu (3 gün önce)     │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Teknik Mimari

```
src/
├── lib/predict/momentum.ts          ← Hesaplama motoru
│   ├── calculateRS(fundPrices, benchmarkPrices)
│   ├── detectCrossover(shortMA, longMA)
│   ├── calculateStreak(prices)
│   └── getMomentumScore(fund) → -100..+100
├── components/predict/
│   ├── MomentumRadar.tsx            ← Ana bileşen
│   ├── RadarScatterPlot.tsx         ← Recharts scatter
│   └── SignalTable.tsx              ← Sinyal tablosu
└── app/predict/momentum/page.tsx    ← Sayfa route
```

## Zorluk Tahmini
- Hesaplama: **Kolay** — Tüm formüller deterministik, client-side çalışır
- Veri: **Mevcut** — fund_prices + exchange_rates zaten var
- UI: **Orta** — Scatter plot + tablo + uyarı kartları

---
---

# Tool 2: Haber Nabzı
### Türkçe Finans Haberi Duygu Analizi

---

## Problem
Yatırımcılar günde yüzlerce finans haberi okuyamaz. Haberlerin fonları nasıl etkileyeceğini anlık olarak bilmek isterler. Bir "faiz artırımı" haberi altın fonlarını farklı, tahvil fonlarını farklı etkiler.

## Çözüm
Türkçe finans haberlerini gerçek zamanlı topla, duygu analizi (NLP) uygula, her fon kategorisine etkisini skorla.

## Veri Kaynakları

| Kaynak | Veri | Erişim |
|--------|------|--------|
| KAP (kap.org.tr) | Resmi şirket/fon bildirimleri | RSS + scraper |
| Bloomberg HT | Türkçe finans haberleri | RSS feed |
| TCMB | Faiz kararları, enflasyon | Resmi site scraper |
| Reuters TR | Makro haberler | RSS |
| Ekşi Sözlük / Twitter | Yatırımcı duygusu | API / scraper |

## NLP Pipeline

```
HAM HABER
    │
    ▼
┌──────────────────┐
│ 1. TOPLAMA        │  KAP RSS, Bloomberg HT, TCMB
│    (her 15 dk)    │  → ~200 haber/gün
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. ÖN İŞLEME      │  Türkçe tokenization
│                    │  Stop word temizleme
│                    │  Varlık tanıma (NER):
│                    │    "TCMB" → kurum
│                    │    "altın" → emtia
│                    │    "faiz" → makro gösterge
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. DUYGU ANALİZİ  │  Yöntem: Sözlük öncelikli + distilbert kritik
│                    │
│  Sözlük Katmanı:   │  Finans-spesifik Türkçe sözlük (VADER benzeri)
│  (TÜM HABERLER)   │    ~500 pozitif terim
│    "artış"   → +1  │    ~500 negatif terim
│    "düşüş"   → -1  │    ~200 nötr terim
│    "belirsiz"→  0  │
│                    │
│  ML Katmanı:       │  SADECE KRİTİK HABERLER İÇİN
│  Tetikleme:        │  Kaynak + Keyword KESİŞİMİ
│    Kaynak: TCMB,   │  KAP "Yatırımcı Duyuruları"
│    Keyword: faiz,  │  enflasyon, para politikası,
│    karar, kredi    │  notu
│  Model:            │  distilbert-base-turkish-cased
│                    │  (%40 daha hafif, %95 performans)
│                    │
│  Çıktı: -1..+1     │  güven skoru ile birlikte
│                    │
│  NOT: Full BERT her haberde overkill.
│  Sözlük hızlı ve ucuz, distilbert sadece yüksek etkili
│  haberlerde devreye girer.
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. KATEGORİ        │  Her haberi fon kategorilerine eşle:
│    EŞLEŞTİRME      │
│                    │  "faiz indirimi" →
│                    │    Altın:   +0.6 (pozitif)
│                    │    Tahvil:  +0.8 (çok pozitif)
│                    │    Hisse:   +0.4 (hafif pozitif)
│                    │    Döviz:   -0.3 (hafif negatif)
│                    │
│  Etki Matrisi:     │  14 haber tipi × 7 kategori
│    Başlangıçta     │  uzman tarafından kalibre
│    Sonra           │  HAFTALIK Pearson korelasyonu (90 gün pencere)
│                    │  haber_duygu vs kategori_getiri → matris güncellenir
│                    │  (günlük = gürültü, aylık = yavaş, haftalık ideal)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. KATEGORİ SKORU  │  Son 72 saat haberleri TIME-DECAY ile:
│                    │
│  V4 — TIME-DECAY:  │  Haberlerin etkisi zamanla azalır:
│    0-24 saat  → 1.0│    (tam etki)
│    24-48 saat → 0.5│    (yarı etki)
│    72+ saat   → 0.1│    (minimal etki)
│                    │  Kategori skoru = Σ(duygu × etki × decay)
│                    │    Yüksek güvenli haberler ağır
│                    │
│  V4 — VERSİYONLAMA:│  Her sinyal source_version ile etiketlenir
│                    │  Sözlük v1 vs v2 A/B test yapılabilir
│                    │
│  Çıktı:            │  Her kategori: -100..+100
│    Altın: +45       │  + "Neden?" açıklaması
│    Tahvil: +72      │  + Kaynak haberler listesi
│    Hisse: -12       │
└──────────────────┘
```

## Etki Matrisi (Çekirdek)

```
                    Altın  Hisse  Tahvil  Döviz  ParaPiy  Yab.Hisse  Karma
Faiz artırımı        -      -      +       +       +        -          ·
Faiz indirimi        +      +      -       -       -        +          ·
Enflasyon yüksek     +      -      -       -       -        ·          -
TL değer kaybı       +      -      ·       +       ·        +          ·
BIST rallisi         -      ++     ·       ·       ·        ·          +
Altın rallisi        ++     ·      ·       ·       ·        ·          ·
Jeopolitik risk      +      --     +       +       +        -          -
Kredi notu artışı    ·      ++     +       ·       ·        +          +
Savaş/Kriz haberi    ++     --     ·       +       +        -          -
Büyüme verisi iyi    ·      +      ·       -       ·        ·          +
İşsizlik artışı      ·      -      +       ·       +        ·          -
Cari açık büyüyor    -      ·      -       +       ·        ·          -
Yabancı yatırım      ·      +      ·       -       ·        +          +
TCMB müdahalesi      -      ·      ·       --      ·        ·          ·
```

## UI Tasarımı

```
┌─────────────────────────────────────────────────┐
│  HABER NABZI                   Son güncelleme:  │
│  Piyasa Duygu Analizi          14:35            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─── Genel Nabız ───────────────────────────┐  │
│  │                                           │  │
│  │    😰 ──────────●────────── 😄            │  │
│  │   -100         +23          +100          │  │
│  │                                           │  │
│  │   Piyasa hafif pozitif. Faiz indirimi     │  │
│  │   beklentisi hakim.                       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Kategori Nabızları ────────────────────┐  │
│  │                                           │  │
│  │  Tahvil    ████████████████░░  +72  🟢    │  │
│  │  Altın     ██████████░░░░░░░░  +45  🟢    │  │
│  │  ParaPiy   ████████░░░░░░░░░░  +31  🟡    │  │
│  │  Karma     ██████░░░░░░░░░░░░  +18  🟡    │  │
│  │  Döviz     █████░░░░░░░░░░░░░  +05  🟡    │  │
│  │  Hisse     ████░░░░░░░░░░░░░░  -12  🔴    │  │
│  │  Yab.Hisse ███░░░░░░░░░░░░░░░  -28  🔴    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Son Haberler & Etki ───────────────────┐  │
│  │                                           │  │
│  │  14:20  TCMB: Faiz %37'ye indi     +0.8  │  │
│  │         → Tahvil ▲, Altın ▲, Döviz ▼      │  │
│  │         Kaynak: Bloomberg HT              │  │
│  │                                           │  │
│  │  13:45  Altın ons fiyatı rekor kırdı +0.6 │  │
│  │         → Altın ▲▲, Hisse ─               │  │
│  │         Kaynak: Reuters TR                │  │
│  │                                           │  │
│  │  11:30  BIST 100 %2.3 düştü         -0.7 │  │
│  │         → Hisse ▼▼, Tahvil ▲              │  │
│  │         Kaynak: KAP                       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── 7 Günlük Duygu Trendi ────────────────┐  │
│  │                                           │  │
│  │   +50 ┤  ╭─╮                              │  │
│  │       │ ╭╯ ╰╮  ╭╮                        │  │
│  │     0 ┤╯    ╰──╯╰╮                       │  │
│  │       │          ╰──╮                     │  │
│  │   -50 ┤             ╰─●                   │  │
│  │       └──┬──┬──┬──┬──┬──┬──               │  │
│  │         Pzt Sal Çar Per Cum Cmt Paz       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Teknik Mimari

```
Backend (Python cron job — her 15 dk):
├── scripts/news_scraper.py          ← KAP/Bloomberg/TCMB RSS
├── scripts/sentiment_analyzer.py    ← Sözlük + distilbert (kritik haberler)
├── scripts/category_mapper.py       ← Etki matrisi uygulaması
└── Supabase tabloları:
    ├── news_items (id, source, title, body, url, published_at)
    ├── news_sentiment (news_id, raw_score, confidence)
    └── category_sentiment (category, score, updated_at, reasons[])

Frontend (Next.js):
├── lib/predict/sentiment.ts         ← Supabase query
├── components/predict/
│   ├── HaberNabzi.tsx               ← Ana bileşen
│   ├── SentimentGauge.tsx           ← Gauge meter
│   ├── CategoryBars.tsx             ← Yatay bar chart
│   ├── NewsFeed.tsx                 ← Haber akışı
│   └── SentimentTrend.tsx           ← 7 günlük çizgi grafik
└── app/predict/sentiment/page.tsx
```

## Zorluk Tahmini
- NLP: **Orta** — Sözlük tabanlı başla (hızlı), distilbert sadece kritik haberler (daha pratik)
- Veri toplama: **Orta** — RSS kolay, KAP scraping orta zorlukta
- Etki matrisi: **Orta** — Uzman kalibrasyonu gerekir, iteratif iyileştirme
- Altyapı: **Orta** — Python cron job + yeni Supabase tabloları

---
---

# Tool 3: Sürü Barometresi
### Yatırımcı Davranış & Akış Analizi

---

## Problem
"Herkes altına koşuyor" söylentileri var ama kanıt yok. Yatırımcılar diğer yatırımcıların ne yaptığını göremez. Fon akışları (para giriş/çıkışı) en güçlü öncü göstergelerden biri ama Türkiye'de kimse bunu görselleştirmiyor.

## Çözüm
TEFAS'tan fon büyüklüğü ve yatırımcı sayısı değişimlerini takip et. "Akıllı para nereye gidiyor?" sorusunu cevapla. Ani yatırımcı akınları veya kaçışları tespit et.

## Veri Kaynakları

| Kaynak | Veri | Sıklık |
|--------|------|--------|
| Supabase `fund_details` | `market_cap`, `investor_count` | Günlük (scraper) |
| TEFAS | Günlük fon büyüklükleri | Günlük scrape |
| Hesaplama | Akış delta, z-score, trend | Client-side |

## Akış Hesaplama Motoru

```
Her fon için günlük delta:

  flow_proxy = market_cap[t] - market_cap[t-1] × (price[t] / price[t-1])

  Açıklama: Fon büyüklüğü değişiminden fiyat değişimini çıkarıyoruz.
  Kalan = net para girişi/çıkışı (flow proxy)

Yatırımcı değişimi:
  investor_delta = investor_count[t] - investor_count[t-1]
  investor_delta_pct = investor_delta / investor_count[t-1] × 100

Anomali tespiti (Çift Pencere Z-Score):
  z_short = (today_flow - mean_10d_flow) / std_10d_flow   ← HIZLI (FOMO tespiti)
  z_long  = (today_flow - mean_30d_flow) / std_30d_flow   ← TREND teyidi
  |z_short| > 2.0 VEYA |z_long| > 2.0 → ⚡ Anomali uyarısı
  NOT: 10 günlük kısa pencere eklendi — Türkiye'de sürü psikolojisi
       çok hızlı (FOMO) gelişir, 30 gün tek başına yavaş kalır.

  V4 — ANOMALİ EŞİK KURALLARI (net threshold):
  ┌──────────────────────────────────────────────────────────────┐
  │ "Ani Şişme" etiketi için TÜM koşullar sağlanmalı:          │
  │   |z_long| > 2.0 VE |z_short| > 1.5 VE zıt yön            │
  │   → güven = %50'ye düşürülür                                │
  │   → "Sürü giriyor ama henüz kalıcı değil" mesajı           │
  │                                                              │
  │ Tek z_score yüksekse:                                        │
  │   z_long > 2.0 ama z_short < 1.5 → normal trend (güven OK)  │
  │   z_short > 2.0 ama z_long < 1.0 → anlık spike (güven ↓)   │
  │                                    ama "Ani Şişme" DEĞİL     │
  └──────────────────────────────────────────────────────────────┘

Sürü skoru (kategori bazında):
  herd_score = Σ(flow_proxy × weight) / Σ(market_cap)
  weight = investor_count_change ile ağırlıklı

  Pozitif = para akışı içeri (boğa sürüsü)
  Negatif = para akışı dışarı (ayı sürüsü)

Kontrarian sinyal:
  Eğer herd_score > +80 → "Aşırı kalabalık, dikkat!"
  Eğer herd_score < -80 → "Aşırı panik, fırsat olabilir"

V5 — BIST YABANCI TAKAS ORANI (güven modifikatörü):
  Hisse kategorisi için "akıllı para" teyidi:
    Yabancı takas ↑ VE herd_score pozitif → güven ↑ (yabancı da giriyor)
    Yabancı takas ↓ VE herd_score pozitif → güven ↓ (sadece yerli FOMO)
  Ayrı sinyal DEĞİL — flow sinyalinin confidence'ını modifiye eder.
  Sadece Hisse kategorisine uygulanır.
  Kaynak: BIST günlük bülteni.
```

## UI Tasarımı

```
┌─────────────────────────────────────────────────┐
│  SÜRÜ BAROMETRESİ               [TEFAS ▾]      │
│  Yatırımcı Akış Analizi                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─── Genel Akış Termometresi ───────────────┐  │
│  │                                           │  │
│  │   PANIK ◄════════●══════════► AÇGÖZLÜLÜK  │  │
│  │   -100          +34            +100       │  │
│  │                                           │  │
│  │   Son 7 gün: Net ₺2.4 milyar giriş       │  │
│  │   Yatırımcı değişimi: +12,340 kişi        │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Kategori Akışları (son 7 gün) ────────┐  │
│  │                                           │  │
│  │         ◄── Çıkış ──┤── Giriş ──►         │  │
│  │                     │                     │  │
│  │  Altın    ██████████│████████████████ +₺1.2B │
│  │  ParaPiy  ████████░░│░░░░░░░░░░░░░░ -₺800M  │
│  │  Hisse    ░░░░░░░░░░│████████░░░░░░ +₺400M  │
│  │  Tahvil   ░░░░░░░░░░│██████░░░░░░░░ +₺200M  │
│  │  Döviz    ████░░░░░░│░░░░░░░░░░░░░░ -₺150M  │
│  │  Yab.His  ░░░░░░░░░░│████░░░░░░░░░░ +₺100M  │
│  │  Karma    ██░░░░░░░░│░░░░░░░░░░░░░░ -₺50M   │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Anomali Uyarıları ─────────────────────┐  │
│  │                                           │  │
│  │  🔴 TYH: Yatırımcı sayısı 1 günde %8 ↑   │  │
│  │     Z-score: 3.2 — Son 30 günün en yükseği│  │
│  │     "Altın fonlarına anormal giriş var"   │  │
│  │                                           │  │
│  │  🟡 AK1: ₺200M çıkış (1 gün)             │  │
│  │     Z-score: -2.4 — Para piyasasından kaçış│  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── En Çok Giriş/Çıkış (Fon Bazında) ─────┐  │
│  │                                           │  │
│  │  EN ÇOK GİRİŞ          EN ÇOK ÇIKIŞ      │  │
│  │  1. TYH  +₺340M ↑      1. AK1  -₺200M ↓  │  │
│  │  2. GAL  +₺280M ↑      2. YKP  -₺150M ↓  │  │
│  │  3. IPB  +₺120M ↑      3. GAE  -₺80M  ↓  │  │
│  │  4. MAC  +₺90M  ↑      4. IST  -₺60M  ↓  │  │
│  │  5. AFA  +₺50M  ↑      5. TTE  -₺40M  ↓  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── 30 Günlük Akış Trendi ────────────────┐  │
│  │  [Kategori bazında stacked area chart]    │  │
│  │  X: Tarih  Y: Kümülatif net akış (₺)     │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Teknik Mimari

```
Backend (Python daily cron):
├── scripts/flow_calculator.py
│   ├── fetch daily fund_details snapshots
│   ├── calculate flow_proxy per fund
│   ├── compute z-scores
│   └── store in Supabase
│
└── Yeni Supabase tabloları:
    ├── fund_flows_daily
    │   (fund_code, date, market_cap, investor_count,
    │    flow_proxy, investor_delta, z_score)
    └── category_flows_weekly
        (category, week_start, net_flow, investor_change, herd_score)

Frontend:
├── lib/predict/flows.ts
├── components/predict/
│   ├── SuruBarometresi.tsx          ← Ana bileşen
│   ├── FlowThermometer.tsx          ← Panik↔Açgözlülük gauge
│   ├── CategoryFlowBars.tsx         ← Butterfly chart
│   ├── AnomalyAlerts.tsx            ← Z-score uyarıları
│   ├── TopFlows.tsx                 ← En çok giriş/çıkış
│   └── FlowTrend.tsx               ← Stacked area chart
└── app/predict/flows/page.tsx
```

## Zorluk Tahmini
- Hesaplama: **Orta** — Flow proxy doğrudan ölçülemiyor, yaklaşık hesap
- Veri: **Mevcut + ek** — fund_details var ama günlük snapshot gerekli (yeni cron)
- UI: **Orta-Zor** — Butterfly chart, gauge, anomali kartları

---
---

# Tool 4: Rejim Dedektörü
### İstatistiksel Piyasa Rejimi Tespiti

---

## Problem
Piyasalar farklı "rejimlerde" çalışır: boğa, ayı, yatay, kriz. Her rejimde farklı fon kategorileri kazanır. Mevcut Makro Rejim aracı kullanıcı input'una dayalı — ama piyasa verileri rejimi zaten söylüyor.

## Çözüm
Fiyat verilerinden otomatik olarak mevcut piyasa rejimini tespit et. Geçmiş rejim geçişlerini analiz ederek hangi fonların hangi rejimde kazandığını göster. "Şu an hangi rejimdeyiz ve bu rejimde tarihsel olarak ne kazandırmış?" sorusunu cevapla.

## Veri Kaynakları

| Kaynak | Veri | Kullanım |
|--------|------|----------|
| Supabase `exchange_rates` | USD/TRY, EUR/TRY, Altın | Rejim tespiti |
| Supabase `fund_prices` | Tüm fon fiyatları | Rejim-getiri korelasyonu |
| TCMB | Faiz oranı (politika faizi) | Rejim sınıflandırma |
| **CDS 5Y** | **Türkiye CDS spread** | **Risk algısı öncü göstergesi (Yahoo Finance / banka bülteni)** |
| Hesaplama | HMM, volatilite, trend | Server-side Python |

## Rejim Tespiti Algoritması

```
═══════════════════════════════════════════════
YÖNTEMı: Hidden Markov Model (HMM) + Kural Tabanlı Hibrit
═══════════════════════════════════════════════

GİRDİLER (günlük):
  • USD/TRY getirisi (%)
  • BIST proxy (hisse fonları ortalaması) getirisi (%)
  • Altın/TRY getirisi (%)
  • Faiz oranı seviyesi
  • 30 günlük volatilite (USD/TRY)

3 REJİM TANIMI (Gemini önerisiyle 4'ten 3'e indirildi):
NOT: "Sakin Boğa" Türkiye için nadir bir lüks — kaldırıldı.

  ┌──────────────────────┬──────────────────────────────────┐
  │ REJİM                │ KARAKTERİSTİK                    │
  ├──────────────────────┼──────────────────────────────────┤
  │ 🟢 Düşük Volatilite  │ TL göreceli stabil, düşük vol,   │
  │                      │ CDS düşük, makro sakin            │
  ├──────────────────────┼──────────────────────────────────┤
  │ 🟠 Yüksek Volatilite │ TL dalgalı, yüksek vol, CDS      │
  │                      │ yükselen, karışık sinyaller       │
  ├──────────────────────┼──────────────────────────────────┤
  │ 🔴 Kriz              │ TL sert düşüş, çok yüksek vol,   │
  │                      │ CDS çok yüksek, altın/dövize kaçış│
  └──────────────────────┴──────────────────────────────────┘

HMM EĞİTİMİ:
  • 5 yıllık geçmiş veri ile eğitilir
  • Gizli durum sayısı: 3 (4'ten düşürüldü — daha az veri ile daha güvenilir)
  • Gözlem vektörü: [usdtry_ret, bist_ret, gold_ret, vol_30d, rate_level, cds_5y,
                      brent_ret, gpr_zscore]
    ↑ CDS 5Y — Türkiye risk algısının en iyi öncü göstergesi
    ↑ V5 Brent Petrol — enerji ithalatçısı etkisi (Yahoo Finance BZ=F)
    ↑ V5 GPR Endeksi — jeopolitik risk (matteoiacoviello.com, aylık, Z-score)
    Yeni sinyal kaynağı DEĞİL — HMM gözlem boyutunu zenginleştirir.
    Sinyal sayısı artmaz, rejim tespiti hassaslaşır.
  • OVERFİTTİNG KORUMASI: CDS ve volatilite kriz anında birbirine çok benzer
    sinyal verir. Tüm gözlem değişkenleri Z-score normalize edildikten sonra
    HMM'e verilir — modelin iki veriyi "tek değişken" gibi algılamasını önler.
  • Kütüphane: hmmlearn (Python)
  • Her gün çalışır, mevcut rejimi ve geçiş olasılıklarını hesaplar

  V4 — HMM HİSTEREZİS (flip-flop önleme):
    Rejim değişikliği için minimum 5 gün kalma şartı.
    HMM "bugün kriz, yarın düşük vol" derse → eski rejim korunur.
    5 gün üst üste yeni rejim çıkarsa → geçiş onaylanır.

  V4 — VALÖR MALİYETİ KIRPIMI:
    T+2/T+3 fonlar (yabancı hisse vb.) için rejim bazlı skor kırpımı:
    Kriz rejiminde T+3 fonlara -10 puan (geç çıkış maliyeti yansıtılır)

  V4 — KATEGORİ BAZLI HMM (ileri faz):
    Her kategori için ayrı gözlem vektörü:
      Hisse → [BIST_ret, CDS, vol_30d, rate_level, brent_ret, gpr_z]
      Altın → [ONS_ret, USD_ret, CDS, vol_30d, brent_ret]
      Döviz → [USD_ret, EUR_ret, CDS, rate_level, brent_ret]
    Faz 3'te tek HMM ile başla, Faz 5+ sonrası kategori bazlı ayrıştır.

ÇIKTILAR:
  • Mevcut rejim (4'ten biri)
  • Güven skoru (%0-100)
  • Geçiş olasılıkları:
    P(Sakin → Stresli) = %15
    P(Stresli → Kriz) = %8
    P(Kriz → Sakin) = %5
  • Rejimde ortalama kalış süresi (gün)
```

## Rejim × Getiri Matrisi (Back-test)

```
Geçmiş 5 yılın her rejiminde ortalama aylık USD getirisi:

                  🟢Düşük Vol  🟠Yüksek Vol  🔴Kriz
  Altın            +1.0%        +3.5%         +6.2%
  Hisse            +3.2%        -3.2%         -8.1%
  Yab.Hisse        +2.0%        -1.5%         -2.3%
  Tahvil           +0.1%        -1.8%         -4.5%
  Para Piyasası    -0.6%        -2.1%         -5.2%
  Döviz            +0.1%        +1.5%         +2.8%
  Karma            +0.8%        -1.2%         -3.1%

  Bu matris kullanıcıya gösterilir:
  "Şu anki rejimde tarihsel olarak en iyi performans gösteren kategoriler"
```

## UI Tasarımı

```
┌─────────────────────────────────────────────────┐
│  REJİM DEDEKTÖRÜ                                │
│  Piyasa Hangi Modda?                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─── Mevcut Rejim ──────────────────────────┐  │
│  │                                           │  │
│  │    ┌───────────────────────────┐          │  │
│  │    │   🟠 YÜKSEK VOLATİLİTE    │          │  │
│  │    │   Güven: %78              │          │  │
│  │    │   Bu rejimde: 23 gündür   │          │  │
│  │    │   Ort. kalış: 45 gün      │          │  │
│  │    └───────────────────────────┘          │  │
│  │                                           │  │
│  │  TL dalgalı, volatilite yüksek, CDS ↑.   │  │
│  │  Tarihsel olarak altın ve döviz fonları    │  │
│  │  bu rejimde en iyi performansı göstermiş.  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Geçiş Olasılıkları ───────────────────┐  │
│  │                                           │  │
│  │  Şu anki: 🟠 Yüksek Volatilite              │  │
│  │                                           │  │
│  │  Sonraki hafta tahmini:                   │  │
│  │    → 🟠 Yüksek Vol kalır  %62             │  │
│  │    → 🟢 Düşük Vol'e döner %27             │  │
│  │    → 🔴 Kriz'e kayar      %11             │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Bu Rejimde Ne Kazandırmış? ────────────┐  │
│  │                                           │  │
│  │  Kategori       Ort. Aylık USD    Güven    │  │
│  │  ─────────────  ──────────────    ──────   │  │
│  │  Altın           +3.5%            %85     │  │
│  │  Döviz           +1.5%            %72     │  │
│  │  Karma           -1.2%            %65     │  │
│  │  Yab.Hisse       -1.5%            %60     │  │
│  │  Tahvil          -1.8%            %78     │  │
│  │  Para Piyasası   -2.1%            %82     │  │
│  │  Hisse           -3.2%            %88     │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Rejim Tarihi (5 yıl) ─────────────────┐  │
│  │                                           │  │
│  │  2021 ████████████████████████████████████ │  │
│  │       🟢🟢🟢🟢🟡🟡🟠🟠🟠🟠🟠🟠           │  │
│  │  2022 ████████████████████████████████████ │  │
│  │       🟠🟠🔴🔴🔴🟠🟠🟡🟡🟡🟢🟢           │  │
│  │  2023 ████████████████████████████████████ │  │
│  │       🟢🟢🟢🟡🟠🟠🔴🔴🟠🟠🟡🟡           │  │
│  │  2024 ████████████████████████████████████ │  │
│  │       🟡🟡🟢🟢🟢🟢🟡🟡🟠🟠🟠🟡           │  │
│  │  2025 ████████████████████████████████████ │  │
│  │       🟡🟡🟡🟠🟠🟠🟠🟡🟡🟢🟢🟢           │  │
│  │  2026 ████████                             │  │
│  │       🟢🟡🟠●                              │  │
│  │             ↑ bugün                        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Teknik Mimari

```
Backend (Python daily cron):
├── scripts/regime_detector.py
│   ├── train_hmm(historical_data)        ← Haftalık yeniden eğit
│   ├── detect_current_regime()           ← Günlük çalıştır
│   ├── calculate_transition_probs()
│   └── backtest_category_returns()       ← Rejim×Getiri matrisi
│
├── Kütüphaneler:
│   ├── hmmlearn                          ← Hidden Markov Model
│   ├── numpy, pandas                     ← Veri işleme
│   └── scikit-learn                      ← Volatilite hesaplama
│
└── Yeni Supabase tabloları:
    ├── regime_state
    │   (date, regime, confidence, transition_probs JSONB)
    └── regime_category_returns
        (regime, category, avg_monthly_usd, sample_count, confidence)

Frontend:
├── lib/predict/regime.ts
├── components/predict/
│   ├── RejimDedektoru.tsx               ← Ana bileşen
│   ├── RegimeBadge.tsx                  ← Büyük rejim kartı
│   ├── TransitionProbs.tsx              ← Geçiş olasılıkları
│   ├── RegimeCategoryTable.tsx          ← Rejim×Getiri tablosu
│   └── RegimeTimeline.tsx              ← Yıllık renk şeridi
└── app/predict/regime/page.tsx
```

## Zorluk Tahmini
- Algoritma: **Orta-Zor** — HMM eğitimi (3 rejim, 4'ten kolay), CDS 5Y veri toplama
- Back-test: **Orta** — Veri mevcut, matris hesaplaması basit
- Veri: **Mevcut** — exchange_rates + fund_prices yeterli
- UI: **Orta** — Timeline heatmap ve geçiş matrisi

---
---

# Tool 5: Kristal Küre
### Ensemble Tahmin Modeli

---

## Problem
Dört aracın her biri tek bir açıdan bakar: momentum teknik sinyale, haber duyguya, sürü davranışa, rejim makro duruma. Yatırımcı bunları birleştirip "peki sonuç olarak ne yapayım?" diye sorar.

## Çözüm
Diğer 4 aracın çıktılarını tek bir ensemble modelde birleştir. Her fon kategorisi için kısa vadeli (1-4 hafta) performans tahmini üret. Geçmiş tahminlerin isabetini (hit rate) şeffaf olarak göster.

## Veri Kaynakları (Diğer 4 Araçtan)

| Sinyal | Kaynak | Ağırlık |
|--------|--------|---------|
| Momentum Skor | Tool 1: Momentum Radar | %25 |
| Haber Duygu Skoru | Tool 2: Haber Nabzı | %25 |
| Akış/Sürü Skoru | Tool 3: Sürü Barometresi | %25 |
| Rejim Skoru | Tool 4: Rejim Dedektörü | %25 |

## Ensemble Tahmin Modeli

```
═══════════════════════════════════════════════
KATMAN 1: Sinyal Normalizasyonu
═══════════════════════════════════════════════

Her sinyal -100..+100 aralığına normalize edilir:

  momentum_norm  = momentum_score          (zaten -100..+100)
  sentiment_norm = category_sentiment      (zaten -100..+100)
  flow_norm      = herd_score              (zaten -100..+100)
  regime_norm    = regime_category_return × 10  (ölçeklendirilir)


═══════════════════════════════════════════════
KATMAN 2: Ağırlıklı Ensemble
═══════════════════════════════════════════════

Exponential Decay Dinamik Ağırlıklandırma:

NOT: Statik+Dinamik 50/50 karışım KALDIRILDI.
     Dinamik öğrenmeyi yavaşlatan darboğaz ortadan kaldırıldı.

   decay_factor = decay^(hafta_farkı)    ← Son hafta daha ağır
   inverse_mae = 1 / (1 + mae_i)        ← Düşük hata → yüksek ağırlık
   w_i = Σ(inverse_mae_k × decay^k) / Σ(decay^k)   (k=0..11 hafta)
   prediction = Σ(w_i × signal_i)

V4/V5 — ADAPTİF DECAY (rejim + VIX/DXY/Brent duyarlı):
   if regime == "crisis" or (kategori == "YabHisse" and VIX > 25)
      or brent_change_30d > 20%:
       decay = 0.85  (daha hızlı unut, yeni veriye adapte ol)
   else:
       decay = 0.90  (standart)
   VIX + DXY + Brent: gece pipeline'ından (23:59 TR) güncellenir
   Eksikse: varsayılan decay=0.90 kullanılır

NOT: Binary yön isabeti (hit/miss) yerine MAE kullanılır.
     "Güçlü yukarı dedik ama %0.1 arttı" artık düşük puan alır.
     Minimum ağırlık = %10 (hiçbir sinyal tamamen sıfırlanmaz)


═══════════════════════════════════════════════
KATMAN 3: Güven Skoru
═══════════════════════════════════════════════

  agreement = sinyallerin aynı yönü gösterme oranı

  4/4 aynı yön → Güven: %95 "Çok Yüksek"
  3/4 aynı yön → Güven: %75 "Yüksek"
  2/4 aynı yön → Güven: %50 "Orta"
  Dağınık       → Güven: %25 "Düşük — dikkatli olun"


═══════════════════════════════════════════════
KATMAN 4: Tahmin Çıktısı
═══════════════════════════════════════════════

Her kategori için:
  • Yön: ▲ Yukarı / ─ Yatay / ▼ Aşağı
  • Güç: Zayıf / Orta / Güçlü
  • Güven: %0-100
  • Tahmini USD getiri aralığı (1 hafta)
  • Katkı yapan sinyaller açıklaması


═══════════════════════════════════════════════
KATMAN 5: Kendi Kendini Değerlendirme
═══════════════════════════════════════════════

Her hafta geçmiş tahminler kontrol edilir:

  actual_return = gerçekleşen haftalık USD getiri
  predicted_direction = tahmin edilen yön

  hit = (predicted > 0 && actual > 0) || (predicted < 0 && actual < 0)

  mae = |predicted_normalized - actual_normalized|
  hit_rate = hits / total_predictions  (kayan 12 haftalık pencere)

  MAE + hit rate birlikte kaydedilir.
  Ağırlık güncellemesi Exponential Decay + inverse MAE ile yapılır.
  Son haftanın performansı 12 hafta öncesinden daha ağır basar.
```

## UI Tasarımı

```
┌─────────────────────────────────────────────────┐
│  KRİSTAL KÜRE                                   │
│  Birleşik Tahmin Tablosu                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─── Bu Hafta İçin Tahminler ───────────────┐  │
│  │                                           │  │
│  │  Kategori    Yön    Güç    Güven  Aralık   │  │
│  │  ─────────── ────── ────── ────── ──────── │  │
│  │  Altın        ▲▲    Güçlü   %92   +1~3%   │  │
│  │  Döviz        ▲     Orta    %71   +0~2%   │  │
│  │  Tahvil       ─     Yatay   %55   -1~+1%  │  │
│  │  Karma        ─     Yatay   %48   -1~+1%  │  │
│  │  Yab.Hisse    ▼     Orta    %63   -2~0%   │  │
│  │  Hisse        ▼▼    Güçlü   %85   -3~-1%  │  │
│  │  Para Piy.    ▼     Zayıf   %42   -2~0%   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Altın Detay (tıkla/aç) ───────────────┐  │
│  │                                           │  │
│  │  Neden ▲▲ Güçlü Yukarı?                   │  │
│  │                                           │  │
│  │  ┌──────────┬────────┬─────────────────┐  │  │
│  │  │ Sinyal   │  Skor  │ Açıklama        │  │  │
│  │  ├──────────┼────────┼─────────────────┤  │  │
│  │  │ Momentum │  +82   │ RSI 72, Golden  │  │  │
│  │  │          │   ▲    │ Cross 3gün önce │  │  │
│  │  ├──────────┼────────┼─────────────────┤  │  │
│  │  │ Haber    │  +45   │ Faiz indirimi   │  │  │
│  │  │          │   ▲    │ haberleri hakim  │  │  │
│  │  ├──────────┼────────┼─────────────────┤  │  │
│  │  │ Sürü     │  +91   │ ₺1.2B giriş,   │  │  │
│  │  │          │   ▲    │ yatırımcı %8↑   │  │  │
│  │  ├──────────┼────────┼─────────────────┤  │  │
│  │  │ Rejim    │  +65   │ Stresli Ayı     │  │  │
│  │  │          │   ▲    │ rejiminde altın  │  │  │
│  │  │          │        │ tarihsel +3.5%/ay│  │  │
│  │  └──────────┴────────┴─────────────────┘  │  │
│  │                                           │  │
│  │  4/4 sinyal aynı yön → Güven %92          │  │
│  │                                           │  │
│  │  V4 — XAI: Güven renk kodlu               │  │
│  │  🟢 >%70  🟡 %40-70  🔴 <%40             │  │
│  │  Tıklanınca: sinyal breakdown gösterilir   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Günün Sepeti (V4) ────────────────────┐  │
│  │                                           │  │
│  │  Yüksek skorlu fonlar arasında korelasyon │  │
│  │  matrisi → en düşük korelasyonlu 3-4 fon: │  │
│  │                                           │  │
│  │  1. TYH (Altın)  Skor: +82  🟢           │  │
│  │  2. MAC (Hisse)  Skor: +45  🟢           │  │
│  │  3. IPB (Döviz)  Skor: +34  🟢           │  │
│  │  Korelasyon: TYH↔MAC 0.12, TYH↔IPB 0.08 │  │
│  │  ⚠️ Yatırım tavsiyesi değildir.          │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Geçmiş Tahmin İsabeti ────────────────┐  │
│  │                                           │  │
│  │  Son 12 Hafta Hit Rate:                   │  │
│  │                                           │  │
│  │  Genel:      ████████████░░░░  9/12 (%75) │  │
│  │  Momentum:   █████████░░░░░░░  7/12 (%58) │  │
│  │  Haber:      ██████████░░░░░░  8/12 (%67) │  │
│  │  Sürü:       ████████████░░░░  9/12 (%75) │  │
│  │  Rejim:      ██████████████░░ 10/12 (%83) │  │
│  │                                           │  │
│  │  ┌─ Haftalık tarihçe ─────────────────┐   │  │
│  │  │ H1  H2  H3  H4  H5  H6 ... H12    │   │  │
│  │  │ ✓   ✓   ✗   ✓   ✓   ✓  ... ✓      │   │  │
│  │  └────────────────────────────────────┘   │  │
│  │                                           │  │
│  │  ⚠️ Uyarı: Bu tahminler geçmiş veriye    │  │
│  │  dayalıdır. Yatırım tavsiyesi değildir.   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─── Zaman İçinde Tahmin vs Gerçek ────────┐  │
│  │  [Çizgi grafik: her kategori için         │  │
│  │   tahmin edilen yön vs gerçekleşen getiri │  │
│  │   12 haftalık kayan pencere]              │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Teknik Mimari

```
Backend (Python weekly cron):
├── scripts/crystal_ball.py
│   ├── collect_signals()             ← 4 araçtan sinyal topla
│   ├── normalize_signals()           ← -100..+100 normalize
│   ├── ensemble_predict()            ← Ağırlıklı birleştirme
│   ├── calculate_confidence()        ← Sinyal uyumu
│   ├── evaluate_past_predictions()   ← Hit rate güncelle
│   └── update_dynamic_weights()      ← Ağırlıkları ayarla
│
└── Yeni Supabase tabloları:
    ├── predictions
    │   (id, category, predicted_direction, confidence,
    │    signal_details JSONB, predicted_range_low,
    │    predicted_range_high, created_at)
    ├── prediction_results
    │   (prediction_id, actual_return, hit BOOLEAN,
    │    evaluated_at)
    └── signal_weights
        (signal_name, current_weight, hit_rate_12w, updated_at)

Frontend:
├── lib/predict/crystal.ts
├── components/predict/
│   ├── KristalKure.tsx              ← Ana bileşen
│   ├── PredictionTable.tsx          ← Haftalık tahmin tablosu
│   ├── SignalBreakdown.tsx          ← Sinyal detay (accordion)
│   ├── HitRateDisplay.tsx           ← İsabet oranları
│   └── PredictionVsActual.tsx       ← Zaman serisi karşılaştırma
└── app/predict/crystal/page.tsx
```

## Zorluk Tahmini
- Algoritma: **Orta** — Basit ensemble, ağırlıklı ortalama
- Bağımlılık: **Yüksek** — Diğer 4 aracın çalışır olması gerekir
- Back-test: **Orta** — Hit rate sistemi düzenli bakım ister
- UI: **Orta** — Tablo + accordion + hit rate görselleri
- Güvenilirlik: **Kritik** — Yanlış tahminler güven kaybına yol açar

---
---

# Genel Mimari Özet

```
┌─────────────────────────────────────────────────────────────┐
│                    GÖSTERGEÇ PREDİKTİF ARAÇLAR               │
│                                                             │
│  VERİ KATMANI                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │ fund_    │ │ exchange_│ │ fund_    │ │ news_items   │    │
│  │ prices   │ │ rates    │ │ details  │ │ (YENİ)       │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘    │
│       │            │            │               │            │
│  ─────┼────────────┼────────────┼───────────────┼──────────  │
│       │            │            │               │            │
│  HESAPLAMA KATMANI (Python cron jobs)                        │
│  ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌──────┴───────┐    │
│  │ Momentum │ │ Rejim    │ │ Akış     │ │ Duygu        │    │
│  │ Hesapla  │ │ HMM      │ │ Z-Score  │ │ NLP/BERT     │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘    │
│       │            │            │               │            │
│  ─────┼────────────┼────────────┼───────────────┼──────────  │
│       │            │            │               │            │
│       ▼            ▼            ▼               ▼            │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              KRİSTAL KÜRE ENSEMBLE                    │    │
│  │  Signal aggregation → Weighted prediction → Hit rate  │    │
│  └──────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ───────────────────────┼──────────────────────────────────  │
│                         │                                    │
│  SUNUM KATMANI (Next.js)│                                    │
│  ┌───────┐ ┌───────┐ ┌──┴────┐ ┌───────┐ ┌───────────┐      │
│  │ /pred │ │ /pred │ │ /pred │ │ /pred │ │ /predict/ │      │
│  │ /mom  │ │ /sent │ │ /flow │ │ /reg  │ │ /crystal  │      │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Yeni Supabase Tabloları (Toplam 7)

| # | Tablo | Araç | Boyut Tahmini |
|---|-------|------|---------------|
| 1 | `news_items` | Haber Nabzı | ~6000 satır/ay |
| 2 | `news_sentiment` | Haber Nabzı | ~6000 satır/ay |
| 3 | `category_sentiment` | Haber Nabzı | 7 satır (güncel) |
| 4 | `fund_flows_daily` | Sürü Barometresi | ~500 satır/gün |
| 5 | `regime_state` | Rejim Dedektörü | 1 satır/gün |
| 6 | `predictions` | Kristal Küre | 7 satır/hafta |
| 7 | `prediction_results` | Kristal Küre | 7 satır/hafta |

**V4 — signals tablosu ek kolonlar:**
- `source_version TEXT` — sinyal versiyonlama (A/B test)
- `is_delayed BOOLEAN` — AOF gecikme flag'i

## Yeni Python Dependencies

| Paket | Araç | Amaç |
|-------|------|------|
| `hmmlearn` | Rejim Dedektörü | Hidden Markov Model |
| `transformers` | Haber Nabzı | BERT inference |
| `torch` | Haber Nabzı | ML framework |
| `feedparser` | Haber Nabzı | RSS parsing |
| `beautifulsoup4` | Haber Nabzı | KAP scraping |

## Yeni Frontend Dosyaları (Toplam ~25)

```
src/
├── lib/predict/
│   ├── momentum.ts       ← RSI, MACD, MA hesaplamaları
│   ├── sentiment.ts      ← Supabase'den duygu skoru çek
│   ├── flows.ts          ← Akış verisi çek & hesapla
│   ├── regime.ts         ← Rejim durumu çek
│   └── crystal.ts        ← Ensemble tahmin çek
├── components/predict/
│   ├── MomentumRadar.tsx
│   ├── RadarScatterPlot.tsx
│   ├── SignalTable.tsx
│   ├── HaberNabzi.tsx
│   ├── SentimentGauge.tsx
│   ├── CategoryBars.tsx
│   ├── NewsFeed.tsx
│   ├── SentimentTrend.tsx
│   ├── SuruBarometresi.tsx
│   ├── FlowThermometer.tsx
│   ├── CategoryFlowBars.tsx
│   ├── AnomalyAlerts.tsx
│   ├── TopFlows.tsx
│   ├── FlowTrend.tsx
│   ├── RejimDedektoru.tsx
│   ├── RegimeBadge.tsx
│   ├── TransitionProbs.tsx
│   ├── RegimeTimeline.tsx
│   ├── KristalKure.tsx
│   ├── PredictionTable.tsx
│   ├── SignalBreakdown.tsx
│   └── HitRateDisplay.tsx
└── app/predict/
    ├── momentum/page.tsx
    ├── sentiment/page.tsx
    ├── flows/page.tsx
    ├── regime/page.tsx
    └── crystal/page.tsx
```

## Önerilen Geliştirme Sırası

| Sıra | Araç | Neden Bu Sırada? | Not |
|------|------|-----------------|-----|
| MVP | Momentum + Sürü | Deterministik, hata payı düşük, ML/NLP yok | Birlikte yapılır |
| 3 | Rejim Dedektörü | CDS 5Y entegrasyonu ile, 3 rejim | Makro katman |
| 4 | Haber Nabzı | En çok gürültü (noise) üretecek olan — en sona | Sözlük + distilbert |
| 5 | Kristal Küre | Diğer 4'ün çalışmasına bağımlı | Ensemble |

## V4 — Gece Pipeline + Veri Kalitesi

**Gece Pipeline (23:59 TR / 20:59 UTC):**
- CDS 5Y, VIX, DXY, Brent Petrol, GPR akşam güncellemesi
- Ertesi gün için ön rejim hesaplama
- Ana sinyal üretimi YAPMAZ, sadece makro veri günceller
- Ayrı GitHub Actions workflow: `night-pipeline.yml`

**Veri Kalitesi Raporu (her pipeline sonunda):**
- Null oran > %20 → ALARM
- CDS verisi 3 gün üst üste gelmezse → ALARM
- Tek sinyal ağırlığı > %40 → ALARM (tek kaynağa aşırı bağımlılık)
- Bildirim: Telegram bot veya email (opsiyonel)

**Yeni Python dosyaları (V4/V5):**
- `collectors/global_macro.py` — VIX + DXY + Brent + GPR
- `collectors/bist_foreign.py` — BIST yabancı takas oranı (günlük)
- `collectors/holidays.py` — Türkiye tatil takvimi + is_market_open()
- `quality/health_check.py` — Null oranı, CDS kontrolü, ağırlık dengesi
- `quality/alerting.py` — Telegram/email bildirim

## Yasal Uyarı (Her Sayfada Gösterilecek)

```
⚠️ Bu tahminler geçmiş veriye dayalı istatistiksel modellerdir.
Yatırım tavsiyesi niteliği taşımaz. Geçmiş performans gelecek
sonuçların garantisi değildir. Yatırım kararlarınızı vermeden
önce profesyonel danışmanlık alınız.
```
