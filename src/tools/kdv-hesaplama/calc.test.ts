import { describe, expect, it } from 'vitest';
import { hesaplaKdv, validateKdv } from './calc';

describe('KDV hariç → dahil', () => {
  it('1.000 TL + %20', () => {
    const r = hesaplaKdv({ amount: 1000, rate: 20, mode: 'haric', tevkifat: 0 });
    expect(r).toMatchObject({ matrah: 1000, kdv: 200, toplam: 1200, tevkifEdilen: 0, odenecekToplam: 1200 });
  });

  it('%10 ve %1 oranları', () => {
    expect(hesaplaKdv({ amount: 250, rate: 10, mode: 'haric', tevkifat: 0 }).toplam).toBe(275);
    expect(hesaplaKdv({ amount: 250, rate: 1, mode: 'haric', tevkifat: 0 }).kdv).toBe(2.5);
  });

  it('kuruş yuvarlaması: 99,99 TL + %20 = 19,998 → 20,00', () => {
    const r = hesaplaKdv({ amount: 99.99, rate: 20, mode: 'haric', tevkifat: 0 });
    expect(r.kdv).toBe(20);
    expect(r.toplam).toBe(119.99);
  });
});

describe('KDV dahil → hariç', () => {
  it('1.200 TL (%20 dahil) → 1.000 + 200', () => {
    const r = hesaplaKdv({ amount: 1200, rate: 20, mode: 'dahil', tevkifat: 0 });
    expect(r).toMatchObject({ matrah: 1000, kdv: 200, toplam: 1200 });
  });

  it('matrah + KDV her zaman girilen tutara eşit (100 TL, %20)', () => {
    const r = hesaplaKdv({ amount: 100, rate: 20, mode: 'dahil', tevkifat: 0 });
    expect(r.matrah).toBe(83.33);
    expect(r.kdv).toBe(16.67);
    expect(r.toplam).toBe(100);
  });

  it('%10 dahil 55 TL → 50 + 5', () => {
    expect(hesaplaKdv({ amount: 55, rate: 10, mode: 'dahil', tevkifat: 0 })).toMatchObject({ matrah: 50, kdv: 5 });
  });

  it('%0 oranda matrah = tutar', () => {
    expect(hesaplaKdv({ amount: 500, rate: 0, mode: 'dahil', tevkifat: 0 })).toMatchObject({ matrah: 500, kdv: 0 });
  });
});

describe('tevkifat', () => {
  it('10.000 TL matrah, %20, 9/10 tevkifat', () => {
    const r = hesaplaKdv({ amount: 10000, rate: 20, mode: 'haric', tevkifat: 9 });
    expect(r.kdv).toBe(2000);
    expect(r.tevkifEdilen).toBe(1800);
    expect(r.tahsilEdilecekKdv).toBe(200);
    expect(r.odenecekToplam).toBe(10200);
    expect(r.toplam).toBe(12000);
  });

  it('5/10 tevkifat KDV’nin yarısıdır', () => {
    const r = hesaplaKdv({ amount: 4000, rate: 20, mode: 'haric', tevkifat: 5 });
    expect(r.tevkifEdilen).toBe(400);
    expect(r.tahsilEdilecekKdv).toBe(400);
  });

  it('10/10 tam tevkifatta satıcı KDV tahsil etmez', () => {
    const r = hesaplaKdv({ amount: 1000, rate: 20, mode: 'haric', tevkifat: 10 });
    expect(r.tahsilEdilecekKdv).toBe(0);
    expect(r.odenecekToplam).toBe(1000);
  });

  it('2/10 tevkifat, kuruşlu KDV', () => {
    const r = hesaplaKdv({ amount: 1234.56, rate: 20, mode: 'haric', tevkifat: 2 });
    expect(r.kdv).toBe(246.91);
    expect(r.tevkifEdilen).toBe(49.38);
    expect(r.tahsilEdilecekKdv).toBe(197.53);
  });
});

describe('doğrulama', () => {
  it('eksik ve hatalı girdiler', () => {
    expect(validateKdv({ amount: undefined, rate: 20 })).toHaveProperty('amount');
    expect(validateKdv({ amount: -5, rate: 20 })).toHaveProperty('amount');
    expect(validateKdv({ amount: 5, rate: 120 })).toHaveProperty('rate');
    expect(validateKdv({ amount: 5, rate: 20 })).toEqual({});
  });
});
