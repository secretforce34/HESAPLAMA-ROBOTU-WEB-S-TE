import { besKurallari } from '../../data/params/bes';
import { round2 } from '../../lib/finance';

export interface BesInput {
  aylikKatki: number;
  /** Katkı payının her yıl artışı (%) */
  katkiArtisi: number;
  /** Fonların yıllık net getirisi (%) */
  getiri: number;
  /** Bundan sonra kaç yıl katkı ödenecek */
  yil: number;
  /** Bugünkü yaş */
  yas: number;
  /** Zaten BES'i olanlar için: sistemde geçen süre (yıl) */
  mevcutYil: number;
  /** Şimdiye kadar ödenen katkı payı toplamı */
  mevcutOdenen: number;
  /** Bugünkü katkı payı birikimi (getiri dahil) */
  mevcutBirikim: number;
  /** Bugünkü devlet katkısı birikimi */
  mevcutDk: number;
}

export interface CikisSatiri {
  /** Bugünden itibaren geçen yıl */
  yil: number;
  /** Sisteme girişten itibaren geçen yıl */
  sistemYili: number;
  yas: number;
  emeklilik: boolean;
  odenen: number;
  birikim: number;
  /** Getirisiyle birlikte devlet katkısı birikimi */
  dkBirikim: number;
  dkHakOrani: number;
  hakEdilenDk: number;
  /** Katılımcı katkı paylarının getirisi */
  getiri: number;
  stopajOrani: number;
  stopaj: number;
  /** Eline geçen: birikim − stopaj + hak edilen devlet katkısı */
  net: number;
}

export interface BesSonucu {
  cikislar: CikisSatiri[];
  son: CikisSatiri;
  /** Hesaba yatan devlet katkısı toplamı (getirisi hariç) */
  yatanDk: number;
  /** Üst sınır nedeniyle devlet katkısı alınamayan katkı payı var mı */
  sinirAsildi: boolean;
  /** Emeklilik hakkı için gereken yıl (bugünden); zaten hak kazanılmışsa 0 */
  emeklilikIcinYil: number;
}

/** Sistemde geçen süreye göre (emeklilik dışı) hak kazanılan devlet katkısı oranı (%). */
export function hakOrani(sistemYili: number): number {
  for (const d of besKurallari.values.hakKazanma) if (sistemYili >= d.yil) return d.oran;
  return 0;
}

export function emeklilikHakki(sistemYili: number, yas: number): boolean {
  const p = besKurallari.values;
  return sistemYili >= p.emeklilikYil && yas >= p.emeklilikYas;
}

export function stopajOrani(sistemYili: number, emeklilik: boolean): number {
  const s = besKurallari.values.stopaj;
  if (emeklilik) return s.emeklilik;
  return sistemYili >= besKurallari.values.emeklilikYil ? s.onYilVeUzeri : s.onYildanAz;
}

export function hesaplaBes(i: BesInput): BesSonucu {
  const p = besKurallari.values;
  const r = Math.pow(1 + i.getiri / 100, 1 / 12) - 1;
  let birikim = i.mevcutBirikim;
  let dk = i.mevcutDk;
  let odenen = i.mevcutOdenen;
  let yatanDk = 0;
  let dkYil = 0;
  let sinirAsildi = false;
  const cikislar: CikisSatiri[] = [];

  for (let m = 1; m <= i.yil * 12; m++) {
    const y = Math.floor((m - 1) / 12);
    if ((m - 1) % 12 === 0) dkYil = 0;
    const artis = Math.pow(1 + i.katkiArtisi / 100, y);
    const katki = i.aylikKatki * artis;
    // Üst sınırın da asgari ücretle, katkı artışı kadar arttığı varsayılır
    const sinir = p.yillikUstSinir * artis;
    const istenen = (katki * p.devletKatkisiOrani) / 100;
    const verilen = Math.max(0, Math.min(istenen, sinir - dkYil));
    if (verilen < istenen - 0.005) sinirAsildi = true;
    dkYil += verilen;
    yatanDk += verilen;

    birikim = birikim * (1 + r) + katki;
    dk = dk * (1 + r) + verilen;
    odenen += katki;

    if (m % 12 === 0) {
      const yil = m / 12;
      const sistemYili = i.mevcutYil + yil;
      const yas = i.yas + yil;
      const emeklilik = emeklilikHakki(sistemYili, yas);
      const dkHakOrani = emeklilik ? 100 : hakOrani(sistemYili);
      const getiri = birikim - odenen;
      const so = stopajOrani(sistemYili, emeklilik);
      const stopaj = round2((Math.max(0, getiri) * so) / 100);
      const hakEdilenDk = round2((dk * dkHakOrani) / 100);
      cikislar.push({
        yil,
        sistemYili,
        yas,
        emeklilik,
        odenen: round2(odenen),
        birikim: round2(birikim),
        dkBirikim: round2(dk),
        dkHakOrani,
        hakEdilenDk,
        getiri: round2(getiri),
        stopajOrani: so,
        stopaj,
        net: round2(birikim - stopaj + hakEdilenDk),
      });
    }
  }

  const emeklilikIcinYil = Math.max(0, p.emeklilikYil - i.mevcutYil, p.emeklilikYas - i.yas);
  return { cikislar, son: cikislar[cikislar.length - 1], yatanDk: round2(yatanDk), sinirAsildi, emeklilikIcinYil };
}

export function validateBes(i: {
  katki: number | null;
  getiri: number | null;
  yil: number | null;
  yas: number | null;
  mevcutYil: number | null;
  mevcutOdenen: number | null;
  mevcutBirikim: number | null;
}) {
  const e: Record<string, string> = {};
  if (i.katki === null || i.katki <= 0) e.katki = 'Aylık katkı payını girin.';
  if (i.getiri === null || i.getiri < -50 || i.getiri > 300) e.getiri = '-50 ile 300 arasında olmalı.';
  if (i.yil === null || i.yil < 1 || i.yil > 50 || !Number.isInteger(i.yil)) e.yil = '1 ile 50 yıl arasında olmalı.';
  if (i.yas === null || i.yas < 0 || i.yas > 90 || !Number.isInteger(i.yas)) e.yas = '0 ile 90 arasında tam sayı olmalı.';
  if (i.mevcutYil !== null && (i.mevcutYil < 0 || i.mevcutYil > 40)) e.mevcutYil = '0 ile 40 arasında olmalı.';
  if ((i.mevcutBirikim ?? 0) > 0 && !((i.mevcutOdenen ?? 0) > 0)) e.mevcutOdenen = 'Birikim varsa ödenen katkı toplamını da girin.';
  return e;
}
