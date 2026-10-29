# Siteyi yayına alma (GitHub Pages, ücretsiz)

Site statik dosyalardan oluşur; sunucu gerekmez. Yayın tamamen GitHub üzerinden ve ücretsizdir:

| Parça | Ne işe yarar | Ücret |
|---|---|---|
| **GitHub deposu** | Kodun saklandığı yer | Ücretsiz (herkese açık depo) |
| **GitHub Pages** | Siteyi internette yayınlar | Ücretsiz |
| **GitHub Actions** | Her yüklemede siteyi derleyip yayınlar; her ay TÜFE/kur verisini günceller | Herkese açık depoda ücretsiz |
| Alan adı (isteğe bağlı) | Akılda kalıcı adres (ör. hesaprobotu.com) | Yıllık küçük ücret |

Bilinmesi gerekenler:
- Ücretsiz GitHub hesabında Pages yalnızca **herkese açık (public)** depolarda çalışır; kod herkes tarafından görülebilir.
- Site, adresin **kökünde** çalışacak şekilde yazıldı. Bu yüzden ya kendi alan adınız olmalı ya da depo adı `kullaniciadi.github.io` olmalı. (`kullaniciadi.github.io/hesap-robotu` gibi alt klasör adresi linkleri bozar.)
- GitHub Pages'in esnek aylık trafik sınırı ~100 GB'tır; bu, yüz binlerce ziyarete yeter. Aşılırsa site Cloudflare Pages'e (yine ücretsiz) kod değişikliği olmadan taşınabilir.

## Şu anki durum

- Depo: https://github.com/secretforce34/HESAPLAMA-ROBOTU-WEB-S-TE (herkese açık)
- Her yüklemede **testler ve derleme** çalışır (Actions sekmesi), ama **yayın kapalıdır**.
- Alan adı alındığında yayını açmak için aşağıdaki **3. ve 4. adımlar** yeterli. Depo adı değiştirilmez; alan adı olduğu için site kökte çalışır.

## 1. Depoyu oluşturun (bir kez, ~3 dk)

1. https://github.com/new adresine gidin.
2. **Repository name:** alan adınız yoksa tam olarak `kullaniciadi.github.io` (kendi kullanıcı adınızla). Alan adınız varsa istediğiniz ad (ör. `hesap-robotu`).
3. **Public** seçin. README, .gitignore, lisans **eklemeyin** (boş depo).
4. **Create repository** → depo adresini Claude'a verin.

## 2. Kodu yükleme (Claude yapar)

Claude depoyu bağlayıp kodu yükler. İlk yüklemede Windows'ta GitHub giriş penceresi açılır; girişi siz yaparsınız (şifrenizi Claude'a vermeyin).

## 3. Pages'i açın (bir kez, ~1 dk)

1. Depoda **Settings → Pages**.
2. **Build and deployment → Source:** `GitHub Actions` seçin.
3. **Settings → Actions → General → Workflow permissions:** `Read and write permissions` seçip kaydedin (aylık veri görevi yeni veriyi kaydedebilsin).

Birkaç dakika içinde **Actions** sekmesinde "Siteyi yayınla" görevi yeşile döner ve site yayında olur:
`https://kullaniciadi.github.io`

## 4. Alan adı (isteğe bağlı)

1. Alan adını herhangi bir firmadan alın.
2. Depoda **Settings → Pages → Custom domain** kutusuna alan adını yazın; GitHub'ın gösterdiği DNS kayıtlarını alan adı firmanızın panelinde ekleyin. **Enforce HTTPS** kutusunu işaretleyin.
3. Depoda **Settings → Secrets and variables → Actions → Variables → New repository variable** ile iki değişken ekleyin:
   - `SITE_URL` = `https://alanadiniz.com` (site haritası, paylaşım linkleri ve gömme kodu bu adresi kullanır)
   - `YAYIN_ACIK` = `true` (yayın adımını açar; bu değişken yokken yalnızca test ve derleme yapılır)
4. **Actions → Siteyi yayınla → Run workflow** ile yayınlayın.

## 5. Google'a tanıtma

1. https://search.google.com/search-console → sitenizi ekleyip doğrulayın.
2. **Site haritaları** bölümüne `sitemap-index.xml` yazıp gönderin.

## 6. Kendiliğinden çalışanlar

- **Her kod değişikliğinde:** "Siteyi yayınla" görevi testleri çalıştırır, siteyi derler ve yayınlar. Testlerden biri başarısız olursa yayın yapılmaz, eski site yayında kalır.
- **Her ay:** "Veri güncelle" görevi TÜİK ve TCMB verilerini indirir, değişiklik varsa kaydeder ve siteyi yeniden yayınlar. Ayrıntılar: `docs/VERI.md`.
- Bir görev başarısız olursa GitHub size e-posta gönderir.

## 7. Yıllık oran güncellemesi (her Ocak, bazıları Temmuz)

Vergi dilimleri, asgari ücret, SGK sınırları, kıdem tavanı gibi yasal oranlar `src/data/params/` altındadır. Süresi dolan oranlar için sitede sarı uyarı kendiliğinden çıkar. Claude'a "2027 oranlarını güncelle" demeniz yeterli: araştırır, günceller, testleri çalıştırır ve yükler.

## 8. Reklam (ileride)

Google AdSense gibi reklam ağları eklendiğinde üçüncü taraf betikler ve çerezler devreye girer. O zaman gizlilik sayfası ve çerez onayı (KVKK) güncellenmelidir; Claude'a söylemeniz yeterli.
