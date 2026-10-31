import { describe, expect, it } from 'vitest';
import { asgariOdemeDonemiOn, kartFaizDonemiOn } from '../../data/params/kredi';
import { asgariOdeme, borcFaizi, kmhAylikFaizYuku, krediyleKapat, planla, validateBorclar, type Borc } from './calc';

// TCMB Kasım 2026 ilanı: TL nakit kullanım ve KMH için azami akdi faiz aylık %4,25; faize %15 KKDF + %15 BSMV.
const o = { faizDonemi: kartFaizDonemiOn('2026-10-31'), asgariDonemi: asgariOdemeDonemiOn('2026-10-31') };
const kmh = (ad: string, bakiye: number, aylikFaiz: number | null = null): Borc => ({ ad, tur: 'kmh', bakiye, aylikFaiz, limit: 0 });

describe('KMH borç kapatma planı', () => {
  it('faiz boşsa TCMB azami oranı kullanılır', () => {
    expect(borcFaizi(kmh('a', 30_000), 30_000, o)).toBe(4.25);
    expect(borcFaizi(kmh('a', 30_000, 3.5), 30_000, o)).toBe(3.5);
  });

  it('yalnız faiz yükü: 30.000 × %4,25 × 1,30 = 1.657,50 TL', () => {
    expect(kmhAylikFaizYuku(30_000, 4.25)).toBe(1_657.5);
  });

  it('asgari tutar (faiz + vergi) ödenince borç aynı kalır', () => {
    const b = kmh('a', 30_000, 4);
    const a = asgariOdeme(b, 30_000, o);
    const sonraki = (30_000 - a) * (1 + 0.04 * 1.3);
    expect(Math.round(sonraki)).toBe(30_000);
  });

  it('yalnızca faiz ödenirse borç hiç bitmez', () => {
    const r = planla([kmh('a', 30_000)], 0, 'asgari', o);
    expect(r.bitmedi).toBe(true);
  });

  it('faiz sıfırsa süre = borç ÷ bütçe', () => {
    const r = planla([kmh('a', 40_000, 0)], 8_000, 'cig', o);
    expect(r.ay).toBe(5);
    expect(r.toplamFaiz).toBe(0);
  });

  it('ilk ay faizi: (borç − ödeme) × faiz × 1,30', () => {
    const r = planla([kmh('a', 30_000, 4)], 6_000, 'cig', o);
    // (30.000 − 6.000) × %4 × 1,30 = 1.248
    expect(r.aylar[0].faiz).toBe(1_248);
    expect(r.aylar[0].kalan).toBe(25_248);
  });

  it('iki bankada KMH: çığ yöntemi önce yüksek faizliyi kapatır', () => {
    const borclar = [kmh('Ucuz', 20_000, 3), kmh('Pahalı', 20_000, 4.25)];
    const r = planla(borclar, 8_000, 'cig', o);
    expect(r.aylar[0].hedef).toBe('Pahalı');
    expect(r.kapanislar[1].ay!).toBeLessThan(r.kapanislar[0].ay!);
  });

  it('kartopu yöntemi önce küçük borcu kapatır', () => {
    const borclar = [kmh('Büyük', 30_000, 4.25), kmh('Küçük', 5_000, 3)];
    const r = planla(borclar, 8_000, 'kartopu', o);
    expect(r.aylar[0].hedef).toBe('Küçük');
  });

  it('bütçe aylık faizi karşılamıyorsa uyarır', () => {
    const r = planla([kmh('a', 100_000)], 3_000, 'cig', o);
    expect(r.yetersiz).toBe(true);
    expect(r.ilkAsgariToplam).toBeGreaterThan(3_000);
  });

  it('KMH için kart limiti istenmez', () => {
    expect(validateBorclar([{ bakiye: 30_000, aylikFaiz: null, limit: null, tur: 'kmh' }])).toBeNull();
  });

  it('ihtiyaç kredisiyle kapatma: taksit ve BDDK vade sınırı', () => {
    const k = krediyleKapat(40_000, 3, 24, 0);
    expect(k.taksit).toBeGreaterThan(40_000 / 24);
    expect(k.toplamOdeme).toBeCloseTo(k.taksit * 24, 0);
    expect(krediyleKapat(40_000, 3, k.azamiVade + 1, 0).vadeAsiyor).toBe(true);
  });
});
