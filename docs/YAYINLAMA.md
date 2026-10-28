# Siteyi yayına alma (ücretsiz)

Site statik dosyalardan oluşur; sunucu gerekmez. Önerilen kurulum tamamen ücretsizdir:

| Parça | Ne işe yarar | Ücret |
|---|---|---|
| **GitHub** | Kodun saklandığı yer + aylık veri güncelleme görevi (GitHub Actions) | Ücretsiz |
| **Cloudflare Pages** | Siteyi internette yayınlar, her güncellemede otomatik yeniden yayınlar | Ücretsiz (ticari kullanım ve reklam serbest, trafik sınırı yok) |
| Alan adı (ör. hesaprobotu.com) | Akılda kalıcı adres | İsteğe bağlı, yıllık küçük ücret |

> Not: GitHub Pages de ücretsizdir ama kuralları, reklamla para kazanan siteler için uygun değildir. Bu yüzden Cloudflare Pages öneriyoruz.

## 1. GitHub hesabı ve depo (bir kez, ~5 dk)

1. https://github.com adresinden ücretsiz hesap açın.
2. Sağ üstteki **+ → New repository**: ad `hesap-robotu`, **Private** (gizli) seçebilirsiniz. "Add README" seçmeyin.
3. Depo adresini (ör. `https://github.com/kullaniciadi/hesap-robotu`) Claude'a verin; kodu Claude yükler.

## 2. Cloudflare Pages (bir kez, ~5 dk)

1. https://dash.cloudflare.com adresinden ücretsiz hesap açın.
2. **Workers & Pages → Create → Pages → Connect to Git** → GitHub hesabınızı bağlayın → `hesap-robotu` deposunu seçin.
3. Derleme ayarları:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `24`
4. **Save and Deploy**. Birkaç dakika sonra site `https://hesap-robotu.pages.dev` gibi bir adreste yayında olur.

Bundan sonra GitHub'a her yeni kod/veri geldiğinde Cloudflare siteyi kendiliğinden yeniden yayınlar.

## 3. Alan adı (isteğe bağlı)

1. Alan adını Cloudflare Registrar'dan (maliyet fiyatına) ya da herhangi bir firmadan alın.
2. Cloudflare Pages projesinde **Custom domains → Set up a domain**.
3. Kodda adresi güncelleyin (Claude'a söylemeniz yeterli): `astro.config.mjs` (`SITE_URL`), `src/site.config.ts` (`url`), `public/robots.txt`.

## 4. Google'a tanıtma

1. https://search.google.com/search-console → alan adınızı ekleyip doğrulayın.
2. **Site haritaları** bölümüne `sitemap-index.xml` yazıp gönderin.

## 5. Aylık veri güncellemesi

`.github/workflows/veri-guncelle.yml` her ay TÜİK ve TCMB verilerini kendiliğinden indirip siteye ekler (GitHub'ın ücretsiz sunucularında çalışır). Ayrıntılar: `docs/VERI.md`.

- GitHub'da **Settings → Actions → General → Workflow permissions** bölümünde **Read and write permissions** seçili olmalı (görev, yeni veriyi kaydedebilsin).
- Görev başarısız olursa GitHub size e-posta gönderir; site son veriyle çalışmaya devam eder.

## 6. Yıllık oran güncellemesi (her Ocak, bazıları Temmuz)

Vergi dilimleri, asgari ücret, SGK sınırları, kıdem tavanı gibi yasal oranlar `src/data/params/` altındadır. Geçerlilik süresi dolan oranlar için sitede sarı uyarı kendiliğinden çıkar. Claude'a "2027 oranlarını güncelle" demeniz yeterli: araştırır, günceller, testleri çalıştırır ve yayınlar.

## 7. Reklam (ileride)

Google AdSense gibi reklam ağları eklendiğinde üçüncü taraf betikler ve çerezler devreye girer. O zaman gizlilik sayfası ve çerez onayı (KVKK) güncellenmelidir; Claude'a söylemeniz yeterli.
