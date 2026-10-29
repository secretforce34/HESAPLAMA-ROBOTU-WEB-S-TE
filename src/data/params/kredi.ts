import type { ParamSet } from './types';

// Kredi & borç robotlarının ortak oran setleri (kredi hesaplama, taksit/peşin, kredi kartı, erken kapama).
// Her değer resmî kaynaktan (BDDK Kurul Kararı, TCMB ilanı, Resmî Gazete, mevzuat.gov.tr) kontrol edildi;
// resmî metne ulaşılamayan iki değer (kart faizinde BSMV, ticari kredide BSMV) ikincil kaynak olarak işaretlidir
// ve arayüzde kullanıcı tarafından değiştirilebilir.

/** Açık uçlu dönemlerin bitişi (yeni karar çıkana kadar). */
const SURESIZ = '2099-12-31';

// ---------------------------------------------------------------------------
// 1) Kredi türleri ve faize uygulanan KKDF / BSMV
// ---------------------------------------------------------------------------

export type KrediTuru = 'ihtiyac' | 'tasit' | 'konut' | 'konut-teminatli' | 'telefon' | 'ticari';

export interface KrediTuruBilgisi {
  ad: string;
  /** Faiz üzerinden KKDF (%) */
  kkdf: number;
  /** Faiz üzerinden BSMV (%) */
  bsmv: number;
  /** Tüketici kredisi mi (6502 s. Kanun ve tüketici kredisi sınırları uygulanır) */
  tuketici: boolean;
  aciklama: string;
}

export interface BsmvDonemi {
  from: string;
  to: string;
  /** Tüketici kredisi faizine uygulanan BSMV (%) — kredinin KULLANDIRIM tarihine göre */
  oran: number;
}

export const krediVergileri: ParamSet<{
  turler: Record<KrediTuru, KrediTuruBilgisi>;
  tuketiciBsmvDonemleri: BsmvDonemi[];
}> = {
  id: 'kredi-kkdf-bsmv',
  title: 'Kredi faizine uygulanan KKDF ve BSMV oranları',
  validFrom: '2023-07-07',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    turler: {
      ihtiyac: {
        ad: 'İhtiyaç kredisi',
        kkdf: 15,
        bsmv: 15,
        tuketici: true,
        aciklama: 'Tüketici kredisi: faize %15 KKDF ve %15 BSMV eklenir.',
      },
      tasit: {
        ad: 'Taşıt kredisi',
        kkdf: 15,
        bsmv: 15,
        tuketici: true,
        aciklama: 'Bireysel taşıt kredisi tüketici kredisidir: faize %15 KKDF ve %15 BSMV eklenir.',
      },
      konut: {
        ad: 'Konut kredisi',
        kkdf: 0,
        bsmv: 0,
        tuketici: true,
        aciklama:
          'Konut edinmek için kullanılan kredide (konut finansmanı) KKDF ve BSMV uygulanmaz. Konut başkasına satılırsa sonraki taksitlerin faizine vergi uygulanabilir.',
      },
      'konut-teminatli': {
        ad: 'Konut teminatlı (ihtiyaç) kredi',
        kkdf: 15,
        bsmv: 15,
        tuketici: true,
        aciklama: 'Mevcut konut ipotek edilerek alınan ihtiyaç kredisi konut finansmanı sayılmaz; KKDF ve BSMV uygulanır.',
      },
      telefon: {
        ad: 'Cep telefonu kredisi',
        kkdf: 15,
        bsmv: 15,
        tuketici: true,
        aciklama: 'Cep telefonu alımı için kullanılan tüketici kredisi; vade sınırı telefon fiyatına göre belirlenir.',
      },
      ticari: {
        ad: 'Ticari kredi (TL)',
        kkdf: 0,
        bsmv: 5,
        tuketici: false,
        aciklama: 'Türk lirası ticari kredide KKDF %0; BSMV genel oran %5 (döviz/altın kredilerinde KKDF %1).',
      },
    },
    tuketiciBsmvDonemleri: [
      { from: '2020-01-01', to: '2022-06-10', oran: 5 },
      { from: '2022-06-11', to: '2023-07-06', oran: 10 },
      { from: '2023-07-07', to: SURESIZ, oran: 15 },
    ],
  },
  sources: [
    {
      label: 'Resmî Gazete 07.07.2023 – 7345 sayılı Cumhurbaşkanı Kararı (tüketici kredilerinde BSMV %10 → %15)',
      url: 'https://www.resmigazete.gov.tr/eskiler/2023/07/20230707-10.pdf',
    },
    {
      label: 'RSM Turkey Sirküler 2023/48 – BSMV dönemleri (2022 öncesi %5, 11.06.2022–07.07.2023 %10) ve kapsam (ikincil kaynak)',
      url: 'https://www.rsm.global/turkey/sites/default/files/media/documents/pdf-files/sirkuler/2023/RSM%20Turkey%20Sirk%C3%BCler%202023-48.pdf',
    },
    {
      label: 'Resmî Gazete 18.07.2025 – 10094 sayılı KKDF Kesintisi Hakkında Karar (döviz/altın kredilerde %1, diğerlerinde %0)',
      url: 'https://www.resmigazete.gov.tr/eskiler/2025/07/20250718-10.pdf',
    },
    {
      label: 'KPMG Mali Bülten – 10094 sayılı Karar: tüketici kredilerinde KKDF %15, ticari TL kredilerde %0 (ikincil kaynak)',
      url: 'https://kpmgvergi.com/yayinlar/mali-bultenler/vergi/doviz-ve-altin-kredilerde-kkdf-oranini-degistiren-1772025-tarihli-ve-10094-sayili-cumhurbaskani-karari-1872025-tarihli-resmi-gazetede-yayimlandi/3139',
    },
    {
      label: 'GİB özelgesi – Konut finansmanında BSMV istisnası (6802 s. Gider Vergileri Kanunu md. 29/1-y) (Lexpera)',
      url: 'https://www.lexpera.com.tr/mevzuat/ozelgeler/39044742-130-bsmv-ozelge-453787-sayili-ozelge-1',
    },
  ],
  note: 'Ticari kredide BSMV %5, tüketici kredisi dışındaki kredilere uygulanan genel orandır (ikincil kaynak). Oranlar kullandırım tarihine göre belirlenir; eski kredilerde sözleşmenizdeki oranı esas alın.',
};

/** Tüketici kredisinin kullandırım tarihine göre faizine uygulanan BSMV oranı (%). */
export function tuketiciBsmvOrani(kullandirimIso: string): number {
  const list = krediVergileri.values.tuketiciBsmvDonemleri;
  const found = list.find((d) => kullandirimIso >= d.from && kullandirimIso <= d.to);
  if (found) return found.oran;
  return kullandirimIso < list[0].from ? list[0].oran : list[list.length - 1].oran;
}

// ---------------------------------------------------------------------------
// 2) BDDK: vade sınırları ve kredi/değer oranları
// ---------------------------------------------------------------------------

export interface VadeDilimi {
  /** Bu dilimin üst sınırı (TL, dahil); null = üst sınır yok */
  ust: number | null;
  /** Azami vade (ay) */
  vade: number;
}

export interface TasitDilimi {
  /** Nihai fatura değeri (ikinci elde kasko değeri) üst sınırı (TL, dahil); null = üst sınır yok */
  ust: number | null;
  /** Azami vade (ay); 0 = kredi kullandırılamaz */
  vade: number;
  /** Kredi tutarının taşıt değerine azami oranı (%) */
  kdo: number;
}

export interface KonutDilimi {
  /** Konut değeri üst sınırı (TL, dahil); null = üst sınır yok */
  ust: number | null;
  /** Enerji sınıfına göre azami kredi/değer oranı (%) */
  ab: number;
  c: number;
  diger: number;
}

export type EnerjiSinifi = 'ab' | 'c' | 'diger';

export const krediSinirlari: ParamSet<{
  /** Tüketici kredileri genel vade sınırı (konut, taşıt, eğitim vb. hariç) — kredi tutarına göre */
  genelVade: VadeDilimi[];
  /** Binek taşıt kredisi: nihai fatura değerine göre vade ve kredi/değer oranı */
  tasit: TasitDilimi[];
  /** Yalnızca 5520 s. KVK geçici 12. madde kapsamındaki üreticilerin elektrikli taşıtları */
  tasitYerliElektrikli: TasitDilimi[];
  /** Cep telefonu kredisi vade sınırı */
  telefon: { sinir: number; yenilenmisSinir: number; altVade: number; ustVade: number };
  /** Konut alımı ve konut teminatlı kredilerde kredi/değer oranı */
  konut: KonutDilimi[];
  /** Kendisinin, eşinin veya 18 yaş altı çocuğunun konutu varsa oran bu yüzde kadar azaltılır */
  konutSahibiIndirimi: number;
}> = {
  id: 'bddk-kredi-sinirlari',
  title: 'BDDK tüketici kredisi vade ve kredi/değer sınırları',
  validFrom: '2022-02-21',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    // BDDK 13.02.2025 / 11152
    genelVade: [
      { ust: 125_000, vade: 36 },
      { ust: 250_000, vade: 24 },
      { ust: null, vade: 12 },
    ],
    // BDDK 21.02.2022 / 10099
    tasit: [
      { ust: 400_000, vade: 48, kdo: 70 },
      { ust: 800_000, vade: 36, kdo: 50 },
      { ust: 1_200_000, vade: 24, kdo: 30 },
      { ust: 2_000_000, vade: 12, kdo: 20 },
      { ust: null, vade: 0, kdo: 0 },
    ],
    // BDDK 06.03.2025 / 11158
    tasitYerliElektrikli: [
      { ust: 2_500_000, vade: 48, kdo: 70 },
      { ust: 5_000_000, vade: 36, kdo: 50 },
      { ust: 6_500_000, vade: 24, kdo: 30 },
      { ust: 7_500_000, vade: 12, kdo: 20 },
      { ust: null, vade: 0, kdo: 0 },
    ],
    // BDDK 01.10.2026 / 11582
    telefon: { sinir: 40_000, yenilenmisSinir: 50_000, altVade: 12, ustVade: 3 },
    // BDDK 29.01.2026 / 11364
    konut: [
      { ust: 5_000_000, ab: 90, c: 80, diger: 70 },
      { ust: 7_000_000, ab: 80, c: 70, diger: 60 },
      { ust: 10_000_000, ab: 70, c: 60, diger: 50 },
      { ust: 20_000_000, ab: 50, c: 40, diger: 30 },
      { ust: null, ab: 40, c: 30, diger: 20 },
    ],
    // BDDK 24.08.2023 / 10656 (11364 sayılı Kararla devam ediyor)
    konutSahibiIndirimi: 75,
  },
  sources: [
    {
      label: 'BDDK 13.02.2025 / 11152 – Tüketici kredileri genel vade sınırı (125 bin TL’ye kadar 36, 250 bin TL’ye kadar 24, üzeri 12 ay)',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/1270',
    },
    {
      label: 'BDDK 21.02.2022 / 10099 – Taşıt kredisi vade ve kredi/değer sınırları',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/1099',
    },
    {
      label: 'BDDK 06.03.2025 / 11158 – Yerli üretim elektrikli taşıtlarda vade ve kredi/değer sınırları',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/1278',
    },
    {
      label: 'BDDK 01.10.2026 / 11582 – Cep telefonu kredisinde vade sınırı',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/1348',
    },
    {
      label: 'BDDK 29.01.2026 / 11364 – Konut kredilerinde kredi/değer oranı (değer ve enerji sınıfına göre)',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/1327',
    },
    {
      label: 'BDDK 24.08.2023 / 10656 – Konutu olanlar için kredi/değer oranının %75 azaltılması',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/1191',
    },
    {
      label: 'Bankaların Kredi İşlemlerine İlişkin Yönetmelik md. 12 (sınırların dayanağı)',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=40520&MevzuatTur=7&MevzuatTertip=5',
    },
  ],
  note: 'Genel vade sınırı; konut, konut tadilatı, eğitim ve kamu borcu kredilerine uygulanmaz. İkinci el binek araçta taşıt değeri olarak kasko değeri esas alınır.',
};

/** Tutara göre tüketici kredisi genel azami vadesi (ay). */
export function genelAzamiVade(tutar: number): number {
  for (const d of krediSinirlari.values.genelVade) if (d.ust === null || tutar <= d.ust) return d.vade;
  return krediSinirlari.values.genelVade[krediSinirlari.values.genelVade.length - 1].vade;
}

/** Taşıt değerine göre vade/kredi-değer dilimi. */
export function tasitDilimi(deger: number, yerliElektrikli = false): TasitDilimi {
  const list = yerliElektrikli ? krediSinirlari.values.tasitYerliElektrikli : krediSinirlari.values.tasit;
  for (const d of list) if (d.ust === null || deger <= d.ust) return d;
  return list[list.length - 1];
}

/** Konut değerine ve enerji sınıfına göre azami kredi/değer oranı (%); başka konutu olanlarda %75 azaltılmış. */
export function konutKdo(deger: number, sinif: EnerjiSinifi, baskaKonutVar = false): number {
  const list = krediSinirlari.values.konut;
  const d = list.find((x) => x.ust === null || deger <= x.ust) ?? list[list.length - 1];
  const oran = d[sinif];
  return baskaKonutVar ? (oran * (100 - krediSinirlari.values.konutSahibiIndirimi)) / 100 : oran;
}

// ---------------------------------------------------------------------------
// 3) Tüketici kredisi ücret sınırları ve erken ödeme
// ---------------------------------------------------------------------------

export const krediUcretleri: ParamSet<{
  /** Kredi tahsis ücreti azami sınırı: kullandırılan anaparanın binde kaçı (vergi hariç) */
  tahsisBinde: number;
  /** Konut finansmanında sabit faizli kredide erken ödeme tazminatı üst sınırı (%) */
  erkenOdemeTazminati: { kalanVade36AyaKadar: number; kalanVade36AyUstu: number };
  /** Tüketici kredisinde gecikme faizi, akdi faizin en fazla yüzde kaç fazlası olabilir */
  gecikmeFaiziUstFark: number;
}> = {
  id: 'tuketici-kredisi-ucret-sinirlari',
  title: 'Tüketici kredisi ücret sınırları ve erken ödeme tazminatı',
  validFrom: '2020-03-07',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    tahsisBinde: 5,
    erkenOdemeTazminati: { kalanVade36AyaKadar: 1, kalanVade36AyUstu: 2 },
    gecikmeFaiziUstFark: 30,
  },
  sources: [
    {
      label: 'TCMB – Finansal Tüketicilerden Alınacak Ücretler Tebliği (2020/7) Uygulama Talimatı, 13.01.2026 (tahsis ücreti binde 5; rehin, ipotek, ekspertizde yalnızca üçüncü kişilere ödenen ücret)',
      url: 'https://www.tcmb.gov.tr/wps/wcm/connect/9fcd654e-65a7-4c42-8292-06ec3846e751/2023-39%2Bsay%C4%B1l%C4%B1%2BFT%2BTebli%C4%9Fi%2BUygulama%2BTalimat%C4%B1%2B-13%2BOcak%2B2026.pdf?MOD=AJPERES',
    },
    {
      label: '6502 sayılı Tüketicinin Korunması Hakkında Kanun md. 27 (erken ödemede faiz indirimi) ve md. 37 (konut finansmanında erken ödeme tazminatı %1 / %2)',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6502&MevzuatTur=1&MevzuatTertip=5',
    },
    {
      label: 'Tüketici Kredisi Sözleşmeleri Yönetmeliği (RG 22.05.2015/29363) – md. 4 (gecikme faizi), md. 14 (efektif yıllık faiz oranı), md. 16–17 (erken ve ara ödeme)',
      url: 'https://www.resmigazete.gov.tr/eskiler/2015/05/20150522-2.htm',
    },
  ],
  note: 'Değişken faizli konut kredisinde erken ödeme tazminatı alınamaz; tüketici kredisinde erken ödeme tazminatı yoktur.',
};

// ---------------------------------------------------------------------------
// 4) Kredi kartı: TCMB azami faiz oranları (aylık) — her ay ilan edilir
// ---------------------------------------------------------------------------

export interface KartFaizDilimi {
  /** Dönem borcu üst sınırı (TL). Dilim: alt ≤ borç < üst; son dilimde null. */
  ust: number | null;
  /** Aylık azami akdi faiz (%) */
  akdi: number;
  /** Aylık azami gecikme faizi (%) */
  gecikme: number;
}

export interface KartFaizDonemi {
  from: string;
  to: string;
  /** TCMB referans oranı (aylık %) — yapılandırmada akdi faiz bunu aşamaz */
  referans: number;
  /** TL alışveriş: dönem borcuna göre dilimler */
  dilimler: KartFaizDilimi[];
  /** TL nakit çekim/kullanım (KMH için de geçerli) */
  nakit: { akdi: number; gecikme: number };
  /** Yabancı para */
  yabanciPara: { akdi: number; gecikme: number };
}

export const krediKartiFaizleri: ParamSet<{
  donemler: KartFaizDonemi[];
  /** Kart faizine eklenen fon ve vergi (%) */
  vergiler: { kkdf: number; bsmv: number };
}> = {
  id: 'tcmb-kredi-karti-azami-faiz',
  title: 'TCMB kredi kartı azami faiz oranları (aylık)',
  validFrom: '2026-01-01',
  // TCMB oranları her ayın sondan beşinci iş günü bir sonraki ay için ilan eder; Kasım 2026 ilanı dahil edildi.
  validTo: '2026-11-30',
  lastReviewed: '2026-10-29',
  values: {
    donemler: [
      {
        // 1/1/2026 – 1/11/2026 ilanlarının hepsinde aynı oranlar
        from: '2026-01-01',
        to: '2026-11-30',
        referans: 3.11,
        dilimler: [
          { ust: 30_000, akdi: 3.25, gecikme: 3.55 },
          { ust: 180_000, akdi: 3.75, gecikme: 4.05 },
          { ust: null, akdi: 4.25, gecikme: 4.55 },
        ],
        nakit: { akdi: 4.25, gecikme: 4.55 },
        yabanciPara: { akdi: 2.98, gecikme: 3.28 },
      },
    ],
    vergiler: { kkdf: 15, bsmv: 15 },
  },
  sources: [
    {
      label: 'TCMB – Kredi Kartı İşlemlerinde Uygulanacak Azami Faiz Oranları (1/1/2026–1/11/2026 ilanları)',
      url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%2BTR/Main%2BMenu/Istatistikler/Bankacilik%2BVerileri/Kredi_Karti_Islemlerinde_Uygulanacak_Azami_Faiz_Oranlari',
    },
    {
      label: 'Burgan Bank / ON kredi kartı bilgilendirme formu (01/2026): faize %15 KKDF ve %15 BSMV eklenir (banka açıklaması, ikincil kaynak)',
      url: 'https://on.com.tr/uploads/2026/2/kredi-karti-bilgilendirme-ve-talep-formu-ver5-0ba32087-e899-43a1-802c-cfd4eab7b79d.pdf',
    },
  ],
  note: 'Dilimler dönem borcuna göredir: 30.000 TL altı, 30.000–180.000 TL, 180.000 TL üzeri (kurumsal kartlarda en üst dilim). Bankalar bu oranların altında faiz belirleyebilir.',
};

/** Verilen tarihte geçerli kredi kartı azami faiz dönemi (liste dışındaysa en yakın dönem). */
export function kartFaizDonemiOn(isoDate: string): KartFaizDonemi {
  const list = krediKartiFaizleri.values.donemler;
  const found = list.find((d) => isoDate >= d.from && isoDate <= d.to);
  if (found) return found;
  return isoDate < list[0].from ? list[0] : list[list.length - 1];
}

/**
 * Dönem borcuna göre TL alışveriş dilimi. TCMB tablosu: "30.000 TL altında", "30.000–180.000 TL arasında",
 * "180.000 TL üzerinde" → 30.000 TL tam ikinci dilime, 180.000 TL tam ikinci dilime girer.
 */
export function kartFaizDilimi(donemBorcu: number, donem: KartFaizDonemi, kurumsal = false): KartFaizDilimi {
  const d = donem.dilimler;
  if (kurumsal) return d[d.length - 1];
  if (donemBorcu < (d[0].ust ?? Infinity)) return d[0];
  for (let i = 1; i < d.length; i++) {
    const ust = d[i].ust;
    if (ust === null || donemBorcu <= ust) return d[i];
  }
  return d[d.length - 1];
}

// ---------------------------------------------------------------------------
// 5) Kredi kartı taksit sınırları (BDDK)
// ---------------------------------------------------------------------------

export type KartHarcamaGrubu =
  | 'genel'
  | 'elektronik'
  | 'tv'
  | 'tablet'
  | 'mobilya'
  | 'kuyum'
  | 'seyahat-yurtici'
  | 'seyahat-kktc'
  | 'kulup'
  | 'yenilenmis-telefon'
  | 'kurumsal'
  | 'yasak';

export interface KartTaksitGrubu {
  id: KartHarcamaGrubu;
  ad: string;
  /** Azami taksit sayısı; 0 = taksit yapılamaz */
  azami: number;
}

export const kartTaksitSinirlari: ParamSet<{ gruplar: KartTaksitGrubu[] }> = {
  id: 'bddk-kart-taksit-sinirlari',
  title: 'Kredi kartı taksit sınırları (BDDK)',
  validFrom: '2023-08-24',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    gruplar: [
      { id: 'genel', ad: 'Diğer mal ve hizmetler (bilgisayar, giyim, eğitim, vergi vb.)', azami: 12 },
      { id: 'elektronik', ad: 'Elektronik eşya (5.000 TL’ye kadar televizyon hariç)', azami: 4 },
      { id: 'tv', ad: 'Televizyon (fiyatı 5.000 TL’ye kadar)', azami: 9 },
      { id: 'tablet', ad: 'Tablet', azami: 6 },
      { id: 'mobilya', ad: 'Mobilya, elektrikli eşya ve sağlık ürünü', azami: 9 },
      { id: 'kuyum', ad: 'Kuyum (basılı ve külçe olmayan, ör. takı)', azami: 3 },
      { id: 'seyahat-yurtici', ad: 'Havayolu, seyahat acentesi, konaklama (yurt içi)', azami: 18 },
      { id: 'seyahat-kktc', ad: 'Havayolu, seyahat acentesi, konaklama (KKTC)', azami: 3 },
      { id: 'kulup', ad: 'Kulüp ve dernek ödemeleri', azami: 6 },
      { id: 'yenilenmis-telefon', ad: 'Yenilenmiş cep telefonu (yenileme merkezi / yetkili satıcı)', azami: 12 },
      { id: 'kurumsal', ad: 'Kurumsal kredi kartıyla harcama', azami: 18 },
      {
        id: 'yasak',
        ad: 'Taksit yapılamayanlar: akaryakıt, gıda, yemek, alkollü içecek, kozmetik, ofis malzemesi, telekomünikasyon, basılı/külçe altın, yurt dışı harcama, hediye kartı',
        azami: 0,
      },
    ],
  },
  sources: [
    {
      label: 'BDDK – Kredi Kartı Taksit Sınırları ve Yasakları (8198 sayılı Karar ve değişiklikleriyle birleştirilmiş metin)',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/16',
    },
    {
      label: 'BDDK 24.08.2023 / 10654 – Yurt dışı seyahat harcamalarında taksit yasağı (KKTC 3 ay)',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/1190',
    },
  ],
  note: 'Sınırlar, borcun sonradan taksitlendirilmesi ve ödemenin ertelendiği dönemler dahil uygulanır. Taksit sayısını işyerinin kategorisi (üye işyeri kodu) belirler.',
};

export function kartTaksitGrubu(id: KartHarcamaGrubu): KartTaksitGrubu {
  return kartTaksitSinirlari.values.gruplar.find((g) => g.id === id) ?? kartTaksitSinirlari.values.gruplar[0];
}

// ---------------------------------------------------------------------------
// 6) Kredi kartı asgari ödeme oranı (BDDK)
// ---------------------------------------------------------------------------

export interface AsgariOdemeDonemi {
  from: string;
  to: string;
  /** Kart limiti bu tutar VE ALTINDAYSA alt oran, üzerindeyse üst oran uygulanır */
  limitEsigi: number;
  altOran: number;
  ustOran: number;
}

export const asgariOdemeOranlari: ParamSet<{ donemler: AsgariOdemeDonemi[] }> = {
  id: 'bddk-asgari-odeme',
  title: 'Kredi kartı asgari ödeme oranları (BDDK)',
  validFrom: '2024-09-26',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    donemler: [
      { from: '2024-09-26', to: '2026-09-30', limitEsigi: 50_000, altOran: 20, ustOran: 40 },
      { from: '2026-10-01', to: SURESIZ, limitEsigi: 100_000, altOran: 20, ustOran: 40 },
    ],
  },
  sources: [
    {
      label: 'BDDK 01.10.2026 / 11581 – Limiti 100.000 TL ve altı kartlarda %20, üzeri kartlarda %40',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/1349',
    },
    {
      label: 'BDDK 26.09.2024 / 10970 – Önceki eşik: 50.000 TL',
      url: 'https://www.bddk.org.tr/Mevzuat/DokumanGetir/1255',
    },
    {
      label: 'Banka Kartları ve Kredi Kartları Hakkında Yönetmelik md. 22 (asgari tutar %20–%40 aralığı; üç kez ödenmeyen kartın kapatılması)',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=11180&MevzuatTur=7&MevzuatTertip=5',
    },
  ],
  note: 'Bir takvim yılında asgari tutar toplam üç kez ödenmezse kart nakit kullanımına, üst üste üç kez ödenmezse alışverişe de kapatılır.',
};

export function asgariOdemeDonemiOn(isoDate: string): AsgariOdemeDonemi {
  const list = asgariOdemeOranlari.values.donemler;
  const found = list.find((d) => isoDate >= d.from && isoDate <= d.to);
  if (found) return found;
  return isoDate < list[0].from ? list[0] : list[list.length - 1];
}

/** Kart limitine göre asgari ödeme oranı (%). */
export function asgariOdemeOrani(kartLimiti: number, donem: AsgariOdemeDonemi): number {
  return kartLimiti <= donem.limitEsigi ? donem.altOran : donem.ustOran;
}
