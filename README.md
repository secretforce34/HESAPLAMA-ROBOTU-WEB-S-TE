# Hesap Robotu

Türkiye'nin güncel kurallarıyla çalışan, açıklamalı ve ücretsiz finans hesaplama robotları.

- **Statik site:** Astro 7 + Preact adacıkları. Sunucu yok, tüm hesaplar ziyaretçinin tarayıcısında.
- **Kaynaklı oranlar:** Yasal oranlar `src/data/params/` altında, kaynak ve geçerlilik tarihiyle. Süresi dolan oranlar için sitede otomatik uyarı.
- **Testli:** Her robotun hesap mantığı Vitest ile test edilir.

## Komutlar

```bash
npm install                    # bağımlılıkları kur
npm run dev                    # geliştirme: http://localhost:4321
npm test                       # birim testleri
npm run check                  # tip kontrolü
npm run build                  # dist/ klasörüne statik site
node scripts/link-kontrol.mjs  # kaynak bağlantılarını kontrol et
node scripts/gorseller.mjs     # paylaşım görseli ve simgeleri üret
```

## Belgeler

- [docs/ARAC-REHBERI.md](docs/ARAC-REHBERI.md) — yeni hesaplama robotu ekleme kuralları
- [docs/YAYINLAMA.md](docs/YAYINLAMA.md) — ücretsiz yayına alma (GitHub + Cloudflare Pages)
- [docs/VERI.md](docs/VERI.md) — TÜFE, kur ve altın verilerinin kaynağı ve güncellenmesi

## Klasör yapısı

```
src/
  tools/<slug>/        her robotun meta, hesap, test ve arayüz dosyaları
  pages/<slug>.astro   robot sayfaları (açıklama + SSS)
  data/params/         yasal oranlar (kaynaklı, tarihli)
  data/series/         aylık veri serileri (TÜFE, kur, altın)
  ui/                  ortak form ve sonuç bileşenleri
  layouts/, components/, styles/
scripts/               veri güncelleme, link kontrolü, görsel üretimi
```
