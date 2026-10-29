import type { ParamSet } from './types';

export const evAlimMasraflari: ParamSet<{
  /** 492 s. Harçlar Kanunu (4) sayılı tarife: devirde alıcı ve satıcı için ayrı ayrı (%) */
  tapuHarciYuzde: number;
  /** Taşınmaz Ticareti Hakkında Yönetmelik: alım satımda toplam hizmet bedeli üst sınırı (%, KDV hariç) */
  emlakciToplamUstSinir: number;
  /** Komisyona eklenen KDV (%) */
  emlakciKdv: number;
  /** Tapu döner sermaye ücreti için 2026 yaklaşık alt ve üst değer (bölge katsayısına göre değişir) */
  donerSermayeAralik: { min: number; max: number };
}> = {
  id: 'ev-alim-masraflari',
  title: 'Tapu harcı, emlakçı hizmet bedeli ve döner sermaye',
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-29',
  values: {
    tapuHarciYuzde: 2,
    emlakciToplamUstSinir: 4,
    emlakciKdv: 20,
    donerSermayeAralik: { min: 2534, max: 6681 },
  },
  sources: [
    { label: '492 sayılı Harçlar Kanunu, (4) sayılı tarife – tapu harcı (binde 20, alıcı ve satıcı ayrı ayrı)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=492&MevzuatTur=1&MevzuatTertip=5' },
    { label: 'Taşınmaz Ticareti Hakkında Yönetmelik (RG 05.06.2018/30442) – hizmet bedeli üst sınırı', url: 'https://www.resmigazete.gov.tr/eskiler/2018/06/20180605.htm' },
    { label: 'Tapu döner sermaye bedeli 2026 (bölgeye göre; haber: CNBC-e)', url: 'https://www.cnbce.com/haberler/tapu-islemlerinde-doner-sermaye-bedeline-zam-yillik-artis-yurt-ici-alicida-yuzde-116-yabancida-yuzde-332-oldu-h12342' },
  ],
  note: 'Döner sermaye ücreti taşınmazın bulunduğu bölgenin katsayısına göre değişir; kesin tutar tapu müdürlüğünden öğrenilir.',
};
