import type { ParamSet } from './types';

// ---------------------------------------------------------------------------
// Cumhuriyet altınları (Darphane): ziynet ve sikke (Ata) ağırlıkları
// ---------------------------------------------------------------------------

export type CumhuriyetAltiniId =
  | 'ceyrek'
  | 'yarim'
  | 'tam'
  | 'gremse'
  | 'besli'
  | 'ata'
  | 'ata-ceyrek'
  | 'ata-yarim'
  | 'ata-gremse'
  | 'ata-besli';

export interface CumhuriyetAltini {
  id: CumhuriyetAltiniId;
  /** Kullanıcıya görünen ad */
  ad: string;
  /** Darphane'nin sınıflaması: ziynet altını mı, sikke (halk arasında "Ata") mı */
  grup: 'ziynet' | 'sikke';
  /** Bir adedin ağırlığı (gram) */
  agirlik: number;
  /** Çap (mm) */
  cap: number;
  /** Kaç "birlik"e (1 lira) denk geldiği: çeyrek 0,25 … beşli 5 */
  lira: number;
}

/**
 * Darphane ve Damga Matbaası Genel Müdürlüğü'nün yayımladığı değerler.
 * - Ziynet: çeyrek 1,754 / yarım 3,508 / birlik (tam) 7,016 / ikibuçukluk 17,540 / beşlik 35,080 g
 * - Sikke (Ata): çeyrek 1,804 / yarım 3,608 / birlik 7,216 / ikibuçukluk 18,040 / beşlik 36,080 g
 * - Ayar: hepsi 22 ayar; Darphane'nin 2023 faaliyet raporunda "916,6" milyem olarak gösterilir.
 * Halk arasında "gremse" ikibuçukluk (2,5 liralık) altın için kullanılır; Darphane'nin kendi
 * adı "ikibuçukluk"tur. Sikke ikibuçuklukta 2023 faaliyet raporu 18,041 g yazar; "Sorularla
 * Cumhuriyet Altını" tablosu ve 2,5 × 7,216 hesabı 18,040 g verir, burada 18,040 kullanılır.
 */
export const darphaneAltinlari: ParamSet<{ milyem: number; turler: CumhuriyetAltini[] }> = {
  id: 'darphane-cumhuriyet-altinlari',
  title: 'Cumhuriyet altınları: ağırlık ve ayar (Darphane)',
  validFrom: '2013-11-29',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    milyem: 916.6,
    turler: [
      { id: 'ceyrek', ad: 'Çeyrek altın', grup: 'ziynet', agirlik: 1.754, cap: 18, lira: 0.25 },
      { id: 'yarim', ad: 'Yarım altın', grup: 'ziynet', agirlik: 3.508, cap: 22, lira: 0.5 },
      { id: 'tam', ad: 'Tam (teklik) altın', grup: 'ziynet', agirlik: 7.016, cap: 30, lira: 1 },
      { id: 'gremse', ad: 'Gremse (2,5’luk) altın', grup: 'ziynet', agirlik: 17.54, cap: 40, lira: 2.5 },
      { id: 'besli', ad: 'Beşli altın', grup: 'ziynet', agirlik: 35.08, cap: 45, lira: 5 },
      { id: 'ata', ad: 'Ata (Cumhuriyet) altını', grup: 'sikke', agirlik: 7.216, cap: 22, lira: 1 },
      { id: 'ata-ceyrek', ad: 'Ata çeyrek', grup: 'sikke', agirlik: 1.804, cap: 15, lira: 0.25 },
      { id: 'ata-yarim', ad: 'Ata yarım', grup: 'sikke', agirlik: 3.608, cap: 18, lira: 0.5 },
      { id: 'ata-gremse', ad: 'Ata gremse (2,5’luk)', grup: 'sikke', agirlik: 18.04, cap: 27, lira: 2.5 },
      { id: 'ata-besli', ad: 'Ata beşli', grup: 'sikke', agirlik: 36.08, cap: 35, lira: 5 },
    ],
  },
  sources: [
    {
      label: 'Darphane ve Damga Matbaası GM – Sorularla Cumhuriyet Altını (ziynet/sikke ağırlıkları, 22 ayar)',
      url: 'https://ms.hmb.gov.tr/uploads/sites/7/2021/05/Sorularla_Cumhuriyet_Altini.pdf',
    },
    {
      label: 'Darphane ve Damga Matbaası GM – 2023 Faaliyet Raporu (ağırlık, çap ve 916,6 ayar tablosu)',
      url: 'https://ms.hmb.gov.tr/uploads/sites/7/2024/05/DARPHANE-ve-DAMGA-MATBAASI-GENEL-MUDURLUGU-2023-FAALIYET-RAPORU.pdf',
    },
  ],
  note: 'Ziynet ve Ata (sikke) altınlarının tümü 22 ayardır (916,6 milyem); Ata liranın ağırlığı 7,216 g, tam ziynetin 7,016 g’dır.',
};

export function cumhuriyetAltini(id: CumhuriyetAltiniId): CumhuriyetAltini {
  const t = darphaneAltinlari.values.turler.find((x) => x.id === id);
  if (!t) throw new Error(`Bilinmeyen altın türü: ${id}`);
  return t;
}

// ---------------------------------------------------------------------------
// Ayar ↔ milyem
// ---------------------------------------------------------------------------

export interface AyarKaydi {
  /** Kısa kod: "22", "14", "14-585", "24-995" */
  kod: string;
  /** Kuyumculukta söylenen ayar (24 üzerinden) */
  ayar: number;
  /** Binde saf altın oranı */
  milyem: number;
  /**
   * teblig: Resmî Gazete'deki tebliğ tablosunda yazan değer
   * tanim: ayar/24 tanımı gereği (24 ayar = saf altın)
   * piyasa: tebliğ tablosunda olmayan, ticarette yaygın damga/standart
   */
  kaynak: 'teblig' | 'tanim' | 'piyasa';
  aciklama?: string;
}

/**
 * Ayar–milyem tablosu. 8–22 ayar değerleri "Kıymetli Maden ve Taş Analizinde Yetki Verilecek
 * Ayar Evlerinin Standartları, Seçimi ve Denetim Esaslarının Belirlenmesine İlişkin Tebliğ"
 * (Hazine Müsteşarlığı, RG 20.06.2007, sayı 26558) md. 12 tablosundan alınmıştır
 * (tolerans ±0,002). Tebliğde 24 ayar için değer yoktur: 24 ayar saf (has) altın sayılır.
 * Külçe altın standardı 995/1000'dir (Darphane, Cumhuriyet altını için 995/1000 kabul eder).
 * 14 ayar tebliğde 583'tür; ticarette 585 damgası da yaygındır.
 */
export const altinAyarlari: ParamSet<{ ayarlar: AyarKaydi[]; tolerans: number }> = {
  id: 'altin-ayar-milyem',
  title: 'Altın ayar – milyem tablosu',
  validFrom: '2007-06-20',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    tolerans: 0.002,
    ayarlar: [
      { kod: '24', ayar: 24, milyem: 1000, kaynak: 'tanim', aciklama: 'Saf (has) altın' },
      { kod: '24-995', ayar: 24, milyem: 995, kaynak: 'piyasa', aciklama: 'Standart külçe / gram altın (995/1000)' },
      { kod: '22', ayar: 22, milyem: 916, kaynak: 'teblig' },
      { kod: '21', ayar: 21, milyem: 875, kaynak: 'teblig' },
      { kod: '18', ayar: 18, milyem: 750, kaynak: 'teblig' },
      { kod: '14', ayar: 14, milyem: 583, kaynak: 'teblig' },
      { kod: '14-585', ayar: 14, milyem: 585, kaynak: 'piyasa', aciklama: '585 damgalı 14 ayar' },
      { kod: '10', ayar: 10, milyem: 416, kaynak: 'teblig' },
      { kod: '9', ayar: 9, milyem: 375, kaynak: 'teblig' },
      { kod: '8', ayar: 8, milyem: 333, kaynak: 'teblig' },
    ],
  },
  sources: [
    {
      label: 'Resmî Gazete 20.06.2007, sayı 26558 – Ayar Evlerinin Standartları Hakkında Tebliğ, md. 12 (ayar–milyem tablosu)',
      url: 'https://www.resmigazete.gov.tr/eskiler/2007/06/20070620.htm',
    },
    {
      label: 'Tebliğ metni (Alomaliye arşivi) – md. 12: 8=333, 9=375, 10=416, 14=583, 18=750, 21=875, 22=916',
      url: 'https://www.alomaliye.com/2007/06/20/kiymetli-maden-ve-tas-analizinde-yetki-verilecek-ayar-evlerinin-standartlari-secimi-ve-denetim-esaslarinin-belirlenmesine-iliskin-teblig/',
    },
    {
      label: 'Darphane ve Damga Matbaası GM – Sorularla Cumhuriyet Altını (külçe altın 995/1000, 24 ayar)',
      url: 'https://ms.hmb.gov.tr/uploads/sites/7/2021/05/Sorularla_Cumhuriyet_Altini.pdf',
    },
  ],
  note: 'Tebliğdeki tolerans ±0,002’dir (22 ayar için 914–918 milyem). Kuyumcular hesapta çoğunlukla bu milyem değerlerini kullanır.',
};

export function ayarKaydi(kod: string): AyarKaydi | undefined {
  return altinAyarlari.values.ayarlar.find((a) => a.kod === kod);
}

/** Ayar koduna karşılık gelen milyem (binde); bilinmiyorsa undefined. */
export function milyemOf(kod: string): number | undefined {
  return ayarKaydi(kod)?.milyem;
}

/** Kuyumcu terimi: milyem → "22 ayar" gibi okunur ad. */
export function ayarEtiketi(a: AyarKaydi): string {
  if (a.kod === '24') return '24 ayar (saf / has altın)';
  if (a.kod === '24-995') return '24 ayar (995 milyem, külçe / gram altın)';
  if (a.kod === '14') return '14 ayar (583 milyem)';
  if (a.kod === '14-585') return '14 ayar (585 damgalı)';
  return `${a.ayar} ayar (${a.milyem} milyem)`;
}
