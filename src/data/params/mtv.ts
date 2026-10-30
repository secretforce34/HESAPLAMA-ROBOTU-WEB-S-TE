import type { ParamSet } from './types';

/** Yaş grupları: 1–3, 4–6, 7–11, 12–15, 16 ve yukarı */
export type YasTutarlari = [number, number, number, number, number];

export interface MtvKademe {
  /** Taşıt değeri üst sınırı (TL, dahil); null = üst sınır yok */
  ustDeger: number | null;
  tutar: YasTutarlari;
}

export interface MtvHacimSatiri {
  /** Motor silindir hacmi üst sınırı (cm³, dahil); null = üst sınır yok */
  ustCc: number | null;
  /** Elektrikli otomobilde bu satıra karşılık gelen motor gücü üst sınırı (kW, dahil) */
  ustKw: number | null;
  /** (I) sayılı tarife: 1.1.2018 ve sonrası tescil — taşıt değerine göre kademeler */
  kademeler: MtvKademe[];
  /** (I/A) sayılı tarife: 31.12.2017 ve öncesi tescil */
  eski: YasTutarlari;
}

export interface MtvMotosikletSatiri {
  /** Alt sınır (cm³; bunun altı vergi dışı) */
  altCc: number;
  ustCc: number | null;
  /** Elektrikli motosiklette motor gücü aralığı (kW): alt sınır hariç, üst sınır dahil */
  altKw: number;
  ustKw: number | null;
  tutar: YasTutarlari;
}

export const mtvTarifesi: ParamSet<{
  /** Tarifenin uygulandığı takvim yılı */
  yil: number;
  otomobil: MtvHacimSatiri[];
  motosiklet: MtvMotosikletSatiri[];
  /** Sadece elektrik motoru olan taşıtlarda tarife tutarının uygulanan oranı (%) */
  elektrikliOran: number;
}> = {
  id: 'mtv-tarifesi',
  title: 'Motorlu taşıtlar vergisi (I) ve (I/A) sayılı tarifeler',
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
  lastReviewed: '2026-10-31',
  values: {
    yil: 2026,
    otomobil: [
      {
        ustCc: 1300,
        ustKw: 70,
        kademeler: [
          { ustDeger: 309_100, tutar: [5_750, 4_010, 2_238, 1_689, 593] },
          { ustDeger: 541_500, tutar: [6_319, 4_409, 2_459, 1_861, 655] },
          { ustDeger: null, tutar: [6_902, 4_807, 2_693, 2_032, 706] },
        ],
        eski: [5_750, 4_010, 2_238, 1_689, 593],
      },
      {
        ustCc: 1600,
        ustKw: 85,
        kademeler: [
          { ustDeger: 309_100, tutar: [10_016, 7_510, 4_354, 3_077, 1_181] },
          { ustDeger: 541_500, tutar: [11_023, 8_264, 4_794, 3_375, 1_290] },
          { ustDeger: null, tutar: [12_028, 9_012, 5_220, 3_685, 1_408] },
        ],
        eski: [10_016, 7_510, 4_354, 3_077, 1_181],
      },
      {
        ustCc: 1800,
        ustKw: 105,
        kademeler: [
          { ustDeger: 775_100, tutar: [19_472, 15_226, 8_948, 5_458, 2_113] },
          { ustDeger: null, tutar: [21_251, 16_600, 9_775, 5_964, 2_307] },
        ],
        eski: [17_705, 13_829, 8_145, 4_957, 1_917],
      },
      {
        ustCc: 2000,
        ustKw: 120,
        kademeler: [
          { ustDeger: 775_100, tutar: [30_679, 23_625, 13_886, 8_264, 3_248] },
          { ustDeger: null, tutar: [33_474, 25_784, 15_147, 9_012, 3_547] },
        ],
        eski: [27_898, 21_478, 12_624, 7_510, 2_958],
      },
      {
        ustCc: 2500,
        ustKw: 150,
        kademeler: [
          { ustDeger: 968_100, tutar: [46_027, 33_413, 20_874, 12_465, 4_930] },
          { ustDeger: null, tutar: [50_217, 36_448, 22_768, 13_606, 5_378] },
        ],
        eski: [41_840, 30_372, 18_977, 11_333, 4_479],
      },
      {
        ustCc: 3000,
        ustKw: 180,
        kademeler: [
          { ustDeger: 1_937_500, tutar: [64_175, 55_837, 34_878, 18_758, 6_875] },
          { ustDeger: null, tutar: [70_018, 60_905, 38_053, 20_466, 7_503] },
        ],
        eski: [58_347, 50_754, 31_704, 17_044, 6_255],
      },
      {
        ustCc: 3500,
        ustKw: 210,
        kademeler: [
          { ustDeger: 1_937_500, tutar: [97_744, 87_954, 52_976, 26_443, 9_684] },
          { ustDeger: null, tutar: [106_641, 95_940, 57_791, 28_839, 10_578] },
        ],
        eski: [88_859, 79_955, 48_158, 24_031, 8_813],
      },
      {
        ustCc: 4000,
        ustKw: 240,
        kademeler: [
          { ustDeger: 3_101_800, tutar: [153_684, 132_712, 78_152, 34_878, 13_886] },
          { ustDeger: null, tutar: [167_671, 144_770, 85_271, 38_053, 15_147] },
        ],
        eski: [139_721, 120_647, 71_048, 31_704, 12_624],
      },
      {
        ustCc: null,
        ustKw: null,
        kademeler: [
          { ustDeger: 3_683_200, tutar: [251_554, 188_627, 111_714, 50_206, 19_472] },
          { ustDeger: null, tutar: [274_415, 205_781, 121_873, 54_769, 21_251] },
        ],
        eski: [228_681, 171_485, 101_555, 45_632, 17_705],
      },
    ],
    motosiklet: [
      { altCc: 100, ustCc: 250, altKw: 6, ustKw: 15, tutar: [1_069, 799, 589, 362, 136] },
      { altCc: 100, ustCc: 650, altKw: 6, ustKw: 40, tutar: [2_214, 1_676, 1_069, 589, 362] },
      { altCc: 100, ustCc: 1200, altKw: 6, ustKw: 60, tutar: [5_719, 3_398, 1_676, 1_069, 589] },
      { altCc: 100, ustCc: null, altKw: 6, ustKw: null, tutar: [13_876, 9_167, 5_719, 4_540, 2_214] },
    ],
    elektrikliOran: 25,
  },
  sources: [
    {
      label: 'Ventera Partners Vergi Sirküleri 2026/02 – 2026 MTV tarifeleri (MTV Genel Tebliği, RG 31.12.2025/33124 5. mük.)',
      url: 'https://www.venterapartners.com/vergi-sirkuleri-2026-02-2026-yili-motorlu-tasitlari-vergi-tarifeleri/',
    },
    { label: 'T24 – 2026 MTV tarifesi belli oldu', url: 'https://t24.com.tr/ekonomi/2026-mtv-tarifesi-belli-oldu-hangi-aracta-vergi-kac-liraya-cikti,1287695' },
    {
      label: '197 sayılı Motorlu Taşıtlar Vergisi Kanunu (md. 5 elektrikli taşıtlar ve taşıt değeri satırı, md. 10 taksitler, md. 11 yaş)',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=197&MevzuatTur=1&MevzuatTertip=4',
    },
  ],
  note: 'Tutarlar her yıl yeniden değerleme oranında artırılır. Taşıt değeri kademesi aracın ilk tescil edildiği yıldaki tutarlara göre belirlenir ve sonraki yıllarda değişmez.',
};
