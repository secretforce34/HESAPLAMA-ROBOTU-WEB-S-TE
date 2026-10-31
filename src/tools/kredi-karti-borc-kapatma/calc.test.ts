import { describe, expect, it } from 'vitest';
import { asgariOdemeDonemiOn, kartFaizDonemiOn } from '../../data/params/kredi';
import { asgariOdeme, borcFaizi, planla, validateBorclar, type Borc } from './calc';

// TCMB Kasım 2026 ilanı: alışverişte 30.000 TL altı %3,25, 30.000–180.000 TL %3,75, üzeri %4,25; nakit %4,25.
// BDDK 01.10.2026 / 11581: limiti 100.000 TL ve altı kartlarda asgari %20, üzerinde %40.
const o = { faizDonemi: kartFaizDonemiOn('2026-10-31'), asgariDonemi: asgariOdemeDonemiOn('2026-10-31') };
const kart = (ad: string, bakiye: number, limit = 60_000, aylikFaiz: number | null = null): Borc => ({ ad, tur: 'kart', bakiye, aylikFaiz, limit });

describe('kredi kartı borç kapatma planı', () => {
  it('alışveriş faizi dönem borcuna göre üç dilim', () => {
    expect(borcFaizi(kart('a', 25_000), 25_000, o)).toBe(3.25);
    expect(borcFaizi(kart('a', 50_000), 50_000, o)).toBe(3.75);
    expect(borcFaizi(kart('a', 200_000), 200_000, o)).toBe(4.25);
  });

  it('tam 30.000 TL dönem borcu ikinci dilime girer', () => {
    expect(borcFaizi(kart('a', 30_000), 30_000, o)).toBe(3.75);
  });

  it('nakit avans borcunda tek oran (%4,25)', () => {
    expect(borcFaizi({ ...kart('a', 10_000), tur: 'nakit' }, 10_000, o)).toBe(4.25);
  });

  it('asgari ödeme: 60.000 TL limitte %20, 150.000 TL limitte %40', () => {
    expect(asgariOdeme(kart('a', 20_000, 60_000), 20_000, o)).toBe(4_000);
    expect(asgariOdeme(kart('a', 20_000, 150_000), 20_000, o)).toBe(8_000);
  });

  it('tam 100.000 TL limit alt orana (%20) girer', () => {
    expect(asgariOdeme(kart('a', 10_000, 100_000), 10_000, o)).toBe(2_000);
  });

  it('faiz sıfırsa süre = toplam borç ÷ bütçe (yukarı yuvarlanır)', () => {
    const r = planla([kart('a', 10_000, 60_000, 0), kart('b', 4_000, 60_000, 0)], 3_000, 'cig', o);
    expect(r.ay).toBe(5);
    expect(r.toplamOdeme).toBe(14_000);
  });

  it('ilk ay: kalan × faiz × 1,30 kadar faiz ve vergi işler', () => {
    const r = planla([kart('a', 20_000, 60_000, 3)], 5_000, 'cig', o);
    // (20.000 − 5.000) × %3 × 1,30 = 585
    expect(r.aylar[0].faiz).toBe(585);
    expect(r.aylar[0].kalan).toBe(15_585);
  });

  it('toplam ödeme = başlangıç borcu + toplam faiz ve vergi', () => {
    const r = planla([kart('a', 45_000), kart('b', 12_000, 30_000)], 12_000, 'cig', o);
    expect(r.bitmedi).toBe(false);
    expect(r.toplamOdeme).toBeCloseTo(57_000 + r.toplamFaiz, 1);
  });

  it('plan, yalnızca asgari ödemeden daha kısa sürer ve daha az faiz öder', () => {
    const borclar = [kart('a', 45_000), kart('b', 12_000, 30_000)];
    const plan = planla(borclar, 12_000, 'cig', o);
    const asgari = planla(borclar, 0, 'asgari', o);
    expect(plan.ay).toBeLessThan(asgari.ay);
    expect(plan.toplamFaiz).toBeLessThan(asgari.toplamFaiz);
  });

  it('çığ yöntemi artan parayı en yüksek faizli karta, kartopu en küçük borca yollar', () => {
    const borclar = [kart('Pahalı', 50_000, 60_000, 4), kart('Küçük', 6_000, 20_000, 2)];
    expect(planla(borclar, 18_000, 'cig', o).aylar[0].hedef).toBe('Pahalı');
    expect(planla(borclar, 18_000, 'kartopu', o).aylar[0].hedef).toBe('Küçük');
  });

  it('bütçe asgari tutarların toplamından azsa plan kurulmaz', () => {
    const r = planla([kart('a', 50_000, 150_000)], 10_000, 'cig', o);
    expect(r.yetersiz).toBe(true);
    expect(r.ilkAsgariToplam).toBe(20_000);
  });

  it('kart limiti girilmeden plan kurulmaz', () => {
    expect(validateBorclar([{ bakiye: 10_000, aylikFaiz: null, limit: null, tur: 'kart' }])).toMatch(/limit/);
    expect(validateBorclar([{ bakiye: null, aylikFaiz: null, limit: null, tur: 'kart' }])).toMatch(/En az bir borç/);
  });
});
