import type { ParamSet } from './types';

export interface KidemTavaniDonemi {
  from: string;
  to: string;
  /** Bir hizmet yılı için ödenebilecek en yüksek kıdem tazminatı (TL) */
  tavan: number;
}

/**
 * Kıdem tazminatı tavanı (1475 s. Kanun md. 14/13): en yüksek devlet memuruna bir hizmet yılı için
 * ödenecek azami emeklilik ikramiyesi. Memur katsayılarıyla birlikte Ocak ve Temmuz'da değişir.
 * Tazminat, iş sözleşmesinin sona erdiği tarihteki tavana göre hesaplanır.
 */
export const kidemTavani: ParamSet<{ donemler: KidemTavaniDonemi[] }> = {
  id: 'kidem-tavani',
  title: 'Kıdem tazminatı tavanı',
  validFrom: '2024-01-01',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-29',
  values: {
    donemler: [
      { from: '2024-01-01', to: '2024-06-30', tavan: 35058.58 },
      { from: '2024-07-01', to: '2024-12-31', tavan: 41828.42 },
      { from: '2025-01-01', to: '2025-06-30', tavan: 46655.43 },
      { from: '2025-07-01', to: '2025-12-31', tavan: 53919.68 },
      { from: '2026-01-01', to: '2026-06-30', tavan: 64948.77 },
      { from: '2026-07-01', to: '2026-12-31', tavan: 73729.87 },
    ],
  },
  sources: [
    {
      label: 'ÇSGB – Kıdem tazminatı tavan miktarları (1980–2026)',
      url: 'https://www.csgb.gov.tr/%C4%B1statistikler/calisma-hayati-%C4%B1statistikleri/kidem-tazminati-tavan-miktari/',
    },
    {
      label: 'ÇSGB – 01.07.2026 itibarıyla kıdem tazminatı tavanı hesabı (PDF)',
      url: 'https://www.csgb.gov.tr/Media/5vuhphpb/k%C4%B1dem-tazminat%C4%B1-2026_temmuz-d%C3%B6nem.pdf',
    },
    {
      label: '1475 sayılı İş Kanunu md. 14 (kıdem tazminatı)',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=1475&MevzuatTur=1&MevzuatTertip=5',
    },
  ],
  note: 'Tavan, sözleşmenin sona erdiği tarihe göre uygulanır; ödeme tarihinin önemi yoktur.',
};

/** Verilen tarihteki tavan dönemi; tarih listede yoksa null. */
export function kidemTavaniOn(isoDate: string): KidemTavaniDonemi | null {
  return kidemTavani.values.donemler.find((d) => isoDate >= d.from && isoDate <= d.to) ?? null;
}
