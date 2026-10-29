import { describe, expect, it } from 'vitest';
import { darphaneAltinlari, milyemOf } from '../../data/params/altin';
import {
  adetHasGram,
  birimFiyat,
  butceyeGore,
  hasGramOf,
  hesaplaDugunAltini,
  validateAdet,
  validateFiyat,
  validateTaki,
} from './calc';

// Darphane ve Damga Matbaası GM – "Sorularla Cumhuriyet Altını" (Soru 3) ve 2023 Faaliyet Raporu:
// ziynet çeyrek 1,754 / yarım 3,508 / birlik 7,016 / ikibuçukluk 17,540 / beşlik 35,080 g,
// sikke (Ata) çeyrek 1,804 / yarım 3,608 / birlik 7,216 / ikibuçukluk 18,040 / beşlik 36,080 g; hepsi 22 ayar (916,6).
describe('Darphane değerleri', () => {
  const agirlik = (id: string) => darphaneAltinlari.values.turler.find((t) => t.id === id)?.agirlik;

  it('ziynet altınlarının ağırlıkları', () => {
    expect(agirlik('ceyrek')).toBe(1.754);
    expect(agirlik('yarim')).toBe(3.508);
    expect(agirlik('tam')).toBe(7.016);
    expect(agirlik('gremse')).toBe(17.54);
    expect(agirlik('besli')).toBe(35.08);
  });

  it('Ata (sikke) altınlarının ağırlıkları; Ata lira 7,216 g', () => {
    expect(agirlik('ata')).toBe(7.216);
    expect(agirlik('ata-ceyrek')).toBe(1.804);
    expect(agirlik('ata-yarim')).toBe(3.608);
    expect(agirlik('ata-gremse')).toBe(18.04);
    expect(agirlik('ata-besli')).toBe(36.08);
  });

  it('milyem 916,6 ve tam ziynet = 4 çeyrek ağırlığı', () => {
    expect(darphaneAltinlari.values.milyem).toBe(916.6);
    expect(agirlik('tam')).toBeCloseTo(4 * (agirlik('ceyrek') as number), 10);
  });

  it('kimlikler benzersiz', () => {
    const ids = darphaneAltinlari.values.turler.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('has (saf) altın gramı', () => {
  it('çeyrek: 1,754 × 0,9166 = 1,6077164', () => {
    expect(adetHasGram('ceyrek')).toBeCloseTo(1.6077164, 7);
  });

  it('tam ziynet 6,4309 g; Ata lira 6,6142 g (ağırlığı fazla olduğu için)', () => {
    expect(adetHasGram('tam')).toBeCloseTo(6.4308656, 7);
    expect(adetHasGram('ata')).toBeCloseTo(6.6141856, 7);
    expect(adetHasGram('ata')).toBeGreaterThan(adetHasGram('tam'));
  });

  it('gremse (2,5’luk): 17,54 × 0,9166', () => {
    expect(adetHasGram('gremse')).toBeCloseTo(16.077164, 6);
  });

  it('bilezik: 20 g × 916 / 1000 = 18,32 g; 24 ayar tam saf', () => {
    expect(hasGramOf(20, milyemOf('22') as number)).toBeCloseTo(18.32, 10);
    expect(hasGramOf(100, milyemOf('24') as number)).toBe(100);
  });
});

describe('düğün altını toplamı', () => {
  // Senaryo: 4 çeyrek + 2 tam + 20 g 22 ayar bilezik. Has gram fiyatı: alış 3.000, satış 3.100 TL.
  // Has gram: 4 × 1,6077164 = 6,4308656; 2 × 6,4308656 = 12,8617312; 20 × 0,916 = 18,32.
  // Alış: 19.292,5968 → 19.292,60; 38.585,1936 → 38.585,19; 54.960,00  → toplam 112.837,79
  // Satış: 19.935,68336 → 19.935,68; 39.871,36672 → 39.871,37; 56.792,00 → toplam 116.599,05
  const girdi = {
    ziynet: [
      { id: 'ceyrek' as const, adet: 4 },
      { id: 'tam' as const, adet: 2 },
    ],
    takilar: [{ gram: 20, milyem: 916, ayar: 22 }],
    has: { alis: 3000, satis: 3100 },
  };

  it('has gram, brüt gram ve tür bazında döküm', () => {
    const r = hesaplaDugunAltini(girdi);
    expect(r.kalemler).toHaveLength(3);
    expect(r.brutGram).toBeCloseTo(41.048, 6);
    expect(r.hasGram).toBeCloseTo(37.6126, 4);
    expect(r.kalemler[0]).toMatchObject({ anahtar: 'ceyrek', adet: 4, hasGram: 6.4309, alis: 19292.6, satis: 19935.68 });
    expect(r.kalemler[1]).toMatchObject({ anahtar: 'tam', adet: 2, alis: 38585.19, satis: 39871.37 });
    expect(r.kalemler[2]).toMatchObject({ hasGram: 18.32, alis: 54960, satis: 56792 });
  });

  it('alış ve satış toplamı, kalem toplamlarının toplamıdır', () => {
    const r = hesaplaDugunAltini(girdi);
    expect(r.alisToplam).toBe(112837.79);
    expect(r.satisToplam).toBe(116599.05);
  });

  it('alış–satış farkı (makas) ve satışa oranı', () => {
    const r = hesaplaDugunAltini(girdi);
    expect(r.makas).toBe(3761.26);
    expect(r.makasOrani).toBeCloseTo(3.23, 1);
  });

  it('adedi 0 olan ve gramı 0 olan satırlar döküme girmez', () => {
    const r = hesaplaDugunAltini({
      ziynet: [{ id: 'yarim', adet: 0 }],
      takilar: [{ gram: 0, milyem: 750, ayar: 18 }],
      has: { alis: 3000, satis: 3100 },
    });
    expect(r.kalemler).toHaveLength(0);
    expect(r.brutGram).toBe(0);
    expect(r.alisToplam).toBeNull();
  });

  it('24 ayar gram altın: has gram = brüt gram', () => {
    const r = hesaplaDugunAltini({ ziynet: [], takilar: [{ gram: 100, milyem: 1000, ayar: 24 }], has: { alis: 3000, satis: null } });
    expect(r.hasGram).toBe(100);
    expect(r.alisToplam).toBe(300000);
    expect(r.satisToplam).toBeNull();
    expect(r.makas).toBeNull();
  });
});

describe('ürün bazında kullanıcı fiyatı', () => {
  it('çeyrek için girilen adet fiyatı, has fiyatından türetileni geçersiz kılar', () => {
    const r = hesaplaDugunAltini({
      ziynet: [
        { id: 'ceyrek', adet: 2 },
        { id: 'yarim', adet: 1 },
      ],
      takilar: [],
      has: { alis: 3000, satis: 3100 },
      urunFiyatlari: { ceyrek: { alis: 4900, satis: 5100 } },
    });
    expect(r.kalemler[0]).toMatchObject({ alis: 9800, satis: 10200, ozelFiyat: true });
    // yarım altın has fiyatından: 3,2154328 × 3.000 = 9.646,2984 → 9.646,30
    expect(r.kalemler[1]).toMatchObject({ alis: 9646.3, ozelFiyat: false });
  });

  it('yalnızca alış girilirse satış has fiyatından türetilir', () => {
    const r = hesaplaDugunAltini({
      ziynet: [{ id: 'ceyrek', adet: 1 }],
      takilar: [],
      has: { alis: 3000, satis: 3100 },
      urunFiyatlari: { ceyrek: { alis: 4900, satis: null } },
    });
    expect(r.kalemler[0].alis).toBe(4900);
    expect(r.kalemler[0].satis).toBe(4983.92);
  });

  it('has fiyatı yokken ürün fiyatı tek başına yeter, diğer kalemler değersiz kalır', () => {
    const r = hesaplaDugunAltini({
      ziynet: [{ id: 'ceyrek', adet: 3 }],
      takilar: [{ gram: 10, milyem: 750, ayar: 18 }],
      has: { alis: null, satis: null },
      urunFiyatlari: { ceyrek: { alis: 5000, satis: 5200 } },
    });
    expect(r.kalemler[0].alis).toBe(15000);
    expect(r.kalemler[1].alis).toBeNull();
    expect(r.alisToplam).toBeNull();
  });

  it('22 ayar bilezik gram fiyatı yalnızca 22 ayar satırlara uygulanır', () => {
    const r = hesaplaDugunAltini({
      ziynet: [],
      takilar: [
        { gram: 10, milyem: 916, ayar: 22 },
        { gram: 10, milyem: 750, ayar: 18 },
      ],
      has: { alis: 3000, satis: 3100 },
      bilezik22: { alis: 2700, satis: 2900 },
    });
    expect(r.kalemler[0]).toMatchObject({ alis: 27000, satis: 29000, ozelFiyat: true });
    // 18 ayar: 10 × 0,75 × 3.000 = 22.500
    expect(r.kalemler[1]).toMatchObject({ alis: 22500, satis: 23250, ozelFiyat: false });
  });
});

describe('birim fiyat ve bütçeye göre adet', () => {
  const fiyatlar = { has: { alis: 3000, satis: 3100 } };

  it('1 çeyrek = 4.823,15 alış / 4.983,92 satış', () => {
    // 1,6077164 × 3.000 = 4.823,1492 ; × 3.100 = 4.983,92084
    expect(birimFiyat('ceyrek', fiyatlar)).toEqual({ alis: 4823.15, satis: 4983.92 });
  });

  it('20.000 TL bütçe: 4 çeyrek, 2 yarım ya da 1 tam; her birinde 64,32 TL artar', () => {
    const r = butceyeGore(20000, fiyatlar, ['ceyrek', 'yarim', 'tam']);
    expect(r.map((x) => x.adet)).toEqual([4, 2, 1]);
    expect(r.map((x) => x.kalan)).toEqual([64.32, 64.32, 64.32]);
  });

  it('bütçe sıfırsa adet 0; satış fiyatı olmayan tür atlanır', () => {
    expect(butceyeGore(0, fiyatlar, ['ceyrek'])[0].adet).toBe(0);
    expect(butceyeGore(10000, { has: { alis: 3000, satis: null } }, ['ceyrek'])).toEqual([]);
  });
});

describe('doğrulama', () => {
  it('fiyat: en az biri girilmeli, sıfır ve negatif olamaz', () => {
    expect(validateFiyat({ alis: null, satis: null })).toHaveProperty('fiyat');
    expect(validateFiyat({ alis: 0, satis: 3100 })).toHaveProperty('hasAlis');
    expect(validateFiyat({ alis: 3000, satis: -1 })).toHaveProperty('hasSatis');
    expect(validateFiyat({ alis: 3000, satis: null })).toEqual({});
    expect(validateFiyat({ alis: null, satis: 3100 })).toEqual({});
  });

  it('adet: boş 0 sayılır, ondalıklı ve negatif olamaz', () => {
    expect(validateAdet(null)).toBeUndefined();
    expect(validateAdet(3)).toBeUndefined();
    expect(validateAdet(-1)).toBeDefined();
    expect(validateAdet(1.5)).toBeDefined();
    expect(validateAdet(1_000_000)).toBeDefined();
  });

  it('takı: gram ve milyem', () => {
    expect(validateTaki(null, 916)).toHaveProperty('gram');
    expect(validateTaki(10, 0)).toHaveProperty('milyem');
    expect(validateTaki(10, 1001)).toHaveProperty('milyem');
    expect(validateTaki(10, 916)).toEqual({});
  });
});
