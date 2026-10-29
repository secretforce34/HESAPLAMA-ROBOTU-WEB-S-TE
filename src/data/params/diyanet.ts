import type { ParamSet } from './types';

// ---------------------------------------------------------------------------
// Zekât: nisap ve oran (Diyanet İşleri Başkanlığı yayınları)
// ---------------------------------------------------------------------------

/**
 * Diyanet İşleri Başkanlığı'nın zekât yayınlarında yer alan sabit ölçüler:
 * - Altının nisabı 20 miskal = 80,18 gram (24 ayar altın değeri).
 * - Gümüşün nisabı 561 gram. Diyanet, para ve ticaret mallarında "yoksulun yararı dikkate alınarak"
 *   altın nisabının esas alınmasını uygun görür; elinde 561 gram veya fazla gümüşü olan kişi
 *   zekâtını bu nisap üzerinden verir.
 * - Oran kırkta bir (%2,5); üzerinden bir kamerî yıl geçmesi gerekir.
 * Kamerî (hicrî) yıl 12 kamerî aydır, 354 ya da 355 gün sürer; tarih hesabında yaklaşık 354 gün alınır.
 */
export const zekatNisap: ParamSet<{
  altinNisabiGram: number;
  gumusNisabiGram: number;
  /** Zekât oranı (%): kırkta bir */
  oran: number;
  /** Kamerî yılın yaklaşık gün sayısı */
  kameriYilGun: number;
}> = {
  id: 'zekat-nisap-diyanet',
  title: 'Zekât nisabı ve oranı (Diyanet)',
  validFrom: '2022-04-22',
  validTo: null,
  lastReviewed: '2026-10-29',
  values: {
    altinNisabiGram: 80.18,
    gumusNisabiGram: 561,
    oran: 2.5,
    kameriYilGun: 354,
  },
  sources: [
    {
      label: 'Diyanet İşleri Başkanlığı – Zekât Sıkça Sorulanlar (nisap 80,18 g altın, %2,5, kamerî yıl, borç ve alacak kuralları)',
      url: 'https://webdosyasp.diyanet.gov.tr/muftuluk/UserFiles/afyonkarahisar/Ilceler/dinar/UserFiles/Files/ZEKAT%20SIK%C3%87A%20SORULANLAR_5ac1603b-6888-42b4-8079-56feae66c812.pdf',
    },
    {
      label: 'Din İşleri Yüksek Kurulu – Ticaret malının zekâtı nasıl hesaplanır? (24 ayar 80,18 g altın değeri)',
      url: 'https://kurul.diyanet.gov.tr/tr/fetva/ticaret-malinin-zekati-nasil-hesaplanir/0193c42d-65f7-72b4-634c-35750c38a3a9',
    },
    {
      label: 'Diyanet (müftülük yayını) – Zekâtın Topluma Kazandırdıkları, Cuma Vaazı (altın 80,18 g, gümüş 561 g, paranın ve ticaret malının nisabı)',
      url: 'https://webdosyasp.diyanet.gov.tr/muftuluk/UserFiles/kirikkale/UserFiles/Files/22.04.2022%20Zekat%C4%B1n%20Topluma%20Kazand%C4%B1rd%C4%B1klar%C4%B1-%20Cuma%20Vaaz%C4%B1_7467c41c-750d-4996-b92a-402dba986fa0.pdf',
    },
  ],
  note: 'Diyanet yayınlarında değişmeden yer alan sabit ölçülerdir; her yıl yeniden belirlenmez. Zekât tutarı, sizin girdiğiniz güncel altın fiyatına göre değişir.',
};

// ---------------------------------------------------------------------------
// Fitre ve oruç fidyesi (Din İşleri Yüksek Kurulu kararları)
// ---------------------------------------------------------------------------

export interface FitreDonemi {
  /** Ramazan ayının başlangıcı (ISO) */
  from: string;
  /** Bir sonraki Ramazan'ın başlangıcından önceki gün (ISO) */
  to: string;
  /** Kişi başı fitre (TL); aynı tutar günlük oruç fidyesidir */
  tutar: number;
  /** Örn. "2026 Ramazanı – 2027 Ramazanı" */
  etiket: string;
}

/**
 * Din İşleri Yüksek Kurulu her yıl Ramazan öncesi fitre miktarını açıklar; belirlenen tutar aynı
 * zamanda günlük oruç fidyesinin bedelidir. 2026 kararı: 7 Ocak 2026 toplantısı, 13 Ocak 2026
 * duyurusu, "2026 yılı Ramazan ayının başlangıcından 2027 yılı Ramazan ayının başlangıcına kadar"
 * 240 TL. Dönem sınırları Diyanet'in dinî günler takvimindeki 1 Ramazan tarihleridir
 * (11.03.2024, 01.03.2025, 19.02.2026, 08.02.2027).
 */
export const fitreFidye: ParamSet<{ donemler: FitreDonemi[] }> = {
  id: 'fitre-fidye-diyanet',
  title: 'Fitre ve oruç fidyesi (Diyanet)',
  validFrom: '2026-02-19',
  validTo: '2027-02-07',
  lastReviewed: '2026-10-29',
  values: {
    donemler: [
      { from: '2024-03-11', to: '2025-02-28', tutar: 130, etiket: '2024 Ramazanı – 2025 Ramazanı' },
      { from: '2025-03-01', to: '2026-02-18', tutar: 180, etiket: '2025 Ramazanı – 2026 Ramazanı' },
      { from: '2026-02-19', to: '2027-02-07', tutar: 240, etiket: '2026 Ramazanı – 2027 Ramazanı' },
    ],
  },
  sources: [
    {
      label: 'Din İşleri Yüksek Kurulu – 2026 yılı fitre miktarı (240 TL; aynı zamanda günlük oruç fidyesi)',
      url: 'https://kurul.diyanet.gov.tr/tr/duyuru/din-isleri-yuksek-kurulu-2026-yili-fitre-miktarini-acikladi/019bb642-4872-7191-841e-408610f76b33',
    },
    {
      label: 'Diyanet İşleri Başkanlığı – 2025 yılı fitre miktarı (180 TL)',
      url: 'https://www.diyanet.gov.tr/tr-TR/Kurumsal/Detay/37313/din-isleri-yuksek-kurulu-2025-yili-fitre-miktarini-acikladi',
    },
    {
      label: 'Diyanet İşleri Başkanlığı – 2024 yılı fitre miktarı (130 TL)',
      url: 'https://www.diyanet.gov.tr/tr-TR/Kurumsal/Detay/36231/din-isleri-yuksek-kurulu-2024-yili-fitre-bedelini-130-tl-olarak-belirledi',
    },
  ],
  note: 'Her yıl Ramazan öncesi yeniden belirlenir. 2026 kararı 2027 Ramazanı’nın başlangıcına (8 Şubat 2027) kadar geçerlidir.',
};

/** Verilen tarihte geçerli fitre dönemi; liste dışındaysa en yakın dönem döner. */
export function fitreDonemiOn(isoDate: string): FitreDonemi {
  const list = fitreFidye.values.donemler;
  const found = list.find((d) => isoDate >= d.from && isoDate <= d.to);
  if (found) return found;
  return isoDate < list[0].from ? list[0] : list[list.length - 1];
}
