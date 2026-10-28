import type { ParamSet } from './types';

export interface PekDonemi {
  from: string;
  to: string;
  /** Prime esas kazanç aylık alt sınırı (TL) — brüt asgari ücrete eşittir */
  aylikAlt: number;
  /** Prime esas kazanç aylık üst sınırı / "SGK tavanı" (TL) */
  aylikUst: number;
  /** Üst sınırın alt sınıra oranı (2026'dan itibaren 9; önceden 7,5) */
  ustCarpan: number;
}

/**
 * Prime esas kazanç (PEK) alt ve üst sınırları — özel sektör, aylık.
 * 7566 sayılı Kanun md. 24 ile üst sınır 1 Ocak 2026'dan itibaren alt sınırın 9 katıdır.
 */
export const sgkSinirlar: ParamSet<{ donemler: PekDonemi[] }> = {
  id: 'sgk-pek-sinirlari',
  title: 'SGK prime esas kazanç alt/üst sınırları',
  validFrom: '2024-01-01',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-29',
  values: {
    donemler: [
      { from: '2024-01-01', to: '2024-12-31', aylikAlt: 20002.5, aylikUst: 150018.9, ustCarpan: 7.5 },
      { from: '2025-01-01', to: '2025-12-31', aylikAlt: 26005.5, aylikUst: 195041.4, ustCarpan: 7.5 },
      { from: '2026-01-01', to: '2026-12-31', aylikAlt: 33030, aylikUst: 297270, ustCarpan: 9 },
    ],
  },
  sources: [
    {
      label: 'SGK 2026/2 sayılı Genelge (07.01.2026) – 2026 yılı PEK alt ve üst sınırları',
      url: 'https://www.alomaliye.com/2026/01/08/sgk-genelgesi-2026-2/',
    },
    {
      label: 'KPMG – Sosyal güvenlik primine esas kazanç taban ve tavan ücretleri',
      url: 'https://kpmgvergi.com/pratik-bilgiler/4/1',
    },
  ],
  note: 'Öğrenci ve çıraklar için 2026 aylık üst sınır 99.090 TL’dir.',
};

export function pekSinirlariOn(isoDate: string): PekDonemi {
  const list = sgkSinirlar.values.donemler;
  const found = list.find((d) => isoDate >= d.from && isoDate <= d.to);
  if (found) return found;
  return isoDate < list[0].from ? list[0] : list[list.length - 1];
}
