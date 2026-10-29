import { aySayisi, tufe, type TufeAy } from '../../data/series';
import { round2 } from '../../lib/finance';

const endeksMap = new Map<string, TufeAy>(tufe.aylar.map((a) => [a.ay, a]));

/** Ayın fiyat düzeyi (zincirleme endeks). Veri yoksa null. */
export function endeks(ay: string): number | null {
  return endeksMap.get(ay)?.endeks ?? null;
}

export const ILK_AY = tufe.aylar[0].ay;
export const SON_AY = tufe.sonAy;

export interface EnflasyonSonucu {
  /** Başlangıç ayındaki tutarın bitiş ayındaki karşılığı */
  karsilik: number;
  /** İki ay arası toplam (kümülatif) fiyat artışı (%) */
  kumulatif: number;
  /** Yıllık bileşik ortalama enflasyon (%) */
  yillikOrtalama: number;
  /** Başlangıçtaki paranın kaybettiği alım gücü (%) */
  alimGucuKaybi: number;
  /** Fiyatların kaç katına çıktığı */
  kat: number;
  aySayisi: number;
}

/**
 * Bir ayın fiyatlarıyla verilen tutarın başka bir aydaki karşılığı:
 *   karşılık = tutar × endeks(bitiş) ÷ endeks(başlangıç)
 * Endeks ay sonu fiyat düzeyini temsil eder (ilgili ayın TÜFE değişimi dahil).
 */
export function enflasyonla(tutar: number, baslangic: string, bitis: string): EnflasyonSonucu | null {
  const a = endeks(baslangic);
  const b = endeks(bitis);
  if (a === null || b === null) return null;
  const kat = b / a;
  const n = aySayisi(baslangic, bitis);
  return {
    karsilik: round2(tutar * kat),
    kumulatif: (kat - 1) * 100,
    yillikOrtalama: n !== 0 ? (Math.pow(kat, 12 / n) - 1) * 100 : 0,
    alimGucuKaybi: (1 - 1 / kat) * 100,
    kat,
    aySayisi: n,
  };
}

/** Grafik için: başlangıçtan bitişe her ay 1 TL'nin karşılığı */
export function seriAraligi(baslangic: string, bitis: string): { ay: string; deger: number }[] {
  const a = endeks(baslangic);
  if (a === null) return [];
  const [ilk, son] = baslangic <= bitis ? [baslangic, bitis] : [bitis, baslangic];
  return tufe.aylar.filter((x) => x.ay >= ilk && x.ay <= son).map((x) => ({ ay: x.ay, deger: x.endeks / a }));
}

export function validateAy(ay: string): string | undefined {
  if (!/^\d{4}-\d{2}$/.test(ay)) return 'Bir ay seçin.';
  if (ay < ILK_AY || ay > SON_AY) return `Veri ${ILK_AY} ile ${SON_AY} arasında mevcut.`;
  return undefined;
}
