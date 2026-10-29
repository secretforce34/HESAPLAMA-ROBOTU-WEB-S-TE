import { memurEmekliZam } from '../../data/params/memur-emekli-zam';
import { ayEkle, tufe } from '../../data/series';
import { round2, roundTo } from '../../lib/finance';

export type Statu = 'emekli' | 'memur' | 'memur-emekli';

const aylik = new Map(tufe.aylar.map((a) => [a.ay, a.aylik]));

/** Zam ayı ("2027-01") için esas alınan 6 ay ("2026-07" … "2026-12") */
export function altiAy(zamAyi: string): string[] {
  return Array.from({ length: 6 }, (_, i) => ayEkle(zamAyi, i - 6));
}

/** Zam ayından önceki 6 ayın toplu sözleşme dönemi ("2027-01" için "2026-2") ve zam ayının dönemi ("2027-1") */
function donemler(zamAyi: string) {
  const y = Number(zamAyi.slice(0, 4));
  const ocak = zamAyi.endsWith('-01');
  return { onceki: ocak ? `${y - 1}-2` : `${y}-1`, yeni: ocak ? `${y}-1` : `${y}-2` };
}

export function toplusozlesme(donem: string): number | null {
  return memurEmekliZam.values.toplusozlesme.find((t) => t.donem === donem)?.oran ?? null;
}

export interface AyVerisi {
  ay: string;
  oran: number;
  /** true: TÜİK açıkladı; false: kullanıcı tahmini */
  aciklandi: boolean;
}

export interface ZamSonucu {
  zamAyi: string;
  aylar: AyVerisi[];
  /** 6 aylık kümülatif TÜFE (%) */
  altiAylikTufe: number;
  /** Uygulanan zam (%) */
  zam: number;
  /** Memurda: toplu sözleşme ve enflasyon farkı */
  toplusozlesme: number | null;
  enflasyonFarki: number | null;
  /** Oran resmî olarak açıklandı mı (tahmin değil) */
  resmi: boolean;
  tahminAySayisi: number;
}

/**
 * SSK/Bağ-Kur emeklisi: zam = önceki 6 ayın kümülatif TÜFE artışı.
 * Memur ve memur emeklisi: enflasyon farkı = (1 + 6 aylık TÜFE) ÷ (1 + önceki dönem toplu sözleşme) − 1 (eksi ise 0);
 *   zam = (1 + enflasyon farkı) × (1 + yeni dönem toplu sözleşme) − 1.
 * Açıklanmış dönemlerde resmî oran kullanılır; açıklanmamış aylar için kullanıcı tahmini girilir.
 */
export function zamHesapla(zamAyi: string, statu: Statu, tahminler: Record<string, number>): ZamSonucu | null {
  const aylar: AyVerisi[] = altiAy(zamAyi).map((ay) => {
    const a = aylik.get(ay);
    return a !== undefined ? { ay, oran: a, aciklandi: true } : { ay, oran: tahminler[ay] ?? Number.NaN, aciklandi: false };
  });
  if (aylar.some((a) => !Number.isFinite(a.oran))) return null;
  const kumulatif = (aylar.reduce((k, a) => k * (1 + a.oran / 100), 1) - 1) * 100;
  const resmiKayit = memurEmekliZam.values.aciklanan.find((a) => a.ay === zamAyi);
  const altiAylikTufe = resmiKayit && aylar.every((a) => a.aciklandi) ? resmiKayit.emekli : roundTo(kumulatif, 2);

  const { onceki, yeni } = donemler(zamAyi);
  const ts0 = toplusozlesme(onceki);
  const ts1 = toplusozlesme(yeni);
  const resmi = Boolean(resmiKayit) && aylar.every((a) => a.aciklandi);

  if (statu === 'emekli') {
    return { zamAyi, aylar, altiAylikTufe, zam: altiAylikTufe, toplusozlesme: null, enflasyonFarki: null, resmi, tahminAySayisi: aylar.filter((a) => !a.aciklandi).length };
  }
  if (ts0 === null || ts1 === null) return null;
  const fark = Math.max(0, ((1 + altiAylikTufe / 100) / (1 + ts0 / 100) - 1) * 100);
  const hesaplanan = ((1 + fark / 100) * (1 + ts1 / 100) - 1) * 100;
  return {
    zamAyi,
    aylar,
    altiAylikTufe,
    zam: resmi && resmiKayit ? resmiKayit.memur : roundTo(hesaplanan, 2),
    toplusozlesme: ts1,
    enflasyonFarki: roundTo(fark, 2),
    resmi,
    tahminAySayisi: aylar.filter((a) => !a.aciklandi).length,
  };
}

export function yeniMaas(maas: number, zamYuzde: number): number {
  return round2(maas * (1 + zamYuzde / 100));
}

/** Seçilebilir zam dönemleri: açıklanmışlar + son veriden sonraki iki dönem */
export function donemSecenekleri(sonVeriAyi = tufe.sonAy): string[] {
  const liste = memurEmekliZam.values.aciklanan.map((a) => a.ay);
  const y = Number(sonVeriAyi.slice(0, 4));
  let ay = Number(sonVeriAyi.slice(5, 7)) < 7 ? `${y}-07` : `${y + 1}-01`;
  for (let i = 0; i < 2; i++) {
    if (!liste.includes(ay)) liste.push(ay);
    ay = ay.endsWith('-01') ? `${ay.slice(0, 4)}-07` : `${Number(ay.slice(0, 4)) + 1}-01`;
  }
  return liste.sort();
}
