import { krediUcretleri, krediVergileri, type KrediTuru } from '../../data/params/kredi';
import { round2 } from '../../lib/finance';
import { odemePlani, type PlanSonucu } from '../kredi-hesaplama/calc';

// 6502 sayılı Kanun md. 30: tüketici kredisinde erken ödemede faiz ve diğer maliyetlerden indirim yapılır, tazminat alınmaz.
// md. 37: konut finansmanında SABİT faizli kredide erken ödeme tazminatı, erken ödenen tutarın kalan vade
// 36 ay ve altındaysa en fazla %1'i, üstündeyse en fazla %2'sidir; DEĞİŞKEN faizlide tazminat alınamaz.
// Ticari kredilerde tazminat sözleşmeye göre belirlenir (kullanıcı girer).

export type FaizTipi = 'sabit' | 'degisken';
export type KismiSecim = 'taksit' | 'vade';

export interface ErkenKapamaInput {
  tur: KrediTuru;
  anapara: number;
  vade: number;
  aylikFaiz: number;
  kkdf: number;
  bsmv: number;
  /** Bugüne kadar ödenen taksit sayısı */
  odenenTaksit: number;
  /** Son ödenen taksitten bu yana geçen gün (işlemiş faiz için, 0–30) */
  gecenGun: number;
  faizTipi: FaizTipi;
  /** Ticari kredide sözleşmedeki erken ödeme ücreti (%) */
  ticariOran: number;
}

export interface KapamaSonucu {
  plan: PlanSonucu;
  kalanAnapara: number;
  kalanTaksitSayisi: number;
  /** Kredi normal devam etseydi ödenecek kalan taksitlerin toplamı */
  kalanOdemeler: number;
  /** Son taksitten bu yana işleyen faiz + KKDF + BSMV */
  islemisFaiz: number;
  tazminatOrani: number;
  tazminatAciklama: string;
  tazminat: number;
  kapamaTutari: number;
  /** Erken kapatınca ödenmeyecek faiz ve vergi (kalan ödemeler − kapama tutarı) */
  tasarruf: number;
}

export function tazminatOrani(i: Pick<ErkenKapamaInput, 'tur' | 'faizTipi' | 'ticariOran'>, kalanTaksit: number): { oran: number; aciklama: string } {
  const t = krediUcretleri.values.erkenOdemeTazminati;
  if (i.tur === 'konut') {
    if (i.faizTipi === 'degisken') return { oran: 0, aciklama: 'Değişken faizli konut kredisinde erken ödeme tazminatı alınamaz.' };
    return kalanTaksit <= 36
      ? { oran: t.kalanVade36AyaKadar, aciklama: 'Sabit faizli konut kredisi, kalan vade 36 ay veya daha kısa: en fazla %1.' }
      : { oran: t.kalanVade36AyUstu, aciklama: 'Sabit faizli konut kredisi, kalan vade 36 aydan uzun: en fazla %2.' };
  }
  if (i.tur === 'ticari') return { oran: i.ticariOran, aciklama: 'Ticari kredide erken ödeme ücreti sözleşmenize göre belirlenir.' };
  return { oran: 0, aciklama: 'Tüketici kredisinde erken ödeme tazminatı alınmaz; kalan faiz ve vergiler indirilir.' };
}

export function erkenKapama(i: ErkenKapamaInput): KapamaSonucu {
  const plan = odemePlani({ anapara: i.anapara, vade: i.vade, aylikFaiz: i.aylikFaiz, kkdf: i.kkdf, bsmv: i.bsmv });
  const odenen = Math.min(Math.max(0, i.odenenTaksit), i.vade);
  const kalanAnapara = odenen === 0 ? round2(i.anapara) : plan.satirlar[odenen - 1].kalan;
  const kalanTaksitSayisi = i.vade - odenen;
  const kalanOdemeler = round2(plan.satirlar.slice(odenen).reduce((t, s) => t + s.odeme, 0));

  // İşlemiş faiz: kalan anapara × aylık faiz × gün/30, üzerine KKDF ve BSMV
  const faiz = round2(kalanAnapara * (i.aylikFaiz / 100) * (Math.min(30, Math.max(0, i.gecenGun)) / 30));
  const islemisFaiz = round2(faiz + round2(faiz * (i.kkdf / 100)) + round2(faiz * (i.bsmv / 100)));

  const { oran, aciklama } = tazminatOrani(i, kalanTaksitSayisi);
  const tazminat = round2((kalanAnapara * oran) / 100);
  const kapamaTutari = round2(kalanAnapara + islemisFaiz + tazminat);
  return {
    plan,
    kalanAnapara,
    kalanTaksitSayisi,
    kalanOdemeler,
    islemisFaiz,
    tazminatOrani: oran,
    tazminatAciklama: aciklama,
    tazminat,
    kapamaTutari,
    tasarruf: round2(kalanOdemeler - kapamaTutari),
  };
}

export interface KismiSonuc {
  /** Anaparadan düşen tutar */
  dusenAnapara: number;
  tazminat: number;
  yeniPlan: PlanSonucu;
  yeniTaksit: number;
  yeniVade: number;
  /** Eski kalan ödemeler − (ara ödeme + tazminat + yeni kalan ödemeler) */
  tasarruf: number;
}

/**
 * Ara (kısmi) ödeme: girilen tutar anaparaya sayılır (varsa tazminatı ayrıca ödenir).
 * "taksit": vade aynı kalır, taksit düşer. "vade": taksit yaklaşık aynı kalır, taksit sayısı azalır.
 */
export function kismiOdeme(i: ErkenKapamaInput, tutar: number, secim: KismiSecim): KismiSonuc | null {
  const k = erkenKapama(i);
  if (k.kalanTaksitSayisi <= 0 || tutar <= 0 || tutar >= k.kalanAnapara) return null;
  const tazminat = round2((tutar * k.tazminatOrani) / 100);
  const yeniAnapara = round2(k.kalanAnapara - tutar);
  const re = k.plan.vergiDahilAylikOran;

  let yeniVade = k.kalanTaksitSayisi;
  if (secim === 'vade' && re > 0) {
    const eskiTaksit = k.plan.taksit;
    const oran = (yeniAnapara * re) / eskiTaksit;
    yeniVade = oran >= 1 ? k.kalanTaksitSayisi : Math.max(1, Math.ceil(-Math.log(1 - oran) / Math.log(1 + re) - 1e-9));
  } else if (secim === 'vade') {
    yeniVade = Math.max(1, Math.ceil(yeniAnapara / k.plan.taksit - 1e-9));
  }

  const yeniPlan = odemePlani({ anapara: yeniAnapara, vade: yeniVade, aylikFaiz: i.aylikFaiz, kkdf: i.kkdf, bsmv: i.bsmv });
  return {
    dusenAnapara: tutar,
    tazminat,
    yeniPlan,
    yeniTaksit: yeniPlan.taksit,
    yeniVade,
    tasarruf: round2(k.kalanOdemeler - (tutar + tazminat + k.islemisFaiz + yeniPlan.toplamOdeme)),
  };
}

export function varsayilanVergiler(tur: KrediTuru) {
  const t = krediVergileri.values.turler[tur];
  return { kkdf: t.kkdf, bsmv: t.bsmv };
}

export function validateErken(i: {
  anapara: number | null;
  vade: number | null;
  faiz: number | null;
  odenen: number | null;
  gun: number | null;
}) {
  const e: Record<string, string> = {};
  if (i.anapara === null || i.anapara <= 0) e.anapara = 'Kredi tutarını girin.';
  if (i.vade === null || i.vade < 1 || !Number.isInteger(i.vade)) e.vade = 'Vadeyi ay olarak girin.';
  if (i.faiz === null || i.faiz < 0) e.faiz = 'Aylık faiz oranını girin.';
  if (i.odenen === null || i.odenen < 0 || !Number.isInteger(i.odenen)) e.odenen = 'Ödenen taksit sayısını girin.';
  else if (i.vade !== null && i.odenen >= i.vade) e.odenen = 'Ödenen taksit, vadeden az olmalı.';
  if (i.gun === null || i.gun < 0 || i.gun > 30) e.gun = '0 ile 30 arasında olmalı.';
  return e;
}
