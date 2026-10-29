import type { ParamSet } from './types';

export interface VerasetDilimi {
  /** Dilimin kümülatif üst sınırı (TL); null = üst sınır yok */
  ust: number | null;
  /** Veraset yoluyla intikallerde oran (%) */
  veraset: number;
  /** İvazsız (bağış, hibe) intikallerde oran (%) */
  ivazsiz: number;
}

export const verasetVergisi: ParamSet<{
  /** Füru (altsoy, evlatlık dahil) ve eşten her birine isabet eden miras payında istisna */
  istisnaAltsoyVeEs: number;
  /** Füru bulunmaması hâlinde eşe isabet eden miras payında istisna */
  istisnaEsTek: number;
  /** İvazsız (bağış, hibe) intikallerde istisna */
  istisnaIvazsiz: number;
  tarife: VerasetDilimi[];
}> = {
  id: 'veraset-vergisi',
  title: 'Veraset ve intikal vergisi istisnaları ve tarifesi',
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-29',
  values: {
    istisnaAltsoyVeEs: 2_907_136,
    istisnaEsTek: 5_817_845,
    istisnaIvazsiz: 66_935,
    tarife: [
      { ust: 3_000_000, veraset: 1, ivazsiz: 10 },
      { ust: 10_000_000, veraset: 3, ivazsiz: 15 },
      { ust: 25_000_000, veraset: 5, ivazsiz: 20 },
      { ust: 55_000_000, veraset: 7, ivazsiz: 25 },
      { ust: null, veraset: 10, ivazsiz: 30 },
    ],
  },
  sources: [
    {
      label: 'KPMG – 2026’da uygulanacak veraset ve intikal vergisi istisna ve dilim tutarları (VİVK Genel Tebliği Seri No: 57, RG 31.12.2025)',
      url: 'https://kpmgvergi.com/yayinlar/mali-bultenler/vergi/2026-yilinda-uygulanacak-veraset-ve-intikal-vergisi-maktu-istisna-tutarlari-ile-matrah-dilim-tutarlari-yayimlandi/3355',
    },
    { label: '7338 sayılı Veraset ve İntikal Vergisi Kanunu (md. 4 istisnalar, md. 16 tarife, md. 20 ödeme)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=7338&MevzuatTur=1&MevzuatTertip=4' },
    { label: '4721 sayılı Türk Medeni Kanunu (md. 495–499 yasal mirasçılar, md. 506 saklı paylar)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4721&MevzuatTur=1&MevzuatTertip=5' },
  ],
  note: 'Tutarlar her yıl yeniden değerleme oranında güncellenir. Vergi, her mirasçının kendi payı üzerinden ayrı hesaplanır; taşınmazlarda emlak vergi değeri esas alınır.',
};

/** Dilimli vergi: her dilimin oranı yalnızca o dilime düşen kısma uygulanır. */
export function dilimliVergi(matrah: number, tur: 'veraset' | 'ivazsiz'): number {
  let vergi = 0;
  let alt = 0;
  for (const d of verasetVergisi.values.tarife) {
    const ust = d.ust ?? Infinity;
    if (matrah <= alt) break;
    vergi += ((Math.min(matrah, ust) - alt) * d[tur]) / 100;
    alt = ust;
  }
  return vergi;
}
