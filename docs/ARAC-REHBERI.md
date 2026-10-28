# Hesap Robotu – Yeni araç ekleme rehberi

Bu belge, siteye yeni bir hesaplama robotu (araç) eklerken uyulacak kuralları anlatır.
**Örnek araç:** `src/tools/kdv-hesaplama/` + `src/pages/kdv-hesaplama.astro` — yeni araca başlamadan önce bu dosyaları baştan sona oku ve aynı kalıbı izle.

## 0. Tasarım ilkesi: çok fonksiyonlu robotlar (site sahibinin açık talebi)

Her robot, kullanıcının söylemesine gerek kalmadan **gerçek hayattaki tüm yaygın varyasyonları** kapsamalı. Başlamadan önce "bu hesabı kim, hangi durumlarda yapar?" listesini çıkar ve şunları baştan düşün:

- **Çoklu satır / çoklu kalem:** Gerçekte birden fazla kalem varsa (fatura satırları, birden çok alım, birden çok çek, farklı varlıklar, birden fazla teklif) satır ekle/sil arayüzü kur. Örnek: KDV robotu (`line-items` / `line-item` sınıfları, `+ Satır ekle` düğmesi, satır başına `id` ile state).
- **İki yön:** brüt ↔ net, dahil ↔ hariç, tutar ↔ oran gibi ters hesaplar.
- **Tüm seçenekler görünür:** "Yok" seçeneği de dahil (ör. "Tevkifat: Yok / 2/10 / … / 10/10" sekmeleri). Gizli varsayım bırakma.
- **Yasal eşik ve sınırlar otomatik:** tavanlar, tabanlar, tutar sınırları, istisnalar, süre şartları hesaba kendiliğinden uygulanır ve sonuçta "neden" açıklanır (ör. "12.000 TL sınırı aşılmadığı için tevkifat uygulanmaz"). Sınırın aranmadığı özel durum varsa kullanıcı kapatabilsin.
- **Tarih/dönem duyarlılığı:** oranlar tarihe göre değişiyorsa kullanıcı dönemi seçebilsin (varsayılan: bugün).
- **Karşılaştırma ve senaryo:** mantıklıysa "A mı B mi" ya da farklı varsayımlar için senaryo tablosu.
- **Dökümler:** sonucun nasıl oluştuğunu kalem kalem göster (Breakdown/DataTable); aylık/dönemsel tablolar.

Ama: arayüz sade kalsın. Gelişmiş seçenekler mantıklı varsayılanlarla gelsin; nadir kullanılanları `Details` (açılır bölüm) içine koy.

## 1. Projenin değişmez kuralları

- **Sadece Türkiye, sadece Türkçe.** Arayüz metinleri, açıklamalar, SSS: sade Türkçe, "siz" hitabı.
- **Server yok.** Site statik (Astro). Tüm hesaplar ziyaretçinin tarayıcısında yapılır. Hiçbir araç dış API'ye, sunucuya, üçüncü taraf betiğe istek atmaz.
- **Uydurma veri/oran YOK.** Her yasal oran, tutar, katsayı resmî bir kaynaktan doğrulanır ve kaynağıyla birlikte yazılır. Doğrulayamadığın bir değeri koyma: ya kullanıcıya düzenlenebilir alan olarak sun (varsayılanı boş ya da açıkça "örnek" diye işaretli) ya da raporunda belirt.
- **Tavsiye dili yok.** "Şunu alın", "en iyisi bu" denmez. Geçmiş veri = "geçmişte ne oldu". Hukuki/mali/yatırım tavsiyesi değildir notu zaten sayfa iskeletinde var.
- **Yeni npm paketi ekleme.** Gerekiyorsa raporunda gerekçesiyle öner.
- **Paylaşılan dosyalara dokunma:** `src/layouts/*`, `src/components/*`, `src/ui/*`, `src/lib/*`, `src/styles/*`, `src/tools/registry.ts`, `src/tools/categories.ts`, `src/tools/types.ts`, `src/data/params/types.ts`, `astro.config.mjs`, `package.json`. Bunlarda bir eksik görürsen raporunda öner; kendin değiştirme. (İstisna: sana açıkça verilen dosyalar.)
- Başka bir ajanın klasörüne/oran dosyasına yazma. Mevcut bir oran dosyasını (ör. `asgari-ucret.ts`, `sgk-sinirlar.ts`) **okuyup kullanabilirsin**, değiştiremezsin.

## 2. Bir araç = 5 dosya

```
src/tools/<slug>/meta.ts          → ToolMeta (başlık, açıklama, kategori, kaynaklar…)
src/tools/<slug>/calc.ts          → saf hesap fonksiyonları (UI yok, tarih/DOM yok)
src/tools/<slug>/calc.test.ts     → Vitest testleri
src/tools/<slug>/Calculator.tsx   → Preact arayüzü (default export)
src/pages/<slug>.astro            → sayfa: ToolLayout + Calculator + açıklama içeriği + SSS
```

Gerekirse ek olarak: `src/data/params/<konu>.ts` (yasal oran seti, bkz. §4).

- `slug`: küçük harf, Türkçe karakter yok, tire ile; arama niyetine uygun: `fazla-mesai-hesaplama`, `halka-arz-lot-hesaplama`.
- Araç, `meta.ts` dosyası sayesinde ana sayfaya, kategoriye, aramaya ve site haritasına **kendiliğinden** eklenir. Kayıt dosyası düzenlemek gerekmez.

## 3. meta.ts

`src/tools/types.ts` içindeki `ToolMeta` arayüzüne bak. Önemli alanlar:

| Alan | Kural |
|---|---|
| `title` | H1, ör. "Fazla Mesai Hesaplama" (aranan ifade) |
| `question` | H1 altındaki soru: "Fazla mesai ücretim ne kadar olmalı, net ele ne geçer?" |
| `seoTitle` | ≤ 65 karakter. Yıllık oranlı araçlarda yıl, oran setinden gelsin (ör. `` `Brüt Net Maaş Hesaplama ${maas.year}` ``), elle yazma. |
| `description` | 120–155 karakter, somut fayda |
| `cardText` | tek kısa cümle (kartlarda) |
| `category` | `src/tools/categories.ts` içindeki id'lerden biri |
| `keywords` | 5–10 eş anlamlı/arama ifadesi (arama kutusu için) |
| `maintenance` | `none` / `yearly` / `monthly` |
| `paramSets` | kullandığın oran setleri (bayatlık uyarısı + "Kullanılan oranlar" kutusu bunlardan oluşur) |
| `sources` | oran seti dışındaki kaynaklar (kanun maddesi, yönetmelik, genelge) |
| `lastReviewed` | bugünün tarihi (ISO) |
| `related` | 2–4 ilgili aracın slug'ı (var olmayan slug yazma; yazarsan yok sayılır) |

## 4. Yasal oranlar: ParamSet (`src/data/params/`)

Yasaya/karara bağlı her değer (vergi dilimi, tavan, katsayı, oran) koddan ayrı, `ParamSet` olarak tutulur (`src/data/params/types.ts`):

```ts
export const kidemTavani: ParamSet<{ donemler: { from: string; to: string; tavan: number }[] }> = {
  id: 'kidem-tavani',
  title: 'Kıdem tazminatı tavanı',
  validFrom: '2025-01-01',
  validTo: '2026-12-31',   // bu tarihten sonra site sarı "güncellenmeyi bekliyor" uyarısı gösterir; süresizse null
  lastReviewed: '2026-10-29',
  values: { donemler: [ … ] },
  sources: [{ label: '…', url: 'https://…' }],
};
```

- Tarihe bağlı değerleri **dönem listesi** olarak tut (`from`/`to`), hesap fonksiyonu tarihe göre seçsin. Kullanıcı geçmiş bir tarih için de doğru sonuç almalı.
- `validTo`: bilinen son dönemin bitişi. Ör. kıdem tavanı Temmuz–Aralık 2026 için `2026-12-31`.
- Kaynak önceliği: mevzuat.gov.tr, resmigazete.gov.tr, sgk.gov.tr, gib.gov.tr, csgb.gov.tr, tcmb.gov.tr, tuik.gov.tr, kap.org.tr, spk.gov.tr, diyanet.gov.tr. Resmî sayfa bulunamazsa güvenilir ikincil kaynak (büyük denetim firmaları, meslek odaları) kabul; etikette belirt.
- **Hazır ortak setler (sadece oku):** `asgari-ucret.ts` (`asgariUcretOn(tarih)`), `sgk-sinirlar.ts` (`pekSinirlariOn(tarih)`), `kdv.ts`.

## 5. calc.ts – hesap mantığı

- Saf fonksiyonlar: girdi → çıktı. `Date.now()`/`new Date()` kullanma; "bugün" gerekiyorsa parametre olarak al (UI, `todayIsoTR()` ile verir).
- Ortak yardımcılar: `src/lib/finance.ts` → `round2`, `roundTo`, `annuityPayment`, `irr`, `npv`, `annualFromMonthly`, `monthlyFromAnnual`, `futureValue`, `presentValue`, `daysBetween`, `todayIsoTR`.
- Para tutarlarını resmî uygulamadaki gibi kuruşa yuvarla (`round2`); yuvarlamanın nerede yapıldığını yorumla belirt.
- Bir `validateXxx(input)` fonksiyonu yaz: `{ alanAdı: 'Türkçe hata mesajı' }` döndürsün.
- Yasal kuralı uyguladığın her yere kısa yorumla kanun maddesini yaz (ör. `// 4857 s. Kanun md. 41/2: %50 zamlı`).
- Sınır durumlarını düşün: 0, negatif, çok büyük değerler, tavan aşımı, ay/yıl geçişleri, artık yıl.

## 6. calc.test.ts – testler (zorunlu)

- En az **10 test**. Mümkünse **resmî örneklerle** (SGK/GİB genelge örnekleri, bakanlık tabloları): testin üstüne kaynağı yorum olarak yaz.
- Elle doğruladığın senaryolar: hesabı adım adım yorumda göster.
- Sınır durumları ve doğrulama fonksiyonu da test edilsin.
- Çalıştır: `npx vitest run src/tools/<slug>` → hepsi geçmeli.

## 7. Calculator.tsx – arayüz

Örnek: `src/tools/kdv-hesaplama/Calculator.tsx`. Kalıp:

```tsx
export default function Calculator() {
  // 1) state (varsayılanlar: gerçekçi örnek değerler, ör. 50.000 TL maaş)
  // 2) useEffect(() => { const p = readParams(); … }, [])  → paylaşılan bağlantıdan değer okuma
  // 3) errors = validate(...); result = useMemo(() => valid ? hesapla(...) : null, [...])
  return (
    <div class="calc-grid">
      <div class="calc-inputs"> …alanlar… </div>
      <div class="calc-results"> {result ? <>ResultHero, Breakdown, …, ShareBar</> : <ResultEmpty>…</ResultEmpty>} </div>
    </div>
  );
}
```

Hazır bileşenler (`src/ui/`):
- `fields.tsx`: `NumberField` (Türkçe sayı girişi: "50.000", "1.234,56"; `suffix="TL"|"%"|"ay"`), `Segmented` (2–5 seçenek), `SelectField`, `CheckboxField`, `DateField` (ISO), `TextField`
- `results.tsx`: `ResultHero` (büyük sonuç), `Breakdown` (kalem kalem; `kind: 'minus'|'plus'|'total'|'sub'`), `StatGrid`, `DataTable` (aylık tablo / ödeme planı; `scroll` ile uzun tablolar), `Callout` (`info|warning|danger|success`), `StackedBar` (parçaların payı), `Details` (açılır bölüm), `ResultEmpty`
- `ShareBar`: `params` (girdiler → bağlantı) + `summary` (panoya kopyalanacak düz metin)
- `url.ts`: `readParams`, `numParam`, `enumParam`, `boolParam`, `dateParam`
- Biçimlendirme `src/lib/format.ts`: `formatTL(n)` → "1.234,56 TL", `formatNumber`, `formatPercent(20)` → "%20", `formatDateTR('2026-10-29')` → "29 Ekim 2026", `formatMonthTR`, `parseTR`
- Yerleşim sınıfları: `calc-grid` (2 sütun), `calc-inputs`, `calc-results`, `row-2` (iki alan yan yana), `calc-section-title` (küçük bölüm başlığı), `calc-wide` (hesaplayıcının altında tam genişlik bölüm; ör. 12 aylık tablo)

Kurallar:
- Sonuç **yazarken anında** güncellenir (Hesapla düğmesi yok).
- Alan id'leri araç önekiyle benzersiz olsun: `id="fm-saatlik-ucret"`.
- Her alan için anlaşılır `label` + gerektiğinde `hint`. Hata mesajı `error` ile.
- Mobilde de kullanılabilir olmalı (tablolar `DataTable` içinde zaten yatay kayar).
- Satır içi stil yerine mevcut sınıfları kullan. Yeni CSS gerekiyorsa raporda öner.
- `ShareBar` her araçta olsun. Paylaşım parametre adları kısa ve Türkçe: `?brut=50000&yil=2026`.

## 8. Sayfa: src/pages/<slug>.astro

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import Calculator from '../tools/<slug>/Calculator';
import { meta } from '../tools/<slug>/meta';
import type { FaqItem } from '../tools/types';
const faq: FaqItem[] = [ { q: '…?', a: '…' } ];
---
<ToolLayout meta={meta} faq={faq}>
  <Fragment slot="calculator"><Calculator client:load /></Fragment>
  <h2>… nasıl hesaplanır?</h2>
  …
</ToolLayout>
```

İçerik (makale bölümü) — kaliteli, özgün, kopya değil:
1. **"… nasıl hesaplanır?"**: kural + formül (`<div class="formula">…</div>`), kanun maddesine atıf.
2. **"Örnek hesaplama"**: en az 2 somut örnek (`<div class="example">`). Rakamları elle yazma; `calc.ts` fonksiyonunu sayfanın üst kısmında çağırıp sonucu `formatTL` ile bas (KDV sayfasındaki gibi) — böylece metin ile hesap hep tutarlı kalır.
3. **"Bilmeniz gerekenler"**: istisnalar, sık yapılan hatalar, tablo (varsa).
4. **SSS**: 5–7 soru, gerçekten aranan sorular ("… ne zaman ödenir?", "… vergiye tabi mi?"). Cevaplar 2–4 cümle, kaynaklı ve kesin.
- Kopyala-yapıştır metin YOK; telif hakkı olan içerik alıntılama.

## 9. Doğrulama (teslimden önce)

```bash
npx vitest run src/tools/<slug>      # testler geçmeli
npx astro check                      # 0 error (sadece kendi dosyalarındaki hataları düzelt)
```

`astro build` ve `astro dev` **çalıştırma** (paralel çalışan ajanlarla çakışır; derlemeyi ana süreç yapar).

## 10. Teslim raporu

Kısa ve maddeli:
- Eklenen araçlar (slug, başlık) ve dosya listesi
- Kullanılan resmî kaynaklar (URL) ve doğrulanan kritik değerler
- Test sayısı ve sonucu
- Emin olamadığın noktalar / kullanıcıya düzenlenebilir bıraktığın değerler
- Paylaşılan dosyalar için önerilerin (varsa)
