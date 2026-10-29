import { describe, expect, it } from 'vitest';
import { asgariOdemeDonemiOn, kartFaizDilimi, kartFaizDonemiOn } from '../../data/params/kredi';
import { asgariTutar, donemOranlari, gerekenSabitOdeme, simuleEt, validateKart, type OranAyari } from './calc';

const donem = kartFaizDonemiOn('2026-11-15');
const azami: OranAyari = { mod: 'azami', donem, borcTuru: 'alisveris', kurumsal: false };
const temel = { asgariOran: 20, oran: azami, kkdf: 15, bsmv: 15 };

describe('TCMB azami faiz dilimleri (1/11/2026)', () => {
  // Kaynak: TCMB "Kredi Kartı İşlemlerinde Uygulanacak Azami Faiz Oranları" tablosu
  it('dönem borcuna göre: 30.000 TL altı %3,25 · 30.000–180.000 TL %3,75 · 180.000 TL üzeri %4,25', () => {
    expect(kartFaizDilimi(29_999.99, donem).akdi).toBe(3.25);
    expect(kartFaizDilimi(30_000, donem).akdi).toBe(3.75);
    expect(kartFaizDilimi(180_000, donem).akdi).toBe(3.75);
    expect(kartFaizDilimi(180_000.01, donem)).toMatchObject({ akdi: 4.25, gecikme: 4.55 });
    expect(kartFaizDilimi(5_000, donem, true).akdi).toBe(4.25); // kurumsal kart
  });

  it('nakit çekimde dilim yok: %4,25 / %4,55', () => {
    expect(donemOranlari(5_000, { ...azami, borcTuru: 'nakit' })).toEqual({ akdi: 4.25, gecikme: 4.55 });
    expect(donemOranlari(10_000, azami)).toEqual({ akdi: 3.25, gecikme: 3.55 });
  });
});

describe('asgari ödeme oranı (BDDK)', () => {
  it('01.10.2026’dan itibaren limit 100.000 TL ve altı %20, üzeri %40 (11581)', () => {
    const d = asgariOdemeDonemiOn('2026-10-29');
    expect(asgariTutar(10_000, 100_000, d)).toBe(2000);
    expect(asgariTutar(10_000, 100_000.01, d)).toBe(4000);
  });

  it('Eylül 2026’da eşik 50.000 TL idi (10970)', () => {
    const d = asgariOdemeDonemiOn('2026-09-15');
    expect(asgariTutar(10_000, 80_000, d)).toBe(4000);
  });
});

describe('ekstre simülasyonu', () => {
  it('tam ödeme: faiz yok, tek ay', () => {
    const s = simuleEt({ ...temel, borc: 25_000, strateji: { tur: 'tam' } });
    expect(s).toMatchObject({ ay: 1, toplamOdeme: 25_000, toplamMaliyet: 0, bitmedi: false });
  });

  it('asgari ödenen ay: kalan 8.000 TL’ye %3,25 akdi faiz + %15 KKDF + %15 BSMV', () => {
    // 10.000 borç, asgari 2.000 → kalan 8.000; faiz 260; KKDF 39; BSMV 39 → sonraki borç 8.338
    const s = simuleEt({ ...temel, borc: 10_000, strateji: { tur: 'asgari' }, azamiAy: 1 });
    expect(s.satirlar[0]).toMatchObject({ asgari: 2000, odeme: 2000, kalan: 8000, akdiFaiz: 260, gecikmeFaizi: 0, kkdf: 39, bsmv: 39, sonraki: 8338 });
  });

  it('asgarinin altında ödeme: ödenmeyen asgari kısmına gecikme faizi', () => {
    // Asgari 2.000, ödeme 1.000 → 1.000 TL’ye %3,55 gecikme (35,50); kalan 8.000’e %3,25 akdi (260)
    // Faiz 295,50; KKDF = BSMV = 44,33 → sonraki 9.000 + 295,50 + 88,66 = 9.384,16
    const s = simuleEt({ ...temel, borc: 10_000, strateji: { tur: 'sabit', tutar: 1000 }, azamiAy: 1 });
    expect(s.satirlar[0]).toMatchObject({ gecikmeFaizi: 35.5, akdiFaiz: 260, kkdf: 44.33, bsmv: 44.33, sonraki: 9384.16, asgariAlti: true });
  });

  it('yalnızca asgari ödeme: borç azalarak biter, toplam ödeme borçtan fazladır', () => {
    const s = simuleEt({ ...temel, borc: 20_000, strateji: { tur: 'asgari' } });
    expect(s.bitmedi).toBe(false);
    expect(s.ay).toBeGreaterThan(12);
    expect(s.toplamOdeme).toBeCloseTo(20_000 + s.toplamMaliyet, 2);
    expect(s.satirlar[s.ay - 1].sonraki).toBe(0);
    for (let i = 1; i < s.satirlar.length; i++) expect(s.satirlar[i].donemBorcu).toBeLessThan(s.satirlar[i - 1].donemBorcu);
  });

  it('borç azaldıkça faiz dilimi düşer: 40.000 TL’de %3,75, 30.000 TL altında %3,25', () => {
    const s = simuleEt({ ...temel, borc: 40_000, strateji: { tur: 'asgari' } });
    expect(s.satirlar[0].akdiOran).toBe(3.75);
    const alt = s.satirlar.find((x) => x.donemBorcu < 30_000)!;
    expect(alt.akdiOran).toBe(3.25);
  });

  it('sabit ödeme asgari ödemeden hızlı ve ucuz kapatır', () => {
    const asg = simuleEt({ ...temel, borc: 20_000, strateji: { tur: 'asgari' } });
    const sabit = simuleEt({ ...temel, borc: 20_000, strateji: { tur: 'sabit', tutar: 5000 } });
    expect(sabit.ay).toBeLessThan(asg.ay);
    expect(sabit.toplamMaliyet).toBeLessThan(asg.toplamMaliyet);
    expect(sabit.asgariAltiAy).toBe(0);
  });

  it('ödeme faizi karşılamıyorsa borç bitmez', () => {
    const s = simuleEt({ ...temel, borc: 100_000, strateji: { tur: 'sabit', tutar: 1000 } });
    expect(s.bitmedi).toBe(true);
  });

  it('özel (banka) oranı ile hesap', () => {
    const s = simuleEt({ ...temel, oran: { ...azami, mod: 'ozel', ozelAkdi: 3, ozelGecikme: 3.3 }, borc: 10_000, strateji: { tur: 'asgari' }, azamiAy: 1 });
    expect(s.satirlar[0].akdiFaiz).toBe(240);
  });

  it('borcu n ayda bitirecek sabit ödeme', () => {
    const t = gerekenSabitOdeme({ ...temel, borc: 20_000 }, 6);
    const s = simuleEt({ ...temel, borc: 20_000, strateji: { tur: 'sabit', tutar: t } });
    expect(s.ay).toBeLessThanOrEqual(6);
    expect(simuleEt({ ...temel, borc: 20_000, strateji: { tur: 'sabit', tutar: t - 5 } }).ay).toBeGreaterThan(6);
  });
});

describe('doğrulama', () => {
  it('eksik/hatalı girdiler', () => {
    const ok = { borc: 10_000, limit: 50_000, kkdf: 15, bsmv: 15 };
    expect(validateKart(ok, false, false)).toEqual({});
    expect(validateKart({ ...ok, borc: null }, false, false)).toHaveProperty('borc');
    expect(validateKart({ ...ok, limit: 0 }, false, false)).toHaveProperty('limit');
    expect(validateKart({ ...ok, ozelAkdi: 25, ozelGecikme: 3 }, true, false)).toHaveProperty('akdi');
    expect(validateKart({ ...ok, sabit: null }, false, true)).toHaveProperty('sabit');
  });
});
