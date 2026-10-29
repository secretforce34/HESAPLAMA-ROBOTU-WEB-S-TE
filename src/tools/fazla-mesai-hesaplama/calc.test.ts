import { describe, expect, it } from 'vitest';
import {
  gunlukUcret,
  hesaplaFazlaMesai,
  saatlikUcret,
  tekrarlananAylar,
  validateBolen,
  validateDonem,
  validateHaftalik,
  validateUcret,
  type Donem,
  type FazlaMesaiGirdi,
} from './calc';

const donem = (ay: number, p: Partial<Donem> = {}): Donem => ({
  ay,
  fazlaCalisma: 0,
  fazlaSureler: 0,
  haftaTatili: 0,
  genelTatil: 0,
  ...p,
});

const temel: FazlaMesaiGirdi = {
  yil: 2026,
  ucret: { tur: 'aylik', tutar: 50000, bolen: 225 },
  haftalikSure: 45,
  donemler: [donem(10, { fazlaCalisma: 10 })],
};

describe('saat ve gün ücreti', () => {
  it('aylık 50.000 TL ÷ 225 = 222,22 TL/saat; günlük 1.666,67 TL', () => {
    expect(saatlikUcret(temel.ucret)).toBeCloseTo(222.2222, 4);
    expect(gunlukUcret(temel.ucret)).toBeCloseTo(1666.6667, 4);
  });

  it('günlük ve saatlik ücretten çevirme (günlük 7,5 saat)', () => {
    expect(saatlikUcret({ tur: 'gunluk', tutar: 2000, bolen: 225 })).toBeCloseTo(266.6667, 4);
    expect(gunlukUcret({ tur: 'saatlik', tutar: 300, bolen: 225 })).toBe(2250);
  });
});

describe('brüt fazla mesai kalemleri (4857 md. 41, 47)', () => {
  it('10 saat fazla çalışma = 10 × 222,22 × 1,5 = 3.333,33 TL', () => {
    const r = hesaplaFazlaMesai(temel);
    expect(r.toplam.fazlaCalismaUcreti).toBe(3333.33);
    expect(r.toplam.brut).toBe(3333.33);
  });

  it('dört kalem birlikte, haftalık 40 saatlik sözleşme (elle doğrulandı)', () => {
    const r = hesaplaFazlaMesai({
      ...temel,
      haftalikSure: 40,
      donemler: [donem(10, { fazlaCalisma: 10, fazlaSureler: 8, haftaTatili: 8, genelTatil: 1 })],
    });
    const d = r.donemler[0];
    expect(d.fazlaCalismaUcreti).toBe(3333.33); // %50
    expect(d.fazlaSurelerUcreti).toBe(2222.22); // %25: 8 × 222,22 × 1,25
    expect(d.haftaTatiliUcreti).toBe(2666.67); // %50: 8 × 222,22 × 1,5
    expect(d.genelTatilUcreti).toBe(1666.67); // md. 47: +1 günlük ücret
    expect(d.brut).toBe(9888.89);
    // Ekim bordrosu: mesaili net 43.797,30 − mesaisiz net 37.736,30
    expect(d.sgkIsci).toBe(1384.44);
    expect(d.issizlikIsci).toBe(98.89);
    expect(d.gv).toBe(2269.5); // kümülatif 382.500 → 400.000 eşiği Ekim’de aşılır
    expect(d.dv).toBe(75.06);
    expect(d.net).toBe(6061);
    expect(r.dilimEtkisi).toBe(0);
  });

  it('saatlik ücretli: 300 TL/saat, 10 saat + yarım gün arife', () => {
    const r = hesaplaFazlaMesai({
      ...temel,
      ucret: { tur: 'saatlik', tutar: 300, bolen: 225 },
      donemler: [donem(5, { fazlaCalisma: 10, genelTatil: 0.5 })],
    });
    expect(r.aylik).toBe(67500);
    expect(r.toplam.fazlaCalismaUcreti).toBe(4500);
    expect(r.toplam.genelTatilUcreti).toBe(1125);
  });

  it('günlük ücretli: 2.000 TL/gün, 3 saat fazla çalışma + 1 bayram günü', () => {
    const r = hesaplaFazlaMesai({
      ...temel,
      ucret: { tur: 'gunluk', tutar: 2000, bolen: 225 },
      donemler: [donem(4, { fazlaCalisma: 3, genelTatil: 1 })],
    });
    expect(r.toplam.fazlaCalismaUcreti).toBe(1200);
    expect(r.toplam.genelTatilUcreti).toBe(2000);
  });
});

describe('yaklaşık net ve dilim etkisi', () => {
  it('Şubat’ta 30 saat (10.000 TL): bordroya 7.149,10 TL; Mayıs ve Ekim’de dilim etkisi −1.020 TL', () => {
    const r = hesaplaFazlaMesai({ ...temel, donemler: [donem(2, { fazlaCalisma: 30 })] });
    const d = r.donemler[0];
    expect(d.brut).toBe(10000);
    // 1.400 SGK + 100 işsizlik + 1.275 GV (%15) + 75,90 DV
    expect(d.gv).toBe(1275);
    expect(d.net).toBe(7149.1);
    // Ek 8.500 TL matrah: Mayıs’ta %15 yerine %20 (+425), Ekim’de %20 yerine %27 (+595)
    expect(r.dilimEtkisi).toBe(-1020);
    expect(r.yillikNetEtki).toBe(6129.1);
  });

  it('birden fazla ay satır satır', () => {
    const r = hesaplaFazlaMesai({
      ...temel,
      donemler: [donem(1, { fazlaCalisma: 12 }), donem(2, { fazlaCalisma: 8, genelTatil: 0 }), donem(4, { genelTatil: 1.5 })],
    });
    expect(r.donemler).toHaveLength(3);
    expect(r.toplam.fazlaCalisma).toBe(20);
    expect(r.toplam.brut).toBe(round(r.donemler.reduce((s, x) => s + x.brut, 0)));
    expect(r.donemler.every((x) => x.net > 0 && x.net < x.brut)).toBe(true);
  });
});

describe('yıllık 270 saat sınırı (4857 md. 41/8)', () => {
  it('fazla çalışma + hafta tatili çalışması toplamı 270’i aşarsa uyarı', () => {
    const asan = hesaplaFazlaMesai({
      ...temel,
      donemler: [donem(1, { fazlaCalisma: 100 }), donem(2, { fazlaCalisma: 100 }), donem(3, { fazlaCalisma: 50, haftaTatili: 30 })],
    });
    expect(asan.sinirSaati).toBe(280);
    expect(asan.sinirAsildi).toBe(true);
    const icinde = hesaplaFazlaMesai({ ...temel, donemler: [donem(1, { fazlaCalisma: 100, haftaTatili: 50 }), donem(2, { fazlaCalisma: 100 })] });
    expect(icinde.sinirAsildi).toBe(false);
  });
});

describe('doğrulama', () => {
  it('ücret, haftalık süre, bölen, dönem ve tekrarlanan ay', () => {
    expect(validateUcret(0)).toBeDefined();
    expect(validateUcret(50000)).toBeUndefined();
    expect(validateHaftalik(46)).toBeDefined();
    expect(validateHaftalik(40)).toBeUndefined();
    expect(validateBolen(225)).toBeUndefined();
    expect(validateBolen(10)).toBeDefined();
    const d = { ay: 10, fazlaCalisma: 5, fazlaSureler: 3, haftaTatili: 0, genelTatil: 0 };
    expect(validateDonem(d, 45)).toHaveProperty('fazlaSureler');
    expect(validateDonem(d, 40)).toEqual({});
    expect(validateDonem({ ...d, fazlaCalisma: -1 }, 40)).toHaveProperty('fazlaCalisma');
    expect(validateDonem({ ...d, genelTatil: null }, 40)).toHaveProperty('genelTatil');
    expect([...tekrarlananAylar([10, 11, 10])]).toEqual([2]);
  });
});

function round(n: number) {
  return Math.round(n * 100) / 100;
}
