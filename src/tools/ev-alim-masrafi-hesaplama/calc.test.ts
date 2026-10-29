import { describe, expect, it } from 'vitest';
import { hesaplaEvAlim, validateEvAlim } from './calc';

const temel = {
  satisBedeli: 5_000_000,
  saticiHarciniDaOde: false,
  donerSermaye: 2534,
  emlakciYuzde: 2,
  kdvYuzde: 0,
  krediTutari: 0,
  tahsisBinde: 5,
  ekspertiz: 0,
  dask: 0,
  digerler: [],
};

describe('ev alım masrafları', () => {
  it('tapu harcı alıcı payı %2', () => {
    const r = hesaplaEvAlim(temel);
    expect(r.kalemler[0].tutar).toBe(100_000);
  });

  it('satıcı payı da ödenirse %4', () => {
    expect(hesaplaEvAlim({ ...temel, saticiHarciniDaOde: true }).kalemler[0].tutar).toBe(200_000);
  });

  it('emlakçı %2 + %20 KDV = %2,4', () => {
    const r = hesaplaEvAlim(temel);
    expect(r.kalemler.find((k) => k.ad.startsWith('Emlakçı'))!.tutar).toBe(120_000);
  });

  it('toplam masraf ve oran', () => {
    const r = hesaplaEvAlim(temel);
    expect(r.toplamMasraf).toBe(100_000 + 2534 + 120_000);
    expect(r.toplamMaliyet).toBe(5_000_000 + 222_534);
    expect(r.masrafOrani).toBeCloseTo(4.45, 2);
  });

  it('kredi: tahsis ücreti binde 5, ekspertiz, peşin gereken', () => {
    const r = hesaplaEvAlim({ ...temel, krediTutari: 3_000_000, ekspertiz: 6000 });
    expect(r.kalemler.find((k) => k.ad.startsWith('Kredi tahsis'))!.tutar).toBe(15_000);
    expect(r.pesinGereken).toBe(r.toplamMaliyet - 3_000_000);
  });

  it('müteahhitten alımda KDV maliyete eklenir ama masraf oranına girmez', () => {
    const r = hesaplaEvAlim({ ...temel, emlakciYuzde: 0, kdvYuzde: 1 });
    expect(r.kalemler.find((k) => k.ad.startsWith('KDV'))!.tutar).toBe(50_000);
    expect(r.toplamMasraf).toBe(102_534);
    expect(r.toplamMaliyet).toBe(5_000_000 + 50_000 + 102_534);
  });

  it('diğer masraflar ve DASK', () => {
    const r = hesaplaEvAlim({ ...temel, dask: 1800, digerler: [{ ad: 'Nakliye', tutar: 15000 }, { ad: '', tutar: 0 }] });
    expect(r.kalemler.some((k) => k.ad === 'Nakliye')).toBe(true);
    expect(r.toplamMasraf).toBe(100_000 + 2534 + 120_000 + 1800 + 15000);
  });

  it('doğrulama', () => {
    expect(validateEvAlim({ bedel: 0, emlakci: 2, kredi: 0 })).toHaveProperty('bedel');
    expect(validateEvAlim({ bedel: 100, emlakci: 5, kredi: 0 })).toHaveProperty('emlakci');
    expect(validateEvAlim({ bedel: 100, emlakci: 2, kredi: 200 })).toHaveProperty('kredi');
    expect(validateEvAlim({ bedel: 100, emlakci: 2, kredi: 50 })).toEqual({});
  });
});
