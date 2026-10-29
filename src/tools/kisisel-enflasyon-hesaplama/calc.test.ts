import { describe, expect, it } from 'vitest';
import { gelirKarsilastir, kisiselEnflasyon, onceTutar, resmi, validateKalemler } from './calc';

describe('kişisel enflasyon', () => {
  const kalemler = [
    { ad: 'Kira', once: 10_000, simdi: 15_000 },
    { ad: 'Market', once: 8_000, simdi: 10_000 },
    { ad: 'Ulaşım', once: 2_000, simdi: 2_000 },
  ];

  it('toplam bugünkü ÷ toplam önceki − 1', () => {
    const r = kisiselEnflasyon(kalemler)!;
    expect(r.toplamOnce).toBe(20_000);
    expect(r.toplamSimdi).toBe(27_000);
    expect(r.oran).toBeCloseTo(35, 10);
  });

  it('ağırlıklı ortalamaya eşit: Σ pay × artış', () => {
    const r = kisiselEnflasyon(kalemler)!;
    const agirlikli = r.kalemler.reduce((t, k) => t + (k.pay / 100) * k.artis, 0);
    expect(agirlikli).toBeCloseTo(r.oran, 10);
  });

  it('katkıların toplamı kişisel enflasyon', () => {
    const r = kisiselEnflasyon(kalemler)!;
    expect(r.kalemler.map((k) => k.katki)).toEqual([25, 10, 0]);
    expect(r.kalemler.reduce((t, k) => t + k.katki, 0)).toBeCloseTo(r.oran, 10);
  });

  it('artış oranından önceki tutar', () => {
    expect(onceTutar(13_000, 30)).toBeCloseTo(10_000, 8);
  });

  it('önceki tutarı olmayan kalem atlanır; hiç yoksa null', () => {
    expect(kisiselEnflasyon([...kalemler, { ad: 'Yeni', once: 0, simdi: 500 }])!.toplamSimdi).toBe(27_000);
    expect(kisiselEnflasyon([{ ad: 'x', once: 0, simdi: 0 }])).toBeNull();
  });

  it('gelir: reel değişim ve gereken gelir', () => {
    const g = gelirKarsilastir(40_000, 50_000, 35);
    expect(g.nominalArtis).toBeCloseTo(25, 10);
    expect(g.gereken).toBe(54_000);
    expect(g.reelDegisim).toBeCloseTo((1.25 / 1.35 - 1) * 100, 10);
  });

  it('resmi TÜFE son ay verisi', () => {
    expect(resmi.ay).toMatch(/^\d{4}-\d{2}$/);
    expect(Number.isFinite(resmi.yillik)).toBe(true);
  });

  it('doğrulama', () => {
    expect(validateKalemler([{ simdi: null, once: null }])).not.toBeNull();
    expect(validateKalemler([{ simdi: 100, once: null }])).not.toBeNull();
    expect(validateKalemler([{ simdi: 100, once: 80 }, { simdi: null, once: null }])).toBeNull();
  });
});
