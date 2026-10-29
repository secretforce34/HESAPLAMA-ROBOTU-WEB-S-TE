import { round2 } from '../../lib/finance';

// Tüm tutarlar bugünkü parayla (reel) düşünülür; getiri de enflasyon üstü (reel) getiridir.

export interface OzgurlukInput {
  /** Bugünkü fiyatlarla aylık harcama */
  aylikHarcama: number;
  mevcutBirikim: number;
  aylikBirikim: number;
  /** Enflasyon üstü yıllık getiri beklentisi (%) */
  reelGetiri: number;
  /** Birikimden her yıl çekilecek oran (%) — "güvenli çekim oranı" */
  cekimOrani: number;
  /** Aylık birikimin her yıl reel artışı (%) */
  birikimArtisi: number;
  /** Şu anki yaş (isteğe bağlı, 0 = yok) */
  yas: number;
}

export interface YilSatiri {
  yil: number;
  birikim: number;
  /** Bu birikimin her ay sağlayabileceği gelir */
  aylikGelir: number;
}

export interface OzgurlukSonucu {
  hedef: number;
  /** Hedefe ulaşma süresi (ay); ulaşılamıyorsa null */
  ay: number | null;
  yasinda: number | null;
  yillar: YilSatiri[];
  /** Hiç birikim eklemeden bugünkü birikimin hedefe ulaşma süresi (ay) */
  birikimsizAy: number | null;
}

const MAKS_AY = 100 * 12;

export function hesaplaOzgurluk(i: OzgurlukInput): OzgurlukSonucu {
  const hedef = round2((i.aylikHarcama * 12) / (i.cekimOrani / 100));
  const rAy = Math.pow(1 + i.reelGetiri / 100, 1 / 12) - 1;
  let b = i.mevcutBirikim;
  let katki = i.aylikBirikim;
  let ay: number | null = b >= hedef ? 0 : null;
  const yillar: YilSatiri[] = [{ yil: 0, birikim: round2(b), aylikGelir: round2((b * i.cekimOrani) / 100 / 12) }];
  for (let m = 1; m <= MAKS_AY; m++) {
    b = b * (1 + rAy) + katki;
    if (ay === null && b >= hedef) ay = m;
    if (m % 12 === 0) {
      yillar.push({ yil: m / 12, birikim: round2(b), aylikGelir: round2((b * i.cekimOrani) / 100 / 12) });
      katki *= 1 + i.birikimArtisi / 100;
      if (ay !== null && m / 12 >= Math.ceil(ay / 12) + 2) break;
    }
  }

  let birikimsizAy: number | null = null;
  if (i.mevcutBirikim > 0 && rAy > 0) {
    birikimsizAy = i.mevcutBirikim >= hedef ? 0 : Math.ceil(Math.log(hedef / i.mevcutBirikim) / Math.log(1 + rAy));
    if (birikimsizAy > MAKS_AY) birikimsizAy = null;
  }

  return {
    hedef,
    ay,
    yasinda: ay !== null && i.yas > 0 ? Math.floor(i.yas + ay / 12) : null,
    yillar,
    birikimsizAy,
  };
}

export function validateOzgurluk(i: { harcama: number | null; birikim: number | null; aylik: number | null; getiri: number | null; cekim: number | null }) {
  const e: Record<string, string> = {};
  if (i.harcama === null || i.harcama <= 0) e.harcama = 'Aylık harcamanızı girin.';
  if (i.birikim === null || i.birikim < 0) e.birikim = '0 veya daha büyük olmalı.';
  if (i.aylik === null || i.aylik < 0) e.aylik = '0 veya daha büyük olmalı.';
  if (i.getiri === null || i.getiri < -10 || i.getiri > 20) e.getiri = '-10 ile 20 arasında olmalı.';
  if (i.cekim === null || i.cekim <= 0 || i.cekim > 15) e.cekim = '0 ile 15 arasında olmalı.';
  return e;
}
