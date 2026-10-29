import { describe, expect, it } from 'vitest';
import { bol, paylastir, validateBolumler, varsayilanYontem } from './calc';

const bolumler = [
  { ad: 'D1', arsaPayi: 40 },
  { ad: 'D2', arsaPayi: 60 },
  { ad: 'D3', arsaPayi: 100 },
];

describe('kuruş bölüştürme', () => {
  it('toplam tam korunur', () => {
    const p = bol(100, [1, 1, 1]);
    expect(p.reduce((t, x) => t + x, 0)).toBeCloseTo(100, 10);
    expect(p.sort()).toEqual([33.33, 33.33, 33.34]);
  });
  it('ağırlıklı bölme', () => {
    expect(bol(1000, [40, 60, 100])).toEqual([200, 300, 500]);
  });
});

describe('KMK md. 20 varsayılanları', () => {
  it('personel giderleri eşit, diğerleri arsa payı', () => {
    expect(varsayilanYontem('Kapıcı maaşı')).toBe('esit');
    expect(varsayilanYontem('Kalorifer yakıtı')).toBe('esit');
    expect(varsayilanYontem('Bahçıvan')).toBe('esit');
    expect(varsayilanYontem('Güvenlik görevlisi')).toBe('esit');
    expect(varsayilanYontem('Asansör bakımı')).toBe('arsa');
    expect(varsayilanYontem('Ortak elektrik')).toBe('arsa');
  });
});

describe('paylaştırma', () => {
  it('arsa payına göre gider', () => {
    const r = paylastir(bolumler, [{ ad: 'Asansör', tutar: 2000, yontem: 'arsa' }]);
    expect(r.satirlar.map((s) => s.toplam)).toEqual([400, 600, 1000]);
    expect(r.satirlar[2].oran).toBe(50);
  });

  it('eşit gider', () => {
    const r = paylastir(bolumler, [{ ad: 'Kapıcı', tutar: 30000, yontem: 'esit' }]);
    expect(r.satirlar.map((s) => s.toplam)).toEqual([10000, 10000, 10000]);
  });

  it('karma giderler ve toplamlar', () => {
    const r = paylastir(bolumler, [
      { ad: 'Kapıcı', tutar: 30000, yontem: 'esit' },
      { ad: 'Asansör', tutar: 2000, yontem: 'arsa' },
    ]);
    expect(r.satirlar.map((s) => s.toplam)).toEqual([10400, 10600, 11000]);
    expect(r.toplamGider).toBe(32000);
    expect(r.arsaPayliToplam).toBe(2000);
    expect(r.esitToplam).toBe(30000);
    expect(r.satirlar.reduce((t, s) => t + s.toplam, 0)).toBeCloseTo(32000, 6);
  });

  it('bölünemeyen kuruşlar dağıtılır, toplam tutar', () => {
    const r = paylastir(bolumler, [{ ad: 'Temizlik', tutar: 1000.01, yontem: 'esit' }]);
    expect(r.satirlar.reduce((t, s) => t + s.toplam, 0)).toBeCloseTo(1000.01, 6);
  });

  it('doğrulama', () => {
    expect(validateBolumler([{ arsaPayi: 1 }])).not.toBeNull();
    expect(validateBolumler([{ arsaPayi: 1 }, { arsaPayi: 0 }])).not.toBeNull();
    expect(validateBolumler([{ arsaPayi: 1 }, { arsaPayi: 2 }])).toBeNull();
  });
});
