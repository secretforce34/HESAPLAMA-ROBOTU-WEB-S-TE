import { kartTaksitGrubu, type KartHarcamaGrubu } from '../../data/params/kredi';
import { annualFromMonthly, round2 } from '../../lib/finance';

/** Bir ay 30 gün kabul edilir; ilk ödemeye kadar geçen gün sayısı ay kesrine çevrilir. */
const GUN_AY = 30;

// ---------------------------------------------------------------------------
// Peşin fiyat
// ---------------------------------------------------------------------------

/** Etiket fiyatından peşin indirimi düşülmüş tutar (kuruşa yuvarlanır). */
export function pesinFiyatHesapla(etiket: number, indirimYuzde: number): number {
  return round2(etiket * (1 - indirimYuzde / 100));
}

// ---------------------------------------------------------------------------
// Taksit seçeneği
// ---------------------------------------------------------------------------

/** vadeFarki: etiket fiyatına eklenen % · toplam: taksitli toplam fiyat · taksit: aylık taksit tutarı */
export type TaksitGirisi = 'vadeFarki' | 'toplam' | 'taksit';

export interface TaksitSecenegi {
  /** Taksit sayısı */
  sayi: number;
  giris: TaksitGirisi;
  /** Girişe göre: vade farkı (%), toplam fiyat (TL) ya da aylık taksit (TL) */
  deger: number;
}

/** Seçeneğin aylık taksiti ve toplamı. Vade farkı etiket fiyatı üzerinden hesaplanır. */
export function taksitTutari(s: TaksitSecenegi, etiket: number): { taksit: number; toplam: number } {
  if (s.giris === 'taksit') return { taksit: s.deger, toplam: round2(s.deger * s.sayi) };
  const toplam = s.giris === 'toplam' ? round2(s.deger) : round2(etiket * (1 + s.deger / 100));
  return { taksit: toplam / s.sayi, toplam };
}

/**
 * Taksitlerin bugünkü değeri. k. taksit (k = 0…n−1) bugünden (ilkGun/30 + k) ay sonra ödenir;
 * her taksit aylık oranla (bileşik) bugüne indirgenir.
 */
export function bugunkuDeger(taksit: number, sayi: number, aylikOran: number, ilkGun: number): number {
  const i = aylikOran / 100;
  let pv = 0;
  for (let k = 0; k < sayi; k++) pv += taksit / Math.pow(1 + i, ilkGun / GUN_AY + k);
  return pv;
}

/**
 * Başa baş aylık oran (%): taksitlerin bugünkü değeri peşin fiyata eşit olur. Getiri veya enflasyon bu oranın
 * üzerindeyse taksitli ödeme bugünkü değerle daha ucuzdur. Taksit toplamı peşin fiyattan düşükse oran negatiftir.
 */
export function basabasOrani(pesin: number, taksit: number, sayi: number, ilkGun: number): number | null {
  const f = (i: number) => bugunkuDeger(taksit, sayi, i * 100, ilkGun) - pesin;
  let lo = -0.5;
  let hi = 5;
  let fLo = f(lo);
  const fHi = f(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
  for (let it = 0; it < 200; it++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);
    if (Math.abs(fMid) < 1e-9 || hi - lo < 1e-13) return mid * 100;
    if (fLo * fMid < 0) hi = mid;
    else {
      lo = mid;
      fLo = fMid;
    }
  }
  return ((lo + hi) / 2) * 100;
}

export type Durum = 'taksit-ucuz' | 'pesin-ucuz' | 'esit';

export interface SecenekSonucu {
  sayi: number;
  taksit: number;
  toplam: number;
  /** Taksitli toplamın etiket fiyatına göre farkı (%) */
  vadeFarki: number;
  /** Taksitli toplam − peşin fiyat */
  pesineGoreFark: number;
  /** Taksitli toplamın peşin fiyata göre farkı (%) */
  pesineGoreOran: number;
  bugunkuDeger: number;
  /** Bugünkü değer − peşin fiyat (negatifse taksit daha ucuz) */
  bdFark: number;
  basabasAylik: number | null;
  basabasYillik: number | null;
  durum: Durum;
}

export interface KarsilastirmaInput {
  /** Etiket (taksitli satış) fiyatı */
  etiket: number;
  /** Peşin ödenecek tutar (peşin indirimi dahil) */
  pesin: number;
  secenekler: TaksitSecenegi[];
  /** Paranızın aylık getirisi veya aylık enflasyon varsayımı (%) */
  aylikOran: number;
  /** İlk taksite kadar geçen gün (0 = alışveriş günü) */
  ilkGun: number;
}

export function secenekHesapla(s: TaksitSecenegi, input: Omit<KarsilastirmaInput, 'secenekler'>): SecenekSonucu {
  const { taksit, toplam } = taksitTutari(s, input.etiket);
  const bd = bugunkuDeger(taksit, s.sayi, input.aylikOran, input.ilkGun);
  const bdFark = round2(bd - input.pesin);
  const bb = basabasOrani(input.pesin, taksit, s.sayi, input.ilkGun);
  return {
    sayi: s.sayi,
    taksit: round2(taksit),
    toplam,
    vadeFarki: input.etiket > 0 ? (toplam / input.etiket - 1) * 100 : 0,
    pesineGoreFark: round2(toplam - input.pesin),
    pesineGoreOran: input.pesin > 0 ? (toplam / input.pesin - 1) * 100 : 0,
    bugunkuDeger: round2(bd),
    bdFark,
    basabasAylik: bb,
    basabasYillik: bb === null ? null : annualFromMonthly(bb / 100) * 100,
    // 1 kuruşluk farklar eşit sayılır
    durum: Math.abs(bdFark) < 0.01 ? 'esit' : bdFark < 0 ? 'taksit-ucuz' : 'pesin-ucuz',
  };
}

export interface KarsilastirmaSonucu {
  secenekler: SecenekSonucu[];
  /** Bugünkü değeri en düşük seçeneğin indeksi; peşin daha ucuzsa -1 */
  enUcuz: number;
  /** En düşük bugünkü değer (peşin dahil) */
  enDusukDeger: number;
}

export function karsilastir(input: KarsilastirmaInput): KarsilastirmaSonucu {
  const secenekler = input.secenekler.map((s) => secenekHesapla(s, input));
  let enUcuz = -1;
  let enDusukDeger = input.pesin;
  secenekler.forEach((s, i) => {
    if (s.bugunkuDeger < enDusukDeger - 0.005) {
      enUcuz = i;
      enDusukDeger = s.bugunkuDeger;
    }
  });
  return { secenekler, enUcuz, enDusukDeger: round2(enDusukDeger) };
}

/** Farklı aylık getiri/enflasyon varsayımlarında her seçeneğin bugünkü değeri. */
export function senaryoTablosu(input: KarsilastirmaInput, oranlar: number[]): { oran: number; degerler: number[] }[] {
  return oranlar.map((oran) => ({
    oran,
    degerler: input.secenekler.map((s) => {
      const { taksit } = taksitTutari(s, input.etiket);
      return round2(bugunkuDeger(taksit, s.sayi, oran, input.ilkGun));
    }),
  }));
}

// ---------------------------------------------------------------------------
// Kredi kartı taksit sınırı (BDDK)
// ---------------------------------------------------------------------------

export interface TaksitSiniriSonucu {
  azami: number;
  uygun: boolean;
  /** Bu grupta kartla taksit yapılamaz */
  yasak: boolean;
}

export function kartTaksitKontrol(grup: KartHarcamaGrubu, sayi: number): TaksitSiniriSonucu {
  const g = kartTaksitGrubu(grup);
  return { azami: g.azami, yasak: g.azami === 0, uygun: g.azami > 0 && sayi <= g.azami };
}

// ---------------------------------------------------------------------------
// Doğrulama
// ---------------------------------------------------------------------------

export function validateFiyat(etiket: number | null, pesin: number | null): Record<string, string> {
  const e: Record<string, string> = {};
  if (etiket === null || Number.isNaN(etiket)) e.etiket = 'Etiket fiyatını girin.';
  else if (etiket <= 0) e.etiket = 'Fiyat sıfırdan büyük olmalı.';
  if (pesin === null || Number.isNaN(pesin)) e.pesin = 'Peşin fiyatı girin.';
  else if (pesin <= 0) e.pesin = 'Peşin fiyat sıfırdan büyük olmalı.';
  return e;
}

export function validateIndirim(indirim: number | null): string | null {
  if (indirim === null || Number.isNaN(indirim)) return 'İndirim oranını girin (yoksa 0).';
  if (indirim < 0 || indirim >= 100) return 'İndirim %0 ile %99 arasında olmalı.';
  return null;
}

export function validateSecenek(sayi: number | null, giris: TaksitGirisi, deger: number | null): { sayi?: string; deger?: string } {
  const e: { sayi?: string; deger?: string } = {};
  if (sayi === null || Number.isNaN(sayi)) e.sayi = 'Taksit sayısını girin.';
  else if (!Number.isInteger(sayi) || sayi < 1 || sayi > 120) e.sayi = 'Taksit sayısı 1–120 arasında tam sayı olmalı.';
  if (deger === null || Number.isNaN(deger)) e.deger = giris === 'vadeFarki' ? 'Vade farkını girin (yoksa 0).' : 'Tutarı girin.';
  else if (giris === 'vadeFarki' ? deger < 0 || deger > 500 : deger <= 0) e.deger = giris === 'vadeFarki' ? 'Vade farkı %0–%500 arasında olmalı.' : 'Tutar sıfırdan büyük olmalı.';
  return e;
}

export function validateOran(aylikOran: number | null): string | null {
  if (aylikOran === null || Number.isNaN(aylikOran)) return 'Aylık getiri veya enflasyon varsayımını girin.';
  if (aylikOran < 0 || aylikOran > 50) return 'Aylık oran %0–%50 arasında olmalı.';
  return null;
}

export function validateGun(gun: number | null): string | null {
  if (gun === null || Number.isNaN(gun)) return 'Gün sayısını girin.';
  if (!Number.isInteger(gun) || gun < 0 || gun > 90) return 'İlk ödemeye kalan gün 0–90 arasında tam sayı olmalı.';
  return null;
}
