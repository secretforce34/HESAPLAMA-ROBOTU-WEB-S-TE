import type { ParamSet } from './types';

export interface HakKazanmaDilimi {
  /** Sistemde geçen asgari süre (yıl) */
  yil: number;
  /** Hak kazanılan devlet katkısı oranı (%) */
  oran: number;
}

export const besKurallari: ParamSet<{
  /** Katılımcının ödediği katkı payına eklenen devlet katkısı (%) */
  devletKatkisiOrani: number;
  /** Takvim yılı içinde alınabilecek en yüksek devlet katkısı (TL): yıllık brüt asgari ücret × oran */
  yillikUstSinir: number;
  /** Emeklilik dışı ayrılmada hak kazanma oranları (büyükten küçüğe aranır) */
  hakKazanma: HakKazanmaDilimi[];
  /** Emeklilik hakkı: sistemde en az bu kadar yıl ve bu yaş */
  emeklilikYil: number;
  emeklilikYas: number;
  /** Katılımcı katkı payı getirisine uygulanan stopaj (%) */
  stopaj: { onYildanAz: number; onYilVeUzeri: number; emeklilik: number };
}> = {
  id: 'bes-devlet-katkisi',
  title: 'BES devlet katkısı, hak kazanma ve stopaj oranları',
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-29',
  values: {
    devletKatkisiOrani: 20,
    // 2026 brüt asgari ücret 33.030 × 12 × %20
    yillikUstSinir: 79_272,
    hakKazanma: [
      { yil: 10, oran: 60 },
      { yil: 6, oran: 35 },
      { yil: 3, oran: 15 },
    ],
    emeklilikYil: 10,
    emeklilikYas: 56,
    stopaj: { onYildanAz: 15, onYilVeUzeri: 10, emeklilik: 5 },
  },
  sources: [
    { label: 'Resmi Gazete 07.01.2026 – Devlet katkısı oranının %20 olarak belirlenmesi (1.1.2026’dan geçerli)', url: 'https://www.resmigazete.gov.tr/eskiler/2026/01/20260107.htm' },
    { label: 'Bloomberg HT – BES devlet katkısı %20’ye indirildi (yıllık üst sınır 79.272 TL)', url: 'https://www.bloomberght.com/bes-devlet-katkisi-yuzde-20-ye-indirildi-3765538' },
    { label: 'EY Türkiye – BES devlet katkısı, hak kazanma ve vergi oranları', url: 'https://www.ey.com/tr_tr/insights/tax/bes-devlet-katkisi-vergi-oranlari' },
    { label: '4632 sayılı Bireysel Emeklilik Tasarruf ve Yatırım Sistemi Kanunu, Ek md. 1', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4632&MevzuatTur=1&MevzuatTertip=5' },
  ],
  note: '1 Ocak 2026 öncesi ödenen katkı paylarına %30 devlet katkısı verilmişti. Yıllık üst sınır her yıl brüt asgari ücrete göre yenilenir. Vefat ve maluliyette devlet katkısının tamamı hak edilir.',
};
