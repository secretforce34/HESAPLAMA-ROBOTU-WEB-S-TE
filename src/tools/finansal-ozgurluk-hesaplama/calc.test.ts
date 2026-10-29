import { describe, expect, it } from 'vitest';
import { hesaplaOzgurluk, validateOzgurluk } from './calc';

const temel = { aylikHarcama: 40000, mevcutBirikim: 500000, aylikBirikim: 15000, reelGetiri: 4, cekimOrani: 4, birikimArtisi: 0, yas: 30 };

describe('finansal özgürlük', () => {
  it('hedef = yıllık harcama ÷ çekim oranı', () => {
    expect(hesaplaOzgurluk(temel).hedef).toBe(12_000_000);
  });

  it('getiri sıfırsa süre doğrusal: (hedef − mevcut) ÷ aylık birikim', () => {
    const r = hesaplaOzgurluk({ ...temel, reelGetiri: 0 });
    expect(r.ay).toBe(Math.ceil((12_000_000 - 500_000) / 15000));
  });

  it('getiri süreyi kısaltır', () => {
    const sifir = hesaplaOzgurluk({ ...temel, reelGetiri: 0 }).ay!;
    expect(hesaplaOzgurluk(temel).ay!).toBeLessThan(sifir);
  });

  it('birikim zaten yeterliyse 0 ay', () => {
    expect(hesaplaOzgurluk({ ...temel, mevcutBirikim: 13_000_000 }).ay).toBe(0);
  });

  it('yaş hesaplanır', () => {
    const r = hesaplaOzgurluk(temel);
    expect(r.yasinda).toBe(Math.floor(30 + r.ay! / 12));
  });

  it('birikim yapmadan: ln(hedef/mevcut) ÷ ln(1 + aylık getiri)', () => {
    const r = hesaplaOzgurluk(temel);
    const rAy = Math.pow(1.04, 1 / 12) - 1;
    expect(r.birikimsizAy).toBe(Math.ceil(Math.log(24) / Math.log(1 + rAy)));
  });

  it('birikim ve getiri yoksa hedefe ulaşılamaz', () => {
    expect(hesaplaOzgurluk({ ...temel, aylikBirikim: 0, reelGetiri: 0 }).ay).toBeNull();
  });

  it('doğrulama', () => {
    expect(validateOzgurluk({ harcama: 0, birikim: 0, aylik: 0, getiri: 4, cekim: 4 })).toHaveProperty('harcama');
    expect(validateOzgurluk({ harcama: 1, birikim: 0, aylik: 0, getiri: 4, cekim: 0 })).toHaveProperty('cekim');
    expect(validateOzgurluk({ harcama: 1, birikim: 0, aylik: 0, getiri: 4, cekim: 4 })).toEqual({});
  });
});
