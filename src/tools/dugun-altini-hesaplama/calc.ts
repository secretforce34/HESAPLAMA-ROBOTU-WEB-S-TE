import { darphaneAltinlari, type CumhuriyetAltiniId } from '../../data/params/altin';
import { round2, roundTo } from '../../lib/finance';

/** Kuyumcu fiyatı: alış (kuyumcunun sizden aldığı) ve satış (kuyumcunun size sattığı), TL. */
export interface Fiyat {
  alis: number | null;
  satis: number | null;
}

export interface ZiynetAdedi {
  id: CumhuriyetAltiniId;
  adet: number;
}

export interface TakiGirdisi {
  /** Satır adı (isteğe bağlı) */
  ad?: string;
  gram: number;
  /** Binde saf altın oranı (916, 750 …) */
  milyem: number;
  /** Kuyumcu ayarı. 22 ayar bilezik fiyatı yalnızca ayar = 22 olan satırlara uygulanır. */
  ayar: number;
}

export interface DugunInput {
  ziynet: ZiynetAdedi[];
  takilar: TakiGirdisi[];
  /** Has (24 ayar) altının gram fiyatı. Her şey buradan türetilir. */
  has: Fiyat;
  /** Kullanıcı ürün bazında kendi fiyatını girdiyse (TL / adet): has fiyatından türetilen değerin yerine geçer. */
  urunFiyatlari?: Partial<Record<CumhuriyetAltiniId, Fiyat>>;
  /** 22 ayar bilezik için kuyumcunun gram fiyatı (TL / gram brüt). */
  bilezik22?: Fiyat;
}

export type Taraf = 'alis' | 'satis';

export interface KalemSonucu {
  anahtar: string;
  ad: string;
  /** Ziynet altınlarında adet */
  adet?: number;
  /** Bu kalemin toplam brüt ağırlığı (gram) */
  brutGram: number;
  /** Saf (has) altın gramı */
  hasGram: number;
  /** Kuyumcunun alış fiyatıyla değer (bozdurma) */
  alis: number | null;
  /** Kuyumcunun satış fiyatıyla değer (satın alma) */
  satis: number | null;
  /** Kullanıcı bu kalem için kendi ürün fiyatını girdiyse true */
  ozelFiyat: boolean;
}

export interface DugunSonucu {
  kalemler: KalemSonucu[];
  brutGram: number;
  hasGram: number;
  /** Tüm kalemler alış fiyatıyla değerlenebiliyorsa toplam; yoksa null */
  alisToplam: number | null;
  satisToplam: number | null;
  /** satış − alış (TL) */
  makas: number | null;
  /** Makas, satış değerinin yüzde kaçı: hemen geri satılırsa kaybedilen pay */
  makasOrani: number | null;
}

/** Bir adet Cumhuriyet altınının saf altın gramı: ağırlık × 916,6 / 1000 */
export function adetHasGram(id: CumhuriyetAltiniId): number {
  const t = darphaneAltinlari.values.turler.find((x) => x.id === id);
  if (!t) throw new Error(`Bilinmeyen altın türü: ${id}`);
  return (t.agirlik * darphaneAltinlari.values.milyem) / 1000;
}

/** Gram × milyem / 1000 */
export function hasGramOf(gram: number, milyem: number): number {
  return (gram * milyem) / 1000;
}

const pozitif = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Bir kalemin bir taraftaki (alış/satış) değeri. Kullanıcı bu ürün için kendi fiyatını girdiyse o,
 * yoksa has gram fiyatından türetilen değer kullanılır. Kuruşa yuvarlama kalem başına yapılır;
 * toplam, yuvarlanmış kalemlerin toplamıdır (ekrandaki satırlar toplamla tutarlı olsun diye).
 */
function kalemDegeri(
  hasGramHam: number,
  hasFiyati: number | null,
  ozelBirimFiyat: number | null,
  ozelMiktar: number,
): number | null {
  if (ozelBirimFiyat !== null) return round2(ozelMiktar * ozelBirimFiyat);
  if (hasFiyati !== null) return round2(hasGramHam * hasFiyati);
  return null;
}

function toplamTaraf(kalemler: KalemSonucu[], taraf: Taraf): number | null {
  if (kalemler.length === 0) return null;
  let t = 0;
  for (const k of kalemler) {
    const v = k[taraf];
    if (v === null) return null;
    t += v;
  }
  return round2(t);
}

export function hesaplaDugunAltini(input: DugunInput): DugunSonucu {
  const hasAlis = pozitif(input.has.alis) ? input.has.alis : null;
  const hasSatis = pozitif(input.has.satis) ? input.has.satis : null;
  const kalemler: KalemSonucu[] = [];

  for (const z of input.ziynet) {
    if (!(z.adet > 0)) continue;
    const t = darphaneAltinlari.values.turler.find((x) => x.id === z.id);
    if (!t) continue;
    const birimHas = adetHasGram(z.id);
    const ozel = input.urunFiyatlari?.[z.id];
    const ozelAlis = pozitif(ozel?.alis) ? ozel.alis : null;
    const ozelSatis = pozitif(ozel?.satis) ? ozel.satis : null;
    const hasHam = birimHas * z.adet;
    kalemler.push({
      anahtar: z.id,
      ad: t.ad,
      adet: z.adet,
      brutGram: roundTo(t.agirlik * z.adet, 4),
      hasGram: roundTo(hasHam, 4),
      alis: kalemDegeri(hasHam, hasAlis, ozelAlis, z.adet),
      satis: kalemDegeri(hasHam, hasSatis, ozelSatis, z.adet),
      ozelFiyat: ozelAlis !== null || ozelSatis !== null,
    });
  }

  input.takilar.forEach((t, i) => {
    if (!(t.gram > 0)) return;
    const hasHam = hasGramOf(t.gram, t.milyem);
    // 22 ayar bilezik için kuyumcunun kendi gram fiyatı varsa o; fiyat gram (brüt) başınadır.
    const ozel = t.ayar === 22 ? input.bilezik22 : undefined;
    const ozelAlis = pozitif(ozel?.alis) ? ozel.alis : null;
    const ozelSatis = pozitif(ozel?.satis) ? ozel.satis : null;
    kalemler.push({
      anahtar: `taki-${i}`,
      ad: t.ad?.trim() ? t.ad.trim() : `${t.ayar} ayar takı`,
      brutGram: roundTo(t.gram, 4),
      hasGram: roundTo(hasHam, 4),
      alis: kalemDegeri(hasHam, hasAlis, ozelAlis, t.gram),
      satis: kalemDegeri(hasHam, hasSatis, ozelSatis, t.gram),
      ozelFiyat: ozelAlis !== null || ozelSatis !== null,
    });
  });

  const brutGram = roundTo(kalemler.reduce((t, k) => t + k.brutGram, 0), 4);
  const hasGram = roundTo(kalemler.reduce((t, k) => t + k.hasGram, 0), 4);
  const alisToplam = toplamTaraf(kalemler, 'alis');
  const satisToplam = toplamTaraf(kalemler, 'satis');
  const makas = alisToplam !== null && satisToplam !== null ? round2(satisToplam - alisToplam) : null;
  const makasOrani = makas !== null && satisToplam !== null && satisToplam > 0 ? roundTo((makas / satisToplam) * 100, 2) : null;

  return { kalemler, brutGram, hasGram, alisToplam, satisToplam, makas, makasOrani };
}

/** Tek bir Cumhuriyet altınının (1 adet) fiyatı: ürün fiyatı varsa o, yoksa has fiyatından türetilen. */
export function birimFiyat(id: CumhuriyetAltiniId, input: Pick<DugunInput, 'has' | 'urunFiyatlari'>): Fiyat {
  const hasHam = adetHasGram(id);
  const ozel = input.urunFiyatlari?.[id];
  return {
    alis: kalemDegeri(
      hasHam,
      pozitif(input.has.alis) ? input.has.alis : null,
      pozitif(ozel?.alis) ? ozel.alis : null,
      1,
    ),
    satis: kalemDegeri(
      hasHam,
      pozitif(input.has.satis) ? input.has.satis : null,
      pozitif(ozel?.satis) ? ozel.satis : null,
      1,
    ),
  };
}

export interface ButceSatiri {
  id: CumhuriyetAltiniId;
  /** Kuyumcunun satış fiyatı (1 adet) */
  birimSatis: number;
  /** Bütçeyle alınabilecek tam adet */
  adet: number;
  /** Artan tutar */
  kalan: number;
}

/**
 * Ters yön: bütçeyle her tür altından en fazla kaç adet alınabilir? Satın alırken kuyumcunun
 * satış fiyatı geçerlidir. Satış fiyatı bulunamayan türler listeye alınmaz.
 */
export function butceyeGore(
  butce: number,
  input: Pick<DugunInput, 'has' | 'urunFiyatlari'>,
  idler: CumhuriyetAltiniId[],
): ButceSatiri[] {
  const out: ButceSatiri[] = [];
  for (const id of idler) {
    const f = birimFiyat(id, input).satis;
    if (f === null || f <= 0) continue;
    const adet = butce > 0 ? Math.floor(round2(butce) / f + 1e-9) : 0;
    out.push({ id, birimSatis: f, adet, kalan: round2(Math.max(0, butce) - adet * f) });
  }
  return out;
}

export interface FiyatHatalari {
  hasAlis?: string;
  hasSatis?: string;
  /** Alış ve satıştan hiçbiri girilmedi */
  fiyat?: string;
}

export function validateFiyat(has: Fiyat): FiyatHatalari {
  const e: FiyatHatalari = {};
  const gecerli = (n: number | null) => n !== null && !Number.isNaN(n);
  if (gecerli(has.alis) && (has.alis as number) <= 0) e.hasAlis = 'Fiyat sıfırdan büyük olmalı.';
  if (gecerli(has.satis) && (has.satis as number) <= 0) e.hasSatis = 'Fiyat sıfırdan büyük olmalı.';
  if (!pozitif(has.alis) && !pozitif(has.satis) && !e.hasAlis && !e.hasSatis) {
    e.fiyat = 'Has (24 ayar) gram fiyatını alış, satış ya da ikisi için girin.';
  }
  return e;
}

export function validateAdet(adet: number | null): string | undefined {
  if (adet === null) return undefined; // boş = 0
  if (Number.isNaN(adet) || adet < 0) return 'Adet negatif olamaz.';
  if (!Number.isInteger(adet)) return 'Adet tam sayı olmalı.';
  if (adet > 10000) return 'Bu kadar büyük bir adet girilemez.';
  return undefined;
}

export function validateTaki(gram: number | null, milyem: number | null): { gram?: string; milyem?: string } {
  const e: { gram?: string; milyem?: string } = {};
  if (gram === null || Number.isNaN(gram)) e.gram = 'Ağırlığı gram olarak girin.';
  else if (gram < 0) e.gram = 'Ağırlık negatif olamaz.';
  else if (gram > 100000) e.gram = 'Bu kadar büyük bir ağırlık girilemez.';
  if (milyem === null || Number.isNaN(milyem)) e.milyem = 'Milyem girin.';
  else if (milyem <= 0 || milyem > 1000) e.milyem = 'Milyem 1 ile 1000 arasında olmalı.';
  return e;
}
