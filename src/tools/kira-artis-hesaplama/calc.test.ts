import { describe, expect, it } from 'vitest';
import { kiraZinciri, onIkiAylikOrtalama, sonOranlar, validateKira, yasalOran, yeniKira } from './calc';

describe('12 aylık ortalama TÜFE değişimi', () => {
  // TÜİK’in açıkladığı 2026 kira artış oranları (alomaliye.com, TÜİK bültenlerinden derleme)
  const resmi: Record<string, number> = {
    '2026-01': 33.98,
    '2026-02': 33.39,
    '2026-03': 32.82,
    '2026-04': 32.43,
    '2026-05': 32.24,
    '2026-06': 32.03,
    '2026-07': 31.9,
    '2026-08': 31.79,
    '2026-09': 31.49,
  };
  for (const [ay, oran] of Object.entries(resmi)) {
    it(`${ay}: TÜİK’in açıkladığı %${oran} ile aynı`, () => {
      expect(onIkiAylikOrtalama(ay)).toBe(oran);
    });
  }

  it('veri yoksa null', () => {
    expect(onIkiAylikOrtalama('2005-06')).toBeNull();
  });
});

describe('yasal oran', () => {
  it('Ekim yenilemesinde Eylül oranı esas alınır', () => {
    const o = yasalOran('2026-10-15', 'konut');
    expect(o.esasAy).toBe('2026-09');
    expect(o.uygulanan).toBe(31.49);
  });

  it('henüz açıklanmamış oran', () => {
    const o = yasalOran('2099-11-05', 'konut');
    expect(o.oran).toBeNull();
    expect(o.aciklanma).toBe('2099-11-03');
  });

  it('11.06.2022–01.07.2024 konut yenilemelerinde %25 sınırı', () => {
    const konut = yasalOran('2023-08-01', 'konut');
    expect(konut.oran!).toBeGreaterThan(25);
    expect(konut.sinir25).toBe(true);
    expect(konut.uygulanan).toBe(25);
    const isyeri = yasalOran('2023-08-01', 'isyeri');
    expect(isyeri.sinir25).toBe(false);
    expect(isyeri.uygulanan).toBe(isyeri.oran);
  });

  it('sınır 01.07.2024’te sona erer', () => {
    expect(yasalOran('2024-07-01', 'konut').sinir25).toBe(true);
    expect(yasalOran('2024-07-02', 'konut').sinir25).toBe(false);
  });
});

describe('kira zinciri', () => {
  it('2022’de başlayan konut kirasının yıllık azami artışları', () => {
    const z = kiraZinciri(5000, '2022-03-01', '2026-10-29', 'konut');
    // 2023-03 ve 2024-03 yenilemeleri %25 sınırında
    expect(z[0]).toMatchObject({ tarih: '2023-03-01', uygulanan: 25, yeniKira: 6250 });
    expect(z[1]).toMatchObject({ tarih: '2024-03-01', uygulanan: 25, yeniKira: 7812.5 });
    expect(z[2].sinir25).toBe(false);
    expect(z[3]).toMatchObject({ tarih: '2026-03-01', uygulanan: 33.39 });
    // bir sonraki (gelecek) yenileme de listede
    expect(z[z.length - 1].tarih).toBe('2027-03-01');
  });

  it('yeni kira hesabı', () => {
    expect(yeniKira(20000, 31.49)).toBe(26298);
  });
});

describe('yardımcılar', () => {
  it('son oranlar listesi', () => {
    const l = sonOranlar(12);
    expect(l).toHaveLength(12);
    expect(l[0].ay >= '2026-09').toBe(true);
  });
  it('doğrulama', () => {
    expect(validateKira({ kira: 0, tarih: '2026-01-01' })).toHaveProperty('kira');
    expect(validateKira({ kira: 100, tarih: '2001-01-01' })).toHaveProperty('tarih');
    expect(validateKira({ kira: 100, tarih: '2026-01-01' })).toEqual({});
  });
});
