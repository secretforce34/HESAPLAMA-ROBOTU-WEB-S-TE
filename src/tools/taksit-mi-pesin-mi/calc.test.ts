import { describe, expect, it } from 'vitest';
import {
  basabasOrani,
  bugunkuDeger,
  karsilastir,
  kartTaksitKontrol,
  pesinFiyatHesapla,
  senaryoTablosu,
  taksitTutari,
  validateFiyat,
  validateGun,
  validateIndirim,
  validateOran,
  validateSecenek,
} from './calc';

describe('peşin fiyat ve taksit tutarı', () => {
  it('30.000 TL etiket fiyatında %10 peşin indirimi → 27.000 TL', () => {
    expect(pesinFiyatHesapla(30_000, 10)).toBe(27_000);
    expect(pesinFiyatHesapla(1_999.99, 7.5)).toBe(1849.99);
  });

  it('üç giriş biçimi: vade farkı, toplam fiyat, aylık taksit', () => {
    expect(taksitTutari({ sayi: 6, giris: 'vadeFarki', deger: 0 }, 30_000)).toEqual({ taksit: 5000, toplam: 30_000 });
    // %15 vade farkı: 30.000 × 1,15 = 34.500 → 12 taksit 2.875
    expect(taksitTutari({ sayi: 12, giris: 'vadeFarki', deger: 15 }, 30_000)).toEqual({ taksit: 2875, toplam: 34_500 });
    expect(taksitTutari({ sayi: 10, giris: 'toplam', deger: 33_000 }, 30_000)).toEqual({ taksit: 3300, toplam: 33_000 });
    expect(taksitTutari({ sayi: 12, giris: 'taksit', deger: 2_600 }, 30_000)).toEqual({ taksit: 2600, toplam: 31_200 });
  });
});

describe('bugünkü değer', () => {
  it('oran %0 ise bugünkü değer taksit toplamına eşit', () => {
    expect(bugunkuDeger(5000, 6, 0, 30)).toBeCloseTo(30_000, 8);
  });

  it('ilk taksit bugün: 1.000 + 1.000 / 1,10 = 1.909,09 (aylık %10)', () => {
    expect(bugunkuDeger(1000, 2, 10, 0)).toBeCloseTo(1909.0909, 4);
  });

  it('ilk taksit 1 ay sonra: 1.000 / 1,10 + 1.000 / 1,21 = 1.735,54', () => {
    expect(bugunkuDeger(1000, 2, 10, 30)).toBeCloseTo(1735.5372, 4);
  });

  it('kart dönemi etkisi: ilk ödeme 40 gün sonraysa bugünkü değer 10 gün sonrakinden düşük', () => {
    const geç = bugunkuDeger(5000, 6, 3, 40);
    const erken = bugunkuDeger(5000, 6, 3, 10);
    expect(geç).toBeLessThan(erken);
    // Fark ≈ 30 gün = 1 aylık iskonto: erken / 1,03
    expect(geç).toBeCloseTo(erken / 1.03, 6);
  });
});

describe('başa baş oranı', () => {
  it('peşin 1.909,09, iki taksit 1.000 (ilk taksit bugün) → aylık %10', () => {
    const pesin = 1000 + 1000 / 1.1;
    expect(basabasOrani(pesin, 1000, 2, 0)!).toBeCloseTo(10, 6);
  });

  it('vade farksız taksit ve indirimsiz peşin: ilk taksit 1 ay sonraysa başa baş %0', () => {
    expect(basabasOrani(30_000, 5000, 6, 30)!).toBeCloseTo(0, 8);
  });

  it('%10 peşin indirimine karşı vade farksız 6 taksit: başa baş oranında bugünkü değer = peşin', () => {
    const bb = basabasOrani(27_000, 5000, 6, 30)!;
    expect(bb).toBeGreaterThan(2);
    expect(bb).toBeLessThan(4);
    expect(bugunkuDeger(5000, 6, bb, 30)).toBeCloseTo(27_000, 4);
  });

  it('taksit toplamı peşinden düşükse başa baş oranı negatiftir', () => {
    expect(basabasOrani(10_000, 900, 10, 30)!).toBeLessThan(0);
  });
});

describe('karşılaştırma', () => {
  const input = {
    etiket: 30_000,
    pesin: 27_000,
    aylikOran: 2.5,
    ilkGun: 30,
    secenekler: [
      { sayi: 3, giris: 'vadeFarki' as const, deger: 0 },
      { sayi: 12, giris: 'vadeFarki' as const, deger: 15 },
    ],
  };

  it('aylık %2,5 varsayımında peşin, iki taksit seçeneğinden de ucuz', () => {
    const r = karsilastir(input);
    // 3 taksit: 10.000/1,025 + 10.000/1,025² + 10.000/1,025³ = 28.560,24 > 27.000
    expect(r.secenekler[0].bugunkuDeger).toBeCloseTo(28560.24, 2);
    expect(r.secenekler[0].durum).toBe('pesin-ucuz');
    expect(r.secenekler[1].pesineGoreFark).toBe(7500);
    expect(r.enUcuz).toBe(-1);
    expect(r.enDusukDeger).toBe(27_000);
  });

  it('yüksek getiride (aylık %8) 12 taksit bugünkü değerle en ucuz olur', () => {
    const r = karsilastir({ ...input, aylikOran: 8 });
    expect(r.enUcuz).toBe(1);
    expect(r.secenekler[1].durum).toBe('taksit-ucuz');
    expect(r.secenekler[1].bdFark).toBeLessThan(0);
  });

  it('senaryo tablosu: %0 satırı taksit toplamlarını verir', () => {
    const t = senaryoTablosu(input, [0, 3]);
    expect(t[0].degerler).toEqual([30_000, 34_500]);
    expect(t[1].degerler[0]).toBeLessThan(30_000);
  });
});

describe('kredi kartı taksit sınırı', () => {
  it('elektronikte 4, mobilyada 9, genelde 12 taksit; akaryakıtta taksit yok', () => {
    expect(kartTaksitKontrol('elektronik', 6)).toEqual({ azami: 4, uygun: false, yasak: false });
    expect(kartTaksitKontrol('mobilya', 9).uygun).toBe(true);
    expect(kartTaksitKontrol('genel', 12).uygun).toBe(true);
    expect(kartTaksitKontrol('genel', 15).uygun).toBe(false);
    expect(kartTaksitKontrol('yasak', 2)).toEqual({ azami: 0, uygun: false, yasak: true });
    expect(kartTaksitKontrol('seyahat-yurtici', 18).uygun).toBe(true);
  });
});

describe('doğrulama', () => {
  it('hatalı girdiler yakalanır', () => {
    expect(validateFiyat(null, 100)).toHaveProperty('etiket');
    expect(validateFiyat(100, 0)).toHaveProperty('pesin');
    expect(validateFiyat(100, 90)).toEqual({});
    expect(validateIndirim(100)).not.toBeNull();
    expect(validateIndirim(0)).toBeNull();
    expect(validateSecenek(0, 'vadeFarki', 0)).toHaveProperty('sayi');
    expect(validateSecenek(6, 'taksit', 0)).toHaveProperty('deger');
    expect(validateSecenek(6, 'vadeFarki', 0)).toEqual({});
    expect(validateOran(-1)).not.toBeNull();
    expect(validateGun(45)).toBeNull();
    expect(validateGun(4.5)).not.toBeNull();
  });
});
