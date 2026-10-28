import { describe, expect, it } from 'vitest';
import { hesaplaFatura, hesaplaKdv, validateKdv, validateSatir } from './calc';

describe('çok satırlı fatura', () => {
  it('%1, %10 ve %20 satırları aynı faturada', () => {
    const r = hesaplaFatura({
      satirlar: [
        { tutar: 1000, oran: 20 },
        { tutar: 500, oran: 10 },
        { tutar: 200, oran: 1 },
        { tutar: 300, oran: 20 },
      ],
      mode: 'haric',
      tevkifat: 0,
      tevkifatSiniri: 12000,
    });
    expect(r.matrah).toBe(2000);
    // 200 + 50 + 2 + 60
    expect(r.kdv).toBe(312);
    expect(r.toplam).toBe(2312);
    expect(r.oranlar).toEqual([
      { oran: 1, matrah: 200, kdv: 2, toplam: 202 },
      { oran: 10, matrah: 500, kdv: 50, toplam: 550 },
      { oran: 20, matrah: 1300, kdv: 260, toplam: 1560 },
    ]);
  });

  it('KDV dahil satırlardan geriye: her satır kendi içinde tutarlı', () => {
    const r = hesaplaFatura({
      satirlar: [
        { tutar: 120, oran: 20 },
        { tutar: 110, oran: 10 },
        { tutar: 101, oran: 1 },
      ],
      mode: 'dahil',
      tevkifat: 0,
      tevkifatSiniri: null,
    });
    expect(r.matrah).toBe(300);
    expect(r.kdv).toBe(31);
    expect(r.toplam).toBe(331);
  });

  it('kısmi tevkifat: KDV dahil toplam 12.000 TL’yi aşarsa uygulanır', () => {
    // 10.000 + %20 = 12.000 → sınırı AŞMIYOR (eşit) → tevkifat yok
    const esit = hesaplaFatura({ satirlar: [{ tutar: 10000, oran: 20 }], mode: 'haric', tevkifat: 9, tevkifatSiniri: 12000 });
    expect(esit.sinirAltinda).toBe(true);
    expect(esit.uygulananTevkifat).toBe(0);
    expect(esit.tevkifEdilen).toBe(0);
    expect(esit.odenecekToplam).toBe(12000);

    // 10.000,01 + %20 = 12.000,01 → aşıyor → 9/10 uygulanır
    const asan = hesaplaFatura({ satirlar: [{ tutar: 10000.01, oran: 20 }], mode: 'haric', tevkifat: 9, tevkifatSiniri: 12000 });
    expect(asan.sinirAltinda).toBe(false);
    expect(asan.uygulananTevkifat).toBe(9);
    expect(asan.kdv).toBe(2000);
    expect(asan.tevkifEdilen).toBe(1800);
    expect(asan.odenecekToplam).toBe(10200.01);
  });

  it('tam tevkifatta (10/10) tutar sınırı aranmaz', () => {
    const r = hesaplaFatura({ satirlar: [{ tutar: 1000, oran: 20 }], mode: 'haric', tevkifat: 10, tevkifatSiniri: 12000 });
    expect(r.sinirAltinda).toBe(false);
    expect(r.tevkifEdilen).toBe(200);
    expect(r.tahsilEdilecekKdv).toBe(0);
  });

  it('sınır kapatılınca küçük tutarda da kısmi tevkifat uygulanır', () => {
    const r = hesaplaFatura({ satirlar: [{ tutar: 1000, oran: 20 }], mode: 'haric', tevkifat: 5, tevkifatSiniri: null });
    expect(r.tevkifEdilen).toBe(100);
    expect(r.odenecekToplam).toBe(1100);
  });

  it('yalnızca tevkifatlı işaretli satırlara tevkifat uygulanır, sınır da onlara bakar', () => {
    const r = hesaplaFatura({
      satirlar: [
        { tutar: 20000, oran: 20, tevkifatli: true }, // hizmet: KDV 4.000
        { tutar: 5000, oran: 20, tevkifatli: false }, // malzeme: KDV 1.000
      ],
      mode: 'haric',
      tevkifat: 4,
      tevkifatSiniri: 12000,
    });
    expect(r.tevkifataTabiToplam).toBe(24000);
    expect(r.kdv).toBe(5000);
    expect(r.tevkifEdilen).toBe(1600);
    expect(r.tahsilEdilecekKdv).toBe(3400);
    expect(r.odenecekToplam).toBe(28400);
  });

  it('tevkifatlı satırlar sınırın altında kalırsa, fatura toplamı aşsa bile uygulanmaz', () => {
    const r = hesaplaFatura({
      satirlar: [
        { tutar: 5000, oran: 20, tevkifatli: true }, // 6.000 KDV dahil
        { tutar: 50000, oran: 20, tevkifatli: false },
      ],
      mode: 'haric',
      tevkifat: 9,
      tevkifatSiniri: 12000,
    });
    expect(r.sinirAltinda).toBe(true);
    expect(r.tevkifEdilen).toBe(0);
  });

  it('2025 sınırı (9.900 TL) ile', () => {
    const r = hesaplaFatura({ satirlar: [{ tutar: 9000, oran: 20 }], mode: 'haric', tevkifat: 7, tevkifatSiniri: 9900 });
    // 10.800 > 9.900 → uygulanır: 1.800 × 7/10 = 1.260
    expect(r.tevkifEdilen).toBe(1260);
  });

  it('satır doğrulaması', () => {
    expect(validateSatir(null, 20)).toHaveProperty('tutar');
    expect(validateSatir(10, -1)).toHaveProperty('oran');
    expect(validateSatir(10, 20)).toEqual({});
  });
});

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
