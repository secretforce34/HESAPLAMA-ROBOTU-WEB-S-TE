import { describe, expect, it } from 'vitest';
import { dilimliVergi } from '../../data/params/veraset';
import { bagisVergisi, deger, kesirMetni, verasetHesapla, yasalPaylar, type Aile } from './calc';

const bos: Aile = { es: false, cocuklar: [], anne: false, baba: false, kardes: 0, zumre3: false };
const sag = { sag: true, torunSayisi: 0 };
const paylar = (a: Aile) => yasalPaylar(a).mirascilar.map((m) => [m.ad, kesirMetni(m.yasal), m.sakli ? kesirMetni(m.sakli) : null]);

describe('yasal miras payları (TMK 495–499)', () => {
  it('eş + 2 çocuk: eş 1/4, çocuklar 3/8; saklı paylar ve tasarruf nisabı', () => {
    const p = yasalPaylar({ ...bos, es: true, cocuklar: [sag, sag] });
    expect(paylar({ ...bos, es: true, cocuklar: [sag, sag] })).toEqual([
      ['Eş', '1/4', '1/4'],
      ['1. çocuk', '3/8', '3/16'],
      ['2. çocuk', '3/8', '3/16'],
    ]);
    expect(kesirMetni(p.tasarrufNisabi)).toBe('3/8');
  });

  it('ölen çocuğun payı torunlarına geçer (halefiyet)', () => {
    expect(paylar({ ...bos, es: true, cocuklar: [sag, { sag: false, torunSayisi: 2 }] })).toEqual([
      ['Eş', '1/4', '1/4'],
      ['1. çocuk', '3/8', '3/16'],
      ['2. çocuğun 1. çocuğu (torun)', '3/16', '3/32'],
      ['2. çocuğun 2. çocuğu (torun)', '3/16', '3/32'],
    ]);
  });

  it('çocuğu olmadan ölen çocuk mirasçı olmaz', () => {
    expect(paylar({ ...bos, cocuklar: [sag, { sag: false, torunSayisi: 0 }] })).toEqual([['1. çocuk', 'Tamamı', '1/2']]);
  });

  it('eşsiz 3 çocuk: her biri 1/3, tasarruf nisabı 1/2', () => {
    const p = yasalPaylar({ ...bos, cocuklar: [sag, sag, sag] });
    expect(p.mirascilar.map((m) => kesirMetni(m.yasal))).toEqual(['1/3', '1/3', '1/3']);
    expect(kesirMetni(p.tasarrufNisabi)).toBe('1/2');
  });

  it('eş + anne + baba: eş 1/2, anne ve baba 1/4; ana-baba saklı payı yasal payın 1/4’ü', () => {
    const p = yasalPaylar({ ...bos, es: true, anne: true, baba: true });
    expect(paylar({ ...bos, es: true, anne: true, baba: true })).toEqual([
      ['Eş', '1/2', '1/2'],
      ['Anne', '1/4', '1/16'],
      ['Baba', '1/4', '1/16'],
    ]);
    expect(kesirMetni(p.tasarrufNisabi)).toBe('3/8');
  });

  it('ölen babanın payı kardeşlere; kardeşlerin saklı payı yok', () => {
    expect(paylar({ ...bos, es: true, anne: true, kardes: 2 })).toEqual([
      ['Eş', '1/2', '1/2'],
      ['Anne', '1/4', '1/16'],
      ['1. kardeş', '1/8', null],
      ['2. kardeş', '1/8', null],
    ]);
  });

  it('ölen ebeveynin altsoyu yoksa pay diğer ebeveyne geçer', () => {
    expect(paylar({ ...bos, es: true, anne: true })).toEqual([
      ['Eş', '1/2', '1/2'],
      ['Anne', '1/2', '1/8'],
    ]);
  });

  it('anne ve baba ölmüşse kardeşler eşit paylaşır', () => {
    expect(paylar({ ...bos, kardes: 2 }).map((x) => x[1])).toEqual(['1/2', '1/2']);
  });

  it('eş + büyükanne-büyükbaba zümresi: eş 3/4, saklı payı 3/4’ün 3/4’ü', () => {
    expect(paylar({ ...bos, es: true, zumre3: true })).toEqual([
      ['Eş', '3/4', '9/16'],
      ['Büyükanne-büyükbabalar ve onların altsoyu', '1/4', null],
    ]);
  });

  it('yalnız eş: tamamı; kimse yoksa Hazine', () => {
    expect(paylar({ ...bos, es: true })).toEqual([['Eş', 'Tamamı', '3/4']]);
    expect(paylar(bos)).toEqual([['Devlet (Hazine)', 'Tamamı', null]]);
  });

  it('paylar her durumda 1’e tamamlanır', () => {
    const durumlar: Aile[] = [
      { ...bos, es: true, cocuklar: [sag, { sag: false, torunSayisi: 3 }, sag] },
      { ...bos, baba: true, kardes: 3 },
      { ...bos, es: true, kardes: 5 },
      { ...bos, zumre3: true },
    ];
    for (const a of durumlar) expect(yasalPaylar(a).mirascilar.reduce((t, m) => t + deger(m.yasal), 0)).toBeCloseTo(1, 12);
  });
});

describe('veraset ve intikal vergisi 2026', () => {
  it('dilimli tarife', () => {
    expect(dilimliVergi(3_000_000, 'veraset')).toBeCloseTo(30_000, 6);
    expect(dilimliVergi(10_000_000, 'veraset')).toBeCloseTo(240_000, 6);
    expect(dilimliVergi(60_000_000, 'veraset')).toBeCloseTo(3_590_000, 6);
    expect(dilimliVergi(3_000_000, 'ivazsiz')).toBeCloseTo(300_000, 6);
  });

  it('eş ve çocuklara 2.907.136 TL istisna, vergi pay üzerinden ayrı ayrı', () => {
    const r = verasetHesapla(10_000_000, yasalPaylar({ ...bos, es: true, cocuklar: [sag, sag] }));
    expect(r[0].tutar).toBe(2_500_000);
    expect(r[0].vergi).toBe(0);
    expect(r[1].tutar).toBe(3_750_000);
    expect(r[1].matrah).toBe(842_864);
    expect(r[1].vergi).toBe(8_428.64);
    expect(r[1].sakliTutar).toBe(1_875_000);
  });

  it('altsoy yoksa eşin istisnası 5.817.845 TL; anne-babaya istisna yok', () => {
    const r = verasetHesapla(8_000_000, yasalPaylar({ ...bos, es: true, anne: true, baba: true }));
    expect(r[0].istisna).toBe(5_817_845);
    expect(r[1].istisna).toBe(0);
    expect(r[1].vergi).toBe(20_000);
  });

  it('bağışta 66.935 TL istisna ve ivazsız tarife', () => {
    const b = bagisVergisi(1_000_000);
    expect(b.matrah).toBe(933_065);
    expect(b.vergi).toBe(93_306.5);
    expect(bagisVergisi(50_000).vergi).toBe(0);
  });
});
