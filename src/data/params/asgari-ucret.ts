import type { ParamSet } from './types';

export interface AsgariUcretDonemi {
  /** Dönem başlangıcı (ISO) */
  from: string;
  /** Dönem sonu (ISO) */
  to: string;
  /** Aylık brüt asgari ücret (TL) */
  brut: number;
  /** Aylık net asgari ücret (TL, bekâr ve çocuksuz işçi için) */
  net: number;
}

/**
 * Asgari ücret dönemleri (eskiden yeniye). Yeni dönem eklenince listenin sonuna eklenir
 * ve validTo güncellenir. 2026 yılında Temmuz'da ara artış yapılmadı.
 */
export const asgariUcret: ParamSet<{ donemler: AsgariUcretDonemi[] }> = {
  id: 'asgari-ucret',
  title: 'Asgari ücret (2024–2026)',
  validFrom: '2024-01-01',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-29',
  values: {
    donemler: [
      { from: '2024-01-01', to: '2024-12-31', brut: 20002.5, net: 17002.12 },
      { from: '2025-01-01', to: '2025-12-31', brut: 26005.5, net: 22104.67 },
      { from: '2026-01-01', to: '2026-12-31', brut: 33030, net: 28075.5 },
    ],
  },
  sources: [
    {
      label: 'Çalışma ve Sosyal Güvenlik Bakanlığı – Asgari ücretin net hesabı ve işverene maliyeti',
      url: 'https://www.csgb.gov.tr/poco-pages/asgari-ucret/',
    },
    {
      label: 'ÇSGB – 2026 asgari ücret hesap tablosu (PDF)',
      url: 'https://www.csgb.gov.tr/Media/gm2fekds/asgari-%C3%BCcret-2026.pdf',
    },
  ],
};

/** Verilen tarihte geçerli asgari ücret dönemi; tarih listenin dışındaysa en yakın dönem döner. */
export function asgariUcretOn(isoDate: string): AsgariUcretDonemi {
  const list = asgariUcret.values.donemler;
  const found = list.find((d) => isoDate >= d.from && isoDate <= d.to);
  if (found) return found;
  return isoDate < list[0].from ? list[0] : list[list.length - 1];
}
