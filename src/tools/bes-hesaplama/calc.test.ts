import { describe, expect, it } from 'vitest';
import { emeklilikHakki, hakOrani, hesaplaBes, stopajOrani, validateBes, type BesInput } from './calc';

const temel: BesInput = {
  aylikKatki: 1000,
  katkiArtisi: 0,
  getiri: 0,
  yil: 1,
  yas: 30,
  mevcutYil: 0,
  mevcutOdenen: 0,
  mevcutBirikim: 0,
  mevcutDk: 0,
};

describe('BES', () => {
  it('getiri yoksa: ödenen = birikim, devlet katkısı %20, 3 yıldan önce hak yok', () => {
    const r = hesaplaBes(temel);
    expect(r.son.odenen).toBe(12_000);
    expect(r.son.birikim).toBe(12_000);
    expect(r.son.dkBirikim).toBe(2_400);
    expect(r.son.hakEdilenDk).toBe(0);
    expect(r.son.stopaj).toBe(0);
    expect(r.son.net).toBe(12_000);
  });

  it('yıllık devlet katkısı üst sınırı 79.272 TL', () => {
    const r = hesaplaBes({ ...temel, aylikKatki: 50_000 });
    expect(r.yatanDk).toBe(79_272);
    expect(r.sinirAsildi).toBe(true);
    expect(hesaplaBes({ ...temel, aylikKatki: 33_030 }).sinirAsildi).toBe(false);
  });

  it('hak kazanma oranları: 3 yıl %15, 6 yıl %35, 10 yıl %60', () => {
    expect([2, 3, 5, 6, 9, 10, 20].map(hakOrani)).toEqual([0, 15, 15, 35, 35, 60, 60]);
  });

  it('emeklilik: 10 yıl ve 56 yaş', () => {
    expect(emeklilikHakki(10, 56)).toBe(true);
    expect(emeklilikHakki(9, 60)).toBe(false);
    expect(emeklilikHakki(12, 55)).toBe(false);
  });

  it('stopaj: 10 yıldan az %15, 10 yıl üstü %10, emeklilik %5', () => {
    expect(stopajOrani(5, false)).toBe(15);
    expect(stopajOrani(10, false)).toBe(10);
    expect(stopajOrani(10, true)).toBe(5);
  });

  it('stopaj yalnızca katılımcı katkı payının getirisine uygulanır', () => {
    const r = hesaplaBes({ ...temel, getiri: 30, yil: 4 });
    const s = r.son;
    expect(s.getiri).toBeCloseTo(s.birikim - s.odenen, 1);
    expect(s.stopaj).toBeCloseTo(s.getiri * 0.15, 1);
    expect(s.hakEdilenDk).toBeCloseTo(s.dkBirikim * 0.15, 1);
    expect(s.net).toBeCloseTo(s.birikim - s.stopaj + s.hakEdilenDk, 1);
  });

  it('mevcut BES süresi hak kazanmaya eklenir; 56 yaşta emeklilikte devlet katkısının tamamı', () => {
    const r = hesaplaBes({ ...temel, yil: 2, yas: 54, mevcutYil: 8, mevcutOdenen: 50_000, mevcutBirikim: 80_000, mevcutDk: 15_000 });
    expect(r.son.sistemYili).toBe(10);
    expect(r.son.emeklilik).toBe(true);
    expect(r.son.dkHakOrani).toBe(100);
    expect(r.son.stopajOrani).toBe(5);
    expect(r.son.getiri).toBe(30_000);
    expect(r.emeklilikIcinYil).toBe(2);
  });

  it('katkı artışı her yıl uygulanır', () => {
    const r = hesaplaBes({ ...temel, yil: 2, katkiArtisi: 50 });
    expect(r.son.odenen).toBe(12_000 + 18_000);
  });

  it('doğrulama', () => {
    const ok = { katki: 1000, getiri: 30, yil: 10, yas: 30, mevcutYil: null, mevcutOdenen: null, mevcutBirikim: null };
    expect(validateBes(ok)).toEqual({});
    expect(validateBes({ ...ok, katki: 0 })).toHaveProperty('katki');
    expect(validateBes({ ...ok, mevcutBirikim: 1000 })).toHaveProperty('mevcutOdenen');
  });
});
