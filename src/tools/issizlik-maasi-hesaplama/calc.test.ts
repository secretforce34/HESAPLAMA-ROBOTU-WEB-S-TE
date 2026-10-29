import { describe, expect, it } from 'vitest';
import { hesaplaIssizlik, validateIssizlik } from './calc';

const temel = { primGun: 900, kesintisiz120: true, nedenUygun: true, tarih: '2026-10-15' };

describe('işsizlik ödeneği (4447 md. 50)', () => {
  it('asgari ücretli: 33.030 × %40 = 13.212 TL brüt, net 13.111,72', () => {
    const r = hesaplaIssizlik({ ...temel, son4Ay: [33030, 33030, 33030, 33030] });
    expect(r.aylikBrut).toBe(13212);
    expect(r.aylikDamga).toBe(100.28);
    expect(r.aylikNet).toBe(13111.72);
  });

  it('yüksek ücrette tavan: asgari ücretin %80’i = 26.424 TL, net 26.223,44', () => {
    const r = hesaplaIssizlik({ ...temel, son4Ay: [90000, 90000, 90000, 90000] });
    expect(r.tavanUygulandi).toBe(true);
    expect(r.aylikBrut).toBe(26424);
    expect(r.aylikDamga).toBe(200.56);
    expect(r.aylikNet).toBe(26223.44);
  });

  it('dört ayın ortalaması alınır', () => {
    const r = hesaplaIssizlik({ ...temel, son4Ay: [40000, 50000, 50000, 60000] });
    expect(r.ortalamaPek).toBe(50000);
    expect(r.aylikBrut).toBe(20000);
  });

  it('SGK tavanını aşan ay tavanla sınırlanır', () => {
    const r = hesaplaIssizlik({ ...temel, son4Ay: [400000, 33030, 33030, 33030] });
    // (297.270 + 3 × 33.030) / 4 = 99.090 → %40 = 39.636 → tavan 26.424
    expect(r.ortalamaPek).toBe(99090);
    expect(r.aylikBrut).toBe(26424);
  });

  it('süreler: 600 → 180, 900 → 240, 1080 → 300 gün', () => {
    const s = (primGun: number) => hesaplaIssizlik({ ...temel, primGun, son4Ay: [40000, 40000, 40000, 40000] }).sureGun;
    expect(s(600)).toBe(180);
    expect(s(899)).toBe(180);
    expect(s(900)).toBe(240);
    expect(s(1080)).toBe(300);
  });

  it('toplam net = aylık net × ay', () => {
    const r = hesaplaIssizlik({ ...temel, primGun: 1080, son4Ay: [33030, 33030, 33030, 33030] });
    expect(r.sureAy).toBe(10);
    expect(r.toplamNet).toBe(131117.2);
  });

  it('600 günden az prim: hak yok', () => {
    const r = hesaplaIssizlik({ ...temel, primGun: 599, son4Ay: [40000, 40000, 40000, 40000] });
    expect(r.hakVar).toBe(false);
    expect(r.toplamNet).toBe(0);
  });

  it('kendi isteğiyle ayrılma ve kesintisiz 120 gün şartı', () => {
    const r = hesaplaIssizlik({ ...temel, nedenUygun: false, kesintisiz120: false, son4Ay: [40000, 40000, 40000, 40000] });
    expect(r.engeller).toHaveLength(2);
  });

  it('2025 ayrılışında 2025 asgari ücretine göre tavan', () => {
    const r = hesaplaIssizlik({ ...temel, tarih: '2025-06-01', son4Ay: [90000, 90000, 90000, 90000] });
    // 26.005,50 × %80 = 20.804,40
    expect(r.aylikBrut).toBe(20804.4);
  });

  it('doğrulama', () => {
    expect(validateIssizlik({ aylar: [1, null, 1, 1], primGun: 600, tarih: '2026-01-01' })).toHaveProperty('aylar');
    expect(validateIssizlik({ aylar: [1, 1, 1, 1], primGun: 2000, tarih: '2026-01-01' })).toHaveProperty('primGun');
    expect(validateIssizlik({ aylar: [1, 1, 1, 1], primGun: 600, tarih: '2026-01-01' })).toEqual({});
  });
});
