import type { ParamSet } from './types';

export const kdvOranlari: ParamSet<{
  /** Yürürlükteki KDV oranları (%) */
  oranlar: number[];
  /** Genel oran (%) */
  genelOran: number;
  /** Kısmi/tam tevkifat payları: 2 → 2/10, 10 → 10/10 (tam tevkifat) */
  tevkifatPaylari: number[];
}> = {
  id: 'kdv-oranlari',
  title: 'KDV oranları',
  validFrom: '2023-07-10',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    oranlar: [1, 10, 20],
    genelOran: 20,
    tevkifatPaylari: [2, 3, 4, 5, 7, 9, 10],
  },
  sources: [
    {
      label: '3065 sayılı Katma Değer Vergisi Kanunu (md. 9 tevkifat, md. 28 oranlar)',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3065&MevzuatTur=1&MevzuatTertip=5',
    },
    {
      label: 'Resmî Gazete 07.07.2023 – 7346 sayılı Cumhurbaşkanı Kararı (genel oran %20, indirimli oran %10)',
      url: 'https://www.resmigazete.gov.tr/eskiler/2023/07/20230707.htm',
    },
  ],
};
