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

export interface TevkifatSiniriDonemi {
  from: string;
  to: string;
  /** KDV dahil tutar bu sınırı AŞARSA kısmi tevkifat uygulanır (eşitse uygulanmaz). */
  tutar: number;
}

/**
 * Kısmi KDV tevkifatı tutar sınırı. 1 Mart 2024'ten itibaren (KDV GUT Sıra No: 50)
 * VUK md. 232'deki fatura düzenleme sınırına bağlıdır; her yıl yeniden değerlenir.
 * Sınır, tam tevkifatta (10/10) aranmaz.
 */
export const kismiTevkifatSiniri: ParamSet<{ donemler: TevkifatSiniriDonemi[] }> = {
  id: 'kismi-tevkifat-siniri',
  title: 'Kısmi KDV tevkifatı tutar sınırı',
  validFrom: '2025-01-01',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-29',
  values: {
    donemler: [
      { from: '2025-01-01', to: '2025-12-31', tutar: 9900 },
      { from: '2026-01-01', to: '2026-12-31', tutar: 12000 },
    ],
  },
  sources: [
    {
      label: '588 Sıra No.lu VUK Genel Tebliği – 2026 fatura düzenleme sınırı 12.000 TL (özet: Hellac)',
      url: 'https://www.hellac.com/blogdetay/2026-yili-tevkifatli-fatura-duzenleme-siniri-12-bin-tl-oldu',
    },
  ],
  note: 'Sınır, aynı işleme ait bedellerin toplamına göre değerlendirilir; iş birden fazla faturaya bölünse de toplam esas alınır.',
};

export function tevkifatSiniriOn(isoDate: string): TevkifatSiniriDonemi {
  const list = kismiTevkifatSiniri.values.donemler;
  const found = list.find((d) => isoDate >= d.from && isoDate <= d.to);
  if (found) return found;
  return isoDate < list[0].from ? list[0] : list[list.length - 1];
}
