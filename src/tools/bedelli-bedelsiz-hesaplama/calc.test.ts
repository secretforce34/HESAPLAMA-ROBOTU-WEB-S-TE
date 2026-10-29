import { describe, expect, it } from 'vitest';
import { oranMetni, portfoy, teorikFiyat, validateArtirim } from './calc';

const temel = { kapanis: 50, bedelsizYuzde: 0, bedelliYuzde: 0, rucanFiyati: 1, brutTemettu: 0 };

describe('teorik fiyat (Borsa İstanbul md. 5.1)', () => {
  it('%100 bedelsiz: fiyat yarıya iner', () => {
    expect(teorikFiyat({ ...temel, bedelsizYuzde: 100 }).teorikFiyat).toBe(25);
  });

  it('%100 bedelli (1 TL): (50 + 1) / 2 = 25,5; rüçhan referansı 24,5', () => {
    const t = teorikFiyat({ ...temel, bedelliYuzde: 100 });
    expect(t.teorikFiyat).toBe(25.5);
    expect(t.rucanReferans).toBe(24.5);
  });

  it('%100 bedelli + %100 bedelsiz: (50 + 1) / 3 = 17', () => {
    expect(teorikFiyat({ ...temel, bedelliYuzde: 100, bedelsizYuzde: 100 }).teorikFiyat).toBe(17);
  });

  it('nakit temettü fiyattan düşülür (md. 4.1)', () => {
    expect(teorikFiyat({ ...temel, brutTemettu: 2 }).teorikFiyat).toBe(48);
  });

  it('kapanış rüçhan fiyatının altındaysa bedelli hesaba katılmaz', () => {
    const t = teorikFiyat({ ...temel, kapanis: 0.9, bedelliYuzde: 100 });
    expect(t.bedelliDahil).toBe(false);
    expect(t.bedelliHaricNedeni).toBe('kapanis-dusuk');
    expect(t.teorikFiyat).toBe(0.9);
  });

  it('bedelsiz sonrası fiyat rüçhan fiyatının altına düşerse bedelli hesaba katılmaz', () => {
    // 3 / (1 + 3) = 0,75 < 1
    const t = teorikFiyat({ ...temel, kapanis: 3, bedelsizYuzde: 300, bedelliYuzde: 50 });
    expect(t.bedelliHaricNedeni).toBe('teorik-dusuk');
    expect(t.teorikFiyat).toBe(0.75);
  });

  it('virgülden sonra 3 haneye yuvarlanır (md. 2.6)', () => {
    // 10 / 1,33 = 7,5187…
    expect(teorikFiyat({ ...temel, kapanis: 10, bedelsizYuzde: 33 }).teorikFiyat).toBe(7.519);
  });

  it('primli bedelli (rüçhan 5 TL)', () => {
    // (40 + 0,5 × 5) / 1,5 = 28,333…
    expect(teorikFiyat({ ...temel, kapanis: 40, bedelliYuzde: 50, rucanFiyati: 5 }).teorikFiyat).toBe(28.333);
  });
});

describe('portföy', () => {
  it('rüçhanı tamamen kullanan yatırımcının net değeri değişmez', () => {
    const p = portfoy({ ...temel, bedelliYuzde: 100, lot: 100, kullanim: 1 });
    expect(p.toplamLot).toBe(200);
    expect(p.odeme).toBe(100);
    expect(p.oncekiDeger).toBe(5000);
    expect(p.netDeger).toBe(5000);
    expect(p.kullanilmayanHakDegeri).toBe(0);
  });

  it('rüçhanı kullanmayan, hak değerini kaybeder (satmazsa)', () => {
    const p = portfoy({ ...temel, bedelliYuzde: 100, lot: 100, kullanim: 0 });
    expect(p.toplamLot).toBe(100);
    expect(p.netDeger).toBe(2550);
    expect(p.kullanilmayanHakDegeri).toBe(2450);
    expect(p.netDeger + p.kullanilmayanHakDegeri).toBe(p.oncekiDeger);
  });

  it('temettü + bedelsiz: lot artar, temettü nakit gelir, toplam korunur', () => {
    const p = portfoy({ ...temel, kapanis: 22, bedelsizYuzde: 100, brutTemettu: 2, lot: 10, kullanim: 1 });
    expect(p.teorikFiyat).toBe(10);
    expect(p.toplamLot).toBe(20);
    expect(p.temettu).toBe(20);
    expect(p.netDeger).toBe(220);
  });

  it('kesirli bedelsiz pay', () => {
    expect(portfoy({ ...temel, bedelsizYuzde: 33, lot: 15, kullanim: 1 }).bedelsizYeniLot).toBeCloseTo(4.95, 10);
  });
});

describe('yardımcılar', () => {
  it('oran metni', () => {
    expect(oranMetni(100)).toBe('her 1 paya 1 yeni pay');
    expect(oranMetni(250)).toBe('her 1 paya 2,5 yeni pay');
  });
  it('doğrulama', () => {
    expect(validateArtirim({ kapanis: 0, bedelsiz: 0, bedelli: 0, rucan: 1, temettu: 0, lot: 10 })).toHaveProperty('kapanis');
    expect(validateArtirim({ kapanis: 10, bedelsiz: 0, bedelli: 0, rucan: 1, temettu: 0, lot: 10 })).toHaveProperty('bedelsiz');
    expect(validateArtirim({ kapanis: 10, bedelsiz: 0, bedelli: 0, rucan: 1, temettu: 12, lot: 10 })).toHaveProperty('temettu');
    expect(validateArtirim({ kapanis: 10, bedelsiz: 100, bedelli: 0, rucan: 1, temettu: 0, lot: 10 })).toEqual({});
  });
});
