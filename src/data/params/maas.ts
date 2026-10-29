import type { ParamSet } from './types';

/**
 * Gelir vergisi tarifesinin bir dilimi: önceki dilimin üst sınırından `ust` TL'ye kadar olan kısım
 * `oran` (%) ile vergilenir. Son dilimde `ust` = null (sınırsız).
 */
export interface GvDilimi {
  ust: number | null;
  oran: number;
}

/** 5510 s. Kanun md. 81/1-ı ve geçici md. 108: işveren MYÖ hissesinin Hazinece karşılanan puanı */
export interface HazineDestegiDonemi {
  from: string;
  to: string;
  /** İmalat dışındaki (genel) özel sektör işverenleri için puan */
  genel: number;
  /** İmalat sektöründeki işverenler için puan */
  imalat: number;
}

export interface MaasYili {
  yil: number;
  /** GVK md. 103 — ücret gelirleri tarifesi (kümülatif matraha uygulanır) */
  ucretTarifesi: GvDilimi[];
  /** GVK md. 31 — aylık engellilik indirimi: [1. derece, 2. derece, 3. derece] (TL) */
  engellilikIndirimi: [number, number, number];
  /** SGK işçi payı (%): MYÖ işçi %9 + GSS işçi %5 (5510 md. 81/1-a, f) */
  sgkIsciOrani: number;
  /** İşsizlik sigortası işçi payı (%) — 4447 md. 49 */
  issizlikIsciOrani: number;
  /** İndirimsiz işveren SGK payı (%): kısa vadeli %2,25 + MYÖ işveren + GSS işveren %7,5 */
  sgkIsverenOrani: number;
  /** İşsizlik sigortası işveren payı (%) — 4447 md. 49 */
  issizlikIsverenOrani: number;
  hazineDestegi: HazineDestegiDonemi[];
  /** Sosyal güvenlik destek primi işçi payı (%) — 5510 geçici md. 14/a: %30'un dörtte biri */
  sgdpIsciOrani: number;
  /** SGDP işveren payı (%): %30'un dörtte üçü (%22,5) + kısa vadeli sigorta kolları %2,25 */
  sgdpIsverenOrani: number;
  /** Ücret ödemelerinde damga vergisi (binde) — DVK (1) sayılı tablo IV-1-b */
  damgaVergisiBinde: number;
}

/**
 * Ücretlerin vergilendirilmesi ve sigorta primi oranları. Her yıl Ocak'ta yeni yıl eklenir
 * (yeni GV tarifesi Aralık sonunda Resmî Gazete'de yayımlanır).
 */
export const maasParametreleri: ParamSet<{ yillar: MaasYili[] }> = {
  id: 'maas-vergi-prim',
  title: 'Ücret vergisi tarifesi ve SGK prim oranları (2025–2026)',
  validFrom: '2025-01-01',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-29',
  values: {
    yillar: [
      {
        yil: 2025,
        // GV Genel Tebliği Seri No: 329 (RG 30.12.2024, 32768 2. mük.)
        ucretTarifesi: [
          { ust: 158000, oran: 15 },
          { ust: 330000, oran: 20 },
          { ust: 1200000, oran: 27 },
          { ust: 4300000, oran: 35 },
          { ust: null, oran: 40 },
        ],
        engellilikIndirimi: [9900, 5700, 2400],
        sgkIsciOrani: 14,
        issizlikIsciOrani: 1,
        // 2025: kısa vadeli 2,25 + MYÖ işveren 11 + GSS 7,5 = 20,75 (ÇSGB 2025 tablosu dipnotu)
        sgkIsverenOrani: 20.75,
        issizlikIsverenOrani: 2,
        hazineDestegi: [
          { from: '2025-01-01', to: '2025-01-31', genel: 5, imalat: 5 },
          // 7538 s. Kanun: 1.2.2025'ten itibaren imalat dışı 4 puan, imalat 5 puan (geçici md. 108)
          { from: '2025-02-01', to: '2025-12-31', genel: 4, imalat: 5 },
        ],
        sgdpIsciOrani: 7.5,
        sgdpIsverenOrani: 24.75,
        damgaVergisiBinde: 7.59,
      },
      {
        yil: 2026,
        // GV Genel Tebliği Seri No: 332 (RG 31.12.2025, 33124 5. mük.) md. 3/3
        ucretTarifesi: [
          { ust: 190000, oran: 15 },
          { ust: 400000, oran: 20 },
          { ust: 1500000, oran: 27 },
          { ust: 5300000, oran: 35 },
          { ust: null, oran: 40 },
        ],
        engellilikIndirimi: [12000, 7000, 3000],
        sgkIsciOrani: 14,
        issizlikIsciOrani: 1,
        // 7566 s. Kanun md. 23: MYÖ işveren hissesi %11 → %12 (1.1.2026). 2,25 + 12 + 7,5 = 21,75
        sgkIsverenOrani: 21.75,
        issizlikIsverenOrani: 2,
        // 7566 s. Kanun: 81/1-ı'da "dört" → "iki"; imalatta geçici md. 108 ile 5 puan (31.12.2026'ya kadar)
        hazineDestegi: [{ from: '2026-01-01', to: '2026-12-31', genel: 2, imalat: 5 }],
        sgdpIsciOrani: 7.5,
        sgdpIsverenOrani: 24.75,
        damgaVergisiBinde: 7.59,
      },
    ],
  },
  sources: [
    {
      label: 'Resmî Gazete 31.12.2025 – GV Genel Tebliği (Seri No: 332): 2026 tarifesi ve engellilik indirimi',
      url: 'https://www.resmigazete.gov.tr/eskiler/2025/12/20251231M5-30.pdf',
    },
    {
      label: 'Resmî Gazete 30.12.2024 – GV Genel Tebliği (Seri No: 329): 2025 tarifesi ve engellilik indirimi',
      url: 'https://www.resmigazete.gov.tr/eskiler/2024/12/20241230M2-12.htm',
    },
    {
      label: '5510 sayılı Kanun md. 81 (prim oranları, Hazine desteği), md. 82, geçici md. 14 ve 108',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5510&MevzuatTur=1&MevzuatTertip=5',
    },
    {
      label: '4447 sayılı İşsizlik Sigortası Kanunu md. 49 (%1 işçi, %2 işveren)',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4447&MevzuatTur=1&MevzuatTertip=5',
    },
    {
      label: '193 sayılı Gelir Vergisi Kanunu md. 23/18 (asgari ücret istisnası), 31, 63, 103',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=193&MevzuatTur=1&MevzuatTertip=4',
    },
    {
      label: '488 sayılı Damga Vergisi Kanunu, (1) sayılı tablo IV-1-b ve (2) sayılı tablo IV-34',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=488&MevzuatTur=1&MevzuatTertip=5',
    },
    {
      label: 'Resmî Gazete 27.01.2022 – GV Genel Tebliği (Seri No: 319): asgari ücret istisnasının uygulanması',
      url: 'https://www.resmigazete.gov.tr/eskiler/2022/01/20220127-5.pdf',
    },
    {
      label: 'ÇSGB – 2025 asgari ücret net hesabı ve işverene maliyeti (PDF)',
      url: 'https://www.csgb.gov.tr/Media/f4xjys1e/2025-asgari-%C3%BCcret_.pdf',
    },
  ],
  note: 'Hazine prim desteği 2026’da imalat dışı işverenlerde 2 puan, imalatta 5 puandır; 2025’te Ocak’ta 5, Şubat–Aralık’ta imalat dışında 4 puandı.',
};

export const MAAS_YILLARI: number[] = maasParametreleri.values.yillar.map((y) => y.yil);

/** İstenen yılın parametreleri; listede yoksa en yakın yıl döner. */
export function maasYili(yil: number): MaasYili {
  const list = maasParametreleri.values.yillar;
  const found = list.find((y) => y.yil === yil);
  if (found) return found;
  return yil < list[0].yil ? list[0] : list[list.length - 1];
}

/** Verilen tarihte geçerli Hazine prim desteği puanları (yoksa 0). */
export function hazineDestegiOn(isoDate: string): { genel: number; imalat: number } {
  const yil = maasYili(Number(isoDate.slice(0, 4)));
  const d = yil.hazineDestegi.find((x) => isoDate >= x.from && isoDate <= x.to);
  return d ? { genel: d.genel, imalat: d.imalat } : { genel: 0, imalat: 0 };
}
