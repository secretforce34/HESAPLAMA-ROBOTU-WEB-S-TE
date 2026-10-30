import type { ParamSet } from './types';

export const trafikCezasiOdeme: ParamSet<{
  /** Ödeme süresi içinde ödenirse indirim (%) — 5326 s. Kanun md. 17/6 */
  indirimYuzde: number;
  /** Tebliğden itibaren ödeme süresi (ay) — 2918 s. Kanun md. 115 */
  odemeSuresiAy: number;
  /** Süresinde ödenmeyen cezaya her ay eklenen faiz (%); ay kesri tam ay sayılır */
  aylikFaizYuzde: number;
  /** Faizle bulunan tutar cezanın bu katını geçemez */
  ustSinirKat: number;
  /** Sulh ceza hâkimliğine itiraz süresi (gün) — 5326 s. Kanun md. 27 */
  itirazGun: number;
  /** Elektronik tebligat, adrese ulaştığı günü izleyen bu günün sonunda yapılmış sayılır — 7201 s. Kanun md. 7/a */
  eTebligatGun: number;
}> = {
  id: 'trafik-cezasi-odeme',
  title: 'Trafik idari para cezası ödeme, indirim ve gecikme kuralları',
  validFrom: '2024-01-31',
  validTo: null,
  lastReviewed: '2026-10-31',
  values: {
    indirimYuzde: 25,
    odemeSuresiAy: 1,
    aylikFaizYuzde: 5,
    ustSinirKat: 2,
    itirazGun: 15,
    eTebligatGun: 5,
  },
  sources: [
    { label: '2918 sayılı Karayolları Trafik Kanunu md. 115 (bir ay içinde ödeme, her ay %5, en fazla iki katı)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2918&MevzuatTur=1&MevzuatTertip=5' },
    { label: '5326 sayılı Kabahatler Kanunu md. 17/6 (ödeme süresi içinde %25 indirim) ve md. 27 (15 gün itiraz)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5326&MevzuatTur=1&MevzuatTertip=5' },
    { label: 'Anadolu Ajansı – Trafik idari para cezalarının indirimli ödeme süresi bir aya uzatıldı (Ocak 2024)', url: 'https://www.aa.com.tr/tr/gundem/trafik-idari-para-cezalarinin-indirimli-odeme-suresi-bir-aya-uzatildi/3123447' },
    {
      label: 'Anayasa Mahkemesi E.2025/137, K.2025/129 (RG 22.09.2025) – e-tebligatta “beşinci günün sonunda” kuralı Anayasa’ya aykırı değil',
      url: 'https://www.alomaliye.com/2025/09/22/anayasa-mahkemesinin-e-2025-137-sayili-karari-7201-sayili-tebligat-kanunu-hk/',
    },
  ],
  note: 'İndirimli ödeme süresi Ocak 2024’te 15 günden bir aya çıkarıldı; 15 gün yazan kaynaklar eskidir. Ödeme yapmak itiraz hakkını ortadan kaldırmaz.',
};
