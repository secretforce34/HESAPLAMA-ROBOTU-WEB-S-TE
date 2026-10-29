import { describe, expect, it } from 'vitest';
import { erkenKapama, kismiOdeme, tazminatOrani, validateErken } from './calc';

const konut = {
  tur: 'konut' as const,
  anapara: 1_000_000,
  vade: 120,
  aylikFaiz: 2.5,
  kkdf: 0,
  bsmv: 0,
  odenenTaksit: 24,
  gecenGun: 0,
  faizTipi: 'sabit' as const,
  ticariOran: 0,
};

const ihtiyac = { ...konut, tur: 'ihtiyac' as const, anapara: 200_000, vade: 36, aylikFaiz: 3.5, kkdf: 15, bsmv: 15, odenenTaksit: 12 };

describe('erken ödeme tazminatı (6502 md. 30, 37)', () => {
  it('sabit faizli konut: kalan vade > 36 ay → %2', () => {
    expect(tazminatOrani(konut, 96).oran).toBe(2);
  });
  it('sabit faizli konut: kalan vade ≤ 36 ay → %1', () => {
    expect(tazminatOrani(konut, 36).oran).toBe(1);
  });
  it('değişken faizli konut ve tüketici kredisi: tazminat yok', () => {
    expect(tazminatOrani({ ...konut, faizTipi: 'degisken' }, 96).oran).toBe(0);
    expect(tazminatOrani(ihtiyac, 24).oran).toBe(0);
  });
  it('ticari: sözleşmedeki oran', () => {
    expect(tazminatOrani({ ...konut, tur: 'ticari', ticariOran: 1.5 }, 10).oran).toBe(1.5);
  });
});

describe('tam kapama', () => {
  it('konut: kalan anapara + %2 tazminat, faizden büyük tasarruf', () => {
    const r = erkenKapama(konut);
    expect(r.kalanTaksitSayisi).toBe(96);
    expect(r.kalanAnapara).toBe(r.plan.satirlar[23].kalan);
    expect(r.tazminat).toBe(Math.round(r.kalanAnapara * 2) / 100);
    expect(r.kapamaTutari).toBeCloseTo(r.kalanAnapara + r.tazminat, 2);
    expect(r.tasarruf).toBeGreaterThan(0);
    expect(r.tasarruf).toBeCloseTo(r.kalanOdemeler - r.kapamaTutari, 2);
  });

  it('ihtiyaç kredisi: tazminat yok, işlemiş faize KKDF ve BSMV eklenir', () => {
    const r = erkenKapama({ ...ihtiyac, gecenGun: 15 });
    expect(r.tazminat).toBe(0);
    const faiz = Math.round(r.kalanAnapara * 0.035 * 0.5 * 100) / 100;
    expect(r.islemisFaiz).toBeCloseTo(faiz * 1.3, 1);
  });

  it('hiç taksit ödenmeden kapama: kalan anapara = kredi tutarı', () => {
    const r = erkenKapama({ ...ihtiyac, odenenTaksit: 0 });
    expect(r.kalanAnapara).toBe(200_000);
  });
});

describe('ara (kısmi) ödeme', () => {
  it('taksit düşürme: vade aynı, taksit azalır', () => {
    const k = erkenKapama(ihtiyac);
    const r = kismiOdeme(ihtiyac, 50_000, 'taksit')!;
    expect(r.yeniVade).toBe(24);
    expect(r.yeniTaksit).toBeLessThan(k.plan.taksit);
    expect(r.tasarruf).toBeGreaterThan(0);
  });

  it('vade kısaltma: taksit sayısı azalır, taksit eskisini geçmez', () => {
    const k = erkenKapama(ihtiyac);
    const r = kismiOdeme(ihtiyac, 50_000, 'vade')!;
    expect(r.yeniVade).toBeLessThan(24);
    expect(r.yeniTaksit).toBeLessThanOrEqual(k.plan.taksit + 0.01);
    expect(r.tasarruf).toBeGreaterThan(kismiOdeme(ihtiyac, 50_000, 'taksit')!.tasarruf);
  });

  it('kalan anaparadan fazla ara ödeme: null (tam kapama kullanılmalı)', () => {
    expect(kismiOdeme(ihtiyac, 10_000_000, 'taksit')).toBeNull();
  });
});

describe('doğrulama', () => {
  it('girdi hataları', () => {
    expect(validateErken({ anapara: 0, vade: 12, faiz: 2, odenen: 0, gun: 0 })).toHaveProperty('anapara');
    expect(validateErken({ anapara: 1, vade: 12, faiz: 2, odenen: 12, gun: 0 })).toHaveProperty('odenen');
    expect(validateErken({ anapara: 1, vade: 12, faiz: 2, odenen: 3, gun: 31 })).toHaveProperty('gun');
    expect(validateErken({ anapara: 1, vade: 12, faiz: 2, odenen: 3, gun: 10 })).toEqual({});
  });
});
