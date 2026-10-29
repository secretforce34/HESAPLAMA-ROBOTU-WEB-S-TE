import { describe, expect, it } from 'vitest';
import { enflasyonla, endeks, ILK_AY, seriAraligi, SON_AY, validateAy } from './calc';

describe('TÜFE serisi', () => {
  it('2005’ten başlar ve son veri ayına kadar kesintisizdir', () => {
    expect(ILK_AY).toBe('2005-01');
    expect(SON_AY >= '2026-09').toBe(true);
    expect(endeks('2015-06')).not.toBeNull();
  });
});

describe('enflasyon hesabı', () => {
  it('Aralık 2025 → Eylül 2026: 2026’nın 9 aylık değişimlerinin çarpımı', () => {
    // TÜİK aylık değişimleri: 4,84 / 2,96 / 1,94 / 4,18 / 1,71 / 0,99 / 1,78 / 1,84 / 1,84
    const beklenen = [4.84, 2.96, 1.94, 4.18, 1.71, 0.99, 1.78, 1.84, 1.84].reduce((k, a) => k * (1 + a / 100), 1);
    const r = enflasyonla(1000, '2025-12', '2026-09')!;
    expect(r.kat).toBeCloseTo(beklenen, 8);
    expect(r.karsilik).toBe(Math.round(1000 * beklenen * 100) / 100);
    expect(r.aySayisi).toBe(9);
  });

  it('12 aylık değişim, açıklanan yıllık enflasyonla örtüşür (Eylül 2026: %29,73)', () => {
    const r = enflasyonla(100, '2025-09', '2026-09')!;
    expect(r.kumulatif).toBeCloseTo(29.73, 1);
    expect(r.yillikOrtalama).toBeCloseTo(r.kumulatif, 8);
  });

  it('ters yön: bugünkü tutarın geçmişteki karşılığı', () => {
    const ileri = enflasyonla(1000, '2020-01', '2026-01')!;
    const geri = enflasyonla(ileri.karsilik, '2026-01', '2020-01')!;
    expect(geri.karsilik).toBeCloseTo(1000, 0);
  });

  it('alım gücü kaybı = 1 − 1/kat', () => {
    const r = enflasyonla(1000, '2015-01', '2025-01')!;
    expect(r.alimGucuKaybi).toBeCloseTo((1 - 1 / r.kat) * 100, 10);
    expect(r.kat).toBeGreaterThan(10);
  });

  it('aynı ay: değişim yok', () => {
    expect(enflasyonla(500, '2024-05', '2024-05')!.karsilik).toBe(500);
  });

  it('veri olmayan ay: null', () => {
    expect(enflasyonla(100, '1999-01', '2026-01')).toBeNull();
  });

  it('grafik serisi başlangıçta 1’dir', () => {
    const s = seriAraligi('2024-01', '2024-12');
    expect(s).toHaveLength(12);
    expect(s[0].deger).toBe(1);
  });

  it('ay doğrulaması', () => {
    expect(validateAy('2004-12')).toBeDefined();
    expect(validateAy('2020-05')).toBeUndefined();
  });
});
