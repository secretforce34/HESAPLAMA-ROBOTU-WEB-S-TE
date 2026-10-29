import { describe, expect, it } from 'vitest';
import {
  brutKarDegisimi,
  eskiFiyatiBul,
  eskiyeDonusIndirimi,
  fiyatlandir,
  hacimDengesi,
  hacimSenaryolari,
  toplamZamOrani,
  validateFiyat,
  validateHacim,
  validateHedef,
  validateUrun,
  validateZamOrani,
  yeniFiyatiBul,
  zamOraniBul,
  type FiyatAyari,
} from './calc';

describe('yüzde zam ve ardışık zamlar', () => {
  it('%10 sonra %15 zam = %26,5 (düz toplam %25 değil)', () => {
    // 1,10 × 1,15 = 1,265
    expect(toplamZamOrani([10, 15])).toBe(26.5);
    const r = yeniFiyatiBul(100, [10, 15]);
    expect(r.yeni).toBe(126.5);
    expect(r.toplamOran).toBe(26.5);
    expect(r.duzToplam).toBe(25);
    expect(r.adimlar.map((a) => a.fiyat)).toEqual([110, 126.5]);
    expect(r.fark).toBe(26.5);
  });

  it('tek zam: 80 TL + %25 = 100 TL', () => {
    expect(yeniFiyatiBul(80, [25]).yeni).toBe(100);
  });

  it('zam oranını bul: 80 → 100 = %25', () => {
    const r = zamOraniBul(80, 100);
    expect(r.toplamOran).toBe(25);
    expect(r.fark).toBe(20);
  });

  it('eski fiyatı bul: yeni 126,50 TL, zamlar %10 ve %15 → 100 TL', () => {
    const r = eskiFiyatiBul(126.5, [10, 15]);
    expect(r.eski).toBe(100);
    expect(r.yeni).toBe(126.5);
  });

  it('zamdan sonra eski fiyata dönmek için gereken indirim: %25 zam → %20 indirim', () => {
    // 1 − 1 ÷ 1,25 = 0,20
    expect(eskiyeDonusIndirimi(25)).toBe(20);
    expect(yeniFiyatiBul(100, [25]).geriDonusIndirimi).toBe(20);
  });

  it('indirim (negatif oran) zincirde kullanılabilir: +%20 sonra −%20 = −%4', () => {
    // 1,20 × 0,80 = 0,96
    expect(toplamZamOrani([20, -20])).toBe(-4);
    expect(yeniFiyatiBul(100, [20, -20]).yeni).toBe(96);
  });

  it('kuruş yuvarlaması yalnızca gösterimde: ara adımlar zincirlenir', () => {
    // 99,99 × 1,07 × 1,07 = 114,48...
    const r = yeniFiyatiBul(99.99, [7, 7]);
    expect(r.yeni).toBe(114.48);
  });

  it('doğrulama', () => {
    expect(validateZamOrani(null)).toBeDefined();
    expect(validateZamOrani(-100)).toBeDefined();
    expect(validateZamOrani(-10)).toBeUndefined();
    expect(validateZamOrani(25)).toBeUndefined();
    expect(validateFiyat(0)).toBeDefined();
    expect(validateFiyat(10)).toBeUndefined();
  });
});

describe('maliyet artışında satış fiyatı', () => {
  const urun = { fiyat: 120, maliyet: 80, yeniMaliyet: 92 };
  const ayar = (koruma: FiyatAyari['koruma'], hedef: number | null = null, dahil = false): FiyatAyari => ({
    koruma,
    hedef,
    kdvOrani: 20,
    fiyatKdvDahil: dahil,
  });

  it('kâr oranını (marj/markup) koruma: 80 → 92 maliyet, 120 TL fiyat → 138 TL', () => {
    // eski kâr 40: markup %50, marj %33,33; yeni fiyat = 92 × 1,5 = 138; yeni kâr 46; marj yine %33,33
    const r = fiyatlandir(urun, ayar('oran'));
    expect(r.eskiKar).toBe(40);
    expect(r.eskiMarkup).toBe(50);
    expect(r.eskiMarj).toBeCloseTo(33.3333, 3);
    expect(r.yeniFiyatHaric).toBe(138);
    expect(r.zam).toBe(15);
    expect(r.yeniKar).toBe(46);
    expect(r.yeniMarj).toBeCloseTo(33.3333, 3);
    expect(r.maliyetArtisi).toBe(15);
  });

  it('kâr tutarını koruma: aynı örnekte 132 TL; marj %30,3’e düşer', () => {
    // 92 + 40 = 132; marj 40 ÷ 132 = %30,30
    const r = fiyatlandir(urun, ayar('kar'));
    expect(r.yeniFiyatHaric).toBe(132);
    expect(r.zam).toBe(10);
    expect(r.yeniKar).toBe(40);
    expect(r.yeniMarj).toBeCloseTo(30.303, 2);
    expect(r.karFarki).toBe(0);
    expect(r.oranKorunursa).toBe(138);
    expect(r.karKorunursa).toBe(132);
  });

  it('hedef marj %40: 92 ÷ 0,60 = 153,33 TL; hedef markup %40: 92 × 1,4 = 128,80 TL', () => {
    const marj = fiyatlandir(urun, ayar('hedefMarj', 40));
    expect(marj.yeniFiyatHaric).toBe(153.33);
    expect(marj.yeniMarj).toBeCloseTo(40, 1);
    const markup = fiyatlandir(urun, ayar('hedefMarkup', 40));
    expect(markup.yeniFiyatHaric).toBe(128.8);
    expect(markup.yeniMarkup).toBeCloseTo(40, 1);
  });

  it('marj ≠ markup: aynı %30 hedef farklı fiyat verir', () => {
    const m = fiyatlandir({ fiyat: 100, maliyet: 50, yeniMaliyet: 100 }, ayar('hedefMarj', 30));
    const k = fiyatlandir({ fiyat: 100, maliyet: 50, yeniMaliyet: 100 }, ayar('hedefMarkup', 30));
    expect(m.yeniFiyatHaric).toBe(142.86); // 100 ÷ 0,70
    expect(k.yeniFiyatHaric).toBe(130); // 100 × 1,30
  });

  it('KDV dahil girilen fiyat: 144 TL (KDV dahil, %20) ↔ 120 TL hariç; yeni fiyat 165,60 TL dahil', () => {
    const r = fiyatlandir({ ...urun, fiyat: 144 }, ayar('oran', null, true));
    expect(r.eskiFiyatHaric).toBe(120);
    expect(r.yeniFiyatHaric).toBe(138);
    expect(r.yeniFiyatDahil).toBe(165.6);
    expect(r.yeniFiyat).toBe(165.6);
    expect(r.eskiFiyat).toBe(144);
    expect(r.zam).toBe(15);
  });

  it('maliyet düşerse fiyat da düşer (kâr oranı korunurken)', () => {
    const r = fiyatlandir({ fiyat: 120, maliyet: 80, yeniMaliyet: 72 }, ayar('oran'));
    expect(r.yeniFiyatHaric).toBe(108);
    expect(r.zam).toBe(-10);
  });

  it('doğrulama', () => {
    const a = ayar('oran');
    expect(validateUrun({ fiyat: null, maliyet: 10, yeniMaliyet: 12 }, a)).toHaveProperty('fiyat');
    expect(validateUrun({ fiyat: 100, maliyet: 100, yeniMaliyet: 120 }, a)).toHaveProperty('fiyat');
    expect(validateUrun({ fiyat: 100, maliyet: 100, yeniMaliyet: 120 }, ayar('hedefMarj', 30))).toEqual({});
    expect(validateUrun({ fiyat: 120, maliyet: 80, yeniMaliyet: 92 }, a)).toEqual({});
    expect(validateHedef('hedefMarj', 100)).toBeDefined();
    expect(validateHedef('hedefMarj', 35)).toBeUndefined();
    expect(validateHedef('hedefMarkup', -5)).toBeDefined();
    expect(validateHedef('oran', null)).toBeUndefined();
  });
});

describe('zam yaparsam kaç müşteri kaybedebilirim?', () => {
  it('100 TL fiyat, 60 TL maliyet, %10 zam: en fazla %20 satış kaybı', () => {
    // eski katkı 40, yeni katkı 110 − 60 = 50; 40 ÷ 50 = 0,8 → −%20
    const r = hacimDengesi(100, 60, 10);
    expect(r.mumkun).toBe(true);
    expect(r.eskiKatki).toBe(40);
    expect(r.yeniKatki).toBe(50);
    expect(r.gerekenOran).toBeCloseTo(0.8, 10);
    expect(r.adetDegisimi).toBe(-20);
  });

  it('%10 indirim: brüt kâr için %33,33 daha fazla satış gerekir', () => {
    // yeni katkı 90 − 60 = 30; 40 ÷ 30 = 1,3333
    const r = hacimDengesi(100, 60, -10);
    expect(r.adetDegisimi).toBeCloseTo(33.3333, 3);
  });

  it('fiyat değişmezse adet değişimi 0', () => {
    expect(hacimDengesi(100, 60, 0).adetDegisimi).toBe(0);
  });

  it('indirim maliyetin altına inerse hiçbir satış artışı yetmez', () => {
    // −%40 → 60 TL = maliyet, katkı 0
    expect(hacimDengesi(100, 60, -40).mumkun).toBe(false);
    expect(hacimDengesi(100, 60, -45).mumkun).toBe(false);
  });

  it('senaryo tablosu: zam arttıkça kaldırılabilecek kayıp artar', () => {
    const s = hacimSenaryolari(100, 60, [5, 10, 20, 30]);
    const kayiplar = s.map((x) => -x.adetDegisimi);
    expect(kayiplar).toEqual([...kayiplar].sort((a, b) => a - b));
    // %30 zam: yeni katkı 70; 40 ÷ 70 → −%42,86
    expect(s[3].adetDegisimi).toBeCloseTo(-42.857, 2);
  });

  it('brüt kâr: %10 zam, %10 satış kaybı, 1.000 adet → 40.000 → 45.000 TL', () => {
    const r = brutKarDegisimi(100, 60, 1000, 10, -10);
    expect(r.once).toBe(40000);
    expect(r.sonra).toBe(45000);
    expect(r.fark).toBe(5000);
    expect(r.yeniAdet).toBe(900);
  });

  it('gereken adet değişimiyle brüt kâr tam sabit kalır', () => {
    const d = hacimDengesi(100, 60, 10);
    const r = brutKarDegisimi(100, 60, 1000, 10, d.adetDegisimi);
    expect(r.fark).toBe(0);
  });

  it('doğrulama', () => {
    expect(validateHacim({ fiyat: 100, maliyet: 60, degisim: 10 })).toEqual({});
    expect(validateHacim({ fiyat: 100, maliyet: 100, degisim: 10 })).toHaveProperty('maliyet');
    expect(validateHacim({ fiyat: 100, maliyet: null, degisim: 10 })).toHaveProperty('maliyet');
    expect(validateHacim({ fiyat: 100, maliyet: 60, degisim: -100 })).toHaveProperty('degisim');
  });
});
