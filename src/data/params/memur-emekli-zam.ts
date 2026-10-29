import type { ParamSet } from './types';

export interface ToplusozlesmeOrani {
  /** "2026-1" = Ocak–Haziran, "2026-2" = Temmuz–Aralık */
  donem: string;
  oran: number;
}

export interface AciklananZam {
  /** Zammın uygulandığı ay: "2026-01" ya da "2026-07" */
  ay: string;
  /** SSK ve Bağ-Kur emeklileri (6 aylık TÜFE) */
  emekli: number;
  /** Memur ve memur emeklileri (toplu sözleşme + enflasyon farkı) */
  memur: number;
}

/**
 * Memur maaş artışları (8. Dönem Toplu Sözleşme, Kamu Görevlileri Hakem Kurulu kararı) ve açıklanmış zam oranları.
 * SSK/Bağ-Kur emekli aylıkları her Ocak ve Temmuz'da önceki 6 ayın TÜFE artışı kadar artırılır (5510 md. 55).
 */
export const memurEmekliZam: ParamSet<{ toplusozlesme: ToplusozlesmeOrani[]; aciklanan: AciklananZam[] }> = {
  id: 'memur-emekli-zam',
  title: 'Toplu sözleşme oranları ve açıklanan emekli/memur zamları',
  validFrom: '2026-01-01',
  validTo: '2027-01-06',
  lastReviewed: '2026-10-29',
  values: {
    toplusozlesme: [
      { donem: '2025-2', oran: 5 },
      { donem: '2026-1', oran: 11 },
      { donem: '2026-2', oran: 7 },
      { donem: '2027-1', oran: 5 },
      { donem: '2027-2', oran: 4 },
    ],
    aciklanan: [
      { ay: '2026-01', emekli: 12.19, memur: 18.6 },
      { ay: '2026-07', emekli: 17.76, memur: 13.52 },
    ],
  },
  sources: [
    { label: 'ÇSGB – Kamu çalışanları ve emeklilerinin zam oranlarına ilişkin karar (8. Dönem, 2026–2027)', url: 'https://csgb.gov.tr/cgm/haberler/27082025/' },
    { label: '5510 sayılı Kanun md. 55 (aylıkların TÜFE ile artırılması)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5510&MevzuatTur=1&MevzuatTertip=5' },
    { label: 'Habertürk – Ocak–Haziran 2026 altı aylık TÜFE %17,76', url: 'https://www.haberturk.com/son-dakika-tuik-haziran-2026-enflasyon-oranlari-aciklandi-iste-6-aylik-enflasyon-farki-oranlari-3895673' },
    { label: 'Bigpara – Ocak 2026 emekli (%12,19) ve memur (%18,60) zammı', url: 'https://bigpara.hurriyet.com.tr/haberleri/emekli-maas-zammi-ocak-2026' },
  ],
  note: 'En düşük emekli aylığı (taban) yasa ile ayrıca belirlenir; zam, taban tutarın altındaki aylıklarda tabana tamamlanabilir.',
};
