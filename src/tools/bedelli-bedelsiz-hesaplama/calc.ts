import { roundTo } from '../../lib/finance';

// Borsa İstanbul "Özsermaye Hallerinde Payların Teorik/Referans Fiyatlarının Belirlenmesi", md. 5.1:
//   Ft = (Fk + n2·R − T) / (1 + n1 + n2)      Fr = (Ft − R) × n2
// Fk: son kapanış, n1: bedelsiz oranı, n2: rüçhan (bedelli) oranı, T: brüt temettü, R: rüçhan kullanma fiyatı.
// Fk < R ise ya da temettü ve bedelsiz sonrası fiyat R'nin altına düşüyorsa n2 = 0 alınır.
// Veri hassasiyeti (md. 2.6): Ft ve Fr virgülden sonra 3 hane.

export interface ArtirimInput {
  /** Son kapanış fiyatı (TL) */
  kapanis: number;
  /** Bedelsiz artırım oranı (%) — temettünün pay olarak dağıtılan kısmı da buraya eklenir (md. 4.2) */
  bedelsizYuzde: number;
  /** Bedelli (rüçhan hakkı) artırım oranı (%) */
  bedelliYuzde: number;
  /** 1 TL nominal payın rüçhan hakkı kullanma fiyatı (genelde 1 TL) */
  rucanFiyati: number;
  /** Pay başına brüt nakit temettü (TL) */
  brutTemettu: number;
}

export interface TeorikFiyatSonucu {
  teorikFiyat: number;
  /** Bir mevcut paya bağlı rüçhan haklarının referans değeri (TL) */
  rucanReferans: number;
  /** Bedelli oran formüle dahil edildi mi */
  bedelliDahil: boolean;
  /** Dahil edilmediyse nedeni */
  bedelliHaricNedeni: 'kapanis-dusuk' | 'teorik-dusuk' | null;
  n1: number;
  n2: number;
}

export function teorikFiyat(i: ArtirimInput): TeorikFiyatSonucu {
  const n1 = i.bedelsizYuzde / 100;
  const n2Ham = i.bedelliYuzde / 100;
  const R = i.rucanFiyati;
  const T = i.brutTemettu;

  let neden: TeorikFiyatSonucu['bedelliHaricNedeni'] = null;
  if (n2Ham > 0) {
    if (i.kapanis < R) neden = 'kapanis-dusuk';
    else if ((i.kapanis - T) / (1 + n1) < R) neden = 'teorik-dusuk';
  }
  const bedelliDahil = n2Ham > 0 && neden === null;
  const n2 = bedelliDahil ? n2Ham : 0;

  const teorikFiyat = roundTo((i.kapanis + n2 * R - T) / (1 + n1 + n2), 3);
  const rucanReferans = bedelliDahil ? roundTo((teorikFiyat - R) * n2, 3) : 0;
  return { teorikFiyat, rucanReferans, bedelliDahil, bedelliHaricNedeni: neden, n1, n2: n2Ham };
}

export interface PortfoyInput extends ArtirimInput {
  /** Elimdeki pay (lot) */
  lot: number;
  /** Rüçhan hakkının kullanılacak kısmı (0–1) */
  kullanim: number;
}

export interface PortfoySonucu extends TeorikFiyatSonucu {
  bedelsizYeniLot: number;
  bedelliYeniLot: number;
  toplamLot: number;
  /** Rüçhan için ödenecek tutar */
  odeme: number;
  /** Alınacak brüt temettü (stopaj öncesi) */
  temettu: number;
  oncekiDeger: number;
  /** Sonraki pay değeri (teorik fiyatla) */
  sonrakiPayDegeri: number;
  /** Sonraki pay değeri + temettü − rüçhan ödemesi: öncekiyle karşılaştırılabilir net değer */
  netDeger: number;
  /** Kullanılmayan (ve satılmayan) rüçhan haklarının kaybedilen referans değeri */
  kullanilmayanHakDegeri: number;
}

export function portfoy(i: PortfoyInput): PortfoySonucu {
  const t = teorikFiyat(i);
  const kullanim = Math.min(1, Math.max(0, i.kullanim));
  const bedelsizYeniLot = i.lot * t.n1;
  const bedelliYeniLot = i.lot * t.n2 * kullanim;
  const toplamLot = i.lot + bedelsizYeniLot + bedelliYeniLot;
  const odeme = roundTo(bedelliYeniLot * i.rucanFiyati, 2);
  const temettu = roundTo(i.lot * i.brutTemettu, 2);
  const oncekiDeger = roundTo(i.lot * i.kapanis, 2);
  const sonrakiPayDegeri = roundTo(toplamLot * t.teorikFiyat, 2);
  const netDeger = roundTo(sonrakiPayDegeri + temettu - odeme, 2);
  const kullanilmayanHakDegeri = roundTo(i.lot * t.rucanReferans * (1 - kullanim), 2);
  return {
    ...t,
    bedelsizYeniLot,
    bedelliYeniLot,
    toplamLot,
    odeme,
    temettu,
    oncekiDeger,
    sonrakiPayDegeri,
    netDeger,
    kullanilmayanHakDegeri,
  };
}

/** "%100" → "1 paya 1 yeni pay" gibi okunur ifade. */
export function oranMetni(yuzde: number): string {
  const oran = yuzde / 100;
  if (oran <= 0) return '';
  const r = roundTo(oran, 4);
  return `her 1 paya ${r.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} yeni pay`;
}

export function validateArtirim(i: {
  kapanis: number | null;
  bedelsiz: number | null;
  bedelli: number | null;
  rucan: number | null;
  temettu: number | null;
  lot: number | null;
}): Record<string, string> {
  const e: Record<string, string> = {};
  if (i.kapanis === null || i.kapanis <= 0) e.kapanis = 'Son kapanış fiyatını girin.';
  if (i.bedelsiz === null || i.bedelsiz < 0) e.bedelsiz = 'Bedelsiz oranı 0 veya daha büyük olmalı.';
  if (i.bedelli === null || i.bedelli < 0) e.bedelli = 'Bedelli oranı 0 veya daha büyük olmalı.';
  if (i.bedelli !== null && i.bedelli > 0 && (i.rucan === null || i.rucan <= 0)) e.rucan = 'Rüçhan hakkı kullanma fiyatını girin.';
  if (i.temettu === null || i.temettu < 0) e.temettu = 'Temettü 0 veya daha büyük olmalı.';
  else if (i.kapanis !== null && i.temettu >= i.kapanis) e.temettu = 'Temettü kapanış fiyatından küçük olmalı.';
  if (i.lot === null || i.lot < 0) e.lot = 'Elinizdeki lot sayısını girin.';
  if (i.bedelsiz === 0 && i.bedelli === 0 && i.temettu === 0) e.bedelsiz = 'En az bir artırım oranı ya da temettü girin.';
  return e;
}
