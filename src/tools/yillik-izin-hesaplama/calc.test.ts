import { describe, expect, it } from 'vitest';
import { hesaplaIzin, izinGunu, kullanilmayanIzinUcreti, tamYil, validateIzin, yilEkle } from './calc';

describe('izin günü (İş K. md. 53)', () => {
  it('kıdeme göre 14 / 20 / 26 gün', () => {
    expect(izinGunu(1, 30, false)).toBe(14);
    expect(izinGunu(5, 30, false)).toBe(14);
    expect(izinGunu(6, 30, false)).toBe(20);
    expect(izinGunu(14, 30, false)).toBe(20);
    expect(izinGunu(15, 40, false)).toBe(26);
  });

  it('18 yaş ve altı ile 50 yaş ve üstü en az 20 gün', () => {
    expect(izinGunu(1, 18, false)).toBe(20);
    expect(izinGunu(2, 50, false)).toBe(20);
    expect(izinGunu(16, 55, false)).toBe(26);
  });

  it('yeraltı işinde +4 gün, sözleşmeyle ek gün', () => {
    expect(izinGunu(1, 30, true)).toBe(18);
    expect(izinGunu(1, 30, false, 2)).toBe(16);
  });
});

describe('tarih yardımcıları', () => {
  it('yıl ekleme ve 29 Şubat', () => {
    expect(yilEkle('2020-03-15', 6)).toBe('2026-03-15');
    expect(yilEkle('2024-02-29', 1)).toBe('2025-02-28');
  });
  it('tam yıl', () => {
    expect(tamYil('1976-10-30', '2026-10-29')).toBe(49);
    expect(tamYil('1976-10-29', '2026-10-29')).toBe(50);
  });
});

describe('izin hesabı', () => {
  it('7 yıllık çalışan: 5 × 14 + 2 × 20 = 110 gün', () => {
    const r = hesaplaIzin({ giris: '2019-09-01', dogum: '1990-05-10', hesapTarihi: '2026-10-29', yeraltı: false, ekGun: 0, kullanilan: 60 });
    expect(r.hakEdisler).toHaveLength(7);
    expect(r.toplamHak).toBe(110);
    expect(r.kalan).toBe(50);
    expect(r.sonraki).toMatchObject({ yil: 8, tarih: '2027-09-01', gun: 20 });
    expect(r.hizmet).toEqual({ yil: 7, ay: 1, gun: 28 });
  });

  it('50 yaşına giren çalışanın izni o hak edişten itibaren 20 gün', () => {
    const r = hesaplaIzin({ giris: '2023-01-10', dogum: '1975-06-01', hesapTarihi: '2026-02-01', yeraltı: false, ekGun: 0, kullanilan: 0 });
    // 2024-01-10 yaş 48 → 14; 2025-01-10 yaş 49 → 14; 2026-01-10 yaş 50 → 20
    expect(r.hakEdisler.map((h) => h.gun)).toEqual([14, 14, 20]);
  });

  it('1 yılı doldurmamış: henüz izin hakkı yok', () => {
    const r = hesaplaIzin({ giris: '2026-03-01', dogum: '1995-01-01', hesapTarihi: '2026-10-29', yeraltı: false, ekGun: 0, kullanilan: 0 });
    expect(r.toplamHak).toBe(0);
    expect(r.sonraki?.tarih).toBe('2027-03-01');
  });

  it('kullanılmayan izin ücreti (md. 59)', () => {
    expect(kullanilmayanIzinUcreti(15, 45000)).toBe(22500);
  });

  it('doğrulama', () => {
    expect(validateIzin({ giris: '2026-01-01', dogum: '2015-01-01', hesap: '2026-10-29', kullanilan: 0, ek: 0 })).toHaveProperty('dogum');
    expect(validateIzin({ giris: '2026-01-01', dogum: '1990-01-01', hesap: '2025-10-29', kullanilan: 0, ek: 0 })).toHaveProperty('hesap');
    expect(validateIzin({ giris: '2020-01-01', dogum: '1990-01-01', hesap: '2026-10-29', kullanilan: 0, ek: 0 })).toEqual({});
  });
});
