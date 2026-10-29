import { describe, expect, it } from 'vitest';
import { asgariOdemeDonemiOn, kartFaizDonemiOn } from '../../data/params/kredi';
import { asgariOdeme, borcFaizi, krediyleKapat, planla, validateBorclar, type Borc } from './calc';

const o = { faizDonemi: kartFaizDonemiOn('2026-10-29'), asgariDonemi: asgariOdemeDonemiOn('2026-10-29') };
const kart = (ad: string, bakiye: number, aylikFaiz: number | null = null, limit = 100_000): Borc => ({ ad, tur: 'kart', bakiye, aylikFaiz, limit });

describe('borç kapatma planı', () => {
  it('TCMB azami faizi dönem borcuna göre seçilir; nakit ve KMH tek oran', () => {
    expect(borcFaizi(kart('a', 20_000), 20_000, o)).toBe(3.25);
    expect(borcFaizi(kart('a', 50_000), 50_000, o)).toBe(3.75);
    expect(borcFaizi({ ...kart('a', 50_000), tur: 'nakit' }, 50_000, o)).toBe(4.25);
    expect(borcFaizi({ ...kart('a', 50_000), tur: 'kmh' }, 50_000, o)).toBe(4.25);
    expect(borcFaizi(kart('a', 50_000, 2.5), 50_000, o)).toBe(2.5);
  });

  it('asgari ödeme: limit 100.000 TL ve altı %20, üstü %40; KMH yalnız faiz ve vergisi', () => {
    expect(asgariOdeme(kart('a', 10_000), 10_000, o)).toBe(2_000);
    expect(asgariOdeme(kart('a', 10_000, null, 150_000), 10_000, o)).toBe(4_000);
    const kmh: Borc = { ad: 'k', tur: 'kmh', bakiye: 10_000, aylikFaiz: 4, limit: 0 };
    const a = asgariOdeme(kmh, 10_000, o);
    expect(round((10_000 - a) * (1 + 0.04 * 1.3))).toBe(10_000);
  });

  it('faiz yoksa süre = toplam borç ÷ bütçe, ödenen = borç', () => {
    const r = planla([kart('a', 10_000, 0), kart('b', 5_000, 0)], 3_000, 'cig', o);
    expect(r.ay).toBe(5);
    expect(r.toplamOdeme).toBe(15_000);
    expect(r.toplamFaiz).toBe(0);
  });

  it('faiz, KKDF ve BSMV ile ekstre ekstre işler', () => {
    const r = planla([kart('a', 10_000, 3)], 4_000, 'cig', o);
    // 1. ay: 10.000 − 4.000 = 6.000; faiz 6.000 × %3 × 1,30 = 234
    expect(r.aylar[0].faiz).toBe(234);
    expect(r.aylar[0].kalan).toBe(6_234);
    expect(r.toplamOdeme).toBeCloseTo(10_000 + r.toplamFaiz, 2);
  });

  it('çığ yöntemi en az faizi öder; kartopu en küçük borcu önce kapatır', () => {
    const borclar = [kart('Büyük pahalı', 60_000, 4.25), kart('Küçük ucuz', 8_000, 2)];
    const cig = planla(borclar, 20_000, 'cig', o);
    const kartopu = planla(borclar, 20_000, 'kartopu', o);
    expect(cig.toplamFaiz).toBeLessThan(kartopu.toplamFaiz);
    expect(kartopu.kapanislar[1].ay!).toBeLessThan(kartopu.kapanislar[0].ay!);
    expect(cig.aylar[0].hedef).toBe('Büyük pahalı');
    expect(kartopu.aylar[0].hedef).toBe('Küçük ucuz');
  });

  it('bütçe asgari ödemeleri karşılamıyorsa uyarır', () => {
    const r = planla([kart('a', 100_000)], 10_000, 'cig', o);
    expect(r.yetersiz).toBe(true);
    expect(r.ilkAsgariToplam).toBe(20_000);
  });

  it('yalnız faizi ödenen KMH hiç bitmez', () => {
    const r = planla([{ ad: 'k', tur: 'kmh', bakiye: 10_000, aylikFaiz: 4, limit: 0 }], 0, 'asgari', o);
    expect(r.bitmedi).toBe(true);
  });

  it('yalnız asgari ödemeyle kart borcu çok daha uzun sürer ve pahalıya gelir', () => {
    const borclar = [kart('a', 50_000)];
    const asgari = planla(borclar, 0, 'asgari', o);
    const plan = planla(borclar, 15_000, 'cig', o);
    expect(asgari.bitmedi).toBe(false);
    expect(asgari.ay).toBeGreaterThan(plan.ay);
    expect(asgari.toplamFaiz).toBeGreaterThan(plan.toplamFaiz);
  });

  it('ihtiyaç kredisiyle kapatma: BDDK vade sınırı', () => {
    const k = krediyleKapat(150_000, 3, 36, 0);
    expect(k.azamiVade).toBe(24);
    expect(k.vadeAsiyor).toBe(true);
    expect(krediyleKapat(100_000, 3, 36, 0).vadeAsiyor).toBe(false);
    expect(k.toplamOdeme).toBeCloseTo(150_000 + k.toplamMaliyet, 1);
  });

  it('doğrulama', () => {
    expect(validateBorclar([{ bakiye: null, aylikFaiz: null, limit: null, tur: 'kart' }])).not.toBeNull();
    expect(validateBorclar([{ bakiye: 1000, aylikFaiz: null, limit: null, tur: 'kart' }])).not.toBeNull();
    expect(validateBorclar([{ bakiye: 1000, aylikFaiz: null, limit: null, tur: 'kmh' }])).toBeNull();
  });
});

function round(n: number) {
  return Math.round(n);
}
