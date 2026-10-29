import { describe, expect, it } from 'vitest';
import { donusumBasabasKm, hesaplaMaliyet, hesaplaYolculuk, sarjFiyati, validateYakit, yakitKmBasina } from './calc';

describe('araç km maliyeti', () => {
  it('km başına yakıt: tüketim ÷ 100 × fiyat', () => {
    expect(yakitKmBasina(6, 60)).toBeCloseTo(3.6, 10);
  });

  it('elektrikte ev ve dışarı şarj fiyatı ağırlıklı', () => {
    expect(sarjFiyati(4, 12, 75)).toBeCloseTo(6, 10);
    expect(sarjFiyati(4, 12, 150)).toBe(4);
  });

  it('yıllık ve aylık toplam, km başına maliyet', () => {
    const r = hesaplaMaliyet({
      yillikKm: 15_000,
      tuketim100: 6,
      birimFiyat: 60,
      giderler: [
        { ad: 'Kasko', tutar: 30_000, donem: 'yillik' },
        { ad: 'Otopark', tutar: 1_000, donem: 'aylik' },
      ],
      aracDegeri: 1_000_000,
      degerKaybi: 5,
    });
    expect(r.yakitYillik).toBe(54_000);
    expect(r.yillik).toBe(54_000 + 30_000 + 12_000 + 50_000);
    expect(r.aylik).toBe(12_166.67);
    expect(r.kmBasina).toBeCloseTo(146_000 / 15_000, 10);
    expect(r.yillikMiktar).toBe(900);
    expect(r.kalemler.map((k) => k.ad)).toEqual(['Yakıt / enerji', 'Kasko', 'Otopark', 'Değer kaybı']);
  });

  it('yolculuk: gidiş-dönüş, ücretler ve kişi başı', () => {
    const r = hesaplaYolculuk({ mesafe: 450, gidisDonus: true, tuketim100: 6, birimFiyat: 60, ucretler: 1_200, kisi: 4 });
    expect(r.km).toBe(900);
    expect(r.miktar).toBe(54);
    expect(r.yakit).toBe(3_240);
    expect(r.toplam).toBe(4_440);
    expect(r.kisiBasi).toBe(1_110);
  });

  it('dönüşüm başabaş kilometresi', () => {
    expect(donusumBasabasKm(30_000, 3.6, 1.8)).toBe(16_667);
    expect(donusumBasabasKm(30_000, 1.8, 3.6)).toBeNull();
  });

  it('doğrulama', () => {
    expect(validateYakit({ tuketim: 6, fiyat: 60 })).toEqual({});
    expect(validateYakit({ tuketim: 0, fiyat: null })).toHaveProperty('fiyat');
  });
});
