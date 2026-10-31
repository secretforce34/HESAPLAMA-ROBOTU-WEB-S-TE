import { describe, expect, it } from 'vitest';
import { buildKpis } from './kpi';
import { tufe } from '../data/series';

describe('Bu ayın rakamları', () => {
  const k = buildKpis('2026-10-31');

  it('beş kutucuk üretir ve hepsi bir robota bağlanır', () => {
    expect(k).toHaveLength(5);
    for (const x of k) expect(x.href).toMatch(/^\/[a-z0-9-]+\/$/);
  });

  it('2026 net asgari ücreti', () => {
    expect(k[0].value).toBe('28.075,50 TL');
    expect(k[0].tag).toBe('2026');
  });

  it('enflasyon son açıklanan ayın yıllık TÜFE’si', () => {
    const son = tufe.aylar[tufe.aylar.length - 1];
    expect(k[1].ring).toBe(son.yillik);
  });

  it('kıdem tavanı Temmuz–Aralık 2026 dönemi', () => {
    expect(k[3].value).toBe('73.729,87 TL');
  });

  it('kira sınırı açıklanmamış ay için son açıklanan aya düşer', () => {
    const ileri = buildKpis('2030-05-10');
    expect(ileri[2].ring).toBeGreaterThan(0);
  });
});
