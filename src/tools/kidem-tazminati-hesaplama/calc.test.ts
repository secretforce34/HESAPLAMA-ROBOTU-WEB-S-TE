import { describe, expect, it } from 'vitest';
import { kidemTavaniOn } from '../../data/params/kidem';
import {
  aylikKarsilik,
  hesaplaKidem,
  hizmetSuresi,
  ihbarHaftasi,
  validateEkOdeme,
  validateKidem,
  type KidemGirdi,
} from './calc';

const temel: KidemGirdi = {
  giris: '2019-03-15',
  cikis: '2026-10-29',
  sonBrut: 50000,
  ekOdemeler: [],
  ihbarHesapla: true,
  ihbarKullandirildi: false,
  oncekiKumulatif: null,
};

describe('hizmet süresi (giriş ve çıkış günü dahil)', () => {
  it('15.03.2019 – 29.10.2026 = 7 yıl 7 ay 15 gün', () => {
    expect(hizmetSuresi('2019-03-15', '2026-10-29')).toMatchObject({ yil: 7, ay: 7, gun: 15 });
  });

  it('tam yıl, artık yıl ve ay sonu', () => {
    expect(hizmetSuresi('2020-01-01', '2020-12-31')).toMatchObject({ yil: 1, ay: 0, gun: 0, toplamGun: 366 });
    expect(hizmetSuresi('2023-03-01', '2024-02-29')).toMatchObject({ yil: 1, ay: 0, gun: 0 });
    expect(hizmetSuresi('2024-01-31', '2024-02-28')).toMatchObject({ yil: 0, ay: 1, gun: 0 });
    expect(hizmetSuresi('2026-10-29', '2026-10-29')).toMatchObject({ yil: 0, ay: 0, gun: 1 });
  });
});

describe('ihbar süreleri (4857 md. 17)', () => {
  it('2 / 4 / 6 / 8 hafta ve sınır günleri', () => {
    expect(ihbarHaftasi(hizmetSuresi('2026-01-01', '2026-06-29'))).toBe(2); // 5 ay 29 gün
    expect(ihbarHaftasi(hizmetSuresi('2026-01-01', '2026-06-30'))).toBe(4); // tam 6 ay
    expect(ihbarHaftasi(hizmetSuresi('2025-01-01', '2026-06-30'))).toBe(4); // tam 1,5 yıl
    expect(ihbarHaftasi(hizmetSuresi('2025-01-01', '2026-07-01'))).toBe(6); // 1,5 yıl 1 gün
    expect(ihbarHaftasi(hizmetSuresi('2023-07-01', '2026-06-30'))).toBe(6); // tam 3 yıl
    expect(ihbarHaftasi(hizmetSuresi('2023-07-01', '2026-07-01'))).toBe(8); // 3 yıldan fazla
  });
});

describe('kıdem ve ihbar tazminatı', () => {
  it('7 yıl 7 ay 15 gün, 50.000 TL brüt (elle doğrulandı)', () => {
    const r = hesaplaKidem(temel);
    // 50.000 × (7 + 7/12 + 15/365) = 350.000 + 29.166,67 + 2.054,79
    expect(r.kidemBrut).toBe(381221.46);
    expect(r.kidemYilTutari).toBe(350000);
    expect(r.kidemDamga).toBe(2893.47); // binde 7,59; GV yok (GVK 25/7)
    expect(r.kidemNet).toBe(378327.99);
    expect(r.tavanUygulandi).toBe(false);
    // İhbar: 3 yıldan fazla → 8 hafta = 56 gün; 50.000 / 30 × 56
    expect(r.ihbarGun).toBe(56);
    expect(r.ihbarBrut).toBe(93333.33);
    // Tahmini kümülatif (Ocak–Eylül 9 × 42.500) = 382.500 → ihbarın tamamı %27 dilimde
    expect(r.oncekiKumulatif).toBe(382500);
    expect(r.ihbarGv).toBe(25200);
    expect(r.ihbarDv).toBe(708.4);
    expect(r.ihbarNet).toBe(67424.93);
    expect(r.toplamNet).toBe(445752.92);
  });

  it('tavan: çıkış 30.06.2026 → 64.948,77; 01.07.2026 → 73.729,87 (ÇSGB)', () => {
    const g: KidemGirdi = {
      ...temel,
      giris: '2016-01-01',
      cikis: '2026-06-30',
      sonBrut: 100000,
      ekOdemeler: [
        { tutar: 300, periyot: 'gunluk', gun: 22 }, // yemek 6.600/ay
        { tutar: 100000, periyot: 'yillik' }, // ikramiye 8.333,33/ay
      ],
    };
    const r = hesaplaKidem(g);
    expect(r.giydirilmis).toBe(114933.33);
    expect(r.sure).toMatchObject({ yil: 10, ay: 6, gun: 0 });
    expect(r.tavan).toBe(64948.77);
    expect(r.tavanUygulandi).toBe(true);
    expect(r.kidemBrut).toBe(681962.09); // 64.948,77 × 10,5
    expect(r.kidemDamga).toBe(5176.09);
    expect(r.kidemBrutTavansiz).toBeGreaterThan(r.kidemBrut);
    // İhbar giydirilmiş ücretten, tavansız: 114.933,33 / 30 × 56
    expect(r.ihbarBrut).toBe(214542.22);

    const temmuz = hesaplaKidem({ ...g, cikis: '2026-07-01' });
    expect(temmuz.tavan).toBe(73729.87);
    // 73.729,87 × (10 + 6/12 + 1/365)
    expect(temmuz.kidemBrut).toBe(774365.63);
  });

  it('1 yıl dolmadan kıdem doğmaz; ihbar yine hesaplanır', () => {
    const r = hesaplaKidem({ ...temel, giris: '2026-01-01', cikis: '2026-10-29' });
    expect(r.kidemHakki).toBe(false);
    expect(r.kidemBrut).toBe(0);
    expect(r.kidemNet).toBe(0);
    expect(r.ihbarHafta).toBe(4);
    expect(r.ihbarBrut).toBe(46666.67); // 50.000 / 30 × 28
  });

  it('ihbar süresi kullandırıldıysa ya da hesaplanmasın denirse ihbar 0', () => {
    expect(hesaplaKidem({ ...temel, ihbarKullandirildi: true }).ihbarBrut).toBe(0);
    const r = hesaplaKidem({ ...temel, ihbarHesapla: false });
    expect(r.ihbarNet).toBe(0);
    expect(r.toplamNet).toBe(r.kidemNet);
  });

  it('bordrodan girilen kümülatif matrahla ihbar vergisi (%27 → %35 dilim geçişi)', () => {
    const r = hesaplaKidem({ ...temel, oncekiKumulatif: 1450000 });
    expect(r.kumulatifTahmini).toBe(false);
    // Ekim ücreti matrahı 41.083,33 (29 günlük kıst); ihbar 93.333,33:
    // 1.491.083,33 → 1.500.000 %27 + 84.416,66 × %35 = 31.953,33
    expect(r.ihbarGv).toBe(31953.33);
    expect(r.ihbarDilim).toBe(35);
  });

  it('2025 çıkışı: dönem tavanı ve 2025 tarifesi kullanılır', () => {
    const r = hesaplaKidem({ ...temel, giris: '2020-01-01', cikis: '2025-12-31', sonBrut: 60000 });
    expect(r.tavan).toBe(53919.68);
    expect(r.tavanUygulandi).toBe(true);
    expect(r.sure).toMatchObject({ yil: 6, ay: 0, gun: 0 });
    expect(r.kidemBrut).toBe(323518.08); // 53.919,68 × 6
    // Aralık: tam ay; önceki kümülatif 11 × 51.000 = 561.000 (2025 tarifesinde %27 dilim)
    expect(r.oncekiKumulatif).toBe(561000);
    expect(r.ihbarDilim).toBe(27);
  });
});

describe('yardımcılar ve doğrulama', () => {
  it('ek ödemenin aylık karşılığı', () => {
    expect(aylikKarsilik({ tutar: 12000, periyot: 'yillik' })).toBe(1000);
    expect(aylikKarsilik({ tutar: 300, periyot: 'gunluk', gun: 22 })).toBe(6600);
    expect(aylikKarsilik({ tutar: 2500, periyot: 'aylik' })).toBe(2500);
  });

  it('tavan dönemleri', () => {
    expect(kidemTavaniOn('2025-06-30')?.tavan).toBe(46655.43);
    expect(kidemTavaniOn('2025-07-01')?.tavan).toBe(53919.68);
    expect(kidemTavaniOn('2027-01-01')).toBeNull();
  });

  it('hatalı girdiler', () => {
    expect(validateKidem({ giris: '2026-05-01', cikis: '2026-04-01', sonBrut: 1000, oncekiKumulatif: null })).toHaveProperty('cikis');
    expect(validateKidem({ giris: '2020-01-01', cikis: '2027-01-05', sonBrut: 1000, oncekiKumulatif: null })).toHaveProperty('cikis');
    expect(validateKidem({ giris: '', cikis: '2026-01-05', sonBrut: 1000, oncekiKumulatif: null })).toHaveProperty('giris');
    expect(validateKidem({ giris: '2020-01-01', cikis: '2026-01-05', sonBrut: 0, oncekiKumulatif: null })).toHaveProperty('sonBrut');
    expect(validateKidem({ giris: '2020-01-01', cikis: '2026-01-05', sonBrut: 1000, oncekiKumulatif: -1 })).toHaveProperty('oncekiKumulatif');
    expect(validateKidem({ giris: '2020-01-01', cikis: '2026-01-05', sonBrut: 1000, oncekiKumulatif: null })).toEqual({});
    expect(validateEkOdeme(null, 'aylik', null)).toHaveProperty('tutar');
    expect(validateEkOdeme(300, 'gunluk', 40)).toHaveProperty('gun');
    expect(validateEkOdeme(300, 'gunluk', 22)).toEqual({});
  });
});
