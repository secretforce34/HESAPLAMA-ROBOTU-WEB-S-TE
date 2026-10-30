import { describe, expect, it } from 'vitest';
import { aracYasi, hesaplaMtv, motosikletSatiri, otomobilSatiri, validateMtv, yasGrubu, type MtvInput } from './calc';

const temel: MtvInput = { tur: 'otomobil', elektrikli: false, olcu: 1598, modelYili: 2024, yeniTescil: true, kademe: 2 };

describe('MTV 2026', () => {
  it('model yılında araç 1 yaşında; yaş grupları', () => {
    expect(aracYasi(2026, 2026)).toBe(1);
    expect(aracYasi(2024, 2026)).toBe(3);
    expect(aracYasi(2027, 2026)).toBe(1);
    expect([1, 3, 4, 6, 7, 11, 12, 15, 16, 30].map(yasGrubu)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('silindir hacmi ve elektrikli motor gücü satırları (197 s. Kanun md. 5)', () => {
    expect([1300, 1301, 1598, 1800, 1998, 2500, 2999, 3500, 4000, 4001].map((c) => otomobilSatiri(c, false))).toEqual([0, 1, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect([70, 71, 85, 105, 120, 150, 151, 210, 240, 241].map((k) => otomobilSatiri(k, true))).toEqual([0, 1, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('1.6 benzinli, 2024 model, 541.500 TL üstü kademe: 12.028 TL, iki taksit', () => {
    const r = hesaplaMtv(temel);
    expect(r.yillik).toBe(12_028);
    expect(r.taksit).toBe(6_014);
    expect(r.kademeler.map((k) => k.yillik)).toEqual([10_016, 11_023, 12_028]);
    expect(r.kademeler[1].ad).toBe('309.100 – 541.500 TL');
  });

  it('elektrikli 150 kW, 968.100 TL üstü, 3 yaş: 50.217 TL’nin %25’i', () => {
    const r = hesaplaMtv({ ...temel, elektrikli: true, olcu: 150, kademe: 1 });
    expect(r.tamTutar).toBe(50_217);
    expect(r.yillik).toBe(12_554.25);
  });

  it('2018 öncesi tescil (I/A): 2015 model 1.6 → 12 yaş grubu', () => {
    const r = hesaplaMtv({ ...temel, modelYili: 2015, yeniTescil: false });
    expect(r.yas).toBe(12);
    expect(r.yillik).toBe(3_077);
    expect(r.satir).toContain('(I/A)');
  });

  it('motosiklet: 100 cm³ altı ve 6 kW’a kadar elektrikli vergi dışı', () => {
    expect(motosikletSatiri(90, false)).toBe(-1);
    expect(motosikletSatiri(125, false)).toBe(0);
    expect(motosikletSatiri(6, true)).toBe(-1);
    expect(hesaplaMtv({ ...temel, tur: 'motosiklet', olcu: 125, modelYili: 2026 }).yillik).toBe(1_069);
    expect(hesaplaMtv({ ...temel, tur: 'motosiklet', elektrikli: true, olcu: 10, modelYili: 2026 }).yillik).toBe(267.25);
    expect(hesaplaMtv({ ...temel, tur: 'motosiklet', olcu: 90 }).vergiDisi).toBe(true);
  });

  it('bir sonraki yaş grubuna geçiş yılı', () => {
    const r = hesaplaMtv(temel);
    expect(r.sonrakiGrup).toEqual({ yil: 2027, yillik: 9_012 });
    expect(hesaplaMtv({ ...temel, modelYili: 2000, yeniTescil: false }).sonrakiGrup).toBeNull();
  });

  it('doğrulama', () => {
    expect(validateMtv({ olcu: 1600, modelYili: 2020 })).toEqual({});
    expect(validateMtv({ olcu: null, modelYili: 1900 })).toHaveProperty('modelYili');
  });
});
