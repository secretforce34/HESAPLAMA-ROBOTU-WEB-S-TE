import { altin, doviz, tufe } from '../../data/series';
import { round2 } from '../../lib/finance';

// Geçmiş veriye dayalı karşılaştırma. Fiyatlar ay sonu değeridir (altında aylık ortalama ons × ay sonu kur).

export type Varlik = 'tl' | 'usd' | 'eur' | 'altin';
export type Mod = 'tek' | 'duzenli';

const fiyatlar: Record<Exclude<Varlik, 'tl'>, Map<string, number>> = {
  usd: new Map(doviz.aylar.map((a) => [a.ay, a.usd])),
  eur: new Map(doviz.aylar.map((a) => [a.ay, a.eur])),
  altin: new Map(altin.aylar.map((a) => [a.ay, a.gramTl])),
};
const tufeEndeks = new Map(tufe.aylar.map((a) => [a.ay, a.endeks]));

export const VARLIK_ADI: Record<Varlik, string> = {
  tl: 'TL (yastık altı)',
  usd: 'ABD doları',
  eur: 'Euro',
  altin: 'Gram altın',
};

/** Tüm serilerde ortak verisi olan ilk ve son ay */
export const ILK_AY = [doviz.ilkAy, altin.ilkAy, tufe.ilkAy].sort().at(-1)!;
export const SON_AY = [doviz.sonAy, altin.sonAy, tufe.sonAy].sort()[0];

export function fiyat(v: Varlik, ay: string): number | null {
  if (v === 'tl') return 1;
  return fiyatlar[v].get(ay) ?? null;
}

function aylarArasi(bas: string, bit: string): string[] {
  const out: string[] = [];
  let [y, m] = bas.split('-').map(Number);
  const [by, bm] = bit.split('-').map(Number);
  while (y < by || (y === by && m <= bm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export interface VarlikSonucu {
  varlik: Varlik;
  /** Toplam yatırılan TL */
  yatirilan: number;
  /** Bitiş ayındaki değeri (TL) */
  deger: number;
  /** Alınan birim (dolar, euro, gram) */
  birim: number;
  nominalGetiri: number;
  /** TÜFE'ye göre reel getiri (%) */
  reelGetiri: number;
}

export interface KarsilastirmaSonucu {
  sonuclar: VarlikSonucu[];
  /** Yatırılan tutarın bitiş ayındaki enflasyona göre karşılığı (alım gücünü korumak için gereken) */
  enflasyonKarsiligi: number;
  aySayisi: number;
}

/**
 * Tek seferlik: başlangıç ayında tutar kadar alınır, bitiş ayında değerlenir.
 * Düzenli: başlangıçtan bitişe her ay tutar kadar alınır (son ay dahil).
 * Reel getiri = değer ÷ (yatırılanların bitiş ayı fiyatlarıyla karşılığı) − 1
 */
export function karsilastir(tutar: number, baslangic: string, bitis: string, mod: Mod): KarsilastirmaSonucu | null {
  const aylar = mod === 'tek' ? [baslangic] : aylarArasi(baslangic, bitis);
  const tBitis = tufeEndeks.get(bitis);
  if (!tBitis || aylar.some((a) => !tufeEndeks.get(a))) return null;

  const enflasyonKarsiligi = aylar.reduce((t, a) => t + tutar * (tBitis / tufeEndeks.get(a)!), 0);
  const yatirilan = tutar * aylar.length;
  const sonuclar: VarlikSonucu[] = [];
  for (const v of ['tl', 'usd', 'eur', 'altin'] as Varlik[]) {
    const pBitis = fiyat(v, bitis);
    if (pBitis === null) return null;
    let birim = 0;
    for (const a of aylar) {
      const p = fiyat(v, a);
      if (p === null) return null;
      birim += tutar / p;
    }
    const deger = birim * pBitis;
    sonuclar.push({
      varlik: v,
      yatirilan,
      deger: round2(deger),
      birim,
      nominalGetiri: (deger / yatirilan - 1) * 100,
      reelGetiri: (deger / enflasyonKarsiligi - 1) * 100,
    });
  }
  sonuclar.sort((a, b) => b.deger - a.deger);
  return { sonuclar, enflasyonKarsiligi: round2(enflasyonKarsiligi), aySayisi: aylar.length };
}

/** Grafik için: tek seferlik yatırımın her ay değeri */
export function degerSerisi(tutar: number, baslangic: string, bitis: string, v: Varlik): number[] {
  const p0 = fiyat(v, baslangic);
  if (p0 === null) return [];
  return aylarArasi(baslangic, bitis).map((a) => (tutar / p0) * (fiyat(v, a) ?? Number.NaN));
}

export function enflasyonSerisi(tutar: number, baslangic: string, bitis: string): number[] {
  const t0 = tufeEndeks.get(baslangic);
  if (!t0) return [];
  return aylarArasi(baslangic, bitis).map((a) => tutar * ((tufeEndeks.get(a) ?? Number.NaN) / t0));
}

export function ayListesi(bas: string, bit: string) {
  return aylarArasi(bas, bit);
}
