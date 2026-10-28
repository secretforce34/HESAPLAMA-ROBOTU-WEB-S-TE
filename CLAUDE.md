# Hesap Robotu

Türkiye'ye özel, Türkçe, ücretsiz finans hesaplama sitesi. Astro 7 (statik) + Preact adacıkları + Vitest.

- Kullanıcıyla tüm iletişim Türkçe.
- Server yok, ek maliyet yok: tüm hesaplar tarayıcıda, dış API/üçüncü taraf betik yok.
- Yeni araç eklerken: `docs/ARAC-REHBERI.md` (zorunlu okuma). Örnek araç: `src/tools/kdv-hesaplama/`.
- Yasal oranlar `src/data/params/*.ts` içinde, kaynaklı ve geçerlilik tarihli (`ParamSet`). Her yıl Ocak'ta (bazıları Temmuz'da) güncellenir.

## Komutlar

```bash
npm run dev      # geliştirme sunucusu (http://localhost:4321)
npm test         # tüm birim testleri
npm run check    # tip kontrolü
npm run build    # dist/ klasörüne statik site
```
