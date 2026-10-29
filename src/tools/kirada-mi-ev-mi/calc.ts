import { evAlimMasraflari } from '../../data/params/ev-alim';
import { konutKdo, type EnerjiSinifi } from '../../data/params/kredi';
import { round2 } from '../../lib/finance';
import { odemePlani } from '../kredi-hesaplama/calc';

// İki senaryo aynı parayı harcar: kim o ay daha az öderse aradaki farkı yatırıma koyar.
// Ev alan: peşinat + alım masrafları, her ay taksit + sahiplik masrafı; sonunda ev değeri − kalan borç + yatırımı.
// Kiracı: peşinat + alım masrafı kadar parayı baştan yatırıma koyar, her ay kira öder; sonunda yatırımı.

export interface KiraEvInput {
  evFiyati: number;
  pesinat: number;
  /** Konut kredisi aylık faizi (%); konut kredisinde KKDF ve BSMV yok */
  aylikFaiz: number;
  /** Kredi vadesi (ay) */
  vade: number;
  aylikKira: number;
  /** Kiranın yıllık artışı (%) */
  kiraArtisi: number;
  /** Evin yıllık değer artışı (%) */
  evDegerArtisi: number;
  /** Yatırıma konan paranın yıllık net getirisi (%) */
  getiri: number;
  /** Emlakçı hizmet bedeli, alıcı payı (%; KDV hariç) */
  emlakciYuzde: number;
  /** Döner sermaye, ekspertiz, tahsis ücreti vb. (TL) */
  digerMasraf: number;
  /** Ev sahibinin yıllık masrafları: emlak vergisi, bakım, DASK (ev değerinin %'si) */
  sahiplikYuzde: number;
  /** Karşılaştırma süresi (yıl) */
  yil: number;
}

export interface YilKarsilastirma {
  yil: number;
  evDegeri: number;
  kalanBorc: number;
  alanServet: number;
  kiraciServet: number;
  /** O yıl ödenen aylık kira */
  aylikKira: number;
}

export interface KiraEvSonucu {
  kredi: number;
  taksit: number;
  alimMasrafi: number;
  /** Başlangıçta cepten çıkan: peşinat + alım masrafları */
  baslangicNakit: number;
  alanServet: number;
  kiraciServet: number;
  /** alan − kiracı; pozitifse ev almak avantajlı */
  fark: number;
  toplamKira: number;
  toplamFaiz: number;
  toplamSahiplik: number;
  evDegeri: number;
  kalanBorc: number;
  yillar: YilKarsilastirma[];
}

export function alimMasrafi(i: Pick<KiraEvInput, 'evFiyati' | 'emlakciYuzde' | 'digerMasraf'>): number {
  const p = evAlimMasraflari.values;
  const harc = (i.evFiyati * p.tapuHarciYuzde) / 100;
  const emlakci = ((i.evFiyati * i.emlakciYuzde) / 100) * (1 + p.emlakciKdv / 100);
  return round2(harc + emlakci + i.digerMasraf);
}

const aylik = (yillikYuzde: number) => Math.pow(1 + yillikYuzde / 100, 1 / 12) - 1;

export function karsilastir(i: KiraEvInput): KiraEvSonucu {
  const kredi = Math.max(0, i.evFiyati - i.pesinat);
  const plan = kredi > 0 ? odemePlani({ anapara: kredi, vade: i.vade, aylikFaiz: i.aylikFaiz, kkdf: 0, bsmv: 0 }) : null;
  const masraf = alimMasrafi(i);
  const gEv = aylik(i.evDegerArtisi);
  const gYat = aylik(i.getiri);
  const toplamAy = Math.round(i.yil * 12);

  let deger = i.evFiyati;
  let alanYatirim = 0;
  let kiraciYatirim = i.pesinat + masraf;
  let kira = i.aylikKira;
  let toplamKira = 0;
  let toplamFaiz = 0;
  let toplamSahiplik = 0;
  let borc = kredi;
  const yillar: YilKarsilastirma[] = [{ yil: 0, evDegeri: round2(deger), kalanBorc: round2(borc), alanServet: round2(deger - borc), kiraciServet: round2(kiraciYatirim), aylikKira: round2(kira) }];

  for (let m = 1; m <= toplamAy; m++) {
    const satir = plan && m <= plan.satirlar.length ? plan.satirlar[m - 1] : null;
    const taksit = satir?.odeme ?? 0;
    if (satir) {
      toplamFaiz += satir.faiz;
      borc = satir.kalan;
    }
    const sahiplik = (deger * i.sahiplikYuzde) / 100 / 12;
    toplamSahiplik += sahiplik;
    toplamKira += kira;

    const alanGider = taksit + sahiplik;
    alanYatirim = alanYatirim * (1 + gYat) + Math.max(0, kira - alanGider);
    kiraciYatirim = kiraciYatirim * (1 + gYat) + Math.max(0, alanGider - kira);
    deger *= 1 + gEv;

    if (m % 12 === 0) {
      yillar.push({
        yil: m / 12,
        evDegeri: round2(deger),
        kalanBorc: round2(borc),
        alanServet: round2(deger - borc + alanYatirim),
        kiraciServet: round2(kiraciYatirim),
        aylikKira: round2(kira),
      });
      kira *= 1 + i.kiraArtisi / 100;
    }
  }

  const alanServet = round2(deger - borc + alanYatirim);
  const kiraciServet = round2(kiraciYatirim);
  return {
    kredi: round2(kredi),
    taksit: plan?.taksit ?? 0,
    alimMasrafi: masraf,
    baslangicNakit: round2(i.pesinat + masraf),
    alanServet,
    kiraciServet,
    fark: round2(alanServet - kiraciServet),
    toplamKira: round2(toplamKira),
    toplamFaiz: round2(toplamFaiz),
    toplamSahiplik: round2(toplamSahiplik),
    evDegeri: round2(deger),
    kalanBorc: round2(borc),
    yillar,
  };
}

/** Başabaş kira: bu başlangıç kirasının üstünde ev almak, altında kirada kalmak avantajlı. Fark kiraya göre artandır. */
export function basabasKira(i: KiraEvInput): number | null {
  const fark = (k: number) => karsilastir({ ...i, aylikKira: k }).fark;
  let lo = 0;
  let hi = Math.max(i.evFiyati / 12, 1);
  if (fark(lo) >= 0) return 0;
  if (fark(hi) < 0) return null;
  for (let n = 0; n < 60 && hi - lo > 0.5; n++) {
    const mid = (lo + hi) / 2;
    if (fark(mid) >= 0) hi = mid;
    else lo = mid;
  }
  return Math.round(hi);
}

export interface KdoKontrol {
  /** Azami kredi/değer oranı (%) */
  kdo: number;
  azamiKredi: number;
  /** Kredi sınırı aşıyorsa gereken asgari peşinat */
  asgariPesinat: number;
  asiyor: boolean;
}

/** BDDK konut kredisi kredi/değer sınırı (değer ve enerji sınıfına göre). */
export function kdoKontrol(evFiyati: number, pesinat: number, sinif: EnerjiSinifi, baskaKonutVar: boolean): KdoKontrol {
  const kdo = konutKdo(evFiyati, sinif, baskaKonutVar);
  const azamiKredi = round2((evFiyati * kdo) / 100);
  const kredi = Math.max(0, evFiyati - pesinat);
  return { kdo, azamiKredi, asgariPesinat: round2(evFiyati - azamiKredi), asiyor: kredi > azamiKredi + 0.005 };
}

export function validateKiraEv(i: {
  fiyat: number | null;
  pesinat: number | null;
  faiz: number | null;
  vade: number | null;
  kira: number | null;
  kiraArtisi: number | null;
  evArtisi: number | null;
  getiri: number | null;
  yil: number | null;
}) {
  const e: Record<string, string> = {};
  if (i.fiyat === null || i.fiyat <= 0) e.fiyat = 'Ev fiyatını girin.';
  if (i.pesinat === null || i.pesinat < 0) e.pesinat = '0 veya daha büyük olmalı.';
  else if (i.fiyat !== null && i.pesinat > i.fiyat) e.pesinat = 'Peşinat ev fiyatından büyük olamaz.';
  const krediVar = i.fiyat !== null && i.pesinat !== null && i.pesinat < i.fiyat;
  if (krediVar) {
    if (i.faiz === null || i.faiz < 0 || i.faiz > 10) e.faiz = '0 ile 10 arasında olmalı.';
    if (i.vade === null || i.vade < 1 || i.vade > 360 || !Number.isInteger(i.vade)) e.vade = '1 ile 360 ay arasında olmalı.';
  }
  if (i.kira === null || i.kira <= 0) e.kira = 'Aylık kirayı girin.';
  for (const k of ['kiraArtisi', 'evArtisi', 'getiri'] as const) {
    const v = i[k];
    if (v === null || v < -50 || v > 300) e[k] = '-50 ile 300 arasında olmalı.';
  }
  if (i.yil === null || i.yil < 1 || i.yil > 40 || !Number.isInteger(i.yil)) e.yil = '1 ile 40 yıl arasında olmalı.';
  return e;
}
