# Aylık veri serileri

Enflasyon, kira artışı ve "Ya O Gün Alsaydım?" robotları aşağıdaki serileri kullanır. Seriler `src/data/series/*.json`
dosyalarında durur ve site derlenirken sayfaya gömülür; ziyaretçinin tarayıcısı hiçbir dış adrese istek atmaz.

| Seri | Dosya | Kaynak | Yöntem |
|---|---|---|---|
| TÜFE | `tufe.json` | TÜİK verisi, [TCMB Tüketici Fiyatları](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Enflasyon+Verileri/Tuketici+Fiyatlari) | Aylık % değişimler zincirlenerek endeks oluşturulur (2004-12 = 100) |
| Döviz | `doviz.json` | [TCMB gösterge kurları](https://www.tcmb.gov.tr/kurlar/kurlar_tr.html) | Her ayın son iş günündeki USD ve EUR döviz alış kuru |
| Altın | `altin.json` | [Dünya Bankası Pink Sheet](https://www.worldbank.org/en/research/commodity-markets) | Aylık ortalama ons (USD) × ay sonu USD/TRY ÷ 31,1034768 |

## Doğruluk kontrolü

Kira artışında kullanılan "TÜFE 12 aylık ortalama değişim" oranı bu seriden TÜİK'in yöntemiyle hesaplanır.
`src/tools/kira-artis-hesaplama/calc.test.ts`, 2026'da TÜİK'in açıkladığı bütün oranların birebir aynı çıktığını test eder.
Yeni ay eklendiğinde TÜİK bültenindeki oranı bu teste eklemek iyi bir alışkanlıktır.

## Güncelleme

**Otomatik:** `.github/workflows/veri-guncelle.yml` her ayın 4'ünde ve 6'sında çalışır, yeni veri varsa kaydeder; ardından
"Siteyi yayınla" görevi siteyi yeniden derler. Depo ayarlarında *Settings → Actions → General → Workflow permissions* için
**Read and write permissions** seçili olmalıdır.

**Elle:**

```bash
node scripts/veri/guncelle.mjs          # yalnızca eksik ayları indirir
node scripts/veri/guncelle.mjs --tam    # döviz arşivini baştan indirir
npm test                                # seriler ve kira oranları doğrulanır
```

Betik bir kaynağa ulaşamazsa o seriyi değiştirmez, diğerlerini günceller ve hata koduyla çıkar. Veri bütünlüğü kontrolleri
(eksik ay, olağandışı sıçrama) başarısız olursa dosya yazılmaz.

Son veri ayından iki ay sonra (ayın 6'sına kadar) yeni veri eklenmemişse ilgili robot sayfalarında sarı "güncellenmeyi
bekliyor" uyarısı kendiliğinden çıkar.
