import { describe, expect, it } from 'vitest';
import { duyarlilik, hesaplaUcret, validateFreelancer } from './calc';

const temel = {
  hedefAylikNet: 60_000,
  aylikGider: 10_000,
  vergiYuku: 25,
  haftalikGun: 5,
  gunlukSaat: 8,
  calisilmayanGun: 40,
  faturalanabilir: 75,
};

describe('freelancer ücreti', () => {
  it('iş günü ve faturalanabilir saat', () => {
    const r = hesaplaUcret(temel);
    // 52 × 5 − 40 = 220 gün; 220 × 8 × 0,75 = 1.320 saat
    expect(r.yillikIsGunu).toBe(220);
    expect(r.yillikFaturaSaati).toBe(1320);
  });

  it('ciro = net ÷ (1 − vergi) + gider', () => {
    const r = hesaplaUcret(temel);
    // 720.000 / 0,75 = 960.000 + 120.000 = 1.080.000
    expect(r.yillikCiro).toBe(1_080_000);
    expect(r.aylikCiro).toBe(90_000);
    expect(r.yillikVergi).toBe(240_000);
  });

  it('saatlik ve günlük ücret', () => {
    const r = hesaplaUcret(temel);
    // 1.080.000 / 1.320 = 818,18
    expect(r.saatlik).toBe(818.18);
    expect(r.gunluk).toBeCloseTo(6545.45, 1);
  });

  it('vergi ve gider yoksa ücret yalnızca net hedefe bağlıdır', () => {
    const r = hesaplaUcret({ ...temel, aylikGider: 0, vergiYuku: 0, faturalanabilir: 100 });
    // 720.000 / 1.760 saat
    expect(r.saatlik).toBe(409.09);
  });

  it('faturalanabilir oran düştükçe ücret yükselir', () => {
    const d = duyarlilik(temel, [50, 100], [1]);
    expect(d[0].ucretler[0]).toBeGreaterThan(d[1].ucretler[0]);
    expect(d[0].ucretler[0]).toBeCloseTo(d[1].ucretler[0] * 2, 1);
  });

  it('hedef gelir çarpanı', () => {
    const d = duyarlilik({ ...temel, aylikGider: 0 }, [75], [1, 2]);
    expect(d[0].ucretler[1]).toBeCloseTo(d[0].ucretler[0] * 2, 1);
  });
});

describe('doğrulama', () => {
  it('girdi hataları', () => {
    const e = validateFreelancer({ net: 0, vergi: 100, gun: 8, saat: 0, tatil: -1, oran: 0 });
    expect(Object.keys(e).sort()).toEqual(['gun', 'net', 'oran', 'saat', 'tatil', 'vergi']);
    expect(validateFreelancer({ net: 1, vergi: 20, gun: 5, saat: 8, tatil: 300, oran: 70 })).toHaveProperty('tatil');
    expect(validateFreelancer({ net: 1, vergi: 20, gun: 5, saat: 8, tatil: 30, oran: 70 })).toEqual({});
  });
});
