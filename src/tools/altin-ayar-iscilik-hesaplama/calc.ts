import { round2, roundTo } from '../../lib/finance';

/**
 * mod 'odenenden': ödediğiniz tutardan işçiliği bulun (kuyumcu fişi elinizdeyse)
 * mod 'orandan': kuyumcunun söylediği işçilikten toplam fiyatı bulun (pazarlık / alım öncesi)
 */
export type IscilikModu = 'odenenden' | 'orandan';
/** 'orandan' modunda işçilik girişi: altın değerinin yüzdesi ya da brüt gram başına TL */
export type IscilikBirimi = 'yuzde' | 'tl-gram';

export interface TakiGirdisi {
  ad?: string;
  /** Brüt ağırlık (gram) */
  gram: number;
  /** Binde saf altın oranı (916, 750 …) */
  milyem: number;
  /** Kuyumcu ayarı (görüntü için) */
  ayar: number;
  /** 'odenenden' modunda ödenen toplam tutar (TL) */
  odenen?: number | null;
  /** 'orandan' modunda işçilik değeri: yüzde ya da TL/gram (iscilikBirimi'ne göre) */
  iscilik?: number | null;
}

export interface IscilikInput {
  takilar: TakiGirdisi[];
  mod: IscilikModu;
  iscilikBirimi: IscilikBirimi;
  /** Alım gününün has (24 ayar) gram fiyatı: kuyumcunun satış fiyatı */
  alimHasFiyati: number | null;
  /** Bozdurma günü has gram ALIŞ fiyatı */
  bozdurmaHasAlis: number | null;
  /** Bozdururken kuyumcunun uyguladığı kesinti (%), yoksa 0 */
  bozdurmaKesinti?: number;
}

export interface SatirSonucu {
  ad: string;
  ayar: number;
  milyem: number;
  gram: number;
  hasGram: number;
  /** Has gram × alım günü fiyatı: takının saf altın değeri */
  altinDegeri: number | null;
  /** Ödenen (ya da işçilikten bulunan) toplam tutar */
  odenen: number | null;
  /** Ödenen − altın değeri. Negatifse altın değerinin altında ödenmiştir. */
  iscilikTL: number | null;
  /** İşçilik, altın değerinin yüzde kaçı */
  iscilikOrani: number | null;
  /** İşçilik, brüt gram başına TL */
  iscilikGramBasina: number | null;
  /** Bozdurma günü alış fiyatıyla (kesinti sonrası) alınacak tutar */
  bozdurma: number | null;
}

export interface IscilikSonucu {
  satirlar: SatirSonucu[];
  gram: number;
  hasGram: number;
  altinDegeri: number | null;
  odenen: number | null;
  iscilikTL: number | null;
  iscilikOrani: number | null;
  iscilikGramBasina: number | null;
  bozdurma: number | null;
  /** Bozdurma − ödenen (negatif = kayıp) */
  fark: number | null;
  /** Ödenen tutarı geri almak için gereken has gram ALIŞ fiyatı (kesinti yokken) */
  basabasFiyati: number | null;
}

const pozitif = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const sayi = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n);

/** Gram × milyem ÷ 1000 */
export function hasGramOf(gram: number, milyem: number): number {
  return (gram * milyem) / 1000;
}

/** Farklı ayar arasında eşdeğer gram: aynı saf altını taşıyan ağırlık. gram × milyem(kaynak) ÷ milyem(hedef) */
export function donustur(gram: number, kaynakMilyem: number, hedefMilyem: number): number {
  return roundTo((gram * kaynakMilyem) / hedefMilyem, 4);
}

export interface EsdegerSatiri {
  kod: string;
  milyem: number;
  gram: number;
}

/** Verilen has (saf) altın gramının, listedeki her ayarda kaç gram ettiği. */
export function esdegerTablosu(hasGram: number, ayarlar: { kod: string; milyem: number }[]): EsdegerSatiri[] {
  return ayarlar.map((a) => ({ kod: a.kod, milyem: a.milyem, gram: roundTo((hasGram * 1000) / a.milyem, 4) }));
}

function toplamIfAll(satirlar: SatirSonucu[], alan: 'altinDegeri' | 'odenen' | 'iscilikTL' | 'bozdurma'): number | null {
  if (satirlar.length === 0) return null;
  let t = 0;
  for (const s of satirlar) {
    const v = s[alan];
    if (v === null) return null;
    t += v;
  }
  return round2(t);
}

/**
 * Her satırda: has gram = gram × milyem ÷ 1000; altın değeri = has gram × alım günü has fiyatı.
 * 'odenenden' modunda işçilik = ödenen − altın değeri; 'orandan' modunda ödenen = altın değeri + işçilik.
 * Bozdurma = has gram × bozdurma günü alış fiyatı × (1 − kesinti). Kuruşa yuvarlama satır başınadır;
 * toplamlar yuvarlanmış satırların toplamıdır.
 */
export function hesaplaIscilik(input: IscilikInput): IscilikSonucu {
  const alimFiyat = pozitif(input.alimHasFiyati) ? input.alimHasFiyati : null;
  const alis = pozitif(input.bozdurmaHasAlis) ? input.bozdurmaHasAlis : null;
  const kesinti = sayi(input.bozdurmaKesinti) ? Math.min(Math.max(input.bozdurmaKesinti, 0), 100) : 0;

  const satirlar: SatirSonucu[] = [];
  input.takilar.forEach((t, i) => {
    if (!(t.gram > 0)) return;
    const hasHam = hasGramOf(t.gram, t.milyem);
    const altinDegeri = alimFiyat !== null ? round2(hasHam * alimFiyat) : null;

    let odenen: number | null = null;
    let iscilikTL: number | null = null;
    if (input.mod === 'odenenden') {
      if (sayi(t.odenen) && t.odenen >= 0) {
        odenen = round2(t.odenen);
        if (altinDegeri !== null) iscilikTL = round2(odenen - altinDegeri);
      }
    } else if (altinDegeri !== null && sayi(t.iscilik) && t.iscilik >= 0) {
      iscilikTL = input.iscilikBirimi === 'yuzde' ? round2((altinDegeri * t.iscilik) / 100) : round2(t.gram * t.iscilik);
      odenen = round2(altinDegeri + iscilikTL);
    }

    satirlar.push({
      ad: t.ad?.trim() ? t.ad.trim() : `Takı ${i + 1}`,
      ayar: t.ayar,
      milyem: t.milyem,
      gram: roundTo(t.gram, 4),
      hasGram: roundTo(hasHam, 4),
      altinDegeri,
      odenen,
      iscilikTL,
      iscilikOrani: iscilikTL !== null && altinDegeri !== null && altinDegeri > 0 ? roundTo((iscilikTL / altinDegeri) * 100, 2) : null,
      iscilikGramBasina: iscilikTL !== null ? round2(iscilikTL / t.gram) : null,
      bozdurma: alis !== null ? round2(hasHam * alis * (1 - kesinti / 100)) : null,
    });
  });

  const gram = roundTo(satirlar.reduce((t, s) => t + s.gram, 0), 4);
  const hasGram = roundTo(satirlar.reduce((t, s) => t + s.hasGram, 0), 4);
  const altinDegeri = toplamIfAll(satirlar, 'altinDegeri');
  const odenen = toplamIfAll(satirlar, 'odenen');
  const iscilikTL = toplamIfAll(satirlar, 'iscilikTL');
  const bozdurma = toplamIfAll(satirlar, 'bozdurma');

  return {
    satirlar,
    gram,
    hasGram,
    altinDegeri,
    odenen,
    iscilikTL,
    iscilikOrani: iscilikTL !== null && altinDegeri !== null && altinDegeri > 0 ? roundTo((iscilikTL / altinDegeri) * 100, 2) : null,
    iscilikGramBasina: iscilikTL !== null && gram > 0 ? round2(iscilikTL / gram) : null,
    bozdurma,
    fark: bozdurma !== null && odenen !== null ? round2(bozdurma - odenen) : null,
    basabasFiyati: odenen !== null && hasGram > 0 ? round2(odenen / hasGram) : null,
  };
}

export interface SatirHatalari {
  gram?: string;
  milyem?: string;
  odenen?: string;
  iscilik?: string;
}

/** Boş (null) alanlar hata sayılmaz; yazılmış ama geçersiz değerler hatadır. */
export function validateSatir(
  s: { gram: number | null; milyem: number | null; odenen: number | null; iscilik: number | null },
  mod: IscilikModu,
  birim: IscilikBirimi,
): SatirHatalari {
  const e: SatirHatalari = {};
  if (s.gram !== null) {
    if (Number.isNaN(s.gram) || s.gram < 0) e.gram = 'Ağırlık negatif olamaz.';
    else if (s.gram > 100000) e.gram = 'Bu kadar büyük bir ağırlık girilemez.';
  }
  if (s.milyem === null || Number.isNaN(s.milyem)) e.milyem = 'Milyem girin.';
  else if (s.milyem <= 0 || s.milyem > 1000) e.milyem = 'Milyem 1 ile 1000 arasında olmalı.';
  if (mod === 'odenenden' && s.odenen !== null && (Number.isNaN(s.odenen) || s.odenen < 0)) e.odenen = 'Tutar negatif olamaz.';
  if (mod === 'orandan' && s.iscilik !== null) {
    if (Number.isNaN(s.iscilik) || s.iscilik < 0) e.iscilik = 'İşçilik negatif olamaz.';
    else if (birim === 'yuzde' && s.iscilik > 1000) e.iscilik = 'Yüzde 1000’den büyük olamaz.';
  }
  return e;
}

export function validateFiyat(alim: number | null, alis: number | null): { alim?: string; alis?: string } {
  const e: { alim?: string; alis?: string } = {};
  if (alim !== null && (Number.isNaN(alim) || alim <= 0)) e.alim = 'Fiyat sıfırdan büyük olmalı.';
  if (alis !== null && (Number.isNaN(alis) || alis <= 0)) e.alis = 'Fiyat sıfırdan büyük olmalı.';
  return e;
}

export function validateKesinti(k: number | null): string | undefined {
  if (k === null) return undefined;
  if (Number.isNaN(k) || k < 0 || k > 100) return 'Kesinti %0 ile %100 arasında olmalı.';
  return undefined;
}
