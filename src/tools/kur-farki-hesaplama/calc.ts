import { round2 } from '../../lib/finance';

/** bozdurma: elinizdeki dövizi TL'ye çevirirsiniz; alma: TL ödeyip döviz alırsınız */
export type Yon = 'bozdurma' | 'alma';

export interface Saglayici {
  ad: string;
  /** Size uygulanan kur (TL / 1 birim döviz) */
  kur: number;
  /** İşlem başına sabit ücret (TL) */
  sabitUcret: number;
  /** Tutar üzerinden yüzde komisyon (%) */
  komisyonYuzde: number;
}

export interface SaglayiciSonucu extends Saglayici {
  /** Piyasa (orta) kuruyla olması gereken TL karşılığı */
  ideal: number;
  /** Bozdurmada elinize geçen, almada ödediğiniz TL */
  tl: number;
  /** Kur makasından kaynaklanan gizli maliyet (TL) */
  kurMakasi: number;
  /** Uygulanan kurun piyasa kurundan sapması (%) */
  kurMakasiYuzde: number;
  /** Açık komisyon + sabit ücret (TL) */
  acikUcret: number;
  /** Toplam maliyet = kur makası + açık ücretler (TL) */
  toplamMaliyet: number;
  toplamMaliyetYuzde: number;
  /** Tüm maliyetler dahil size gerçekte uygulanan kur */
  efektifKur: number;
}

/**
 * Gizli kur farkı: piyasa kuru ile size uygulanan kur arasındaki fark, ücret olarak yazılmasa da bir maliyettir.
 * Bozdurma: elinize geçen = tutar × kur × (1 − komisyon) − sabit
 * Alma:     ödediğiniz   = tutar × kur × (1 + komisyon) + sabit
 */
export function hesaplaSaglayici(yon: Yon, tutar: number, piyasaKuru: number, s: Saglayici): SaglayiciSonucu {
  const ideal = round2(tutar * piyasaKuru);
  const brut = tutar * s.kur;
  const komisyon = brut * (s.komisyonYuzde / 100);
  const acikUcret = round2(komisyon + s.sabitUcret);
  const tl = yon === 'bozdurma' ? round2(brut - komisyon - s.sabitUcret) : round2(brut + komisyon + s.sabitUcret);
  const kurMakasi = round2(yon === 'bozdurma' ? tutar * (piyasaKuru - s.kur) : tutar * (s.kur - piyasaKuru));
  const toplamMaliyet = round2(yon === 'bozdurma' ? ideal - tl : tl - ideal);
  return {
    ...s,
    ideal,
    tl,
    kurMakasi,
    kurMakasiYuzde: ((yon === 'bozdurma' ? piyasaKuru - s.kur : s.kur - piyasaKuru) / piyasaKuru) * 100,
    acikUcret,
    toplamMaliyet,
    toplamMaliyetYuzde: ideal > 0 ? (toplamMaliyet / ideal) * 100 : 0,
    efektifKur: tutar > 0 ? tl / tutar : 0,
  };
}

/** Sağlayıcıları en avantajlıdan başlayarak sıralar (en düşük toplam maliyet). */
export function karsilastir(yon: Yon, tutar: number, piyasaKuru: number, list: Saglayici[]): SaglayiciSonucu[] {
  return list.map((s) => hesaplaSaglayici(yon, tutar, piyasaKuru, s)).sort((a, b) => a.toplamMaliyet - b.toplamMaliyet);
}

export function validateKur(i: { tutar: number | null; piyasa: number | null }) {
  const e: Record<string, string> = {};
  if (i.tutar === null || i.tutar <= 0) e.tutar = 'Döviz tutarını girin.';
  if (i.piyasa === null || i.piyasa <= 0) e.piyasa = 'Piyasa (orta) kurunu girin.';
  return e;
}

export function validateSaglayici(s: { kur: number | null; sabit: number | null; komisyon: number | null }) {
  const e: { kur?: string; sabit?: string; komisyon?: string } = {};
  if (s.kur === null || s.kur <= 0) e.kur = 'Uygulanan kuru girin.';
  if (s.sabit === null || s.sabit < 0) e.sabit = '0 veya daha büyük olmalı.';
  if (s.komisyon === null || s.komisyon < 0 || s.komisyon >= 100) e.komisyon = '%0 ile %100 arasında olmalı.';
  return e;
}
