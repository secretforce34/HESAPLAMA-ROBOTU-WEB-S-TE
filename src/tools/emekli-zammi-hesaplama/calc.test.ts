import { describe, expect, it } from 'vitest';
import { altiAy, donemSecenekleri, yeniMaas, zamHesapla } from './calc';

describe('açıklanmış zamlar', () => {
  it('Ocak 2026: SSK/Bağ-Kur %12,19, memur %18,60', () => {
    expect(zamHesapla('2026-01', 'emekli', {})!.zam).toBe(12.19);
    const m = zamHesapla('2026-01', 'memur', {})!;
    expect(m.zam).toBe(18.6);
    expect(m.resmi).toBe(true);
  });

  it('Temmuz 2026: SSK/Bağ-Kur %17,76, memur %13,52', () => {
    expect(zamHesapla('2026-07', 'emekli', {})!.zam).toBe(17.76);
    const m = zamHesapla('2026-07', 'memur-emekli', {})!;
    expect(m.zam).toBe(13.52);
    // enflasyon farkı: 1,1776 / 1,11 − 1 = %6,09
    expect(m.enflasyonFarki).toBeCloseTo(6.09, 2);
  });

  it('memur formülü açıklanan oranı üretir', () => {
    const fark = (1.1776 / 1.11 - 1) * 100;
    expect(((1 + fark / 100) * 1.07 - 1) * 100).toBeCloseTo(13.52, 2);
    const fark0 = (1.1219 / 1.05 - 1) * 100;
    expect(((1 + fark0 / 100) * 1.11 - 1) * 100).toBeCloseTo(18.6, 2);
  });
});

describe('tahmini dönem (Ocak 2027)', () => {
  it('esas aylar Temmuz–Aralık 2026', () => {
    expect(altiAy('2027-01')).toEqual(['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
  });

  it('açıklanan aylar veriden, kalanlar tahminden', () => {
    const r = zamHesapla('2027-01', 'emekli', { '2026-10': 2, '2026-11': 1.5, '2026-12': 1 })!;
    expect(r.resmi).toBe(false);
    expect(r.aylar.filter((a) => a.aciklandi).map((a) => a.ay)).toEqual(['2026-07', '2026-08', '2026-09']);
    const beklenen = (1.0178 * 1.0184 * 1.0184 * 1.02 * 1.015 * 1.01 - 1) * 100;
    expect(r.zam).toBeCloseTo(beklenen, 2);
  });

  it('memur Ocak 2027: fark %7’ye göre, yeni dönem %5', () => {
    const t = { '2026-10': 2, '2026-11': 1.5, '2026-12': 1 };
    const e = zamHesapla('2027-01', 'emekli', t)!;
    const m = zamHesapla('2027-01', 'memur', t)!;
    const fark = Math.max(0, ((1 + e.altiAylikTufe / 100) / 1.07 - 1) * 100);
    expect(m.zam).toBeCloseTo(((1 + fark / 100) * 1.05 - 1) * 100, 2);
  });

  it('enflasyon toplu sözleşmenin altındaysa fark 0', () => {
    const m = zamHesapla('2027-01', 'memur', { '2026-10': 0, '2026-11': 0, '2026-12': -5 })!;
    expect(m.enflasyonFarki).toBe(0);
    expect(m.zam).toBe(5);
  });

  it('tahmin eksikse null', () => {
    expect(zamHesapla('2027-01', 'emekli', {})).toBeNull();
  });
});

describe('yardımcılar', () => {
  it('yeni maaş', () => {
    expect(yeniMaas(20000, 17.76)).toBe(23552);
  });
  it('dönem seçenekleri açıklananlar ve sonraki iki dönem', () => {
    expect(donemSecenekleri('2026-09')).toEqual(['2026-01', '2026-07', '2027-01', '2027-07']);
  });
});
