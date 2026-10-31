import { describe, expect, it } from 'vitest';
import {
  aylikHedeftenDonemHedefi,
  donemHesapla,
  donemSayisiOf,
  faizHesapla,
  gerekenAnapara,
  reelGetiri,
  stopajOrani,
  validateFaiz,
} from './calc';

// Stopaj: 10041 ve 11444 sayılı Cumhurbaşkanı Kararları — vadesiz ve 6 aya kadar %17,5, 1 yıla kadar %15, 1 yıldan uzun %10.
describe('stopaj oranı', () => {
  it('vadesiz ve 6 aya kadar %17,5', () => {
    expect(stopajOrani(1, '2026-10-31')).toBe(17.5);
    expect(stopajOrani(32, '2026-10-31')).toBe(17.5);
    expect(stopajOrani(184, '2026-10-31')).toBe(17.5);
  });

  it('6 aydan uzun, 1 yıla kadar %15', () => {
    expect(stopajOrani(185, '2026-10-31')).toBe(15);
    expect(stopajOrani(366, '2026-10-31')).toBe(15);
  });

  it('1 yıldan uzun %10', () => {
    expect(stopajOrani(367, '2026-10-31')).toBe(10);
    expect(stopajOrani(730, '2026-10-31')).toBe(10);
  });
});

describe('faiz getirisi', () => {
  it('100.000 TL, yıllık %45, 32 gün', () => {
    // Brüt: 100.000 × 0,45 × 32 / 365 = 3.945,205… → 3.945,21
    // Stopaj: 3.945,21 × %17,5 = 690,41 → net 3.254,80
    const d = donemHesapla(100_000, 45, 32, 17.5);
    expect(d.brutFaiz).toBe(3_945.21);
    expect(d.stopaj).toBe(690.41);
    expect(d.netFaiz).toBe(3_254.8);
    expect(d.sonTutar).toBe(103_254.8);
  });

  it('200.000 TL, yıllık %40, 365 gün: brüt 80.000, stopaj %15', () => {
    const r = faizHesapla({ anapara: 200_000, yillikOran: 40, gun: 365, stopaj: 15, donemSayisi: 1 });
    expect(r.toplamBrut).toBe(80_000);
    expect(r.toplamStopaj).toBe(12_000);
    expect(r.toplamNet).toBe(68_000);
    expect(r.netYillikEfektif).toBeCloseTo(34, 6);
    expect(r.netYillikBasit).toBeCloseTo(34, 6);
  });

  it('vade sonunda faiziyle yenilenince ikinci dönem büyümüş tutar üzerinden işler', () => {
    const r = faizHesapla({ anapara: 100_000, yillikOran: 45, gun: 32, stopaj: 17.5, donemSayisi: 2 });
    // 2. dönem: 103.254,80 × 0,45 × 32 / 365 = 4.073,61; stopaj 712,88; net 3.360,73
    expect(r.donemler[1].anapara).toBe(103_254.8);
    expect(r.donemler[1].brutFaiz).toBe(4_073.61);
    expect(r.donemler[1].netFaiz).toBe(3_360.73);
    expect(r.sonTutar).toBe(106_615.53);
    expect(r.toplamGun).toBe(64);
  });

  it('bileşik yıllık getiri, basit yıllık getiriden yüksektir', () => {
    const r = faizHesapla({ anapara: 100_000, yillikOran: 45, gun: 32, stopaj: 17.5, donemSayisi: 11 });
    expect(r.netYillikEfektif).toBeGreaterThan(r.netYillikBasit);
  });

  it('faiz ve stopaj sıfırsa tutar değişmez', () => {
    const r = faizHesapla({ anapara: 50_000, yillikOran: 0, gun: 30, stopaj: 0, donemSayisi: 3 });
    expect(r.sonTutar).toBe(50_000);
    expect(r.toplamNet).toBe(0);
  });
});

describe('yardımcılar', () => {
  it('toplam süreye sığan tam vade sayısı', () => {
    expect(donemSayisiOf(365, 32)).toBe(11);
    expect(donemSayisiOf(30, 32)).toBe(1);
    expect(donemSayisiOf(730, 365)).toBe(2);
  });

  it('reel getiri: %40 nominal, %30 enflasyon → yaklaşık %7,69', () => {
    expect(reelGetiri(40, 30)).toBeCloseTo(7.6923, 3);
    expect(reelGetiri(20, 30)).toBeLessThan(0);
  });

  it('hedef net faiz için gereken anapara', () => {
    expect(gerekenAnapara(3_254.8, 45, 32, 17.5)).toBeCloseTo(100_000, -1);
    expect(gerekenAnapara(1_000, 0, 32, 17.5)).toBe(0);
  });

  it('aylık hedef, vadenin gün sayısına çevrilir', () => {
    // 30.000 × 32 × 12 / 365 = 31.561,64
    expect(aylikHedeftenDonemHedefi(30_000, 32)).toBe(31_561.64);
  });

  it('doğrulama', () => {
    expect(validateFaiz({ anapara: null, oran: 45, gun: 32 }).anapara).toBeTruthy();
    expect(validateFaiz({ anapara: 1000, oran: 0, gun: 32 }).oran).toBeTruthy();
    expect(validateFaiz({ anapara: 1000, oran: 45, gun: 0 }).gun).toBeTruthy();
    expect(validateFaiz({ anapara: 1000, oran: 45, gun: 32, toplamGun: 10 }).toplamGun).toBeTruthy();
    expect(validateFaiz({ anapara: 1000, oran: 45, gun: 32, toplamGun: 365, stopaj: 17.5 })).toEqual({});
  });
});
