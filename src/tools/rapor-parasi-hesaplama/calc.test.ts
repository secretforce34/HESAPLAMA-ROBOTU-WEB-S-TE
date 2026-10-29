import { describe, expect, it } from 'vitest';
import { hesaplaRapor, validateRapor } from './calc';

const temel = {
  tur: 'hastalik' as const,
  pekToplam: 600_000,
  primGun: 360,
  sonBirYilPrimGun: 360,
  ayaktaGun: 10,
  yatarakGun: 0,
  cogulGebelik: false,
  tarih: '2026-10-01',
};

describe('rapor parası (5510 md. 17–18)', () => {
  it('günlük kazanç = 12 aylık PEK ÷ prim günü', () => {
    const r = hesaplaRapor(temel);
    expect(r.hesaplananGunluk).toBe(1666.67);
    expect(r.gunlukKazanc).toBe(1666.67);
  });

  it('hastalıkta ilk 2 gün ödenmez, ayakta 2/3', () => {
    const r = hesaplaRapor(temel);
    expect(r.odenmeyenGun).toBe(2);
    expect(r.ayaktaOdenenGun).toBe(8);
    expect(r.ayaktaGunluk).toBe(1111.11);
    expect(r.toplam).toBe(8888.88);
  });

  it('yatarak tedavide 1/2', () => {
    const r = hesaplaRapor({ ...temel, ayaktaGun: 0, yatarakGun: 7 });
    expect(r.yatarakGunluk).toBe(833.34);
    expect(r.yatarakOdenenGun).toBe(5);
  });

  it('iş kazasında ilk günden ödenir, prim şartı yok', () => {
    const r = hesaplaRapor({ ...temel, tur: 'is-kazasi', sonBirYilPrimGun: 10 });
    expect(r.hakVar).toBe(true);
    expect(r.odenmeyenGun).toBe(0);
    expect(r.ayaktaOdenenGun).toBe(10);
  });

  it('hastalıkta son 1 yılda 90 günden az prim: hak yok', () => {
    const r = hesaplaRapor({ ...temel, sonBirYilPrimGun: 89 });
    expect(r.hakVar).toBe(false);
    expect(r.toplam).toBe(0);
  });

  it('180 günden az prim: günlük kazanç alt sınırın 2 katını geçemez (2026: 2.202 TL)', () => {
    const r = hesaplaRapor({ ...temel, pekToplam: 450_000, primGun: 150, sonBirYilPrimGun: 150 });
    // 450.000 / 150 = 3.000 > 1.101 × 2
    expect(r.sinirUygulandi).toBe(true);
    expect(r.gunlukKazanc).toBe(2202);
  });

  it('iş kazasında 2 kat sınırı uygulanmaz, PEK üst sınırı uygulanır', () => {
    const r = hesaplaRapor({ ...temel, tur: 'is-kazasi', pekToplam: 4_000_000, primGun: 360 });
    expect(r.gunlukKazanc).toBe(9909);
  });

  it('doğum izni: tekil gebelikte 112 gün, 2/3', () => {
    const r = hesaplaRapor({ ...temel, tur: 'analik' });
    expect(r.ayaktaOdenenGun).toBe(112);
    expect(r.toplam).toBe(round(1111.11 * 112));
  });

  it('doğum izni: çoğul gebelikte 126 gün', () => {
    expect(hesaplaRapor({ ...temel, tur: 'analik', cogulGebelik: true }).ayaktaOdenenGun).toBe(126);
  });

  it('doğrulama', () => {
    expect(validateRapor({ tur: 'hastalik', pek: 0, gun: 360, birYil: 360, ayakta: 0, yatarak: 0 })).toHaveProperty('pek');
    expect(validateRapor({ tur: 'hastalik', pek: 1, gun: 360, birYil: 360, ayakta: 0, yatarak: 0 })).toHaveProperty('ayakta');
    expect(validateRapor({ tur: 'analik', pek: 1, gun: 360, birYil: 360, ayakta: null, yatarak: null })).toEqual({});
  });
});

function round(n: number) {
  return Math.round(n * 100) / 100;
}
