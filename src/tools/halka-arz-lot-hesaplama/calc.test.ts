import { describe, expect, it } from 'vitest';
import { benimLotum, esitDagitim, oransalDagitim, senaryolar, validateHalkaArz } from './calc';

describe('eşit dağıtım (SPK II-5.2 md. 20/2)', () => {
  it('talep arzdan azsa herkes istediği kadar alır', () => {
    const s = esitDagitim(1000, [{ kisi: 100, talep: 5 }]);
    expect(s.esitPay).toBeNull();
    expect(s.gruplar[0].alinan).toBe(5);
    expect(s.dagitilan).toBe(500);
  });

  it('herkes çok isterse arz kişi sayısına bölünür', () => {
    const s = esitDagitim(1000, [{ kisi: 100, talep: 1000 }]);
    expect(s.esitPay).toBe(10);
    expect(s.taban).toBe(10);
    expect(s.fazlaAlanSayisi).toBe(0);
  });

  it('eşit payın altında isteyenler tam karşılanır, kalan diğerlerine bölünür', () => {
    // 1. tur: 1000/100 = 10 → 2 lot isteyen 50 kişi karşılanır (100 lot)
    // 2. tur: 900/50 = 18
    const s = esitDagitim(1000, [
      { kisi: 50, talep: 2 },
      { kisi: 50, talep: 100 },
    ]);
    expect(s.gruplar.find((g) => g.talep === 2)?.tamKarsilandi).toBe(true);
    expect(s.esitPay).toBe(18);
    expect(s.taban).toBe(18);
  });

  it('dağıtım turları zincirleme devam eder', () => {
    // 1. tur pay 10 → 9 isteyenler (450) karşılanır; 2. tur 550/50 = 11 → 11 isteyenler (110) karşılanır;
    // kalan 440 lot 40 kişiye: 11'er lot
    const s = esitDagitim(1000, [
      { kisi: 50, talep: 9 },
      { kisi: 10, talep: 11 },
      { kisi: 40, talep: 1000 },
    ]);
    expect(s.gruplar.filter((g) => g.tamKarsilandi)).toHaveLength(2);
    expect(s.karsilanamayanSayisi).toBe(40);
    expect(s.esitPay).toBe(11);
  });

  it('küsurat: bir kısmı tabanı, bir kısmı 1 lot fazlasını alır (md. 20/2-ç)', () => {
    const s = esitDagitim(100, [{ kisi: 30, talep: 50 }]);
    expect(s.esitPay).toBeCloseTo(3.3333, 4);
    expect(s.taban).toBe(3);
    expect(s.fazlaAlanSayisi).toBe(10);
    // korunum: 20 kişi 3 lot + 10 kişi 4 lot = 100
    expect(s.taban! * (s.karsilanamayanSayisi - s.fazlaAlanSayisi) + (s.taban! + 1) * s.fazlaAlanSayisi).toBe(100);
  });

  it('eşit paydan fazla katılımcı varsa bir kısmı hiç alamaz (taban 0)', () => {
    const s = esitDagitim(10, [{ kisi: 25, talep: 5 }]);
    expect(s.taban).toBe(0);
    expect(s.fazlaAlanSayisi).toBe(10);
    expect(benimLotum(s, 5)).toEqual({ enAz: 0, enCok: 1, tamKarsilandi: false });
  });
});

describe('benim lotum', () => {
  it('payın altındaki talep tam karşılanır', () => {
    const s = esitDagitim(1000, [
      { kisi: 99, talep: 1000 },
      { kisi: 1, talep: 2 },
    ]);
    expect(benimLotum(s, 2)).toEqual({ enAz: 2, enCok: 2, tamKarsilandi: true });
  });

  it('küsuratlı payda en az / en çok', () => {
    const s = esitDagitim(100, [{ kisi: 30, talep: 50 }]);
    expect(benimLotum(s, 50)).toEqual({ enAz: 3, enCok: 4, tamKarsilandi: false });
  });
});

describe('oransal dağıtım (md. 20/3)', () => {
  it('arz / toplam talep oranında karşılanır', () => {
    const o = oransalDagitim(1000, 4000, 100);
    expect(o.karsilamaOrani).toBe(0.25);
    expect(o.pay).toBe(25);
  });
  it('talep arzdan azsa oran 1’dir', () => {
    expect(oransalDagitim(1000, 500, 100).karsilamaOrani).toBe(1);
  });
});

describe('senaryolar', () => {
  it('12.550.000 lot, 518.652 katılımcı → kişi başı 24 ya da 25 lot', () => {
    const [s] = senaryolar(12_550_000, [518_652], 1000);
    expect(s.enAz).toBe(24);
    expect(s.enCok).toBe(25);
  });
  it('az talep edenin sonucu katılımcı sayısından etkilenmez', () => {
    const list = senaryolar(1_000_000, [10_000, 100_000], 5);
    expect(list.every((s) => s.enAz === 5)).toBe(true);
  });
});

describe('doğrulama', () => {
  it('eksik ve geçersiz girdiler', () => {
    const e = validateHalkaArz({ lot: null, fiyat: 0, katilimci: 1.5, talep: null });
    expect(Object.keys(e).sort()).toEqual(['fiyat', 'katilimci', 'lot', 'talep']);
    expect(validateHalkaArz({ lot: 1000, fiyat: 20, katilimci: 50, talep: 10 })).toEqual({});
  });
});
