import { describe, expect, it } from 'vitest';
import {
  aylikFaizOrani,
  hesaplaKredi,
  masrafAkisi,
  odemePlani,
  tahsisUcretiSiniri,
  teklifleriKarsilastir,
  tersHesap,
  validateAraOdemeler,
  validateKredi,
  yasalSinirUygula,
} from './calc';

describe('ödeme planı', () => {
  it('vergisiz: 100.000 TL, aylık %3, 12 ay → taksit 10.046,21 TL', () => {
    // 100000 × 0,03 / (1 − 1,03^−12) = 10.046,2085…
    const p = odemePlani({ anapara: 100_000, vade: 12, aylikFaiz: 3, kkdf: 0, bsmv: 0 });
    expect(p.taksit).toBe(10046.21);
    expect(p.satirlar).toHaveLength(12);
    expect(p.satirlar[11].kalan).toBe(0);
    // Anapara kalemlerinin toplamı krediye eşit
    expect(p.satirlar.reduce((t, s) => t + s.anapara, 0)).toBeCloseTo(100_000, 6);
    expect(p.toplamFaiz).toBe(20554.5);
  });

  it('KKDF %15 + BSMV %15: taksit vergiler dahil oranla (3 × 1,30 = %3,9) bulunur', () => {
    // 100000 × 0,039 / (1 − 1,039^−12) = 10.593,48
    const p = odemePlani({ anapara: 100_000, vade: 12, aylikFaiz: 3, kkdf: 15, bsmv: 15 });
    expect(p.taksit).toBe(10593.48);
    // 1. ay: faiz 100.000 × %3 = 3.000; KKDF = BSMV = 3.000 × %15 = 450; anapara = 10.593,48 − 3.900
    expect(p.satirlar[0]).toMatchObject({ faiz: 3000, kkdf: 450, bsmv: 450, anapara: 6693.48, kalan: 93306.52 });
    expect(p.satirlar[11].kalan).toBe(0);
    expect(p.vergiDahilAylikOran).toBeCloseTo(0.039, 12);
    // Vergiler faizin %15'i kadar (aylık kuruş yuvarlamasıyla)
    expect(p.toplamKkdf).toBeCloseTo(p.toplamFaiz * 0.15, 0);
    expect(p.toplamOdeme).toBe(127121.8);
  });

  it('konut kredisinde vergi yok: taksit vergisiz annüiteye eşit', () => {
    const p = odemePlani({ anapara: 2_000_000, vade: 120, aylikFaiz: 2.5, kkdf: 0, bsmv: 0 });
    // 2.000.000 × 0,025 / (1 − 1,025^−120) = 52.035,90…
    expect(p.taksit).toBeCloseTo(2_000_000 * 0.025 / (1 - Math.pow(1.025, -120)), 1);
    expect(p.toplamKkdf + p.toplamBsmv).toBe(0);
    expect(p.satirlar[119].kalan).toBe(0);
  });

  it('faizsiz kredi eşit bölünür', () => {
    const p = odemePlani({ anapara: 12_000, vade: 12, aylikFaiz: 0, kkdf: 15, bsmv: 15 });
    expect(p.taksit).toBe(1000);
    expect(p.toplamFaiz).toBe(0);
    expect(p.toplamOdeme).toBe(12_000);
  });

  it('3 ay ödemesiz dönem: faiz borca eklenir, taksitler yeni borçtan hesaplanır', () => {
    // 100.000 × 1,03³ = 109.272,70 → 12 ay, %3: 109.272,70 × 0,03 / (1 − 1,03^−12) = 10.977,76
    const p = odemePlani({ anapara: 100_000, vade: 12, aylikFaiz: 3, kkdf: 0, bsmv: 0, odemesizAy: 3 });
    expect(p.odemesizdeEklenen).toBe(9272.7);
    expect(p.satirlar[2]).toMatchObject({ taksitNo: null, odeme: 0, kalan: 109272.7 });
    expect(p.taksit).toBe(10977.76);
    expect(p.satirlar).toHaveLength(15);
    expect(p.satirlar[14].kalan).toBe(0);
  });

  it('ara ödeme (6. ayda 20.000 TL) taksiti düşürür ve borç vade sonunda kapanır', () => {
    const duz = odemePlani({ anapara: 100_000, vade: 12, aylikFaiz: 3, kkdf: 15, bsmv: 15 });
    const ara = odemePlani({ anapara: 100_000, vade: 12, aylikFaiz: 3, kkdf: 15, bsmv: 15, araOdemeler: [{ ay: 6, tutar: 20_000 }] });
    expect(ara.taksit).toBeLessThan(duz.taksit);
    expect(ara.satirlar[5].odeme).toBe(ara.taksit + 20_000);
    expect(ara.satirlar[11].kalan).toBe(0);
    // Bugünkü değer eşitliği: 20.000 / 1,039^6 kadar borç peşin karşılanmış gibi
    const beklenen = ((100_000 - 20_000 / Math.pow(1.039, 6)) * 0.039) / (1 - Math.pow(1.039, -12));
    expect(ara.taksit).toBeCloseTo(beklenen, 2);
  });
});

describe('masraflar ve yıllık maliyet oranı', () => {
  it('masrafsız ve vergisiz kredide yıllık maliyet oranı = (1 + aylık faiz)^12 − 1', () => {
    const s = hesaplaKredi({ anapara: 100_000, vade: 12, aylikFaiz: 3, kkdf: 0, bsmv: 0, masraflar: [] });
    expect(s.ymoAylik!).toBeCloseTo(0.03, 5);
    // 1,03^12 − 1 = %42,58
    expect(s.ymoYillik!).toBeCloseTo(0.42576, 4);
    expect(s.yillikNominal).toBe(36);
  });

  it('vergiler maliyet oranına girer: aylık %3 + %30 vergi → aylık %3,9', () => {
    const s = hesaplaKredi({ anapara: 100_000, vade: 12, aylikFaiz: 3, kkdf: 15, bsmv: 15, masraflar: [] });
    expect(s.ymoAylik!).toBeCloseTo(0.039, 5);
    expect(s.ymoYillik!).toBeCloseTo(Math.pow(1.039, 12) - 1, 4);
  });

  it('peşin masraf (500 TL tahsis ücreti) maliyet oranını yükseltir ve toplam maliyete eklenir', () => {
    const s = hesaplaKredi({
      anapara: 100_000,
      vade: 12,
      aylikFaiz: 3,
      kkdf: 15,
      bsmv: 15,
      masraflar: [{ tur: 'tahsis', tutar: 500, zaman: 'pesin' }],
    });
    expect(s.ymoAylik!).toBeGreaterThan(0.039);
    expect(s.ymoAylik!).toBeCloseTo(0.03986, 4);
    // 20.862,94 faiz + 3.129,43 KKDF + 3.129,43 BSMV + 500 masraf
    expect(s.toplamMaliyet).toBe(27621.8);
    expect(s.masrafDahilToplamOdeme).toBe(127621.8);
  });

  it('masraf zamanlaması: aylık her ay, yıllık açılışta ve her 12 ayda; noter oranın dışında', () => {
    const m = masrafAkisi(
      [
        { tur: 'sigorta', tutar: 100, zaman: 'aylik' },
        { tur: 'sigorta', tutar: 1200, zaman: 'yillik' },
        { tur: 'noter', tutar: 300, zaman: 'pesin' },
      ],
      24,
    );
    expect(m.aylar[0]).toBe(1500); // 1.200 yıllık + 300 noter
    expect(m.aylar[1]).toBe(100);
    expect(m.aylar[12]).toBe(1300);
    expect(m.toplam).toBe(100 * 24 + 1200 * 2 + 300);
    expect(m.ymoDisi).toBe(300);
    expect(m.ymoAylar[0]).toBe(1200);
  });

  it('tahsis ücreti sınırı: anaparanın binde 5’i', () => {
    expect(tahsisUcretiSiniri(200_000)).toBe(1000);
    expect(tahsisUcretiSiniri(123_456)).toBe(617.28);
  });

  it('yıllık girilen faiz, sözleşme kuralıyla (÷12) aylığa çevrilir', () => {
    expect(aylikFaizOrani(29.88, 'yillik')).toBeCloseTo(2.49, 10);
    expect(aylikFaizOrani(3.1, 'aylik')).toBe(3.1);
  });
});

describe('BDDK sınırları', () => {
  it('ihtiyaç kredisi: 125.000 TL’ye kadar 36 ay, 250.000 TL’ye kadar 24 ay, üzeri 12 ay (13.02.2025/11152)', () => {
    expect(yasalSinirUygula({ tur: 'ihtiyac', tutar: 125_000, vade: 36 })).toMatchObject({ vade: 36, vadeKisildi: false });
    expect(yasalSinirUygula({ tur: 'ihtiyac', tutar: 125_000.01, vade: 36 })).toMatchObject({ vade: 24, vadeKisildi: true });
    const s = yasalSinirUygula({ tur: 'ihtiyac', tutar: 300_000, vade: 24 });
    expect(s.vade).toBe(12);
    expect(s.aciklamalar[0]).toContain('12 ay');
  });

  it('taşıt: 1.000.000 TL araçta en fazla %30 kredi ve 24 ay (21.02.2022/10099)', () => {
    const s = yasalSinirUygula({ tur: 'tasit', tutar: 800_000, vade: 48, deger: 1_000_000 });
    expect(s).toMatchObject({ tutar: 300_000, vade: 24, kdo: 30, tutarKisildi: true, vadeKisildi: true, krediYok: false });
    // Sınır: 400.000 TL tam → %70 ve 48 ay
    expect(yasalSinirUygula({ tur: 'tasit', tutar: 280_000, vade: 48, deger: 400_000 })).toMatchObject({ tutar: 280_000, vade: 48, tutarKisildi: false });
  });

  it('taşıt: 2.000.000 TL üzeri araca kredi yok; yerli elektrikli araçta sınır 7.500.000 TL', () => {
    expect(yasalSinirUygula({ tur: 'tasit', tutar: 500_000, vade: 12, deger: 2_100_000 }).krediYok).toBe(true);
    const ee = yasalSinirUygula({ tur: 'tasit', tutar: 1_400_000, vade: 48, deger: 2_100_000, yerliElektrikli: true });
    expect(ee).toMatchObject({ krediYok: false, tutar: 1_400_000, vade: 48, kdo: 70 });
  });

  it('konut: 6 milyon TL, C sınıfı %70; başka konutu olana %75 azaltılmış (%17,5)', () => {
    expect(yasalSinirUygula({ tur: 'konut', tutar: 5_000_000, vade: 120, deger: 6_000_000, enerjiSinifi: 'c' })).toMatchObject({ tutar: 4_200_000, kdo: 70 });
    const s = yasalSinirUygula({ tur: 'konut', tutar: 5_000_000, vade: 120, deger: 6_000_000, enerjiSinifi: 'c', baskaKonut: true });
    expect(s).toMatchObject({ tutar: 1_050_000, kdo: 17.5, vade: 120, vadeKisildi: false });
    // A-B sınıfı, 5 milyon TL'ye kadar %90
    expect(yasalSinirUygula({ tur: 'konut', tutar: 4_500_000, vade: 180, deger: 5_000_000, enerjiSinifi: 'ab' }).tutar).toBe(4_500_000);
  });

  it('cep telefonu: 40.000 TL üzeri 3 ay; yenilenmişte sınır 50.000 TL (01.10.2026/11582)', () => {
    expect(yasalSinirUygula({ tur: 'telefon', tutar: 45_000, vade: 12, deger: 45_000 }).vade).toBe(3);
    expect(yasalSinirUygula({ tur: 'telefon', tutar: 45_000, vade: 12, deger: 45_000, yenilenmisTelefon: true }).vade).toBe(12);
    expect(yasalSinirUygula({ tur: 'telefon', tutar: 40_000, vade: 12 }).vade).toBe(12);
  });

  it('ticari kredide tüketici sınırları uygulanmaz', () => {
    expect(yasalSinirUygula({ tur: 'ticari', tutar: 5_000_000, vade: 60 })).toMatchObject({ tutar: 5_000_000, vade: 60, aciklamalar: [] });
  });
});

describe('ters hesap (taksit → kredi tutarı)', () => {
  it('sınırsız: taksit × annüite çarpanı', () => {
    // 10.000 × (1 − 1,03^−12) / 0,03 = 99.540,04
    const r = tersHesap({ taksit: 10_000, vade: 12, aylikFaiz: 3, kkdf: 0, bsmv: 0, sinir: null });
    expect(r.tutar).toBeCloseTo(99540.04, 1);
    // Ters hesabın sonucu ileri hesapta aynı taksiti verir
    expect(odemePlani({ anapara: r.tutar, vade: 12, aylikFaiz: 3, kkdf: 0, bsmv: 0 }).taksit).toBeCloseTo(10_000, 1);
  });

  it('ihtiyaç kredisinde vade dilimleri: 36 ayda en fazla 125.000 TL, 24 ayda 154.042 TL → 24 ay seçilir', () => {
    const r = tersHesap({ taksit: 10_000, vade: 36, aylikFaiz: 3, kkdf: 15, bsmv: 15, sinir: { tur: 'ihtiyac' } });
    expect(r.sinirsizTutar).toBeCloseTo(191729.41, 1);
    expect(r.vade).toBe(24);
    expect(r.tutar).toBeCloseTo(154042.72, 1);
    expect(r.secenekler).toEqual([
      { vade: 36, tutar: 125_000, tutarSiniri: 125_000 },
      { vade: 24, tutar: r.tutar, tutarSiniri: 250_000 },
      { vade: 12, tutar: expect.any(Number), tutarSiniri: null },
    ]);
  });

  it('taşıt: araç değerinin kredi/değer oranı tavanı', () => {
    const r = tersHesap({ taksit: 50_000, vade: 48, aylikFaiz: 2, kkdf: 15, bsmv: 15, sinir: { tur: 'tasit', deger: 1_000_000 } });
    expect(r.tutar).toBe(300_000);
    expect(r.vade).toBe(24);
  });
});

describe('teklif karşılaştırma', () => {
  it('düşük faizli ama yüksek masraflı teklif daha pahalı çıkabilir', () => {
    const [a, b] = teklifleriKarsilastir(100_000, 15, 15, [
      { aylikFaiz: 3, vade: 12, pesinMasraf: 500, aylikMasraf: 0 },
      { aylikFaiz: 2.9, vade: 12, pesinMasraf: 3000, aylikMasraf: 0 },
    ]);
    expect(b.taksit).toBeLessThan(a.taksit);
    expect(b.toplamMaliyet).toBeGreaterThan(a.toplamMaliyet);
    expect(b.ymoYillik!).toBeGreaterThan(a.ymoYillik!);
  });
});

describe('doğrulama', () => {
  it('eksik ve hatalı girdiler', () => {
    const ok = { anapara: 100_000, vade: 12, aylikFaiz: 3, kkdf: 15, bsmv: 15 };
    expect(validateKredi(ok)).toEqual({});
    expect(validateKredi({ ...ok, anapara: null })).toHaveProperty('anapara');
    expect(validateKredi({ ...ok, anapara: -1 })).toHaveProperty('anapara');
    expect(validateKredi({ ...ok, vade: 12.5 })).toHaveProperty('vade');
    expect(validateKredi({ ...ok, vade: 0 })).toHaveProperty('vade');
    expect(validateKredi({ ...ok, aylikFaiz: 45 })).toHaveProperty('faiz');
    expect(validateKredi({ ...ok, kkdf: 120 })).toHaveProperty('kkdf');
    expect(validateKredi({ ...ok, odemesizAy: 30 })).toHaveProperty('odemesiz');
  });

  it('ara ödemeler borcu aşamaz ve vade içinde olmalı', () => {
    const plan = { anapara: 100_000, vade: 12, aylikFaiz: 3, kkdf: 0, bsmv: 0 };
    expect(validateAraOdemeler([{ ay: 6, tutar: 20_000 }], plan)).toBeNull();
    expect(validateAraOdemeler([{ ay: 13, tutar: 1000 }], plan)).toContain('1 ile 12');
    expect(validateAraOdemeler([{ ay: 1, tutar: 150_000 }], plan)).toContain('borcun tamamını');
  });
});
