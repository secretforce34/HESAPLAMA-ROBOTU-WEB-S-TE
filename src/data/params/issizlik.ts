import type { ParamSet } from './types';

/** 4447 sayılı İşsizlik Sigortası Kanunu md. 50–51 — kanunla belirlenmiş sabit oranlar ve süreler. */
export const issizlikKurallari: ParamSet<{
  /** Günlük ödenek = son 4 aylık PEK günlük ortalamasının bu oranı (%) */
  odenekOrani: number;
  /** Ödenek, aylık brüt asgari ücretin bu oranını geçemez (%) */
  tavanOrani: number;
  /** Ödenekten yalnızca damga vergisi kesilir (binde 7,59) */
  damgaVergisi: number;
  /** Son 3 yıldaki prim günü → ödeme süresi (gün) */
  sureler: { enAzGun: number; sure: number }[];
  /** İşten ayrılmadan önceki kesintisiz prim süresi şartı (gün) */
  kesintisizGun: number;
}> = {
  id: 'issizlik-kurallari',
  title: 'İşsizlik ödeneği oranları ve süreleri',
  validFrom: '2008-05-26',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    odenekOrani: 40,
    tavanOrani: 80,
    damgaVergisi: 0.00759,
    sureler: [
      { enAzGun: 1080, sure: 300 },
      { enAzGun: 900, sure: 240 },
      { enAzGun: 600, sure: 180 },
    ],
    kesintisizGun: 120,
  },
  sources: [
    {
      label: '4447 sayılı İşsizlik Sigortası Kanunu, md. 50 (hak ve süre), md. 51 (hak kazanma), md. 48',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4447&MevzuatTur=1&MevzuatTertip=5',
    },
  ],
  note: 'Tavan, ödemenin yapıldığı dönemdeki brüt asgari ücrete göre hesaplanır; asgari ücret değişince tavan da değişir.',
};

export function issizlikSuresi(primGun: number): number {
  return issizlikKurallari.values.sureler.find((s) => primGun >= s.enAzGun)?.sure ?? 0;
}
