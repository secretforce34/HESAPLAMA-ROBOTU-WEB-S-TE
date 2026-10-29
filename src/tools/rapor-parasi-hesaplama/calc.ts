import { geciciIsGoremezlik } from '../../data/params/gecici-is-goremezlik';
import { pekSinirlariOn } from '../../data/params/sgk-sinirlar';
import { round2 } from '../../lib/finance';

export type RaporTuru = 'hastalik' | 'is-kazasi' | 'meslek-hastaligi' | 'analik';

export interface RaporInput {
  tur: RaporTuru;
  /** Önceki 12 aylık dönemdeki prime esas kazanç toplamı (TL) */
  pekToplam: number;
  /** Bu kazançlara ait prim ödeme gün sayısı (önceki 12 ay) */
  primGun: number;
  /** Önceki 1 yılda kısa vadeli sigorta prim günü (hastalık/analık şartı); genelde primGun ile aynıdır */
  sonBirYilPrimGun: number;
  /** Ayakta tedavi rapor günü (analıkta kullanılmaz) */
  ayaktaGun: number;
  /** Yatarak tedavi günü (analıkta kullanılmaz) */
  yatarakGun: number;
  /** Analık: çoğul gebelik mi */
  cogulGebelik: boolean;
  /** Rapor/doğum tarihi (ISO) — alt sınır için */
  tarih: string;
}

export interface RaporSonucu {
  hakVar: boolean;
  engel: string | null;
  /** 12 aylık PEK ÷ prim günü */
  hesaplananGunluk: number;
  /** Uygulanan sınırdan sonra ödeneğe esas günlük kazanç */
  gunlukKazanc: number;
  sinirUygulandi: boolean;
  ayaktaGunluk: number;
  yatarakGunluk: number;
  ayaktaOdenenGun: number;
  yatarakOdenenGun: number;
  odenmeyenGun: number;
  toplam: number;
}

/**
 * 5510 md. 17–18: ödenek = günlük kazanç × (ayakta 2/3, yatarak 1/2). Hastalıkta ilk 2 gün ödenmez.
 * Analıkta doğum öncesi 8 + sonrası 8 hafta (çoğul gebelikte doğum öncesi 10 hafta) için 2/3 oranında ödenir.
 */
export function hesaplaRapor(i: RaporInput): RaporSonucu {
  const k = geciciIsGoremezlik.values;
  const pek = pekSinirlariOn(i.tarih);
  const gunlukAlt = pek.aylikAlt / 30;
  const gunlukUst = pek.aylikUst / 30;

  const hesaplananGunluk = i.primGun > 0 ? round2(i.pekToplam / i.primGun) : 0;
  let gunlukKazanc = Math.min(hesaplananGunluk, gunlukUst);
  let sinirUygulandi = hesaplananGunluk > gunlukUst;
  const sartliTur = i.tur === 'hastalik' || i.tur === 'analik';
  if (sartliTur && i.primGun < k.azPrimEsigi && gunlukKazanc > gunlukAlt * k.sinirKat) {
    gunlukKazanc = round2(gunlukAlt * k.sinirKat);
    sinirUygulandi = true;
  }

  let engel: string | null = null;
  if (sartliTur && i.sonBirYilPrimGun < k.primSartiGun) {
    engel = `${i.tur === 'analik' ? 'Doğumdan' : 'Rapordan'} önceki 1 yılda en az ${k.primSartiGun} gün kısa vadeli sigorta primi gerekir.`;
  } else if (i.primGun <= 0 || i.pekToplam <= 0) {
    engel = 'Ödeneğe esas kazanç bulunamadı.';
  }

  const ayaktaGunluk = round2(gunlukKazanc * k.ayaktaOran);
  const yatarakGunluk = round2(gunlukKazanc * k.yatarakOran);

  let ayaktaOdenenGun: number;
  let yatarakOdenenGun: number;
  let odenmeyenGun = 0;
  if (i.tur === 'analik') {
    ayaktaOdenenGun = (k.dogumOncesiHafta + k.dogumSonrasiHafta + (i.cogulGebelik ? k.cogulGebelikEkHafta : 0)) * 7;
    yatarakOdenenGun = 0;
  } else {
    ayaktaOdenenGun = i.ayaktaGun;
    yatarakOdenenGun = i.yatarakGun;
    if (i.tur === 'hastalik') {
      // İlk 2 gün ödenmez; önce ayakta günlerinden düşülür (rapor çoğunlukla ayakta başlar).
      odenmeyenGun = Math.min(k.hastalikOdenmeyenGun, ayaktaOdenenGun + yatarakOdenenGun);
      const ayaktanDus = Math.min(odenmeyenGun, ayaktaOdenenGun);
      ayaktaOdenenGun -= ayaktanDus;
      yatarakOdenenGun -= odenmeyenGun - ayaktanDus;
    }
  }

  const hakVar = engel === null;
  const toplam = hakVar ? round2(ayaktaGunluk * ayaktaOdenenGun + yatarakGunluk * yatarakOdenenGun) : 0;

  return {
    hakVar,
    engel,
    hesaplananGunluk,
    gunlukKazanc: round2(gunlukKazanc),
    sinirUygulandi,
    ayaktaGunluk,
    yatarakGunluk,
    ayaktaOdenenGun,
    yatarakOdenenGun,
    odenmeyenGun,
    toplam,
  };
}

export function validateRapor(i: { tur: RaporTuru; pek: number | null; gun: number | null; birYil: number | null; ayakta: number | null; yatarak: number | null }) {
  const e: Record<string, string> = {};
  if (i.pek === null || i.pek <= 0) e.pek = 'Prime esas kazanç toplamını girin.';
  if (i.gun === null || i.gun <= 0) e.gun = 'Prim gün sayısını girin.';
  else if (i.gun > 366) e.gun = '12 ayda en fazla 360 gün prim bildirilir.';
  if (i.birYil === null || i.birYil < 0) e.birYil = 'Son 1 yıldaki prim gününü girin.';
  if (i.tur !== 'analik') {
    if (i.ayakta === null || i.ayakta < 0) e.ayakta = '0 veya daha büyük olmalı.';
    if (i.yatarak === null || i.yatarak < 0) e.yatarak = '0 veya daha büyük olmalı.';
    if ((i.ayakta ?? 0) + (i.yatarak ?? 0) <= 0) e.ayakta = 'Rapor gün sayısını girin.';
  }
  return e;
}
