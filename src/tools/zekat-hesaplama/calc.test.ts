import { describe, expect, it } from 'vitest';
import { fitreFidye, zekatNisap } from '../../data/params/diyanet';
import {
  fidyeTutari,
  fitreDonemiOn,
  fitreTutari,
  hesaplaZekat,
  kameriYilDurumu,
  validateVarlik,
  validateZekat,
  type ZekatInput,
} from './calc';

// Diyanet İşleri Başkanlığı, Zekât Sıkça Sorulanlar: nisap 20 miskal = 80,18 g altın; oran kırkta bir (%2,5);
// farklı ayardaki altınların toplam ağırlığı 80,18 grama ulaşırsa nisap oluşur (md. 10).
// Örneklerde altın fiyatı 4.000 TL/g alınmıştır (anlatım için; güncel fiyat değildir) → nisap değeri 80,18 × 4.000 = 320.720 TL.
const temel: ZekatInput = {
  varliklar: [],
  borclar: 0,
  temelIhtiyac: 0,
  altinFiyati: 4000,
  gumusFiyati: null,
  takiDahil: true,
};

describe('Diyanet ölçüleri', () => {
  it('nisap 80,18 g altın, 561 g gümüş, oran %2,5', () => {
    expect(zekatNisap.values.altinNisabiGram).toBe(80.18);
    expect(zekatNisap.values.gumusNisabiGram).toBe(561);
    expect(zekatNisap.values.oran).toBe(2.5);
  });
});

describe('nakit ve nisap eşiği', () => {
  it('500.000 TL nakit: nisap aşıldı, zekât 12.500 TL (3,125 g altın karşılığı)', () => {
    const r = hesaplaZekat({ ...temel, varliklar: [{ tur: 'nakit', tutar: 500000 }] });
    expect(r.altinNisabiDegeri).toBe(320720);
    expect(r.nisabaUlasti).toBe(true);
    expect(r.nisapNedeni).toBe('deger');
    expect(r.zekat).toBe(12500);
    expect(r.zekatAltinGram).toBe(3.125);
  });

  it('nisabın altında zekât yok', () => {
    const r = hesaplaZekat({ ...temel, varliklar: [{ tur: 'nakit', tutar: 300000 }] });
    expect(r.nisabaUlasti).toBe(false);
    expect(r.zekat).toBe(0);
    expect(r.zekatAltinGram).toBeNull();
  });

  it('tam nisapta zekât gerekir: 320.720 × %2,5 = 8.018', () => {
    const r = hesaplaZekat({ ...temel, varliklar: [{ tur: 'nakit', tutar: 320720 }] });
    expect(r.nisabaUlasti).toBe(true);
    expect(r.zekat).toBe(8018);
  });

  it('borç düşülür: 500.000 − 200.000 = 300.000 nisabın altında', () => {
    const r = hesaplaZekat({ ...temel, borclar: 200000, varliklar: [{ tur: 'nakit', tutar: 500000 }] });
    expect(r.netVarlik).toBe(300000);
    expect(r.nisabaUlasti).toBe(false);
  });

  it('temel ihtiyaç için ayrılan para düşülür', () => {
    const alti = hesaplaZekat({ ...temel, temelIhtiyac: 100000, varliklar: [{ tur: 'nakit', tutar: 400000 }] });
    expect(alti.nisabaUlasti).toBe(false);
    const ustu = hesaplaZekat({ ...temel, temelIhtiyac: 50000, varliklar: [{ tur: 'nakit', tutar: 400000 }] });
    expect(ustu.netVarlik).toBe(350000);
    expect(ustu.zekat).toBe(8750);
  });
});

describe('altın ve gümüş', () => {
  it('100 g 22 ayar (916): 91,6 g has × 4.000 = 366.400 TL → zekât 9.160', () => {
    const r = hesaplaZekat({ ...temel, varliklar: [{ tur: 'altin', gram: 100, milyem: 916 }] });
    expect(r.toplamVarlik).toBe(366400);
    expect(r.nisapNedeni).toBe('deger');
    expect(r.zekat).toBe(9160);
  });

  it('düşük ayarda ağırlık nisabı: 100 g 14 ayar değer olarak 233.200 TL, ama 80,18 g’ı geçtiği için nisap oluşur', () => {
    const r = hesaplaZekat({ ...temel, varliklar: [{ tur: 'altin', gram: 100, milyem: 583 }] });
    expect(r.toplamVarlik).toBe(233200);
    expect(r.nisapNedeni).toBe('altin-agirlik');
    expect(r.zekat).toBe(5830); // her ayar kendi değeri üzerinden: 233.200 × %2,5
  });

  it('borç varken ağırlık ölçüsü tek başına nisap sayılmaz, çelişki işaretlenir', () => {
    const r = hesaplaZekat({ ...temel, borclar: 1000, varliklar: [{ tur: 'altin', gram: 100, milyem: 583 }] });
    expect(r.nisabaUlasti).toBe(false);
    expect(r.agirlikDegerCelisiyor).toBe(true);
  });

  it('80 g 24 ayar altın nisabın altında (80,18 g’a ulaşmıyor)', () => {
    const r = hesaplaZekat({ ...temel, varliklar: [{ tur: 'altin', gram: 80, milyem: 1000 }] });
    expect(r.nisabaUlasti).toBe(false);
    expect(r.toplamVarlik).toBe(320000);
  });

  it('takı altın: görüş “dahil etme” ise hesaba girmez', () => {
    const v = [{ tur: 'altin' as const, gram: 100, milyem: 916, taki: true }];
    const dahil = hesaplaZekat({ ...temel, varliklar: v });
    const degil = hesaplaZekat({ ...temel, takiDahil: false, varliklar: v });
    expect(dahil.zekat).toBe(9160);
    expect(degil.toplamVarlik).toBe(0);
    expect(degil.kalemler[0].dahil).toBe(false);
    expect(degil.zekat).toBe(0);
  });

  it('561 g ve üzeri gümüş tek başına nisap oluşturur: 600 g × 50 TL = 30.000 → zekât 750', () => {
    const r = hesaplaZekat({ ...temel, gumusFiyati: 50, varliklar: [{ tur: 'gumus', gram: 600 }] });
    expect(r.gumusNisabiDegeri).toBe(28050);
    expect(r.nisapNedeni).toBe('gumus-agirlik');
    expect(r.zekat).toBe(750);
  });

  it('500 g gümüş nisabın altında', () => {
    const r = hesaplaZekat({ ...temel, gumusFiyati: 50, varliklar: [{ tur: 'gumus', gram: 500 }] });
    expect(r.nisabaUlasti).toBe(false);
  });
});

describe('karma varlıklar', () => {
  it('nakit + döviz + ticari mal + alacak + hisse birlikte', () => {
    // 100.000 + 1.000 × 40 + 200.000 + 50.000 + 30.000 = 420.000 → zekât 10.500
    const r = hesaplaZekat({
      ...temel,
      varliklar: [
        { tur: 'nakit', tutar: 100000 },
        { tur: 'doviz', miktar: 1000, kur: 40 },
        { tur: 'ticari-mal', tutar: 200000 },
        { tur: 'alacak', tutar: 50000 },
        { tur: 'hisse-ticaret', tutar: 30000 },
      ],
    });
    expect(r.toplamVarlik).toBe(420000);
    expect(r.zekat).toBe(10500);
  });

  it('kâr payı amaçlı hissede yalnızca girilen kâr payı sayılır', () => {
    const r = hesaplaZekat({ ...temel, varliklar: [{ tur: 'hisse-temettu', tutar: 12000 }, { tur: 'nakit', tutar: 310000 }] });
    expect(r.toplamVarlik).toBe(322000);
    expect(r.nisabaUlasti).toBe(true);
  });

  it('boş ya da sıfır satırlar yok sayılır; altın fiyatı yoksa nisap belirlenemez', () => {
    const r = hesaplaZekat({ ...temel, varliklar: [{ tur: 'nakit', tutar: null }, { tur: 'altin', gram: 0, milyem: 916 }] });
    expect(r.kalemler).toHaveLength(0);
    const f = hesaplaZekat({ ...temel, altinFiyati: null, varliklar: [{ tur: 'nakit', tutar: 900000 }] });
    expect(f.altinNisabiDegeri).toBeNull();
    expect(f.nisabaUlasti).toBe(false);
  });
});

describe('kamerî yıl', () => {
  it('2026-01-01 + 354 gün = 2026-12-21; 29 Ekim 2026’da 53 gün kalır', () => {
    const d = kameriYilDurumu('2026-01-01', '2026-10-29');
    expect(d.bitisIso).toBe('2026-12-21');
    expect(d.kalanGun).toBe(53);
    expect(d.tamamlandi).toBe(false);
  });

  it('bir yıl dolmuşsa tamamlandı', () => {
    const d = kameriYilDurumu('2025-01-01', '2026-10-29');
    expect(d.bitisIso).toBe('2025-12-21');
    expect(d.tamamlandi).toBe(true);
    expect(d.kalanGun).toBeLessThan(0);
  });
});

describe('fitre ve fidye', () => {
  // Din İşleri Yüksek Kurulu: 2026 Ramazanı – 2027 Ramazanı 240 TL; aynı tutar günlük oruç fidyesidir.
  it('2026 dönemi 240 TL; önceki dönemler 180 ve 130 TL', () => {
    expect(fitreDonemiOn('2026-10-29').tutar).toBe(240);
    expect(fitreDonemiOn('2026-02-19').tutar).toBe(240);
    expect(fitreDonemiOn('2026-02-18').tutar).toBe(180);
    expect(fitreDonemiOn('2024-06-01').tutar).toBe(130);
    expect(fitreFidye.values.donemler).toHaveLength(3);
  });

  it('dönem dışındaki tarihte en yakın dönem döner', () => {
    expect(fitreDonemiOn('2020-01-01').tutar).toBe(130);
    expect(fitreDonemiOn('2030-01-01').tutar).toBe(240);
  });

  it('4 kişilik fitre 960 TL; 30 günlük fidye 7.200 TL', () => {
    expect(fitreTutari(4, 240)).toBe(960);
    expect(fidyeTutari(30, 240)).toBe(7200);
    expect(fitreTutari(-1, 240)).toBe(0);
  });
});

describe('doğrulama', () => {
  const ok = { altinFiyati: 4000, gumusFiyati: null, borclar: 0, temelIhtiyac: 0, gumusVar: false };

  it('altın fiyatı zorunlu ve pozitif', () => {
    expect(validateZekat(ok)).toEqual({});
    expect(validateZekat({ ...ok, altinFiyati: null })).toHaveProperty('altinFiyati');
    expect(validateZekat({ ...ok, altinFiyati: 0 })).toHaveProperty('altinFiyati');
  });

  it('gümüş varsa gümüş fiyatı gerekir; borç ve ihtiyaç negatif olamaz', () => {
    expect(validateZekat({ ...ok, gumusVar: true })).toHaveProperty('gumusFiyati');
    expect(validateZekat({ ...ok, gumusVar: true, gumusFiyati: 50 })).toEqual({});
    expect(validateZekat({ ...ok, borclar: -1 })).toHaveProperty('borclar');
    expect(validateZekat({ ...ok, temelIhtiyac: -1 })).toHaveProperty('temelIhtiyac');
  });

  it('varlık satırı', () => {
    expect(validateVarlik({ tur: 'nakit', tutar: -5 })).toHaveProperty('tutar');
    expect(validateVarlik({ tur: 'nakit', tutar: null })).toEqual({});
    expect(validateVarlik({ tur: 'doviz', miktar: 10, kur: -1 })).toHaveProperty('kur');
    expect(validateVarlik({ tur: 'altin', gram: 10, milyem: null })).toHaveProperty('milyem');
    expect(validateVarlik({ tur: 'altin', gram: 10, milyem: 916 })).toEqual({});
    expect(validateVarlik({ tur: 'gumus', gram: -1 })).toHaveProperty('gram');
  });
});
