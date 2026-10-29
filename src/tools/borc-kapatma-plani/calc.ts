import { asgariOdemeOrani, genelAzamiVade, kartFaizDilimi, krediKartiFaizleri, krediVergileri, type AsgariOdemeDonemi, type KartFaizDonemi } from '../../data/params/kredi';
import { round2 } from '../../lib/finance';
import { odemePlani } from '../kredi-hesaplama/calc';

// Ekstre mantığı (kredi kartı asgari ödeme robotuyla aynı): dönem borcu B, ödeme P;
// kalan (B − P) üzerine akdi faiz ve faizin üzerine KKDF + BSMV işler → sonraki dönem borcu.
// Her ay en az asgari tutarlar ödenir; bütçeden artan para stratejiye göre tek bir borca yığılır.
// Bir borç bitince onun asgari tutarı da sıradaki borca akar (bütçe sabit).

export type BorcTuru = 'kart' | 'nakit' | 'kmh';
export type Strateji = 'cig' | 'kartopu' | 'asgari';

export interface Borc {
  ad: string;
  tur: BorcTuru;
  bakiye: number;
  /** Aylık akdi faiz (%); null = TCMB azami oranı (karta dönem borcuna göre) */
  aylikFaiz: number | null;
  /** Kart limiti (kart ve nakit avansta asgari ödeme oranını belirler) */
  limit: number;
}

export interface Ortam {
  faizDonemi: KartFaizDonemi;
  asgariDonemi: AsgariOdemeDonemi;
}

const vergiCarpani = () => {
  const v = krediKartiFaizleri.values.vergiler;
  return 1 + (v.kkdf + v.bsmv) / 100;
};

/** Bu dönem borcuna uygulanacak aylık akdi faiz (%). */
export function borcFaizi(b: Borc, donemBorcu: number, o: Ortam): number {
  if (b.aylikFaiz !== null) return b.aylikFaiz;
  if (b.tur === 'kart') return kartFaizDilimi(donemBorcu, o.faizDonemi).akdi;
  return o.faizDonemi.nakit.akdi;
}

/**
 * Asgari tutar. Kartta dönem borcu × limite göre oran (BDDK); KMH’de yasal asgari yok,
 * bankalar en az faiz ve vergisini tahsil eder (borç büyümez, küçülmez).
 */
export function asgariOdeme(b: Borc, donemBorcu: number, o: Ortam): number {
  if (donemBorcu <= 0) return 0;
  if (b.tur === 'kmh') {
    const r = (borcFaizi(b, donemBorcu, o) / 100) * vergiCarpani();
    return round2((donemBorcu * r) / (1 + r));
  }
  return round2((donemBorcu * asgariOdemeOrani(b.limit, o.asgariDonemi)) / 100);
}

export interface AySatiri {
  ay: number;
  odeme: number;
  /** Bu ay işleyen faiz + KKDF + BSMV */
  faiz: number;
  /** Ay sonunda kalan toplam borç */
  kalan: number;
  /** Bütçeden artan paranın yığıldığı borç */
  hedef: string | null;
}

export interface PlanSonucu {
  strateji: Strateji;
  /** Bütçe ilk ay asgari ödemelerin toplamını karşılamıyor */
  yetersiz: boolean;
  ilkAsgariToplam: number;
  ay: number;
  bitmedi: boolean;
  toplamOdeme: number;
  toplamFaiz: number;
  kapanislar: { ad: string; ay: number | null }[];
  aylar: AySatiri[];
}

const AZAMI_AY = 600;
// Bu tutarın altına inen borç tek seferde kapatılır (asgari ödeme robotuyla aynı)
const KUCUK = 100;

export function planla(borclar: Borc[], butce: number, strateji: Strateji, o: Ortam): PlanSonucu {
  const bakiye = borclar.map((b) => round2(b.bakiye));
  const kapanis: (number | null)[] = borclar.map((b) => (b.bakiye <= 0 ? 0 : null));
  const aylar: AySatiri[] = [];
  const ilkAsgariToplam = round2(borclar.reduce((t, b, i) => t + Math.min(bakiye[i], asgariOdeme(b, bakiye[i], o)), 0));
  if (strateji !== 'asgari' && butce < ilkAsgariToplam - 0.005) {
    return { strateji, yetersiz: true, ilkAsgariToplam, ay: 0, bitmedi: true, toplamOdeme: 0, toplamFaiz: 0, kapanislar: borclar.map((b) => ({ ad: b.ad, ay: null })), aylar };
  }
  const vc = vergiCarpani();
  let bitmedi = false;

  for (let ay = 1; bakiye.some((x) => x > 0); ay++) {
    if (ay > AZAMI_AY) {
      bitmedi = true;
      break;
    }
    const oncekiToplam = bakiye.reduce((t, x) => t + x, 0);
    const odeme = bakiye.map((x, i) => {
      if (x <= 0) return 0;
      const a = asgariOdeme(borclar[i], x, o);
      return x <= KUCUK || x - a <= 0 ? x : a;
    });
    let hedef: string | null = null;
    if (strateji !== 'asgari') {
      let artan = round2(butce - odeme.reduce((t, x) => t + x, 0));
      const sira = bakiye
        .map((x, i) => i)
        .filter((i) => bakiye[i] - odeme[i] > 0)
        .sort((a, b) =>
          strateji === 'cig'
            ? borcFaizi(borclar[b], bakiye[b], o) - borcFaizi(borclar[a], bakiye[a], o) || bakiye[a] - bakiye[b]
            : bakiye[a] - bakiye[b] || borcFaizi(borclar[b], bakiye[b], o) - borcFaizi(borclar[a], bakiye[a], o),
        );
      for (const i of sira) {
        if (artan <= 0) break;
        const ek = Math.min(artan, round2(bakiye[i] - odeme[i]));
        if (ek > 0 && hedef === null) hedef = borclar[i].ad;
        odeme[i] = round2(odeme[i] + ek);
        artan = round2(artan - ek);
      }
    }
    let faiz = 0;
    for (let i = 0; i < bakiye.length; i++) {
      if (bakiye[i] <= 0) continue;
      const kalan = round2(bakiye[i] - odeme[i]);
      const f = kalan > 0 ? round2(((kalan * borcFaizi(borclar[i], bakiye[i], o)) / 100) * vc) : 0;
      faiz += f;
      bakiye[i] = round2(kalan + f);
      if (bakiye[i] <= 0) {
        bakiye[i] = 0;
        kapanis[i] = ay;
      }
    }
    const kalanToplam = round2(bakiye.reduce((t, x) => t + x, 0));
    aylar.push({ ay, odeme: round2(odeme.reduce((t, x) => t + x, 0)), faiz: round2(faiz), kalan: kalanToplam, hedef });
    // Borç küçülmüyorsa (yalnız faiz ödenen KMH gibi) hiç bitmez
    if (kalanToplam >= oncekiToplam - 0.005) {
      bitmedi = true;
      break;
    }
  }

  return {
    strateji,
    yetersiz: false,
    ilkAsgariToplam,
    ay: aylar.length,
    bitmedi,
    toplamOdeme: round2(aylar.reduce((t, a) => t + a.odeme, 0)),
    toplamFaiz: round2(aylar.reduce((t, a) => t + a.faiz, 0)),
    kapanislar: borclar.map((b, i) => ({ ad: b.ad, ay: kapanis[i] })),
    aylar,
  };
}

export interface KrediKarsilastirma {
  taksit: number;
  toplamOdeme: number;
  /** Faiz + KKDF + BSMV + tahsis ücreti */
  toplamMaliyet: number;
  /** Bu tutar için BDDK’nın izin verdiği en uzun vade (ay) */
  azamiVade: number;
  vadeAsiyor: boolean;
}

/** Tüm borcu ihtiyaç kredisiyle kapatmak: kredi tutarı = toplam borç. */
export function krediyleKapat(tutar: number, aylikFaiz: number, vade: number, tahsisUcreti: number): KrediKarsilastirma {
  const t = krediVergileri.values.turler.ihtiyac;
  const plan = odemePlani({ anapara: tutar, vade, aylikFaiz, kkdf: t.kkdf, bsmv: t.bsmv });
  const azamiVade = genelAzamiVade(tutar);
  return {
    taksit: plan.taksit,
    toplamOdeme: round2(plan.toplamOdeme + tahsisUcreti),
    toplamMaliyet: round2(plan.toplamFaiz + plan.toplamKkdf + plan.toplamBsmv + tahsisUcreti),
    azamiVade,
    vadeAsiyor: vade > azamiVade,
  };
}

export function validateBorclar(rows: { bakiye: number | null; aylikFaiz: number | null; limit: number | null; tur: BorcTuru }[]): string | null {
  if (!rows.some((r) => (r.bakiye ?? 0) > 0)) return 'En az bir borç girin.';
  for (const r of rows) {
    if (r.bakiye === null) continue;
    if (r.bakiye < 0) return 'Borç tutarı negatif olamaz.';
    if (r.aylikFaiz !== null && (r.aylikFaiz < 0 || r.aylikFaiz > 15)) return 'Aylık faiz 0 ile 15 arasında olmalı.';
    if (r.tur !== 'kmh' && r.bakiye > 0 && (r.limit === null || r.limit <= 0)) return 'Kart borçları için kart limitini girin.';
  }
  return null;
}
