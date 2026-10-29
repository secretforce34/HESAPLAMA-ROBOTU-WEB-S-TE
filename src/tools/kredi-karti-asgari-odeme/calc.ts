import { asgariOdemeOrani, kartFaizDilimi, type AsgariOdemeDonemi, type KartFaizDonemi } from '../../data/params/kredi';
import { round2 } from '../../lib/finance';

export type BorcTuru = 'alisveris' | 'nakit';

export interface OranAyari {
  /** azami: TCMB’nin dönem borcuna göre ilan ettiği azami oranlar · ozel: bankanızın oranları */
  mod: 'azami' | 'ozel';
  donem: KartFaizDonemi;
  borcTuru: BorcTuru;
  /** Kurumsal kartta dönem borcuna bakılmaksızın en üst dilim uygulanır */
  kurumsal: boolean;
  /** Özel aylık akdi ve gecikme faizi (%) */
  ozelAkdi?: number;
  ozelGecikme?: number;
}

/**
 * Bir hesap döneminde uygulanacak aylık akdi ve gecikme faizi (%).
 * TCMB tablosu: TL alışverişte dilim dönem borcuna göre seçilir; nakit çekimde (ve KMH’de) tek oran vardır.
 */
export function donemOranlari(donemBorcu: number, a: OranAyari): { akdi: number; gecikme: number } {
  if (a.mod === 'ozel') return { akdi: a.ozelAkdi ?? 0, gecikme: a.ozelGecikme ?? a.ozelAkdi ?? 0 };
  if (a.borcTuru === 'nakit') return { ...a.donem.nakit };
  const d = kartFaizDilimi(donemBorcu, a.donem, a.kurumsal);
  return { akdi: d.akdi, gecikme: d.gecikme };
}

/** Asgari ödeme tutarı: dönem borcu × kart limitine göre oran (kuruşa yuvarlanır). */
export function asgariTutar(donemBorcu: number, kartLimiti: number, donem: AsgariOdemeDonemi): number {
  return round2((donemBorcu * asgariOdemeOrani(kartLimiti, donem)) / 100);
}

export type Strateji = { tur: 'asgari' } | { tur: 'sabit'; tutar: number } | { tur: 'tam' };

export interface SimInput {
  /** İlk ekstredeki dönem borcu (yeni harcama yapılmadığı varsayılır) */
  borc: number;
  /** Asgari ödeme oranı (%) */
  asgariOran: number;
  oran: OranAyari;
  /** Faize eklenen KKDF ve BSMV (%) */
  kkdf: number;
  bsmv: number;
  strateji: Strateji;
  /** Kalan borç bu tutarın altına inince tamamı ödenmiş sayılır (asgari ödeme stratejisi) */
  kucukBakiye?: number;
  /** En fazla simüle edilecek ay */
  azamiAy?: number;
}

export interface SimSatiri {
  ay: number;
  donemBorcu: number;
  asgari: number;
  odeme: number;
  /** Ödemeden sonra kalan */
  kalan: number;
  akdiOran: number;
  /** Akdi faiz (asgari tutarı aşan kalan kısma) */
  akdiFaiz: number;
  /** Gecikme faizi (ödenmeyen asgari tutar kısmına) */
  gecikmeFaizi: number;
  kkdf: number;
  bsmv: number;
  /** Bir sonraki dönem borcu */
  sonraki: number;
  asgariAlti: boolean;
}

export interface SimSonucu {
  satirlar: SimSatiri[];
  /** Borcun bittiği ay sayısı (bitmediyse simüle edilen ay sayısı) */
  ay: number;
  toplamOdeme: number;
  toplamAkdiFaiz: number;
  toplamGecikmeFaizi: number;
  toplamKkdf: number;
  toplamBsmv: number;
  /** Faiz + gecikme faizi + KKDF + BSMV */
  toplamMaliyet: number;
  /** Ödeme faizi karşılamadığı için borç bitmiyor ya da azami aya ulaşıldı */
  bitmedi: boolean;
  /** Asgari tutarın altında ödeme yapılan ay sayısı */
  asgariAltiAy: number;
}

/**
 * Yeni harcama yapılmadığı varsayımıyla ekstre ekstre simülasyon (bir dönem 30 gün kabul edilir).
 * 5464 s. Kanun ve kart sözleşmelerindeki kural: dönem borcunun bir kısmı ödenirse kalan bakiyeye hesap kesim
 * tarihinden itibaren akdi faiz; asgari tutarın altında ödenirse asgari tutarın ödenmeyen kısmına gecikme faizi,
 * kalanın asgari tutarı aşan kısmına akdi faiz işler. KKDF ve BSMV faiz tutarı üzerinden hesaplanır.
 */
export function simuleEt(input: SimInput): SimSonucu {
  const azamiAy = input.azamiAy ?? 600;
  const kucuk = input.kucukBakiye ?? 100;
  const k = input.kkdf / 100;
  const b = input.bsmv / 100;
  const satirlar: SimSatiri[] = [];
  let borc = round2(input.borc);
  let bitmedi = false;

  for (let ay = 1; borc > 0; ay++) {
    if (ay > azamiAy) {
      bitmedi = true;
      break;
    }
    const asgari = round2((borc * input.asgariOran) / 100);
    let odeme: number;
    if (input.strateji.tur === 'tam') odeme = borc;
    else if (input.strateji.tur === 'sabit') odeme = Math.min(input.strateji.tutar, borc);
    else odeme = borc <= kucuk ? borc : asgari;
    odeme = round2(odeme);

    const kalan = round2(borc - odeme);
    const { akdi, gecikme } = donemOranlari(borc, input.oran);
    let akdiFaiz = 0;
    let gecikmeFaizi = 0;
    const asgariAlti = kalan > 0 && odeme < asgari;
    if (kalan > 0) {
      const odenmeyenAsgari = asgariAlti ? round2(asgari - odeme) : 0;
      gecikmeFaizi = round2((odenmeyenAsgari * gecikme) / 100);
      akdiFaiz = round2(((kalan - odenmeyenAsgari) * akdi) / 100);
    }
    const faiz = round2(akdiFaiz + gecikmeFaizi);
    const kkdf = round2(faiz * k);
    const bsmv = round2(faiz * b);
    const sonraki = round2(kalan + faiz + kkdf + bsmv);
    satirlar.push({ ay, donemBorcu: borc, asgari, odeme, kalan, akdiOran: akdi, akdiFaiz, gecikmeFaizi, kkdf, bsmv, sonraki, asgariAlti });

    // Ödeme faizi karşılamıyorsa borç hiç bitmez.
    if (kalan > 0 && sonraki >= borc) {
      bitmedi = true;
      break;
    }
    borc = sonraki;
  }

  const topla = (f: (s: SimSatiri) => number) => round2(satirlar.reduce((t, s) => t + f(s), 0));
  const toplamAkdiFaiz = topla((s) => s.akdiFaiz);
  const toplamGecikmeFaizi = topla((s) => s.gecikmeFaizi);
  const toplamKkdf = topla((s) => s.kkdf);
  const toplamBsmv = topla((s) => s.bsmv);
  return {
    satirlar,
    ay: satirlar.length,
    toplamOdeme: topla((s) => s.odeme),
    toplamAkdiFaiz,
    toplamGecikmeFaizi,
    toplamKkdf,
    toplamBsmv,
    toplamMaliyet: round2(toplamAkdiFaiz + toplamGecikmeFaizi + toplamKkdf + toplamBsmv),
    bitmedi,
    asgariAltiAy: satirlar.filter((s) => s.asgariAlti).length,
  };
}

/** Borcu tam olarak n ayda bitirmek için gereken yaklaşık sabit aylık ödeme (ikili arama). */
export function gerekenSabitOdeme(input: Omit<SimInput, 'strateji'>, ay: number): number {
  let lo = 0;
  let hi = input.borc * 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const s = simuleEt({ ...input, strateji: { tur: 'sabit', tutar: mid }, azamiAy: ay });
    if (!s.bitmedi && s.ay <= ay) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi * 100) / 100;
}

export interface KartGirdisi {
  borc: number | null;
  limit: number | null;
  kkdf: number | null;
  bsmv: number | null;
  ozelAkdi?: number | null;
  ozelGecikme?: number | null;
  sabit?: number | null;
}

export function validateKart(i: KartGirdisi, ozelMod: boolean, sabitVar: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (i.borc === null || Number.isNaN(i.borc)) e.borc = 'Dönem borcunu girin.';
  else if (i.borc <= 0) e.borc = 'Borç sıfırdan büyük olmalı.';
  else if (i.borc > 1_000_000_000) e.borc = 'Tutar çok büyük.';
  if (i.limit === null || Number.isNaN(i.limit)) e.limit = 'Kart limitini girin.';
  else if (i.limit <= 0) e.limit = 'Limit sıfırdan büyük olmalı.';
  if (i.kkdf === null || Number.isNaN(i.kkdf) || i.kkdf < 0 || i.kkdf > 100) e.kkdf = 'KKDF %0–%100 arasında olmalı.';
  if (i.bsmv === null || Number.isNaN(i.bsmv) || i.bsmv < 0 || i.bsmv > 100) e.bsmv = 'BSMV %0–%100 arasında olmalı.';
  if (ozelMod) {
    if (i.ozelAkdi === null || i.ozelAkdi === undefined || Number.isNaN(i.ozelAkdi) || i.ozelAkdi < 0 || i.ozelAkdi > 20) e.akdi = 'Aylık akdi faiz %0–%20 arasında olmalı.';
    if (i.ozelGecikme === null || i.ozelGecikme === undefined || Number.isNaN(i.ozelGecikme) || i.ozelGecikme < 0 || i.ozelGecikme > 20)
      e.gecikme = 'Aylık gecikme faizi %0–%20 arasında olmalı.';
  }
  if (sabitVar && (i.sabit === null || i.sabit === undefined || Number.isNaN(i.sabit) || i.sabit <= 0)) e.sabit = 'Aylık ödeme tutarını girin.';
  return e;
}
