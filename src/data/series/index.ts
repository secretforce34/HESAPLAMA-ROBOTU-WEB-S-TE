// Aylık veri serileri (scripts/veri/guncelle.mjs ile üretilir). Site derlenirken sayfaya gömülür.
import altinJson from './altin.json';
import dovizJson from './doviz.json';
import tufeJson from './tufe.json';
import type { ParamSet } from '../params/types';

export interface SeriDosyasi<T> {
  kaynak: string;
  kaynakUrl: string;
  birim: string;
  yontem: string;
  ilkAy: string;
  sonAy: string;
  olusturma: string;
  aylar: T[];
}

export interface TufeAy {
  ay: string;
  aylik: number;
  yillik: number;
  endeks: number;
}
export interface DovizAy {
  ay: string;
  tarih: string;
  usd: number;
  eur: number;
}
export interface AltinAy {
  ay: string;
  onsUsd: number;
  gramTl: number;
}

export const tufe = tufeJson as SeriDosyasi<TufeAy>;
export const doviz = dovizJson as SeriDosyasi<DovizAy>;
export const altin = altinJson as SeriDosyasi<AltinAy>;

export function ayEkle(ay: string, n: number): string {
  const [y, m] = ay.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

export function aySayisi(a: string, b: string): number {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

/**
 * Veri serisi için tazelik seti: TÜİK bir ayın verisini izleyen ayın 3'ünde açıklar.
 * Son veri ayından 2 ay sonraki ayın 6'sına kadar yeni veri eklenmemişse sitede uyarı çıkar.
 */
export function seriParamSet(seri: SeriDosyasi<unknown>, id: string, title: string): ParamSet<null> {
  return {
    id,
    title: `${title} (son veri: ${seri.sonAy})`,
    validFrom: `${seri.ilkAy}-01`,
    validTo: `${ayEkle(seri.sonAy, 2)}-06`,
    lastReviewed: seri.olusturma,
    values: null,
    sources: [{ label: seri.kaynak, url: seri.kaynakUrl }],
    note: seri.yontem,
  };
}

export const tufeSeti = seriParamSet(tufe, 'tufe-serisi', 'TÜFE aylık verisi');
export const dovizSeti = seriParamSet(doviz, 'doviz-serisi', 'USD ve EUR ay sonu kurları');
export const altinSeti = seriParamSet(altin, 'altin-serisi', 'Gram altın aylık serisi');
