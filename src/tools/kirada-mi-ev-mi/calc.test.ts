import { describe, expect, it } from 'vitest';
import { alimMasrafi, basabasKira, karsilastir, kdoKontrol, validateKiraEv, type KiraEvInput } from './calc';

const temel: KiraEvInput = {
  evFiyati: 5_000_000,
  pesinat: 2_000_000,
  aylikFaiz: 2.49,
  vade: 120,
  aylikKira: 25_000,
  kiraArtisi: 30,
  evDegerArtisi: 30,
  getiri: 35,
  emlakciYuzde: 2,
  digerMasraf: 15_000,
  sahiplikYuzde: 0.5,
  yil: 10,
};

const duz = { ...temel, kiraArtisi: 0, evDegerArtisi: 0, getiri: 0, sahiplikYuzde: 0 };

describe('kirada mı ev mi', () => {
  it('alım masrafı: tapu harcı %2 + emlakçı %2 + KDV + diğer', () => {
    expect(alimMasrafi(temel)).toBe(100_000 + 120_000 + 15_000);
  });

  it('peşin alımda, getiri ve artış yoksa fark = ödenmeyen kira − alım masrafı', () => {
    const r = karsilastir({ ...duz, pesinat: 5_000_000 });
    expect(r.kredi).toBe(0);
    expect(r.fark).toBeCloseTo(25_000 * 120 - 235_000, 2);
  });

  it('getiri ve artış yoksa fark = toplam kira − toplam faiz − alım masrafı', () => {
    const r = karsilastir({ ...duz, yil: 5 });
    expect(r.fark).toBeCloseTo(r.toplamKira - r.toplamFaiz - r.alimMasrafi, 1);
    expect(r.kalanBorc).toBeGreaterThan(0);
  });

  it('kredi bittikten sonra borç sıfır, faiz plan toplamına eşit', () => {
    const r = karsilastir({ ...temel, yil: 12 });
    expect(r.kalanBorc).toBe(0);
    expect(r.yillar).toHaveLength(13);
  });

  it('kira yıllık artar', () => {
    const r = karsilastir(temel);
    expect(r.yillar[1].aylikKira).toBe(25_000);
    expect(r.yillar[2].aylikKira).toBe(32_500);
  });

  it('ev değeri artışı ev almayı, getiri artışı kirada kalmayı öne çıkarır', () => {
    const r = karsilastir(temel);
    expect(karsilastir({ ...temel, evDegerArtisi: 40 }).fark).toBeGreaterThan(r.fark);
    expect(karsilastir({ ...temel, getiri: 45 }).fark).toBeLessThan(r.fark);
  });

  it('başabaş kirada iki senaryo eşit', () => {
    const k = basabasKira(temel)!;
    expect(k).toBeGreaterThan(0);
    const servet = karsilastir(temel).alanServet;
    expect(Math.abs(karsilastir({ ...temel, aylikKira: k }).fark)).toBeLessThan(servet * 0.001);
    expect(karsilastir({ ...temel, aylikKira: k + 1000 }).fark).toBeGreaterThan(0);
    expect(karsilastir({ ...temel, aylikKira: k - 1000 }).fark).toBeLessThan(0);
  });

  it('BDDK kredi/değer sınırı: 5 milyona kadar, A-B dışı enerji sınıfında %70', () => {
    const k = kdoKontrol(5_000_000, 1_000_000, 'diger', false);
    expect(k.kdo).toBe(70);
    expect(k.asiyor).toBe(true);
    expect(k.asgariPesinat).toBe(1_500_000);
    expect(kdoKontrol(5_000_000, 1_500_000, 'diger', false).asiyor).toBe(false);
    expect(kdoKontrol(5_000_000, 0, 'diger', true).kdo).toBe(17.5);
  });

  it('doğrulama', () => {
    const ok = { fiyat: 1, pesinat: 1, faiz: null, vade: null, kira: 1, kiraArtisi: 0, evArtisi: 0, getiri: 0, yil: 10 };
    expect(validateKiraEv(ok)).toEqual({});
    expect(validateKiraEv({ ...ok, pesinat: 0 })).toHaveProperty('faiz');
    expect(validateKiraEv({ ...ok, pesinat: 2 })).toHaveProperty('pesinat');
    expect(validateKiraEv({ ...ok, yil: 0 })).toHaveProperty('yil');
  });
});
