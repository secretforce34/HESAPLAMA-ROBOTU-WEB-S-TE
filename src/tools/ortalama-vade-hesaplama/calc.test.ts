import { describe, expect, it } from 'vitest';
import { addDaysIso, hesaplaOrtalamaVade, isValidIsoDate, validateBaz, validateSatir } from './calc';

const BAZ = '2026-10-29';

describe('tutar ağırlıklı ortalama vade', () => {
  it('10.000 TL @30 gün + 20.000 TL @60 gün → 50 gün', () => {
    // (10.000 × 30 + 20.000 × 60) ÷ 30.000 = 1.500.000 ÷ 30.000 = 50
    const r = hesaplaOrtalamaVade({
      baz: BAZ,
      gecmis: 'negatif',
      satirlar: [
        { tutar: 10000, vade: addDaysIso(BAZ, 30) },
        { tutar: 20000, vade: addDaysIso(BAZ, 60) },
      ],
    })!;
    expect(r.ortalamaGun).toBe(50);
    expect(r.ortalamaGunYuvarlak).toBe(50);
    expect(r.ortalamaVadeTarihi).toBe('2026-12-18');
    expect(r.toplamTutar).toBe(30000);
    expect(r.basitOrtalamaGun).toBe(45);
  });

  it('eşit tutarlarda tutar ağırlıklı ortalama düz ortalamaya eşit', () => {
    const r = hesaplaOrtalamaVade({
      baz: BAZ,
      gecmis: 'negatif',
      satirlar: [
        { tutar: 5000, vade: addDaysIso(BAZ, 10) },
        { tutar: 5000, vade: addDaysIso(BAZ, 20) },
        { tutar: 5000, vade: addDaysIso(BAZ, 90) },
      ],
    })!;
    expect(r.ortalamaGun).toBe(40);
    expect(r.basitOrtalamaGun).toBe(40);
  });

  it('büyük tutar ortalamayı kendine çeker: 1.000 TL @10 + 9.000 TL @100 → 91 gün', () => {
    // (1.000 × 10 + 9.000 × 100) ÷ 10.000 = 910.000 ÷ 10.000 = 91
    const r = hesaplaOrtalamaVade({
      baz: BAZ,
      gecmis: 'negatif',
      satirlar: [
        { tutar: 1000, vade: addDaysIso(BAZ, 10) },
        { tutar: 9000, vade: addDaysIso(BAZ, 100) },
      ],
    })!;
    expect(r.ortalamaGun).toBe(91);
  });

  it('tek satırda ortalama vade kendi vadesidir', () => {
    const r = hesaplaOrtalamaVade({ baz: BAZ, gecmis: 'negatif', satirlar: [{ tutar: 750, vade: '2027-01-15' }] })!;
    expect(r.ortalamaVadeTarihi).toBe('2027-01-15');
    expect(r.ortalamaGunYuvarlak).toBe(78);
  });

  it('ondalıklı ortalama tam güne yuvarlanır, ham değer de korunur', () => {
    // (10.000 × 10 + 5.000 × 11) ÷ 15.000 = 155.000 ÷ 15.000 = 10,3333
    const r = hesaplaOrtalamaVade({
      baz: BAZ,
      gecmis: 'negatif',
      satirlar: [
        { tutar: 10000, vade: addDaysIso(BAZ, 10) },
        { tutar: 5000, vade: addDaysIso(BAZ, 11) },
      ],
    })!;
    expect(r.ortalamaGun).toBeCloseTo(10.333333, 5);
    expect(r.ortalamaGunYuvarlak).toBe(10);
    expect(r.ortalamaVadeTarihi).toBe(addDaysIso(BAZ, 10));
  });
});

describe('vadesi geçmiş satırlar', () => {
  const satirlar = [
    { tutar: 10000, vade: '2026-10-19' }, // 10 gün gecikmiş
    { tutar: 10000, vade: '2026-11-28' }, // 30 gün sonra
  ];

  it('negatif gün olarak hesaba katılır (varsayılan): (−10 + 30) ÷ 2 = 10', () => {
    const r = hesaplaOrtalamaVade({ baz: BAZ, gecmis: 'negatif', satirlar })!;
    expect(r.ortalamaGun).toBe(10);
    expect(r.gecikmisSayisi).toBe(1);
    expect(r.gecikmisTutar).toBe(10000);
    expect(r.satirlar[0].gun).toBe(-10);
    expect(r.satirlar[0].gecikmis).toBe(true);
  });

  it('0 gün sayılırsa: (0 + 30) ÷ 2 = 15', () => {
    const r = hesaplaOrtalamaVade({ baz: BAZ, gecmis: 'sifir', satirlar })!;
    expect(r.ortalamaGun).toBe(15);
    expect(r.satirlar[0].etkinGun).toBe(0);
  });

  it('dışarıda bırakılırsa yalnızca vadesi gelmemiş satır: 30 gün', () => {
    const r = hesaplaOrtalamaVade({ baz: BAZ, gecmis: 'disla', satirlar })!;
    expect(r.ortalamaGun).toBe(30);
    expect(r.hesaplananTutar).toBe(10000);
    expect(r.toplamTutar).toBe(20000);
    expect(r.satirlar[0].dahil).toBe(false);
    expect(r.satirlar[1].pay).toBe(1);
  });

  it('hepsi gecikmiş ve dışarıda bırakılırsa sonuç yok', () => {
    const r = hesaplaOrtalamaVade({ baz: BAZ, gecmis: 'disla', satirlar: [{ tutar: 100, vade: '2026-01-01' }] });
    expect(r).toBeNull();
  });

  it('ortalama negatif çıkabilir: ortalama vade tarihi baz tarihten önce olur', () => {
    const r = hesaplaOrtalamaVade({
      baz: BAZ,
      gecmis: 'negatif',
      satirlar: [
        { tutar: 30000, vade: '2026-10-09' }, // −20
        { tutar: 10000, vade: addDaysIso(BAZ, 20) }, // +20
      ],
    })!;
    // (30.000 × −20 + 10.000 × 20) ÷ 40.000 = −10
    expect(r.ortalamaGun).toBe(-10);
    expect(r.ortalamaVadeTarihi).toBe('2026-10-19');
  });
});

describe('faizi dikkate alan denk vade', () => {
  it('bugünkü değerler toplamı, toplam tutarın denk vadede ödenmesinin bugünkü değerine eşit', () => {
    const r = hesaplaOrtalamaVade({
      baz: BAZ,
      gecmis: 'negatif',
      faizOrani: 36,
      gunEsasi: 360,
      satirlar: [
        { tutar: 10000, vade: addDaysIso(BAZ, 30) },
        { tutar: 10000, vade: addDaysIso(BAZ, 90) },
      ],
    })!;
    expect(r.faizli).not.toBeNull();
    const pv = 10000 / (1 + (0.36 * 30) / 360) + 10000 / (1 + (0.36 * 90) / 360);
    const denk = 20000 / (1 + (0.36 * r.faizli!.gun) / 360);
    expect(denk).toBeCloseTo(pv, 4);
    // Faiz varken denk vade, düz ortalamadan (60 gün) kısadır
    expect(r.faizli!.gun).toBeLessThan(60);
    expect(r.faizli!.gun).toBeGreaterThan(58);
  });

  it('faiz verilmezse hesaplanmaz', () => {
    const r = hesaplaOrtalamaVade({ baz: BAZ, gecmis: 'negatif', satirlar: [{ tutar: 100, vade: '2026-12-01' }] })!;
    expect(r.faizli).toBeNull();
  });

  it('faizsiz sınırda (çok düşük faiz) denk vade ortalamaya yaklaşır', () => {
    const r = hesaplaOrtalamaVade({
      baz: BAZ,
      gecmis: 'negatif',
      faizOrani: 0.0001,
      satirlar: [
        { tutar: 10000, vade: addDaysIso(BAZ, 30) },
        { tutar: 30000, vade: addDaysIso(BAZ, 70) },
      ],
    })!;
    expect(r.ortalamaGun).toBe(60);
    expect(r.faizli!.gun).toBeCloseTo(60, 1);
  });
});

describe('tarih yardımcıları', () => {
  it('artık yıl ve yıl geçişi', () => {
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysIso('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysIso('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDaysIso('2026-10-29', 0)).toBe('2026-10-29');
  });

  it('geçerli tarih denetimi', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
  });
});

describe('doğrulama', () => {
  it('baz tarih ve satır doğrulaması', () => {
    expect(validateBaz('')).toBeDefined();
    expect(validateBaz('2026-10-29')).toBeUndefined();
    expect(validateSatir(null, '2026-11-01')).toHaveProperty('tutar');
    expect(validateSatir(-5, '2026-11-01')).toHaveProperty('tutar');
    expect(validateSatir(100, '')).toHaveProperty('vade');
    expect(validateSatir(100, '2026-11-01')).toEqual({});
  });
});
