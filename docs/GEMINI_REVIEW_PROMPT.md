# Göstergeç Tahmin Sistemi — V5 Final Doğrulama

Bu projenin V1→V4 mimarisini sana sunmuştum. Her turda önerilerini aldım ve tamamını uyguladım. V4'te son 3 önerinle (Brent Petrol, BIST Yabancı Takas, GPR) sisteme entegre ettim. Noise arttırmadan — yeni sinyal kaynağı eklemedim, mevcut producer'ların gözlem/güven katmanını zenginleştirdim.

---

## V1 → V5 EVRİMİ (tüm maddeler)

| # | Konu | V1 | V2 | V3 | V4 | V5 (son 3 önerinle) |
|---|------|----|----|----|----|---------------------|
| 1 | Momentum | RSI(14) | RS vs benchmark | Kategori bazlı + TL bazı | + tatil + AOF flag | (değişmedi) |
| 2 | Haber NLP | Full BERT | Sözlük + distilbert | Kaynak+keyword kesişimi | + time-decay | (değişmedi) |
| 3 | Etki Matrisi | Statik | Pearson | Haftalık 90gün | — | (değişmedi) |
| 4 | Sürü Z-Score | 30 gün | 10+30 çift | z_long/z_short | + net eşikler | + **BIST yabancı takas** güven modifikatörü (Hisse kat.) |
| 5 | Rejim HMM | 4 durum | 3+CDS 5Y | Z-score norm | + histerezis + valör | + **Brent + GPR** gözlem vektörüne (8 boyut) |
| 6 | Ensemble | 50/50 | Exp.Decay+MAE | 0.9/0.85 | + adaptif VIX | + **Brent %20+ → decay=0.85** (enerji şoku) |
| 7 | Pipeline | 11:00 | 12:30 | + retry | + gece (VIX/DXY) | Gece pipeline: + **Brent + GPR** |
| 8-16 | (diğerleri) | — | — | — | sinyal vers., XAI, sepet, vb. | (değişmedi) |

---

## V5 — 3 YENİ VERİ GİRİŞİ (noise artmaz)

### Entegrasyon prensibi
> Yeni sinyal kaynağı eklenmedi. Sinyal sayısı aynı (4 producer, ~1014 sinyal/gün).
> 3 yeni veri, mevcut producer'ların **gözlem boyutunu** veya **güven skorunu** zenginleştirir.

### 1. Brent Petrol (BZ=F)
- **Rol:** Rejim HMM gözlem vektörüne +1 boyut + Ensemble adaptif decay koşulu
- **Neden:** Türkiye enerji ithalatçısı. Petrol ↑ → cari açık ↑, enflasyon ↑. Hisse/tahvil negatif, altın/döviz pozitif.
- **Kaynak:** Yahoo Finance (`BZ=F`), günlük EOD
- **Nereye girer:**
  - Rejim gözlem vektörü: `[..., cds_5y, brent_ret, gpr_z]` (6→8 boyut, Z-score normalize)
  - Ensemble: `if brent_change_30d > 20%: decay = 0.85` (enerji şoku = hızlı adapte ol)
- **Toplanma:** Gece pipeline (23:59 TR), `global_macro.py`

### 2. BIST Yabancı Takas Oranı
- **Rol:** Flow producer'da **güven modifikatörü** (ayrı sinyal DEĞİL)
- **Neden:** "Akıllı para" (yabancı balinalar) teyidi. Yerli FOMO'dan ayırt eder.
- **Kaynak:** BIST günlük bülteni
- **Nereye girer:**
  - Sadece **Hisse kategorisi** flow sinyalinde:
    - Yabancı takas ↑ VE herd_score pozitif → güven ↑
    - Yabancı takas ↓ VE herd_score pozitif → güven ↓ (yerli FOMO)
  - Diğer kategorilerde etkisiz
- **Toplanma:** Ana pipeline (12:30 TR), yeni collector `bist_foreign.py`

### 3. GPR — Jeopolitik Risk Endeksi
- **Rol:** Rejim HMM gözlem vektörüne +1 boyut
- **Neden:** Savaşlar, gerginlikler, seçim dönemleri. GPR ↑ → kriz rejimini erkenden tetikler.
- **Kaynak:** matteoiacoviello.com/gpr.htm (aylık, akademik endeks)
- **Nereye girer:**
  - Rejim gözlem vektörü: `[..., brent_ret, gpr_zscore]` (aylık güncelleme, günlük interpolasyon)
  - Z-score normalize (diğer günlük verilerle uyumlu)
- **Toplanma:** Gece pipeline (23:59 TR), `global_macro.py`

---

## V5 FİNAL MİMARİ (V4 + 3 yeni veri)

### Sinyal Kaynakları (4 adet — değişmedi)

**1. Momentum (RS)** — değişmedi

**2. Haber Duygu** — değişmedi

**3. Sürü/Akış (Çift Pencere)**
- Flow proxy + çift z-score + eşik kuralları (V4)
- **V5: BIST yabancı takas oranı** → Hisse kategorisi güven modifikatörü
- Çıktı: 7 sinyal (kategori) + ~500 sinyal (fon) — sayı DEĞİŞMEDİ

**4. Rejim Dedektörü (HMM)**
- 3 rejim, histerezis, valör kırpımı (V4)
- **V5: Gözlem vektörü genişledi** (6→8 boyut):
  `[usdtry_ret, bist_ret, gold_ret, vol_30d, rate_level, cds_5y, brent_ret, gpr_z]`
- Tüm boyutlar Z-score normalize (overfitting koruması)
- Çıktı: 7 sinyal — sayı DEĞİŞMEDİ

### Ensemble (Adaptif Decay + MAE)
```
V5 — Adaptif decay (genişletilmiş):
  if regime=="crisis"
     or (kategori=="YabHisse" and VIX>25)
     or brent_change_30d > 20%:          ← V5: enerji şoku
      decay = 0.85
  else:
      decay = 0.90
```

### Pipeline
```
09:30 UTC (12:30 TR) — Ana pipeline
  V4 ön-kontrol: is_market_open() + AOF check
  Adım 1: Veri Toplama (paralel) — + BIST yabancı takas
  Adım 2-6: değişmedi

10:30 UTC (13:30 TR) — Retry

20:59 UTC (23:59 TR) — Gece Pipeline
  CDS 5Y + VIX + DXY + Brent Petrol + GPR    ← V5: genişledi
  Ön rejim hesaplama (8 boyutlu gözlem ile)
```

### Yeni dosyalar (V5 ekleri)
- `collectors/global_macro.py` — VIX + DXY + **Brent + GPR** (güncellendi)
- `collectors/bist_foreign.py` — **YENİ**: BIST yabancı takas oranı

---

## NOISE KONTROL TABLOSU

| Metrik | V4 | V5 | Değişim |
|--------|----|----|---------|
| Sinyal kaynağı sayısı | 4 | 4 | Aynı |
| Günlük sinyal sayısı | ~1014 | ~1014 | Aynı |
| HMM gözlem boyutu | 6 | 8 | +2 (Z-score norm.) |
| Ensemble ağırlık sayısı | 4 | 4 | Aynı |
| Pipeline çalışma sayısı | 3 | 3 | Aynı |
| Yeni collector | — | 1 (bist_foreign) | +1 |
| Güncellenen collector | — | 1 (global_macro) | Genişledi |

---

## V4'TE EKLENEN 13 + V5'TE EKLENEN 3 MADDE

| # | Madde | Nereye | Noise etkisi |
|---|-------|--------|-------------|
| V4.1-13 | (önceki 13 madde) | Tümü uygulandı | ✅ |
| V5.1 | Brent Petrol | Rejim gözlem + Ensemble decay | Noise yok: gözlem boyutu |
| V5.2 | BIST Yabancı Takas | Flow güven modifikatörü | Noise yok: sinyal değil, güven |
| V5.3 | GPR Endeksi | Rejim gözlem | Noise yok: gözlem boyutu |

---

## SENDEN İSTEDİĞİM (FİNAL ONAYI)

Senin 3 önerini (Brent, BIST Yabancı Takas, GPR) noise arttırmadan entegre ettim:
- Yeni sinyal kaynağı yok
- Sinyal sayısı aynı
- Brent + GPR → HMM gözlem boyutu (6→8)
- BIST yabancı takas → flow güven modifikatörü
- Brent %20+ → ensemble adaptif decay tetikleyici

1. Entegrasyon **noise-safe** mi?
2. 19 maddede (V1→V5) mimari **uygulamaya hazır** mı?
3. Genel mimari skoru (1-10)?

Kısa ve net cevap yeterli. Bu son tur — artık kod yazıyoruz.
