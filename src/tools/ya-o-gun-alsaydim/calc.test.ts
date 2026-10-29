import { describe, expect, it } from 'vitest';
import { altin, doviz } from '../../data/series';
import { degerSerisi, fiyat, ILK_AY, karsilastir, SON_AY } from './calc';

const usd = (ay: string) => doviz.aylar.find((a) => a.ay === ay)!.usd;

describe('veri aralığı', () => {
  it('2005’ten son ortak veri ayına kadar', () => {
    expect(ILK_AY).toBe('2005-01');
    expect(SON_AY >= '2026-09').toBe(true);
    expect(fiyat('tl', '2010-01')).toBe(1);
    expect(fiyat('usd', '2010-01')).toBe(usd('2010-01'));
  });

  it('altın serisi pozitif ve 2020 sonrası 2010’dan yüksek', () => {
    const g = (ay: string) => altin.aylar.find((a) => a.ay === ay)!.gramTl;
    expect(g('2010-01')).toBeGreaterThan(0);
    expect(g('2020-01')).toBeGreaterThan(g('2010-01'));
  });
});

describe('tek seferlik karşılaştırma', () => {
  const r = karsilastir(10000, '2020-01', '2025-01', 'tek')!;

  it('TL nakit nominal olarak değişmez', () => {
    const tl = r.sonuclar.find((s) => s.varlik === 'tl')!;
    expect(tl.deger).toBe(10000);
    expect(tl.nominalGetiri).toBe(0);
    expect(tl.reelGetiri).toBeLessThan(0);
  });

  it('dolar değeri kur oranıyla bulunur', () => {
    const d = r.sonuclar.find((s) => s.varlik === 'usd')!;
    expect(d.birim).toBeCloseTo(10000 / usd('2020-01'), 8);
    expect(d.deger).toBeCloseTo((10000 / usd('2020-01')) * usd('2025-01'), 1);
  });

  it('sonuçlar değere göre büyükten küçüğe sıralı', () => {
    for (let i = 1; i < r.sonuclar.length; i++) expect(r.sonuclar[i - 1].deger).toBeGreaterThanOrEqual(r.sonuclar[i].deger);
  });

  it('reel getiri, enflasyon karşılığına göre hesaplanır', () => {
    const d = r.sonuclar[0];
    expect(d.reelGetiri).toBeCloseTo((d.deger / r.enflasyonKarsiligi - 1) * 100, 1);
  });
});

describe('düzenli (aylık) yatırım', () => {
  it('her ay tutar kadar yatırılır', () => {
    const r = karsilastir(1000, '2024-01', '2024-12', 'duzenli')!;
    expect(r.aySayisi).toBe(12);
    expect(r.sonuclar[0].yatirilan).toBe(12000);
  });
});

describe('grafik ve sınırlar', () => {
  it('değer serisi başlangıçta yatırılan tutara eşittir', () => {
    const s = degerSerisi(5000, '2015-01', '2015-12', 'usd');
    expect(s).toHaveLength(12);
    expect(s[0]).toBeCloseTo(5000, 8);
  });
  it('veri olmayan ay için null', () => {
    expect(karsilastir(100, '1999-01', '2020-01', 'tek')).toBeNull();
  });
});
