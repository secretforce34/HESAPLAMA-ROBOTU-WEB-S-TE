import { tufe } from '../../data/series';
import { round2 } from '../../lib/finance';

// Kişisel enflasyon: aynı harcama sepetinin bugünkü tutarı ÷ bir yıl önceki tutarı − 1.
// Her kalemin ağırlığı bir yıl önceki bütçedeki payıdır (TÜİK'in Laspeyres yöntemiyle aynı mantık).

export interface Kalem {
  ad: string;
  /** Bir yıl önce aynı şey için ödenen aylık tutar */
  once: number;
  /** Bugün ödenen aylık tutar */
  simdi: number;
}

export interface KalemSonucu extends Kalem {
  /** Kalemin fiyat artışı (%) */
  artis: number;
  /** Bir yıl önceki bütçedeki payı (%) */
  pay: number;
  /** Kişisel enflasyona katkısı (yüzde puan) */
  katki: number;
}

export interface KisiselSonuc {
  toplamOnce: number;
  toplamSimdi: number;
  /** Kişisel yıllık enflasyon (%) */
  oran: number;
  kalemler: KalemSonucu[];
}

/** Artış oranı verilen kalemin bir yıl önceki tutarı */
export function onceTutar(simdi: number, artisYuzde: number): number {
  return simdi / (1 + artisYuzde / 100);
}

export function kisiselEnflasyon(kalemler: Kalem[]): KisiselSonuc | null {
  const gecerli = kalemler.filter((k) => k.once > 0 && k.simdi >= 0);
  const toplamOnce = gecerli.reduce((t, k) => t + k.once, 0);
  const toplamSimdi = gecerli.reduce((t, k) => t + k.simdi, 0);
  if (toplamOnce <= 0) return null;
  return {
    toplamOnce: round2(toplamOnce),
    toplamSimdi: round2(toplamSimdi),
    oran: (toplamSimdi / toplamOnce - 1) * 100,
    kalemler: gecerli.map((k) => ({
      ...k,
      artis: (k.simdi / k.once - 1) * 100,
      pay: (k.once / toplamOnce) * 100,
      katki: ((k.simdi - k.once) / toplamOnce) * 100,
    })),
  };
}

export interface GelirSonucu {
  /** Gelirin nominal artışı (%) */
  nominalArtis: number;
  /** Kişisel enflasyona göre reel değişim (%) */
  reelDegisim: number;
  /** Alım gücünü korumak için bugün olması gereken gelir */
  gereken: number;
}

export function gelirKarsilastir(gelirOnce: number, gelirSimdi: number, enflasyon: number): GelirSonucu {
  const k = 1 + enflasyon / 100;
  return {
    nominalArtis: (gelirSimdi / gelirOnce - 1) * 100,
    reelDegisim: (gelirSimdi / gelirOnce / k - 1) * 100,
    gereken: round2(gelirOnce * k),
  };
}

/** TÜİK'in açıkladığı son yıllık TÜFE */
export const resmi = { ay: tufe.aylar[tufe.aylar.length - 1].ay, yillik: tufe.aylar[tufe.aylar.length - 1].yillik };

export function validateKalemler(kalemler: { simdi: number | null; once: number | null }[]): string | null {
  if (!kalemler.some((k) => (k.simdi ?? 0) > 0)) return 'En az bir harcama kalemi girin.';
  for (const k of kalemler) {
    if (k.simdi === null && k.once === null) continue;
    if (k.simdi === null || k.simdi < 0) return 'Bugünkü tutarlar 0 veya daha büyük olmalı.';
    if (k.once === null || k.once <= 0) return 'Bir yıl önceki tutar (veya artış oranı) her kalem için girilmeli.';
  }
  return null;
}
