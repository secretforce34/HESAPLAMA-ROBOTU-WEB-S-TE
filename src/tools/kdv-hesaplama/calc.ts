import { round2 } from '../../lib/finance';

/** Girilen tutar KDV hariç mi (matrah) yoksa KDV dahil mi? */
export type KdvMode = 'haric' | 'dahil';

export interface KdvInput {
  amount: number;
  /** KDV oranı, yüzde olarak (20 = %20) */
  rate: number;
  mode: KdvMode;
  /** Tevkifat payı: 0 = tevkifat yok, 2 = 2/10 … 10 = 10/10 (tam tevkifat) */
  tevkifat: number;
}

export interface KdvResult {
  /** KDV hariç tutar (matrah) */
  matrah: number;
  /** Hesaplanan KDV */
  kdv: number;
  /** KDV dahil toplam */
  toplam: number;
  /** Alıcının keseceği (tevkif edeceği) KDV */
  tevkifEdilen: number;
  /** Satıcının tahsil edeceği KDV */
  tahsilEdilecekKdv: number;
  /** Alıcının satıcıya ödeyeceği tutar (matrah + tahsil edilecek KDV) */
  odenecekToplam: number;
}

export function validateKdv(input: Partial<KdvInput>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.amount === undefined || input.amount === null || Number.isNaN(input.amount)) errors.amount = 'Bir tutar girin.';
  else if (input.amount < 0) errors.amount = 'Tutar negatif olamaz.';
  if (input.rate === undefined || input.rate === null || Number.isNaN(input.rate)) errors.rate = 'Bir KDV oranı girin.';
  else if (input.rate < 0 || input.rate > 100) errors.rate = 'Oran %0 ile %100 arasında olmalı.';
  return errors;
}

/**
 * Faturada olduğu gibi kuruş yuvarlamasıyla hesaplar.
 * KDV dahil tutardan geriye hesapta matrah yuvarlanır, KDV farktan bulunur;
 * böylece matrah + KDV her zaman girilen tutara tam eşit olur.
 */
export function hesaplaKdv({ amount, rate, mode, tevkifat }: KdvInput): KdvResult {
  const r = rate / 100;
  let matrah: number;
  let kdv: number;
  if (mode === 'haric') {
    matrah = round2(amount);
    kdv = round2(matrah * r);
  } else {
    const toplamGirilen = round2(amount);
    matrah = round2(toplamGirilen / (1 + r));
    kdv = round2(toplamGirilen - matrah);
  }
  const toplam = round2(matrah + kdv);
  const tevkifEdilen = tevkifat > 0 ? round2((kdv * tevkifat) / 10) : 0;
  const tahsilEdilecekKdv = round2(kdv - tevkifEdilen);
  const odenecekToplam = round2(matrah + tahsilEdilecekKdv);
  return { matrah, kdv, toplam, tevkifEdilen, tahsilEdilecekKdv, odenecekToplam };
}
