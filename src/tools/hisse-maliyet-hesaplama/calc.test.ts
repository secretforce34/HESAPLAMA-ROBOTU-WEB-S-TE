import { describe, expect, it } from 'vitest';
import { ekAlimSonrasi, guncelDurum, hedefIcinLot, hesaplaMaliyet, validateIslem } from './calc';

const ikiAlis = [
  { tur: 'alis' as const, lot: 100, fiyat: 10 },
  { tur: 'alis' as const, lot: 100, fiyat: 20 },
];

describe('ortalama maliyet', () => {
  it('iki alışın ağırlıklı ortalaması', () => {
    const s = hesaplaMaliyet(ikiAlis, 0);
    expect(s.lot).toBe(200);
    expect(s.ortalama).toBe(15);
    expect(s.toplamMaliyet).toBe(3000);
  });

  it('komisyon maliyete eklenir (binde 2)', () => {
    const s = hesaplaMaliyet([{ tur: 'alis', lot: 100, fiyat: 10 }], 0.2);
    expect(s.toplamMaliyet).toBe(1002);
    expect(s.ortalama).toBeCloseTo(10.02, 10);
    expect(s.toplamKomisyon).toBe(2);
  });

  it('satış ortalama maliyetle düşülür, ortalama değişmez', () => {
    const s = hesaplaMaliyet([...ikiAlis, { tur: 'satis', lot: 50, fiyat: 30 }], 0);
    expect(s.gerceklesenKz).toBe(750);
    expect(s.lot).toBe(150);
    expect(s.ortalama).toBe(15);
    expect(s.toplamMaliyet).toBe(2250);
  });

  it('satışta komisyon kârdan düşülür', () => {
    const s = hesaplaMaliyet([{ tur: 'alis', lot: 100, fiyat: 10 }, { tur: 'satis', lot: 100, fiyat: 12 }], 0.2);
    // alış maliyeti 1002, satış 1200 − 2,4 = 1197,6 → kâr 195,6
    expect(s.gerceklesenKz).toBe(195.6);
    expect(s.lot).toBe(0);
  });

  it('elde olandan fazla satış hata verir', () => {
    const s = hesaplaMaliyet([{ tur: 'alis', lot: 10, fiyat: 10 }, { tur: 'satis', lot: 11, fiyat: 10 }], 0);
    expect(s.hata?.satir).toBe(2);
  });

  it('%100 bedelsiz: lot iki katı, ortalama yarısı, maliyet aynı', () => {
    const s = hesaplaMaliyet([...ikiAlis, { tur: 'bedelsiz', lot: 0, fiyat: 0, oran: 100 }], 0);
    expect(s.lot).toBe(400);
    expect(s.ortalama).toBe(7.5);
    expect(s.toplamMaliyet).toBe(3000);
  });
});

describe('güncel durum ve hedefler', () => {
  const s = hesaplaMaliyet(ikiAlis, 0);

  it('güncel fiyata göre kâr/zarar', () => {
    const g = guncelDurum(s, 18, 0);
    expect(g.piyasaDegeri).toBe(3600);
    expect(g.gerceklesmemisKz).toBe(600);
    expect(g.yuzde).toBe(20);
  });

  it('başa baş fiyatı satış komisyonunu içerir', () => {
    expect(guncelDurum(s, 18, 0.2).basabas).toBeCloseTo(15 / 0.998, 10);
  });

  it('ortalamayı 12’ye indirmek için 10 TL’den 300 lot', () => {
    expect(hedefIcinLot(s, 12, 10, 0)).toBe(300);
  });

  it('hedef alış fiyatının altındaysa imkânsız (null), ortalamanın üstündeyse 0', () => {
    expect(hedefIcinLot(s, 9, 10, 0)).toBeNull();
    expect(hedefIcinLot(s, 16, 10, 0)).toBe(0);
  });

  it('ek alım sonrası yeni ortalama', () => {
    const e = ekAlimSonrasi(s, 100, 9, 0);
    expect(e.yeniLot).toBe(300);
    expect(e.yeniOrtalama).toBe(13);
  });
});

describe('doğrulama', () => {
  it('alış/satış ve bedelsiz satırları', () => {
    expect(validateIslem({ tur: 'alis', lot: null, fiyat: 10, oran: null })).toHaveProperty('lot');
    expect(validateIslem({ tur: 'satis', lot: 5, fiyat: 0, oran: null })).toHaveProperty('fiyat');
    expect(validateIslem({ tur: 'bedelsiz', lot: null, fiyat: null, oran: null })).toHaveProperty('oran');
    expect(validateIslem({ tur: 'alis', lot: 5, fiyat: 10, oran: null })).toEqual({});
  });
});
