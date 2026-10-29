import { describe, expect, it } from 'vitest';
import { hesaplaAltinGunu, siraAraligi, validateAltinGunu, yillikKarsilik, type AltinGunuInput } from './calc';

// Zaman modeli: m. ayın katkısı ayın başında ödenir ve o ayın kasasını sırası gelen alır;
// 1. ay bugündür, m. ayın nakit akışı (m − 1) ay sonradır. Bugünkü değer = akış ÷ (1 + r)^(m − 1).
const temel: AltinGunuInput = {
  katilimci: 3,
  birim: 'tl',
  katki: 100,
  altinFiyati: null,
  aylikOran: 10,
  altinArtisi: 0,
  alanOder: true,
};

describe('TL günü', () => {
  // N = 3, aylık 100 TL, aylık %10. İskonto çarpanları: 1; 1/1,1 = 0,909091; 1/1,21 = 0,826446 → toplam 2,735537
  // Her kişinin ödediklerinin bugünkü değeri = 100 × 2,735537 = 273,55
  // 1. sıra: 300 × 1        = 300,00   → net +26,45
  // 2. sıra: 300 × 0,909091 = 272,73   → net  −0,83
  // 3. sıra: 300 × 0,826446 = 247,93   → net −25,62
  it('ilk sıralar enflasyonda kazançlı, son sıralar kayıpta', () => {
    const r = hesaplaAltinGunu(temel);
    expect(r.tur).toBe('tl');
    expect(r.siralar.map((s) => s.odenenBugun)).toEqual([273.55, 273.55, 273.55]);
    expect(r.siralar.map((s) => s.alinanBugun)).toEqual([300, 272.73, 247.93]);
    expect(r.siralar.map((s) => s.net)).toEqual([26.45, -0.83, -25.62]);
    expect(r.siralar[0].netOran).toBe(9.67);
    expect(r.kazancliSiralar).toEqual([1]);
  });

  it('nominal olarak herkes aldığı kadar öder', () => {
    const r = hesaplaAltinGunu(temel);
    for (const s of r.siralar) {
      expect(s.odenenNominal).toBe(300);
      expect(s.alinanNominal).toBe(300);
    }
    expect(r.odemeSayisi).toBe(3);
    expect(r.ilkAyKatkiTL).toBe(100);
  });

  it('oran sıfırsa TL gününde kimse kazanmaz ya da kaybetmez', () => {
    const r = hesaplaAltinGunu({ ...temel, aylikOran: 0 });
    expect(r.siralar.every((s) => s.net === 0)).toBe(true);
    expect(r.kazancliSiralar).toEqual([]);
  });

  it('kazançlar toplamı sıfırdır (12 kişi, aylık %3)', () => {
    const r = hesaplaAltinGunu({ ...temel, katilimci: 12, katki: 5000, aylikOran: 3 });
    const toplam = r.siralar.reduce((t, s) => t + s.net, 0);
    expect(Math.abs(toplam)).toBeLessThan(0.1);
    expect(r.siralar[0].net).toBeGreaterThan(0);
    expect(r.siralar[11].net).toBeLessThan(0);
  });

  it('sırası gelen o ay katkı ödemiyorsa nominal tutarlar (N − 1) katkıdır, net aynı kalır', () => {
    const odeyen = hesaplaAltinGunu(temel);
    const odemeyen = hesaplaAltinGunu({ ...temel, alanOder: false });
    // Kendi ayındaki ödeme ile kasa payı aynı anda olduğu için birbirini götürür
    expect(odemeyen.siralar.map((s) => s.net)).toEqual(odeyen.siralar.map((s) => s.net));
    expect(odemeyen.siralar[0].odenenNominal).toBe(200);
    expect(odemeyen.siralar[0].alinanNominal).toBe(200);
    expect(odemeyen.odemeSayisi).toBe(2);
  });
});

describe('altın günü', () => {
  // N = 3, aylık 1 gram, bugünkü fiyat 1.000 TL, altın aylık %10 artıyor, aylık oran %0.
  // Katkının TL değeri: 1.000; 1.100; 1.210 → ödenen 3.310 TL
  // 1. sıra 3 × 1.000 = 3.000 → net −310 · 2. sıra 3 × 1.100 = 3.300 → −10 · 3. sıra 3 × 1.210 = 3.630 → +320
  const altin: AltinGunuInput = {
    katilimci: 3,
    birim: 'gram',
    katki: 1,
    altinFiyati: 1000,
    aylikOran: 0,
    altinArtisi: 10,
    alanOder: true,
  };

  it('altın enflasyondan hızlı artarsa son sıralar kazanır', () => {
    const r = hesaplaAltinGunu(altin);
    expect(r.tur).toBe('altin');
    expect(r.siralar.map((s) => s.odenenNominal)).toEqual([3310, 3310, 3310]);
    expect(r.siralar.map((s) => s.alinanNominal)).toEqual([3000, 3300, 3630]);
    expect(r.siralar.map((s) => s.net)).toEqual([-310, -10, 320]);
    expect(r.kazancliSiralar).toEqual([3]);
    expect(r.rho).toBeCloseTo(1.1, 10);
  });

  it('altın artışı enflasyona eşitse (aylık %3 = %3) sıralamanın önemi kalmaz', () => {
    const r = hesaplaAltinGunu({ ...altin, katilimci: 6, aylikOran: 3, altinArtisi: 3 });
    expect(r.rho).toBeCloseTo(1, 12);
    expect(r.siralar.every((s) => Math.abs(s.net) < 0.01)).toBe(true);
  });

  it('altın artmıyorsa (%0) ve oran pozitifse ilk sıralar kazanır; TL günüyle aynı sonuç', () => {
    const a = hesaplaAltinGunu({ ...altin, aylikOran: 10, altinArtisi: 0 });
    const t = hesaplaAltinGunu({ ...temel, katki: 1000 });
    expect(a.siralar.map((s) => s.net)).toEqual(t.siralar.map((s) => s.net));
    expect(a.siralar[0].net).toBe(264.46);
  });

  it('gram katkıda alınacak altın miktarı ve karşılaştırma senaryosu', () => {
    const r = hesaplaAltinGunu({ ...altin, katilimci: 12, katki: 2.5 });
    expect(r.alinacakAltin).toBe(30);
    expect(r.ilkAyKatkiTL).toBe(2500);
    expect(r.karsiTur).toBe('tl');
    expect(r.karsi).toHaveLength(12);
  });

  it('çeyrek altın katkısı: 2 çeyrek × 5.000 TL = 10.000 TL ilk ay, 6 kişide 12 çeyrek alınır', () => {
    const r = hesaplaAltinGunu({ ...altin, birim: 'ceyrek', katilimci: 6, katki: 2, altinFiyati: 5000 });
    expect(r.ilkAyKatkiTL).toBe(10000);
    expect(r.alinacakAltin).toBe(12);
    const r2 = hesaplaAltinGunu({ ...altin, birim: 'ceyrek', katilimci: 6, katki: 2, altinFiyati: 5000, alanOder: false });
    expect(r2.alinacakAltin).toBe(10);
    expect(r2.odemeSayisi).toBe(5);
  });
});

describe('TL günü ile altın günü karşılaştırması', () => {
  it('aynı ilk ay değeriyle altın günü: 3.000 TL = 3 gram (gram 1.000 TL, altın aylık %10, oran %0)', () => {
    const r = hesaplaAltinGunu({ ...temel, katki: 3000, altinFiyati: 1000, aylikOran: 0, altinArtisi: 10 });
    expect(r.tur).toBe('tl');
    expect(r.karsiTur).toBe('altin');
    // TL günü: oran 0 → net 0. Altın günü: katkı değerleri 3.000 / 3.300 / 3.630 → ödenen 9.930
    expect(r.siralar.every((s) => s.net === 0)).toBe(true);
    expect(r.karsi?.map((s) => s.net)).toEqual([-930, -30, 960]);
  });

  it('altın fiyatı girilmediyse karşılaştırma yok', () => {
    const r = hesaplaAltinGunu(temel);
    expect(r.karsi).toBeNull();
    expect(r.karsiTur).toBeNull();
  });
});

describe('yardımcılar', () => {
  it('sıra aralığı', () => {
    expect(siraAraligi([1, 2, 3])).toBe('1–3');
    expect(siraAraligi([5])).toBe('5');
    expect(siraAraligi([1, 3])).toBe('1, 3');
    expect(siraAraligi([])).toBe('yok');
  });

  it('aylık %3 ≈ yıllık %42,58', () => {
    expect(yillikKarsilik(3)).toBe(42.58);
    expect(yillikKarsilik(0)).toBe(0);
  });
});

describe('doğrulama', () => {
  const gecerli = { katilimci: 12, birim: 'tl' as const, katki: 5000, altinFiyati: null, aylikOran: 3, altinArtisi: 2.5, sira: 5 };

  it('geçerli girdi', () => {
    expect(validateAltinGunu(gecerli)).toEqual({});
  });

  it('katılımcı sayısı 2–120 tam sayı', () => {
    expect(validateAltinGunu({ ...gecerli, katilimci: 1 })).toHaveProperty('katilimci');
    expect(validateAltinGunu({ ...gecerli, katilimci: 12.5 })).toHaveProperty('katilimci');
    expect(validateAltinGunu({ ...gecerli, katilimci: 121 })).toHaveProperty('katilimci');
    expect(validateAltinGunu({ ...gecerli, katilimci: null })).toHaveProperty('katilimci');
  });

  it('katkı pozitif; altın katkısında fiyat zorunlu', () => {
    expect(validateAltinGunu({ ...gecerli, katki: 0 })).toHaveProperty('katki');
    expect(validateAltinGunu({ ...gecerli, birim: 'gram' })).toHaveProperty('altinFiyati');
    expect(validateAltinGunu({ ...gecerli, birim: 'gram', altinFiyati: 3000 })).toEqual({});
    expect(validateAltinGunu({ ...gecerli, altinFiyati: -5 })).toHaveProperty('altinFiyati');
  });

  it('oranlar ve sıra', () => {
    expect(validateAltinGunu({ ...gecerli, aylikOran: null })).toHaveProperty('aylikOran');
    expect(validateAltinGunu({ ...gecerli, aylikOran: -60 })).toHaveProperty('aylikOran');
    expect(validateAltinGunu({ ...gecerli, altinArtisi: 150 })).toHaveProperty('altinArtisi');
    expect(validateAltinGunu({ ...gecerli, sira: 13 })).toHaveProperty('sira');
    expect(validateAltinGunu({ ...gecerli, sira: 0 })).toHaveProperty('sira');
    expect(validateAltinGunu({ ...gecerli, sira: null })).toEqual({});
  });
});
