import { round2, roundTo } from '../../lib/finance';

// =====================================================================================
// A) Yüzde zam: eski fiyat ↔ yeni fiyat ↔ zam oranı, ardışık zamlar
// =====================================================================================

export interface ZamAdimi {
  /** Bu adımdaki zam (%); negatifse indirim */
  oran: number;
  /** Adım sonundaki fiyat (kuruşa yuvarlanmış) */
  fiyat: number;
}

export interface ZamSonucu {
  eski: number;
  yeni: number;
  /** Bileşik toplam zam (%) */
  toplamOran: number;
  /** yeni − eski */
  fark: number;
  adimlar: ZamAdimi[];
  /** Oranları düz toplamak (yanlış yöntem) */
  duzToplam: number;
  /** Zamdan sonra eski fiyata dönmek için gereken indirim (%) */
  geriDonusIndirimi: number;
}

/** (1 + o₁)(1 + o₂)… − 1, yüzde olarak. %10 sonra %15 → %26,5 */
export function toplamZamOrani(oranlar: number[]): number {
  const carpim = oranlar.reduce((c, o) => c * (1 + o / 100), 1);
  return roundTo((carpim - 1) * 100, 10);
}

/** Zamdan sonra eski fiyata dönmek için gereken indirim (%): 1 − 1 ÷ (1 + z) */
export function eskiyeDonusIndirimi(toplamOranYuzde: number): number {
  return roundTo((1 - 1 / (1 + toplamOranYuzde / 100)) * 100, 10);
}

function zincir(baslangic: number, oranlar: number[]): ZamAdimi[] {
  let fiyat = baslangic;
  return oranlar.map((oran) => {
    fiyat = fiyat * (1 + oran / 100);
    return { oran, fiyat: round2(fiyat) };
  });
}

/** Eski fiyat + ardışık zamlar → yeni fiyat. Ara fiyatlar yuvarlanmadan zincirlenir, yalnızca gösterim kuruşa yuvarlanır. */
export function yeniFiyatiBul(eski: number, oranlar: number[]): ZamSonucu {
  const toplamOran = toplamZamOrani(oranlar);
  const yeni = round2(oranlar.reduce((f, o) => f * (1 + o / 100), eski));
  return {
    eski: round2(eski),
    yeni,
    toplamOran,
    fark: round2(yeni - eski),
    adimlar: zincir(eski, oranlar),
    duzToplam: roundTo(oranlar.reduce((t, o) => t + o, 0), 10),
    geriDonusIndirimi: eskiyeDonusIndirimi(toplamOran),
  };
}

/** Yeni fiyat + ardışık zamlar → eski fiyat. */
export function eskiFiyatiBul(yeni: number, oranlar: number[]): ZamSonucu {
  const carpim = oranlar.reduce((c, o) => c * (1 + o / 100), 1);
  const eskiHam = yeni / carpim;
  const sonuc = yeniFiyatiBul(eskiHam, oranlar);
  return { ...sonuc, eski: round2(eskiHam), yeni: round2(yeni), fark: round2(yeni - eskiHam) };
}

/** Eski ve yeni fiyattan zam oranı (%). Eski fiyat > 0 olmalı. */
export function zamOraniBul(eski: number, yeni: number): ZamSonucu {
  const oran = roundTo((yeni / eski - 1) * 100, 10);
  return {
    eski: round2(eski),
    yeni: round2(yeni),
    toplamOran: oran,
    fark: round2(yeni - eski),
    adimlar: [{ oran, fiyat: round2(yeni) }],
    duzToplam: oran,
    geriDonusIndirimi: eskiyeDonusIndirimi(oran),
  };
}

export function validateZamOrani(oran: number | null): string | undefined {
  if (oran === null || Number.isNaN(oran)) return 'Bir oran girin.';
  if (oran <= -100) return 'İndirim oranı %100 veya daha fazla olamaz.';
  if (oran > 100000) return 'Oran çok büyük.';
  return undefined;
}

export function validateFiyat(f: number | null, ad = 'Fiyat'): string | undefined {
  if (f === null || Number.isNaN(f)) return `${ad} girin.`;
  if (f <= 0) return `${ad} sıfırdan büyük olmalı.`;
  return undefined;
}

// =====================================================================================
// B) Maliyet artışında satış fiyatı: kâr oranını / kâr tutarını / hedef marjı koruma
// =====================================================================================

/**
 * oran       : mevcut kâr oranı korunur (marj korunur = markup korunur; ikisi aynı fiyatı verir)
 * kar        : mevcut kâr TUTARI (TL) korunur
 * hedefMarj  : belirlediğiniz marj (satış fiyatının yüzdesi) için fiyat
 * hedefMarkup: belirlediğiniz markup (maliyetin yüzdesi) için fiyat
 */
export type Koruma = 'oran' | 'kar' | 'hedefMarj' | 'hedefMarkup';

export interface UrunGirdisi {
  ad?: string;
  /** Mevcut satış fiyatı (kdvDahil ayarına göre KDV dahil ya da hariç) */
  fiyat: number;
  /** Mevcut birim maliyet (KDV hariç) */
  maliyet: number;
  /** Yeni birim maliyet (KDV hariç) */
  yeniMaliyet: number;
}

export interface FiyatAyari {
  koruma: Koruma;
  /** hedefMarj / hedefMarkup için yüzde */
  hedef: number | null;
  kdvOrani: number;
  /** Girilen mevcut fiyat KDV dahil mi? */
  fiyatKdvDahil: boolean;
}

export interface UrunSonucu {
  ad: string;
  /** Mevcut ve yeni fiyat, girdiğiniz türde (KDV dahil ya da hariç) */
  eskiFiyat: number;
  yeniFiyat: number;
  eskiFiyatHaric: number;
  yeniFiyatHaric: number;
  yeniFiyatDahil: number;
  /** Girilen türdeki fiyatın artışı (%) */
  zam: number;
  maliyetArtisi: number;
  eskiKar: number;
  eskiMarj: number;
  eskiMarkup: number;
  yeniKar: number;
  yeniMarj: number;
  yeniMarkup: number;
  karFarki: number;
  /** Karşılaştırma: kâr oranı korunursa / kâr tutarı korunursa yeni KDV hariç fiyat */
  oranKorunursa: number;
  karKorunursa: number;
}

const yuzde = (x: number) => roundTo(x * 100, 8);

/** Yeni KDV hariç fiyat (yuvarlanmamış). Geçersiz girdide NaN. */
function yeniHaricFiyat(eskiHaric: number, maliyet: number, yeniMaliyet: number, ayar: Pick<FiyatAyari, 'koruma' | 'hedef'>): number {
  switch (ayar.koruma) {
    case 'oran':
      // marj = (F − M) ÷ F sabit  ⇔  F ÷ M sabit  ⇒  F' = M' × F ÷ M
      return (yeniMaliyet * eskiHaric) / maliyet;
    case 'kar':
      return yeniMaliyet + (eskiHaric - maliyet);
    case 'hedefMarj':
      return ayar.hedef !== null && ayar.hedef < 100 ? yeniMaliyet / (1 - ayar.hedef / 100) : Number.NaN;
    case 'hedefMarkup':
      return ayar.hedef !== null ? yeniMaliyet * (1 + ayar.hedef / 100) : Number.NaN;
  }
}

export function fiyatlandir(urun: UrunGirdisi, ayar: FiyatAyari): UrunSonucu {
  const k = 1 + ayar.kdvOrani / 100;
  const eskiHaric = ayar.fiyatKdvDahil ? urun.fiyat / k : urun.fiyat;
  const yeniHam = yeniHaricFiyat(eskiHaric, urun.maliyet, urun.yeniMaliyet, ayar);
  const yeniHaric = round2(yeniHam);
  const yeniDahil = round2(yeniHam * k);

  const eskiKar = eskiHaric - urun.maliyet;
  const yeniKar = yeniHaric - urun.yeniMaliyet;
  const eskiFiyat = round2(urun.fiyat);
  const yeniFiyat = ayar.fiyatKdvDahil ? yeniDahil : yeniHaric;

  return {
    ad: urun.ad?.trim() ?? '',
    eskiFiyat,
    yeniFiyat,
    eskiFiyatHaric: round2(eskiHaric),
    yeniFiyatHaric: yeniHaric,
    yeniFiyatDahil: yeniDahil,
    zam: yuzde(yeniFiyat / eskiFiyat - 1),
    maliyetArtisi: yuzde(urun.yeniMaliyet / urun.maliyet - 1),
    eskiKar: round2(eskiKar),
    eskiMarj: yuzde(eskiKar / eskiHaric),
    eskiMarkup: yuzde(eskiKar / urun.maliyet),
    yeniKar: round2(yeniKar),
    yeniMarj: yuzde(yeniKar / yeniHaric),
    yeniMarkup: yuzde(yeniKar / urun.yeniMaliyet),
    karFarki: round2(yeniKar - eskiKar),
    oranKorunursa: round2(yeniHaricFiyat(eskiHaric, urun.maliyet, urun.yeniMaliyet, { koruma: 'oran', hedef: null })),
    karKorunursa: round2(yeniHaricFiyat(eskiHaric, urun.maliyet, urun.yeniMaliyet, { koruma: 'kar', hedef: null })),
  };
}

export function validateUrun(
  u: { fiyat: number | null; maliyet: number | null; yeniMaliyet: number | null },
  ayar: Pick<FiyatAyari, 'koruma' | 'kdvOrani' | 'fiyatKdvDahil'>,
): { fiyat?: string; maliyet?: string; yeniMaliyet?: string } {
  const e: { fiyat?: string; maliyet?: string; yeniMaliyet?: string } = {};
  const f = validateFiyat(u.fiyat, 'Mevcut satış fiyatı');
  const m = validateFiyat(u.maliyet, 'Mevcut maliyet');
  const y = validateFiyat(u.yeniMaliyet, 'Yeni maliyet');
  if (f) e.fiyat = f;
  if (m) e.maliyet = m;
  if (y) e.yeniMaliyet = y;
  if (!f && !m && (ayar.koruma === 'oran' || ayar.koruma === 'kar')) {
    const haric = ayar.fiyatKdvDahil ? u.fiyat! / (1 + ayar.kdvOrani / 100) : u.fiyat!;
    if (haric <= u.maliyet!) e.fiyat = 'Mevcut satış fiyatı (KDV hariç) maliyetten yüksek olmalı; aksi halde korunacak bir kâr yok.';
  }
  return e;
}

export function validateHedef(koruma: Koruma, hedef: number | null): string | undefined {
  if (koruma === 'hedefMarj') {
    if (hedef === null || Number.isNaN(hedef)) return 'Bir hedef marj girin.';
    if (hedef <= 0 || hedef >= 100) return 'Hedef marj %0 ile %100 arasında olmalı.';
  }
  if (koruma === 'hedefMarkup') {
    if (hedef === null || Number.isNaN(hedef)) return 'Bir hedef markup girin.';
    if (hedef < 0) return 'Hedef markup negatif olamaz.';
  }
  return undefined;
}

// =====================================================================================
// C) Zam / indirim ve satış adedi: brüt kârı sabit tutan adet değişimi
// =====================================================================================

export interface HacimSonucu {
  mumkun: boolean;
  eskiFiyat: number;
  yeniFiyat: number;
  /** Mevcut birim katkı (fiyat − değişken maliyet) */
  eskiKatki: number;
  yeniKatki: number;
  /** Brüt kârı koruyan yeni adet ÷ eski adet */
  gerekenOran: number;
  /** Gereken adet değişimi (%): negatif = kaldırabileceğiniz kayıp, pozitif = gereken ek satış */
  adetDegisimi: number;
}

/**
 * Brüt kâr = adet × (fiyat − birim değişken maliyet). Sabit giderler değişmediği için brüt kâr sabit kalırsa
 * toplam kâr da sabittir:  Q' ÷ Q = (F − M) ÷ (F' − M)
 */
export function hacimDengesi(fiyat: number, maliyet: number, fiyatDegisimi: number): HacimSonucu {
  const yeniFiyat = fiyat * (1 + fiyatDegisimi / 100);
  const eskiKatki = fiyat - maliyet;
  const yeniKatki = yeniFiyat - maliyet;
  const mumkun = yeniKatki > 0 && eskiKatki > 0;
  const gerekenOran = mumkun ? eskiKatki / yeniKatki : Number.NaN;
  return {
    mumkun,
    eskiFiyat: round2(fiyat),
    yeniFiyat: round2(yeniFiyat),
    eskiKatki: round2(eskiKatki),
    yeniKatki: round2(yeniKatki),
    gerekenOran,
    adetDegisimi: mumkun ? roundTo((gerekenOran - 1) * 100, 8) : Number.NaN,
  };
}

export interface HacimSenaryosu extends HacimSonucu {
  fiyatDegisimi: number;
}

export function hacimSenaryolari(fiyat: number, maliyet: number, degisimler: number[]): HacimSenaryosu[] {
  return degisimler.map((d) => ({ fiyatDegisimi: d, ...hacimDengesi(fiyat, maliyet, d) }));
}

/** Belirli bir fiyat değişimi ve satış adedi değişiminde brüt kâr: önce / sonra / fark. */
export function brutKarDegisimi(
  fiyat: number,
  maliyet: number,
  adet: number,
  fiyatDegisimi: number,
  adetDegisimi: number,
): { once: number; sonra: number; fark: number; yeniAdet: number } {
  const yeniAdet = adet * (1 + adetDegisimi / 100);
  const once = adet * (fiyat - maliyet);
  const sonra = yeniAdet * (fiyat * (1 + fiyatDegisimi / 100) - maliyet);
  return { once: round2(once), sonra: round2(sonra), fark: round2(sonra - once), yeniAdet: roundTo(yeniAdet, 4) };
}

export function validateHacim(h: { fiyat: number | null; maliyet: number | null; degisim: number | null }): {
  fiyat?: string;
  maliyet?: string;
  degisim?: string;
} {
  const e: { fiyat?: string; maliyet?: string; degisim?: string } = {};
  const f = validateFiyat(h.fiyat, 'Mevcut fiyat');
  if (f) e.fiyat = f;
  if (h.maliyet === null || Number.isNaN(h.maliyet)) e.maliyet = 'Birim değişken maliyeti girin.';
  else if (h.maliyet < 0) e.maliyet = 'Maliyet negatif olamaz.';
  else if (h.fiyat !== null && h.maliyet >= h.fiyat) e.maliyet = 'Maliyet, satış fiyatından düşük olmalı (birim katkı pozitif olmalı).';
  const d = validateZamOrani(h.degisim);
  if (d) e.degisim = d;
  return e;
}
