import { describe, expect, it } from 'vitest';
import { gunlukOran, hesaplaIskonto, validateAyar, validateSenet, yilGunu, type IskontoAyar } from './calc';

const AYAR: IskontoAyar = {
  oran: 36,
  oranDonemi: 'yillik',
  gunEsasi: 360,
  komisyonYuzde: 0,
  sabitKomisyon: 0,
  bsmvOrani: 0,
};

describe('dış iskonto (ticari / banka iskontosu)', () => {
  it('10.000 TL, yıllık %36, 60 gün, 360 gün esası', () => {
    // iskonto = 10.000 × 0,36 × 60 ÷ 360 = 600 → ele geçen 9.400
    const r = hesaplaIskonto([{ nominal: 10000, gun: 60 }], AYAR);
    expect(r.dis.iskonto).toBe(600);
    expect(r.dis.eleGecen).toBe(9400);
    expect(r.dis.toplamKesinti).toBe(600);
  });

  it('365 gün esası: 100.000 TL, %48, 90 gün', () => {
    // 100.000 × 0,48 × 90 ÷ 365 = 11.835,616 → 11.835,62
    const r = hesaplaIskonto([{ nominal: 100000, gun: 90 }], { ...AYAR, oran: 48, gunEsasi: 365 });
    expect(r.dis.iskonto).toBe(11835.62);
    expect(r.dis.eleGecen).toBe(88164.38);
  });

  it('aylık oran: %3 aylık, 60 gün → yıllık %36 / 360 ile aynı', () => {
    const r = hesaplaIskonto([{ nominal: 10000, gun: 60 }], { ...AYAR, oran: 3, oranDonemi: 'aylik' });
    expect(r.dis.iskonto).toBe(600);
    expect(gunlukOran({ oran: 3, oranDonemi: 'aylik', gunEsasi: 365 })).toBeCloseTo(0.001, 10);
    expect(yilGunu({ oranDonemi: 'aylik', gunEsasi: 365 })).toBe(360);
  });

  it('vade günü 0 ise iskonto yoktur ve maliyet hesaplanamaz', () => {
    const r = hesaplaIskonto([{ nominal: 5000, gun: 0 }], AYAR);
    expect(r.dis.iskonto).toBe(0);
    expect(r.dis.eleGecen).toBe(5000);
    expect(r.dis.basitMaliyet).toBeNull();
    expect(r.dis.bilesikMaliyet).toBeNull();
  });

  it('iskonto nominali aşarsa uyarı işaretlenir', () => {
    const r = hesaplaIskonto([{ nominal: 1000, gun: 400 }], { ...AYAR, oran: 400, gunEsasi: 365 });
    // 1.000 × 4 × 400 ÷ 365 = 4.383,56 > 1.000
    expect(r.satirlar[0].disAsim).toBe(true);
    expect(r.dis.eleGecen).toBeLessThan(0);
  });
});

describe('iç iskonto (matematiksel / peşin değer)', () => {
  it('10.000 TL, %36, 60 gün: peşin değer 10.000 ÷ 1,06 = 9.433,96', () => {
    const r = hesaplaIskonto([{ nominal: 10000, gun: 60 }], AYAR);
    expect(r.ic.eleGecen).toBe(9433.96);
    expect(r.ic.iskonto).toBe(566.04);
  });

  it('iç iskonto her zaman dış iskontodan küçüktür', () => {
    for (const gun of [10, 45, 90, 180, 365]) {
      const r = hesaplaIskonto([{ nominal: 25000, gun }], { ...AYAR, oran: 42, gunEsasi: 365 });
      expect(r.ic.iskonto).toBeLessThan(r.dis.iskonto);
      expect(r.ic.eleGecen).toBeGreaterThan(r.dis.eleGecen);
    }
  });

  it('iç iskontoda basit yıllık maliyet nominal orana eşittir (ek masraf yokken)', () => {
    const r = hesaplaIskonto([{ nominal: 1_000_000, gun: 75 }], { ...AYAR, oran: 36, gunEsasi: 360 });
    expect(r.ic.basitMaliyet!).toBeCloseTo(0.36, 3);
  });
});

describe('komisyon, BSMV ve efektif maliyet', () => {
  it('BSMV %5 iskonto üzerinden: 600 TL iskonto → 30 TL BSMV, ele geçen 9.370', () => {
    const r = hesaplaIskonto([{ nominal: 10000, gun: 60 }], { ...AYAR, bsmvOrani: 5 });
    expect(r.dis.bsmv).toBe(30);
    expect(r.dis.toplamKesinti).toBe(630);
    expect(r.dis.eleGecen).toBe(9370);
  });

  it('basit yıllık gerçek maliyet: 630 ÷ (9.370 × 60 ÷ 360) = %40,34', () => {
    const r = hesaplaIskonto([{ nominal: 10000, gun: 60 }], { ...AYAR, bsmvOrani: 5 });
    expect(r.dis.basitMaliyet!).toBeCloseTo(630 / ((9370 * 60) / 360), 10);
    expect(r.dis.basitMaliyet!).toBeCloseTo(0.4034, 4);
    // Nominal orandan (%36) yüksektir: dış iskonto, ele geçen tutar üzerinden daha pahalıdır
    expect(r.dis.basitMaliyet!).toBeGreaterThan(0.36);
  });

  it('bileşik yıllık maliyet: (nominal ÷ ele geçen)^(yıl günü ÷ gün) − 1', () => {
    const r = hesaplaIskonto([{ nominal: 10000, gun: 60 }], { ...AYAR, bsmvOrani: 5 });
    expect(r.dis.bilesikMaliyet!).toBeCloseTo(Math.pow(10000 / 9370, 6) - 1, 8);
  });

  it('komisyon (%0,5 + 25 TL sabit) BSMV matrahına dahildir', () => {
    // komisyon = 50 + 25 = 75; BSMV = (600 + 75) × %5 = 33,75; kesinti = 708,75; ele geçen = 9.291,25
    const r = hesaplaIskonto([{ nominal: 10000, gun: 60 }], { ...AYAR, komisyonYuzde: 0.5, sabitKomisyon: 25, bsmvOrani: 5 });
    expect(r.dis.komisyon).toBe(75);
    expect(r.dis.bsmv).toBe(33.75);
    expect(r.dis.toplamKesinti).toBe(708.75);
    expect(r.dis.eleGecen).toBe(9291.25);
  });
});

describe('çok senetli portföy', () => {
  const senetler = [
    { nominal: 10000, gun: 30 },
    { nominal: 20000, gun: 60 },
    { nominal: 15000, gun: 90 },
  ];

  it('toplamlar satırların toplamıdır', () => {
    const r = hesaplaIskonto(senetler, AYAR);
    // 10.000 × 0,36 × 30 ÷ 360 = 300; 20.000 → 1.200; 15.000 × 0,36 × 90 ÷ 360 = 1.350 → toplam 2.850
    expect(r.satirlar.map((s) => s.dis.iskonto)).toEqual([300, 1200, 1350]);
    expect(r.dis.iskonto).toBe(2850);
    expect(r.toplamNominal).toBe(45000);
    expect(r.dis.eleGecen).toBe(42150);
    expect(r.ortalamaGun).toBeCloseTo(63.3333, 3);
  });

  it('portföy basit maliyeti = toplam kesinti ÷ Σ(ele geçen × gün ÷ yıl günü)', () => {
    const r = hesaplaIskonto(senetler, AYAR);
    const paraGun = r.satirlar.reduce((t, s) => t + (s.dis.eleGecen * s.gun) / 360, 0);
    expect(r.dis.basitMaliyet!).toBeCloseTo(2850 / paraGun, 10);
  });

  it('portföy bileşik maliyeti: bugünkü değerler ele geçen toplama eşit', () => {
    const r = hesaplaIskonto(senetler, AYAR);
    const x = r.dis.bilesikMaliyet!;
    const pv = senetler.reduce((t, s) => t + s.nominal / Math.pow(1 + x, s.gun / 360), 0);
    expect(pv).toBeCloseTo(r.dis.eleGecen, 3);
  });
});

describe('doğrulama', () => {
  it('senet doğrulaması', () => {
    expect(validateSenet(null, 30)).toHaveProperty('nominal');
    expect(validateSenet(0, 30)).toHaveProperty('nominal');
    expect(validateSenet(100, -1)).toHaveProperty('gun');
    expect(validateSenet(100, 5000)).toHaveProperty('gun');
    expect(validateSenet(100, 0)).toEqual({});
  });

  it('ayar doğrulaması', () => {
    const ok = { oran: 40, komisyonYuzde: 0, sabitKomisyon: 0, bsmvOrani: 5 };
    expect(validateAyar(ok)).toEqual({});
    expect(validateAyar({ ...ok, oran: 0 })).toHaveProperty('oran');
    expect(validateAyar({ ...ok, oran: null })).toHaveProperty('oran');
    expect(validateAyar({ ...ok, bsmvOrani: 120 })).toHaveProperty('bsmvOrani');
    expect(validateAyar({ ...ok, sabitKomisyon: -1 })).toHaveProperty('sabitKomisyon');
  });
});
