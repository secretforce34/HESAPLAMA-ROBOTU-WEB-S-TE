import { describe, expect, it } from 'vitest';
import { altinAyarlari, milyemOf } from '../../data/params/altin';
import { donustur, esdegerTablosu, hasGramOf, hesaplaIscilik, validateFiyat, validateKesinti, validateSatir } from './calc';

// Ayar–milyem değerleri: Hazine Müsteşarlığı tebliği (RG 20.06.2007, sayı 26558) md. 12:
// 8=333, 9=375, 10=416, 14=583, 18=750, 21=875, 22=916.
describe('ayar – milyem tablosu', () => {
  it('tebliğdeki değerler', () => {
    expect(milyemOf('8')).toBe(333);
    expect(milyemOf('9')).toBe(375);
    expect(milyemOf('10')).toBe(416);
    expect(milyemOf('14')).toBe(583);
    expect(milyemOf('18')).toBe(750);
    expect(milyemOf('21')).toBe(875);
    expect(milyemOf('22')).toBe(916);
  });

  it('24 ayar saf; ticari varyantlar (14 ayar 585, külçe 995) ayrı kodla', () => {
    expect(milyemOf('24')).toBe(1000);
    expect(milyemOf('24-995')).toBe(995);
    expect(milyemOf('14-585')).toBe(585);
    expect(milyemOf('99')).toBeUndefined();
  });

  it('kodlar benzersiz', () => {
    const kodlar = altinAyarlari.values.ayarlar.map((a) => a.kod);
    expect(new Set(kodlar).size).toBe(kodlar.length);
  });
});

describe('has gram ve ayar dönüşümü', () => {
  it('10 g 22 ayar bilezik = 9,16 g saf altın', () => {
    expect(hasGramOf(10, 916)).toBeCloseTo(9.16, 10);
  });

  it('9,16 g saf altın: 22 ayarda 10 g, 18 ayarda 12,2133 g, 14 ayarda 15,7118 g', () => {
    const tablo = esdegerTablosu(9.16, [
      { kod: '24', milyem: 1000 },
      { kod: '22', milyem: 916 },
      { kod: '18', milyem: 750 },
      { kod: '14', milyem: 583 },
    ]);
    expect(tablo.map((t) => t.gram)).toEqual([9.16, 10, 12.2133, 15.7118]);
  });

  it('20 g 14 ayar (583) = 12,7293 g 22 ayar (916); gidiş-dönüş tutarlı', () => {
    expect(donustur(20, 583, 916)).toBeCloseTo(12.7293, 4);
    expect(donustur(donustur(20, 583, 916), 916, 583)).toBeCloseTo(20, 3);
    expect(donustur(10, 916, 916)).toBe(10);
  });
});

describe('işçilik: ödenen tutardan', () => {
  // 10 g, 22 ayar (916): has 9,16 g. Alım günü has fiyatı 4.000 TL → altın değeri 36.640 TL.
  // Ödenen 40.000 TL → işçilik 3.360 TL = %9,17 (3.360 / 36.640), gram başına 336 TL.
  const temel = {
    mod: 'odenenden' as const,
    iscilikBirimi: 'yuzde' as const,
    alimHasFiyati: 4000,
    bozdurmaHasAlis: null,
  };
  const bilezik = { gram: 10, milyem: 916, ayar: 22, odenen: 40000 };

  it('işçilik TL, yüzde ve gram başına', () => {
    const r = hesaplaIscilik({ ...temel, takilar: [bilezik] });
    expect(r.hasGram).toBe(9.16);
    expect(r.altinDegeri).toBe(36640);
    expect(r.iscilikTL).toBe(3360);
    expect(r.iscilikOrani).toBe(9.17);
    expect(r.iscilikGramBasina).toBe(336);
    expect(r.satirlar[0].odenen).toBe(40000);
  });

  it('ödenen, altın değerinin altındaysa işçilik negatif çıkar (indirim)', () => {
    const r = hesaplaIscilik({ ...temel, takilar: [{ ...bilezik, odenen: 35000 }] });
    expect(r.iscilikTL).toBe(-1640);
    expect(r.iscilikOrani).toBe(-4.48);
  });

  it('birden fazla takı: toplamlar satırların toplamıdır', () => {
    // İkinci takı: 5 g 18 ayar → has 3,75 g, altın değeri 15.000; ödenen 17.500 → işçilik 2.500
    const r = hesaplaIscilik({ ...temel, takilar: [bilezik, { gram: 5, milyem: 750, ayar: 18, odenen: 17500 }] });
    expect(r.gram).toBe(15);
    expect(r.hasGram).toBe(12.91);
    expect(r.altinDegeri).toBe(51640);
    expect(r.odenen).toBe(57500);
    expect(r.iscilikTL).toBe(5860);
    expect(r.iscilikOrani).toBe(11.35);
    expect(r.iscilikGramBasina).toBe(390.67);
    expect(r.satirlar[1].iscilikOrani).toBe(16.67);
  });

  it('bir satırda ödenen tutar yoksa işçilik toplamı hesaplanmaz', () => {
    const r = hesaplaIscilik({ ...temel, takilar: [bilezik, { gram: 5, milyem: 750, ayar: 18, odenen: null }] });
    expect(r.satirlar[0].iscilikTL).toBe(3360);
    expect(r.satirlar[1].iscilikTL).toBeNull();
    expect(r.odenen).toBeNull();
    expect(r.iscilikTL).toBeNull();
    expect(r.hasGram).toBe(12.91);
  });

  it('alım günü fiyatı yoksa yalnızca gram sonucu verilir', () => {
    const r = hesaplaIscilik({ ...temel, alimHasFiyati: null, takilar: [bilezik] });
    expect(r.hasGram).toBe(9.16);
    expect(r.altinDegeri).toBeNull();
    expect(r.iscilikTL).toBeNull();
  });
});

describe('işçilik: oran ya da gram başına işçilikten toplam fiyat', () => {
  const temel = { mod: 'orandan' as const, alimHasFiyati: 4000, bozdurmaHasAlis: null };

  it('%8 işçilik: 36.640 × 0,08 = 2.931,20 → toplam 39.571,20', () => {
    const r = hesaplaIscilik({ ...temel, iscilikBirimi: 'yuzde', takilar: [{ gram: 10, milyem: 916, ayar: 22, iscilik: 8 }] });
    expect(r.iscilikTL).toBe(2931.2);
    expect(r.odenen).toBe(39571.2);
    expect(r.iscilikOrani).toBe(8);
  });

  it('gram başına 300 TL işçilik: 10 g → 3.000 TL → toplam 39.640', () => {
    const r = hesaplaIscilik({ ...temel, iscilikBirimi: 'tl-gram', takilar: [{ gram: 10, milyem: 916, ayar: 22, iscilik: 300 }] });
    expect(r.iscilikTL).toBe(3000);
    expect(r.odenen).toBe(39640);
    expect(r.iscilikOrani).toBe(8.19);
    expect(r.iscilikGramBasina).toBe(300);
  });
});

describe('bozdurma', () => {
  // Ödenen 40.000 TL; bozdurma günü has alış fiyatı 3.900 TL → 9,16 × 3.900 = 35.724 TL
  const girdi = {
    mod: 'odenenden' as const,
    iscilikBirimi: 'yuzde' as const,
    alimHasFiyati: 4000,
    bozdurmaHasAlis: 3900,
    takilar: [{ gram: 10, milyem: 916, ayar: 22, odenen: 40000 }],
  };

  it('alınacak tutar ve ödenene göre fark', () => {
    const r = hesaplaIscilik(girdi);
    expect(r.bozdurma).toBe(35724);
    expect(r.fark).toBe(-4276);
  });

  it('başabaş has alış fiyatı = ödenen ÷ has gram', () => {
    // 40.000 / 9,16 = 4.366,81
    expect(hesaplaIscilik(girdi).basabasFiyati).toBe(4366.81);
  });

  it('kuyumcu kesintisi %5: 35.724 × 0,95 = 33.937,80', () => {
    const r = hesaplaIscilik({ ...girdi, bozdurmaKesinti: 5 });
    expect(r.bozdurma).toBe(33937.8);
    expect(r.fark).toBe(-6062.2);
  });

  it('fiyat artsa bile işçilik geri alınmaz: alış fiyatı alım fiyatına eşitse kayıp işçilik kadardır', () => {
    const r = hesaplaIscilik({ ...girdi, bozdurmaHasAlis: 4000 });
    expect(r.bozdurma).toBe(36640);
    expect(r.fark).toBe(-3360);
  });

  it('gramı 0 olan satır sayılmaz', () => {
    const r = hesaplaIscilik({ ...girdi, takilar: [{ gram: 0, milyem: 916, ayar: 22, odenen: 100 }] });
    expect(r.satirlar).toHaveLength(0);
    expect(r.bozdurma).toBeNull();
  });
});

describe('doğrulama', () => {
  const bos = { gram: null, milyem: 916, odenen: null, iscilik: null };

  it('boş alanlar hata değildir; geçersiz yazılanlar hatadır', () => {
    expect(validateSatir(bos, 'odenenden', 'yuzde')).toEqual({});
    expect(validateSatir({ ...bos, gram: -1 }, 'odenenden', 'yuzde')).toHaveProperty('gram');
    expect(validateSatir({ ...bos, milyem: 0 }, 'odenenden', 'yuzde')).toHaveProperty('milyem');
    expect(validateSatir({ ...bos, milyem: null }, 'odenenden', 'yuzde')).toHaveProperty('milyem');
    expect(validateSatir({ ...bos, odenen: -5 }, 'odenenden', 'yuzde')).toHaveProperty('odenen');
    expect(validateSatir({ ...bos, iscilik: 2000 }, 'orandan', 'yuzde')).toHaveProperty('iscilik');
    expect(validateSatir({ ...bos, iscilik: 2000 }, 'orandan', 'tl-gram')).toEqual({});
  });

  it('fiyat ve kesinti', () => {
    expect(validateFiyat(0, 5)).toHaveProperty('alim');
    expect(validateFiyat(4000, -1)).toHaveProperty('alis');
    expect(validateFiyat(null, null)).toEqual({});
    expect(validateKesinti(120)).toBeDefined();
    expect(validateKesinti(5)).toBeUndefined();
    expect(validateKesinti(null)).toBeUndefined();
  });
});
