import type { ParamSet } from './types';

export interface StopajDonemi {
  from: string;
  to: string;
  /** Vadesiz hesaplar ve 6 aya kadar vadeli TL mevduat (%) */
  altiAya: number;
  /** 1 yıla kadar vadeli (%) */
  birYila: number;
  /** 1 yıldan uzun vadeli (%) */
  uzun: number;
}

/**
 * TL mevduat faizi ve katılım bankası kâr payı stopajı (193 s. GVK geçici 67. madde, Cumhurbaşkanı Kararı).
 * Oran, hesabın açıldığı ya da vadesinin yenilendiği tarihte geçerli olan orandır; vade boyunca değişmez.
 */
export const mevduatStopaji: ParamSet<{ donemler: StopajDonemi[] }> = {
  id: 'mevduat-stopaj',
  title: 'TL mevduat faizi stopaj oranları',
  validFrom: '2025-07-09',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-31',
  values: {
    donemler: [{ from: '2025-07-09', to: '2026-12-31', altiAya: 17.5, birYila: 15, uzun: 10 }],
  },
  sources: [
    {
      label: 'Resmî Gazete 09.07.2025 – GVK geçici 67. maddedeki tevkifat oranları hakkında Karar (10041)',
      url: 'https://www.resmigazete.gov.tr/eskiler/2025/07/20250709-6.pdf',
    },
    {
      label: 'Resmî Gazete 20.06.2026 – Oranların süresi 31.12.2026’ya uzatıldı (Karar 11444)',
      url: 'https://www.resmigazete.gov.tr/eskiler/2026/06/20260620-4.pdf',
    },
    {
      label: 'Yöntem YMM 2026/041 – Vadesiz ve 6 aya kadar %17,5, 1 yıla kadar %15, 1 yıldan uzun %10 (özet, ikincil kaynak)',
      url: 'https://www.yontemymm.com.tr/mali-aciklamalar/2026-041-tl-mevduat-hesaplarinda-uygulanan-stopaj-oranlarinin-suresi-uzatildi',
    },
  ],
  note: 'Katılım bankalarındaki kâr payına da aynı oranlar uygulanır. Döviz ve altın hesaplarında oranlar farklıdır.',
};

/** Hesabın açıldığı tarihte geçerli stopaj dönemi (liste dışındaysa en yakın dönem). */
export function stopajDonemiOn(isoDate: string): StopajDonemi {
  const list = mevduatStopaji.values.donemler;
  const found = list.find((d) => isoDate >= d.from && isoDate <= d.to);
  if (found) return found;
  return isoDate < list[0].from ? list[0] : list[list.length - 1];
}
