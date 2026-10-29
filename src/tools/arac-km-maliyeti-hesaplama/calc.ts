import { round2 } from '../../lib/finance';

export type Yakit = 'benzin' | 'dizel' | 'lpg' | 'elektrik';

export const YAKIT_BIRIM: Record<Yakit, { tuketim: string; fiyat: string; miktar: string }> = {
  benzin: { tuketim: 'L/100 km', fiyat: 'TL/L', miktar: 'litre' },
  dizel: { tuketim: 'L/100 km', fiyat: 'TL/L', miktar: 'litre' },
  lpg: { tuketim: 'L/100 km', fiyat: 'TL/L', miktar: 'litre' },
  elektrik: { tuketim: 'kWh/100 km', fiyat: 'TL/kWh', miktar: 'kWh' },
};

/** Elektrikli araçta evde ve dışarıda şarjın ağırlıklı birim fiyatı */
export function sarjFiyati(ev: number, disari: number, evOraniYuzde: number): number {
  const p = Math.min(100, Math.max(0, evOraniYuzde)) / 100;
  return ev * p + disari * (1 - p);
}

/** Kilometre başına enerji maliyeti (TL/km) */
export function yakitKmBasina(tuketim100: number, birimFiyat: number): number {
  return (tuketim100 / 100) * birimFiyat;
}

export interface Gider {
  ad: string;
  tutar: number;
  donem: 'aylik' | 'yillik';
}

export interface MaliyetInput {
  yillikKm: number;
  tuketim100: number;
  birimFiyat: number;
  giderler: Gider[];
  aracDegeri: number;
  /** Yıllık değer kaybı (%) */
  degerKaybi: number;
}

export interface MaliyetKalemi {
  ad: string;
  yillik: number;
  kmBasina: number;
}

export interface MaliyetSonucu {
  kalemler: MaliyetKalemi[];
  yakitYillik: number;
  yillik: number;
  aylik: number;
  kmBasina: number;
  yakitKmBasina: number;
  /** Yılda harcanan yakıt veya elektrik miktarı (L ya da kWh) */
  yillikMiktar: number;
}

export function hesaplaMaliyet(i: MaliyetInput): MaliyetSonucu {
  const yKm = yakitKmBasina(i.tuketim100, i.birimFiyat);
  const kalem = (ad: string, yillik: number): MaliyetKalemi => ({ ad, yillik: round2(yillik), kmBasina: i.yillikKm > 0 ? yillik / i.yillikKm : 0 });
  const kalemler = [kalem('Yakıt / enerji', yKm * i.yillikKm)];
  for (const g of i.giderler) if (g.tutar > 0) kalemler.push(kalem(g.ad || 'Diğer', g.donem === 'aylik' ? g.tutar * 12 : g.tutar));
  if (i.aracDegeri > 0 && i.degerKaybi > 0) kalemler.push(kalem('Değer kaybı', (i.aracDegeri * i.degerKaybi) / 100));
  const yillik = round2(kalemler.reduce((t, k) => t + k.yillik, 0));
  return {
    kalemler,
    yakitYillik: kalemler[0].yillik,
    yillik,
    aylik: round2(yillik / 12),
    kmBasina: i.yillikKm > 0 ? yillik / i.yillikKm : 0,
    yakitKmBasina: yKm,
    yillikMiktar: (i.tuketim100 / 100) * i.yillikKm,
  };
}

export interface YolculukInput {
  /** Tek yön mesafe (km) */
  mesafe: number;
  gidisDonus: boolean;
  tuketim100: number;
  birimFiyat: number;
  /** Otoyol, köprü, otopark gibi toplam ücretler */
  ucretler: number;
  kisi: number;
}

export interface YolculukSonucu {
  km: number;
  miktar: number;
  yakit: number;
  toplam: number;
  kisiBasi: number;
}

export function hesaplaYolculuk(i: YolculukInput): YolculukSonucu {
  const km = i.mesafe * (i.gidisDonus ? 2 : 1);
  const miktar = (i.tuketim100 / 100) * km;
  const yakit = round2(miktar * i.birimFiyat);
  const toplam = round2(yakit + i.ucretler);
  return { km, miktar, yakit, toplam, kisiBasi: round2(toplam / Math.max(1, i.kisi)) };
}

/** İki yakıt arasında başabaş kilometre: dönüşüm maliyeti ÷ km başına tasarruf (ör. LPG dönüşümü). */
export function donusumBasabasKm(maliyet: number, eskiKmBasina: number, yeniKmBasina: number): number | null {
  const tasarruf = eskiKmBasina - yeniKmBasina;
  if (tasarruf <= 0) return null;
  return Math.ceil(maliyet / tasarruf);
}

export function validateYakit(i: { tuketim: number | null; fiyat: number | null }) {
  const e: Record<string, string> = {};
  if (i.tuketim === null || i.tuketim <= 0 || i.tuketim > 100) e.tuketim = '0 ile 100 arasında olmalı.';
  if (i.fiyat === null || i.fiyat <= 0) e.fiyat = 'Birim fiyatı girin.';
  return e;
}
