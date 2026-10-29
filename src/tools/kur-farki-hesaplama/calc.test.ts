import { describe, expect, it } from 'vitest';
import { hesaplaSaglayici, karsilastir, validateKur, validateSaglayici } from './calc';

const s = (kur: number, sabitUcret = 0, komisyonYuzde = 0, ad = 'A') => ({ ad, kur, sabitUcret, komisyonYuzde });

describe('döviz bozdurma', () => {
  it('yalnızca kur makası: 1.000 $, piyasa 42, uygulanan 41,50', () => {
    const r = hesaplaSaglayici('bozdurma', 1000, 42, s(41.5));
    expect(r.ideal).toBe(42000);
    expect(r.tl).toBe(41500);
    expect(r.kurMakasi).toBe(500);
    expect(r.toplamMaliyet).toBe(500);
    expect(r.kurMakasiYuzde).toBeCloseTo(1.1905, 4);
    expect(r.efektifKur).toBe(41.5);
  });

  it('makas + %1 komisyon + 50 TL sabit ücret', () => {
    const r = hesaplaSaglayici('bozdurma', 1000, 42, s(41.8, 50, 1));
    // brüt 41.800, komisyon 418, sabit 50 → 41.332
    expect(r.tl).toBe(41332);
    expect(r.acikUcret).toBe(468);
    expect(r.kurMakasi).toBe(200);
    expect(r.toplamMaliyet).toBe(668);
    expect(r.toplamMaliyet).toBe(r.kurMakasi + r.acikUcret);
  });
});

describe('döviz alma', () => {
  it('almada uygulanan kur piyasanın üzerindedir', () => {
    const r = hesaplaSaglayici('alma', 500, 42, s(42.6));
    expect(r.tl).toBe(21300);
    expect(r.ideal).toBe(21000);
    expect(r.toplamMaliyet).toBe(300);
    expect(r.kurMakasiYuzde).toBeCloseTo(1.4286, 4);
  });

  it('almada komisyon ve sabit ücret eklenir', () => {
    const r = hesaplaSaglayici('alma', 100, 40, s(40, 10, 0.5));
    expect(r.tl).toBe(4030);
    expect(r.kurMakasi).toBe(0);
    expect(r.toplamMaliyet).toBe(30);
    expect(r.efektifKur).toBe(40.3);
  });
});

describe('karşılaştırma', () => {
  it('düşük kur ama sabit ücretsiz sağlayıcı, küçük tutarda öne geçebilir', () => {
    const list = [s(41.9, 300, 0, 'Ücretli'), s(41.6, 0, 0, 'Makaslı')];
    // 100 $: ücretli 4.190 − 300 = 3.890; makaslı 4.160 → makaslı daha iyi
    expect(karsilastir('bozdurma', 100, 42, list)[0].ad).toBe('Makaslı');
    // 10.000 $: ücretli 419.000 − 300 = 418.700; makaslı 416.000 → ücretli daha iyi
    expect(karsilastir('bozdurma', 10_000, 42, list)[0].ad).toBe('Ücretli');
  });

  it('piyasa kurundan iyi kur verilirse maliyet negatif (kazanç) olabilir', () => {
    expect(hesaplaSaglayici('bozdurma', 100, 42, s(42.1)).toplamMaliyet).toBe(-10);
  });
});

describe('doğrulama', () => {
  it('girdi hataları', () => {
    expect(validateKur({ tutar: 0, piyasa: 42 })).toHaveProperty('tutar');
    expect(validateKur({ tutar: 10, piyasa: null })).toHaveProperty('piyasa');
    expect(validateSaglayici({ kur: null, sabit: 0, komisyon: 0 })).toHaveProperty('kur');
    expect(validateSaglayici({ kur: 40, sabit: -1, komisyon: 120 })).toEqual({ sabit: '0 veya daha büyük olmalı.', komisyon: '%0 ile %100 arasında olmalı.' });
  });
});
