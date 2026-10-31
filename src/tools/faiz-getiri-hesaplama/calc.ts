import { stopajDonemiOn } from '../../data/params/mevduat';
import { round2 } from '../../lib/finance';

// Bankalar TL mevduatta faizi gün esasına göre ve yılı 365 gün sayarak hesaplar:
//   brüt faiz = anapara × yıllık oran × gün / 365
// Faizden stopaj (gelir vergisi kesintisi) düşülür; vade sonunda net faiz anaparaya eklenir.
// Vade sonunda hesap faiziyle yenilenirse (bileşik), bir sonraki dönem yeni tutar üzerinden işler.

const GUN_YIL = 365;

/**
 * Vadeye göre stopaj oranı (%). Karardaki "6 aya kadar" ve "1 yıla kadar" vadeler gün olarak:
 * 6 aylık vade takvime göre 181–184 gün, 1 yıllık vade 365–366 gün sürer.
 */
export function stopajOrani(gun: number, acilisTarihi: string): number {
  const d = stopajDonemiOn(acilisTarihi);
  if (gun <= 184) return d.altiAya;
  if (gun <= 366) return d.birYila;
  return d.uzun;
}

export interface DonemSonucu {
  donem: number;
  /** Dönem başındaki anapara */
  anapara: number;
  brutFaiz: number;
  stopaj: number;
  netFaiz: number;
  /** Dönem sonundaki tutar (anapara + net faiz) */
  sonTutar: number;
}

/** Tek vade dönemi: brüt faiz ve stopaj kuruşa yuvarlanır. */
export function donemHesapla(anapara: number, yillikOran: number, gun: number, stopajYuzde: number): Omit<DonemSonucu, 'donem'> {
  const brutFaiz = round2((anapara * yillikOran * gun) / 100 / GUN_YIL);
  const stopaj = round2((brutFaiz * stopajYuzde) / 100);
  const netFaiz = round2(brutFaiz - stopaj);
  return { anapara: round2(anapara), brutFaiz, stopaj, netFaiz, sonTutar: round2(anapara + netFaiz) };
}

export interface FaizGirdisi {
  anapara: number;
  /** Yıllık brüt faiz oranı (%) */
  yillikOran: number;
  /** Bir vadenin gün sayısı */
  gun: number;
  /** Stopaj oranı (%) */
  stopaj: number;
  /** Vade kaç kez üst üste işletilecek (1 = yenileme yok) */
  donemSayisi: number;
}

export interface FaizSonucu {
  donemler: DonemSonucu[];
  toplamGun: number;
  toplamBrut: number;
  toplamStopaj: number;
  toplamNet: number;
  sonTutar: number;
  /** Bir dönemlik net getiri oranı, yıllık basit karşılığı (%) */
  netYillikBasit: number;
  /** Net getirinin bileşik yıllık karşılığı (%) */
  netYillikEfektif: number;
}

export function faizHesapla(g: FaizGirdisi): FaizSonucu {
  const donemler: DonemSonucu[] = [];
  let tutar = g.anapara;
  for (let i = 1; i <= g.donemSayisi; i++) {
    const d = donemHesapla(tutar, g.yillikOran, g.gun, g.stopaj);
    donemler.push({ donem: i, ...d });
    tutar = d.sonTutar;
  }
  const toplamGun = g.gun * g.donemSayisi;
  const toplamBrut = round2(donemler.reduce((t, d) => t + d.brutFaiz, 0));
  const toplamStopaj = round2(donemler.reduce((t, d) => t + d.stopaj, 0));
  const toplamNet = round2(donemler.reduce((t, d) => t + d.netFaiz, 0));
  const ilkNetOran = g.anapara > 0 ? donemler[0].netFaiz / g.anapara : 0;
  const toplamOran = g.anapara > 0 ? toplamNet / g.anapara : 0;
  return {
    donemler,
    toplamGun,
    toplamBrut,
    toplamStopaj,
    toplamNet,
    sonTutar: round2(g.anapara + toplamNet),
    netYillikBasit: (ilkNetOran * GUN_YIL * 100) / g.gun,
    netYillikEfektif: toplamGun > 0 ? (Math.pow(1 + toplamOran, GUN_YIL / toplamGun) - 1) * 100 : 0,
  };
}

/** Toplam süreye kaç tam vade sığar (ör. 365 gün ÷ 32 gün = 11 vade). En az 1. */
export function donemSayisiOf(toplamGun: number, vadeGun: number): number {
  if (vadeGun <= 0) return 1;
  return Math.max(1, Math.floor(toplamGun / vadeGun));
}

/** Enflasyondan arındırılmış (reel) getiri (%): (1 + nominal) / (1 + enflasyon) − 1 */
export function reelGetiri(nominalYuzde: number, enflasyonYuzde: number): number {
  return ((1 + nominalYuzde / 100) / (1 + enflasyonYuzde / 100) - 1) * 100;
}

/** Bir vadede hedeflenen net faizi kazanmak için gereken anapara. */
export function gerekenAnapara(hedefNet: number, yillikOran: number, gun: number, stopajYuzde: number): number {
  const netOran = ((yillikOran / 100) * gun * (1 - stopajYuzde / 100)) / GUN_YIL;
  return netOran > 0 ? round2(hedefNet / netOran) : 0;
}

/** Aylık net faiz geliri hedefini, vadenin gün sayısına çevirir (ör. ayda 30.000 TL, 32 günlük vade → 32/30,42 ay). */
export function aylikHedeftenDonemHedefi(aylikNet: number, gun: number): number {
  return round2((aylikNet * gun * 12) / GUN_YIL);
}

export function validateFaiz(i: { anapara: number | null; oran: number | null; gun: number | null; toplamGun?: number | null; stopaj?: number | null }) {
  const e: Record<string, string> = {};
  if (i.anapara === null || i.anapara <= 0) e.anapara = 'Yatırılacak tutarı girin.';
  if (i.oran === null || i.oran <= 0) e.oran = 'Yıllık faiz oranını girin.';
  else if (i.oran > 200) e.oran = 'Yıllık oran %200’ü geçemez.';
  if (i.gun === null || i.gun < 1 || !Number.isInteger(i.gun)) e.gun = 'Vade en az 1 tam gün olmalı.';
  else if (i.gun > 3650) e.gun = 'Vade en fazla 3.650 gün (10 yıl) olabilir.';
  if (i.toplamGun !== undefined && i.toplamGun !== null && i.gun && i.toplamGun < i.gun) e.toplamGun = 'Toplam süre bir vadeden kısa olamaz.';
  if (i.stopaj !== undefined && i.stopaj !== null && (i.stopaj < 0 || i.stopaj > 100)) e.stopaj = 'Stopaj 0 ile 100 arasında olmalı.';
  return e;
}
