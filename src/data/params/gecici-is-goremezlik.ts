import type { ParamSet } from './types';

/**
 * 5510 sayılı Kanun md. 17–18 ve 4857 sayılı İş Kanunu md. 74 — geçici iş göremezlik (rapor parası) ve analık ödeneği.
 * 27.12.2024 tarihli değişiklikle ödeneğe esas günlük kazanç, önceki 12 aylık dönemdeki prime esas kazançların
 * prim ödeme gün sayısına bölünmesiyle bulunur (önceden son 3 ay esas alınıyordu).
 */
export const geciciIsGoremezlik: ParamSet<{
  /** Yatarak tedavide günlük kazancın oranı */
  yatarakOran: number;
  /** Ayakta tedavide (ve analıkta) günlük kazancın oranı */
  ayaktaOran: number;
  /** Hastalıkta ödenmeyen ilk gün sayısı (ödeme 3. günden başlar) */
  hastalikOdenmeyenGun: number;
  /** Hastalık ve analıkta önceki 1 yılda gereken kısa vadeli prim günü */
  primSartiGun: number;
  /** Önceki 12 ayda bu günden az prim varsa günlük kazanç, günlük PEK alt sınırının `sinirKat` katını geçemez (hastalık/analık) */
  azPrimEsigi: number;
  sinirKat: number;
  /** Analık: doğum öncesi / sonrası ödenen hafta (çoğul gebelikte doğum öncesi +2 hafta) */
  dogumOncesiHafta: number;
  dogumSonrasiHafta: number;
  cogulGebelikEkHafta: number;
}> = {
  id: 'gecici-is-goremezlik',
  title: 'Rapor parası ve doğum izni ödeneği kuralları',
  validFrom: '2024-12-27',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    yatarakOran: 1 / 2,
    ayaktaOran: 2 / 3,
    hastalikOdenmeyenGun: 2,
    primSartiGun: 90,
    azPrimEsigi: 180,
    sinirKat: 2,
    dogumOncesiHafta: 8,
    dogumSonrasiHafta: 8,
    cogulGebelikEkHafta: 2,
  },
  sources: [
    { label: '5510 sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu, md. 17–18', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5510&MevzuatTur=1&MevzuatTertip=5' },
    { label: '4857 sayılı İş Kanunu, md. 74 (analık halinde çalışma ve süt izni)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5' },
    {
      label: 'Cottgroup – Kısa vadeli sigortada günlük kazanç hesaplama usulü değişti (RG 27.12.2024/32765)',
      url: 'https://www.cottgroup.com/en/component/zoo/item/kisa-vadeli-sigortada-gunluk-kazanc-hesaplama-usulu-degisti',
    },
    {
      label: 'PwC – Hastalık ve analık geçici iş göremezlik ödeneği hesaplama yönteminde değişiklik (2021)',
      url: 'https://pwc.com.tr/tr/Hizmetlerimiz/sosyal-guvenlik/bultenler/2021/hastalik-ve-analik-gecici-is-goremezlik-odenegi-hesaplama-yonteminde-degisiklik-hk.pdf',
    },
  ],
};
