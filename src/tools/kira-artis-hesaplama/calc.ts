import { ayEkle, tufe } from '../../data/series';
import { round2 } from '../../lib/finance';

// TBK md. 344: konut ve çatılı işyeri kiralarında yenilenen kira yılındaki artış, bir önceki kira yılında
// TÜFE'nin 12 aylık ortalamalara göre değişim oranını geçemez.
// 7409 sayılı Kanun (geçici madde): 11.06.2022–01.07.2024 arasında yenilenen KONUT kiralarında artış %25'i geçemez.

const endeks = new Map(tufe.aylar.map((a) => [a.ay, a.endeks]));

export const SINIR25_BASLANGIC = '2022-06-11';
export const SINIR25_BITIS = '2024-07-01';
export const SON_VERI_AYI = tufe.sonAy;

export type KiraTuru = 'konut' | 'isyeri';

/**
 * TÜFE'nin 12 aylık ortalamalara göre değişimi (%):
 *   (son 12 ayın endeks toplamı ÷ önceki 12 ayın endeks toplamı − 1) × 100
 * TÜİK'in açıkladığı oranla aynı yöntem; 2 haneye yuvarlanır.
 */
export function onIkiAylikOrtalama(ay: string): number | null {
  let son = 0;
  let onceki = 0;
  for (let i = 0; i < 12; i++) {
    const a = endeks.get(ayEkle(ay, -i));
    const b = endeks.get(ayEkle(ay, -12 - i));
    if (a === undefined || b === undefined) return null;
    son += a;
    onceki += b;
  }
  return round2((son / onceki - 1) * 100);
}

export interface OranSonucu {
  /** Esas alınan ay (yenileme ayından bir önceki ay) */
  esasAy: string;
  /** TÜFE 12 aylık ortalama değişimi; henüz açıklanmadıysa null */
  oran: number | null;
  /** Yasal azami artış (sınır uygulanmış) */
  uygulanan: number | null;
  /** %25 konut sınırı uygulandı mı */
  sinir25: boolean;
  /** Oran açıklanmadıysa yaklaşık açıklanma tarihi (TÜİK her ayın 3'ünde açıklar) */
  aciklanma: string | null;
}

/** Yenileme tarihinde uygulanacak azami artış: yenileme ayından önceki ayın 12 aylık ortalaması. */
export function yasalOran(yenilemeTarihi: string, tur: KiraTuru): OranSonucu {
  const yenilemeAyi = yenilemeTarihi.slice(0, 7);
  const esasAy = ayEkle(yenilemeAyi, -1);
  const oran = onIkiAylikOrtalama(esasAy);
  const sinirDonemi = tur === 'konut' && yenilemeTarihi >= SINIR25_BASLANGIC && yenilemeTarihi <= SINIR25_BITIS;
  const sinir25 = oran !== null && sinirDonemi && oran > 25;
  return {
    esasAy,
    oran,
    uygulanan: oran === null ? null : sinir25 ? 25 : oran,
    sinir25,
    aciklanma: oran === null ? `${yenilemeAyi}-03` : null,
  };
}

export function yeniKira(kira: number, oranYuzde: number): number {
  return round2(kira * (1 + oranYuzde / 100));
}

function yilEkle(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4)) + n;
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  const son = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, son)).padStart(2, '0')}`;
}

export interface Yenileme extends OranSonucu {
  tarih: string;
  eskiKira: number;
  yeniKira: number | null;
}

/** Sözleşme başından bugüne (ve bir sonraki yenilemeye) yıllık yenilemelerde azami kira zinciri. */
export function kiraZinciri(ilkKira: number, sozlesmeBaslangici: string, bugun: string, tur: KiraTuru): Yenileme[] {
  const liste: Yenileme[] = [];
  let kira = ilkKira;
  for (let n = 1; n <= 60; n++) {
    const tarih = yilEkle(sozlesmeBaslangici, n);
    const o = yasalOran(tarih, tur);
    const yeni = o.uygulanan === null ? null : yeniKira(kira, o.uygulanan);
    liste.push({ ...o, tarih, eskiKira: kira, yeniKira: yeni });
    if (tarih > bugun || yeni === null) break;
    kira = yeni;
  }
  return liste;
}

/** Son n ayın kira artış oranları (yeniden eskiye). */
export function sonOranlar(n = 24): { ay: string; oran: number }[] {
  const out: { ay: string; oran: number }[] = [];
  for (let i = 0; i < n; i++) {
    const ay = ayEkle(SON_VERI_AYI, -i);
    const oran = onIkiAylikOrtalama(ay);
    if (oran !== null) out.push({ ay, oran });
  }
  return out;
}

export function validateKira(i: { kira: number | null; tarih: string }) {
  const e: Record<string, string> = {};
  if (i.kira === null || i.kira <= 0) e.kira = 'Mevcut kira tutarını girin.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tarih)) e.tarih = 'Bir tarih seçin.';
  else if (i.tarih < '2006-01-01') e.tarih = 'Bu tarih için veri yok.';
  return e;
}
