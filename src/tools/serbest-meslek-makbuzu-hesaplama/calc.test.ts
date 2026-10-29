import { describe, expect, it } from 'vitest';
import {
  brutuKdvDahildenBul,
  brutuNettenBul,
  hesaplaMakbuz,
  hesaplaSmm,
  hesaplaTahsilattan,
  tevkifatDurumu,
  validateKalem,
  validateStopaj,
  type SmmAyar,
} from './calc';

const AYAR: SmmAyar = { stopajOrani: 20, tevkifatPayi: 0, alici: 'mukellef', tevkifatSiniri: 12000 };

// Kaynak: GVK md. 94/2-b (genel serbest meslek stopajı %20) ve md. 94/2-a (GVK md. 18 kapsamı %17) – GİB kesinti oranları tablosu.
describe('brütten nete (stopaj + KDV)', () => {
  it('10.000 TL brüt, %20 stopaj, %20 KDV', () => {
    // stopaj 10.000 × 0,20 = 2.000 → net 8.000; KDV 2.000; tahsilat 8.000 + 2.000 = 10.000
    const r = hesaplaSmm({ ...AYAR, yon: 'brut', kalemler: [{ tutar: 10000, kdvOrani: 20 }] });
    expect(r.brut).toBe(10000);
    expect(r.stopaj).toBe(2000);
    expect(r.net).toBe(8000);
    expect(r.kdv).toBe(2000);
    expect(r.kdvDahil).toBe(12000);
    expect(r.tahsilat).toBe(10000);
    expect(r.musteriVergiOdemesi).toBe(2000);
  });

  it('GVK md. 18 kapsamındaki işte %17 stopaj: 5.000 TL brüt', () => {
    // stopaj 850 → net 4.150; KDV %20 = 1.000; tahsilat 4.150 + 1.000 = 5.150
    const r = hesaplaSmm({ ...AYAR, stopajOrani: 17, yon: 'brut', kalemler: [{ tutar: 5000, kdvOrani: 20 }] });
    expect(r.stopaj).toBe(850);
    expect(r.net).toBe(4150);
    expect(r.tahsilat).toBe(5150);
  });

  it('stopajsız mod (bireysel müşteri): tahsilat = brüt + KDV', () => {
    const r = hesaplaSmm({ ...AYAR, stopajOrani: 0, alici: 'tuketici', yon: 'brut', kalemler: [{ tutar: 2500, kdvOrani: 20 }] });
    expect(r.stopaj).toBe(0);
    expect(r.net).toBe(2500);
    expect(r.kdv).toBe(500);
    expect(r.tahsilat).toBe(3000);
  });

  it('KDV %0 (istisna) ve %10 oranları', () => {
    const sifir = hesaplaSmm({ ...AYAR, yon: 'brut', kalemler: [{ tutar: 1000, kdvOrani: 0 }] });
    expect(sifir.kdv).toBe(0);
    expect(sifir.tahsilat).toBe(800);
    const on = hesaplaSmm({ ...AYAR, yon: 'brut', kalemler: [{ tutar: 1000, kdvOrani: 10 }] });
    expect(on.kdv).toBe(100);
    expect(on.tahsilat).toBe(900);
  });

  it('kuruşlu tutarlar kuruşa yuvarlanır (1.234,56 TL)', () => {
    // stopaj 246,912 → 246,91; KDV 246,912 → 246,91; net 987,65; tahsilat 1.234,56
    const r = hesaplaSmm({ ...AYAR, yon: 'brut', kalemler: [{ tutar: 1234.56, kdvOrani: 20 }] });
    expect(r.stopaj).toBe(246.91);
    expect(r.net).toBe(987.65);
    expect(r.kdv).toBe(246.91);
    expect(r.tahsilat).toBe(1234.56);
  });

  it('çok kalemli makbuz: farklı KDV oranları, stopaj toplam brüt üzerinden', () => {
    const r = hesaplaSmm({
      ...AYAR,
      yon: 'brut',
      kalemler: [
        { tutar: 6000, kdvOrani: 20 }, // KDV 1.200
        { tutar: 4000, kdvOrani: 10 }, // KDV 400
      ],
    });
    expect(r.brut).toBe(10000);
    expect(r.stopaj).toBe(2000);
    expect(r.kdv).toBe(1600);
    expect(r.tahsilat).toBe(9600); // 8.000 + 1.600
  });
});

describe('netten brüte ("müşteriden ne isteyeyim?")', () => {
  it('8.000 TL net → 10.000 TL brüt (stopaj %20)', () => {
    expect(brutuNettenBul(8000, 20)).toBe(10000);
    const r = hesaplaSmm({ ...AYAR, yon: 'net', kalemler: [{ tutar: 8000, kdvOrani: 20 }] });
    expect(r.brut).toBe(10000);
    expect(r.net).toBe(8000);
    expect(r.tahsilat).toBe(10000);
  });

  it('%17 stopajda 4.150 TL net → 5.000 TL brüt', () => {
    expect(brutuNettenBul(4150, 17)).toBe(5000);
  });

  it('sonuç her zaman ileri hesapla birebir tutar (kuruş taraması)', () => {
    for (const net of [0.01, 1, 33.33, 999.99, 1234.57, 87654.32]) {
      for (const oran of [17, 20]) {
        const b = brutuNettenBul(net, oran);
        const r = hesaplaMakbuz([{ tutar: b, kdvOrani: 20 }], { ...AYAR, stopajOrani: oran });
        expect(r.net).toBe(net);
      }
    }
  });

  it('stopaj yoksa net = brüt', () => {
    expect(brutuNettenBul(1500, 0)).toBe(1500);
  });
});

describe('KDV dahil fiyattan brüte', () => {
  it('KDV dahil 12.000 TL (%20) → brüt 10.000 TL', () => {
    expect(brutuKdvDahildenBul(12000, 20)).toBe(10000);
    const r = hesaplaSmm({ ...AYAR, yon: 'kdvDahil', kalemler: [{ tutar: 12000, kdvOrani: 20 }] });
    expect(r.brut).toBe(10000);
    expect(r.kdv).toBe(2000);
    expect(r.kdvDahil).toBe(12000);
  });

  it('brüt + KDV her zaman girilen KDV dahil tutara tam eşit (KDV farktan bulunur)', () => {
    for (const g of [0.01, 1, 99.99, 100, 1234.56, 54321.09]) {
      for (const oran of [1, 10, 20]) {
        const r = hesaplaSmm({ ...AYAR, stopajOrani: 0, yon: 'kdvDahil', kalemler: [{ tutar: g, kdvOrani: oran }] });
        expect(r.kdvDahil).toBe(g);
      }
    }
  });

  it('100 TL KDV dahil (%20): brüt 83,33 + KDV 16,67', () => {
    const r = hesaplaSmm({ ...AYAR, yon: 'kdvDahil', kalemler: [{ tutar: 100, kdvOrani: 20 }] });
    expect(r.brut).toBe(83.33);
    expect(r.kdv).toBe(16.67);
  });
});

describe('tahsilattan geriye', () => {
  it('hesaba 10.000 TL yattı (stopaj %20, KDV %20) → brüt 10.000 TL', () => {
    const t = hesaplaTahsilattan(10000, 20, { ...AYAR, tevkifatSiniri: null });
    expect(t.adaylar).toEqual([10000]);
    expect(t.sonuc.brut).toBe(10000);
    expect(t.fark).toBe(0);
  });

  it('stopajsız: tahsilat 1.200 TL (%20 KDV dahil) → brüt 1.000 TL', () => {
    const t = hesaplaTahsilattan(1200, 20, { ...AYAR, stopajOrani: 0 });
    expect(t.sonuc.brut).toBe(1000);
  });

  it('9/10 tevkifatlı (kamu alıcı): 16.400 TL tahsilat → brüt 20.000 TL', () => {
    // tahsilat = 0,8 B + 0,2 B × (1 − 0,9) = 0,82 B → 16.400 / 0,82 = 20.000
    const ayar: SmmAyar = { stopajOrani: 20, tevkifatPayi: 9, alici: 'kamu', tevkifatSiniri: 12000 };
    const t = hesaplaTahsilattan(16400, 20, ayar);
    expect(t.adaylar).toEqual([20000]);
    expect(t.sonuc.uygulananTevkifat).toBe(9);
    expect(t.fark).toBe(0);
  });

  it('tevkifat sınırı yüzünden aynı tahsilatı veren iki brüt çıkabilir', () => {
    // Sınır altı (tevkifat yok): brüt = tahsilat = 9.000 (KDV dahil 10.800 ≤ 12.000)
    // Sınır üstü (9/10): brüt = 9.000 / 0,82 = 10.975,61 (KDV dahil 13.170,73 > 12.000)
    const ayar: SmmAyar = { stopajOrani: 20, tevkifatPayi: 9, alici: 'kamu', tevkifatSiniri: 12000 };
    const t = hesaplaTahsilattan(9000, 20, ayar);
    expect(t.adaylar).toEqual([9000, 10975.61]);
    expect(t.sonuc.uygulananTevkifat).toBe(0);
    const ust = hesaplaMakbuz([{ tutar: 10975.61, kdvOrani: 20 }], ayar);
    expect(ust.uygulananTevkifat).toBe(9);
    expect(ust.tahsilat).toBe(9000);
  });
});

describe('KDV tevkifatı: alıcı türü, oran ve tutar sınırı', () => {
  const kalem = (tutar: number) => [{ tutar, kdvOrani: 20 }];

  it('belirlenmiş alıcıya (kamu) 9/10 danışmanlık: 20.000 TL brüt', () => {
    // KDV 4.000; KDV dahil 24.000 > 12.000 → tevkifat 3.600; tahsil edilecek KDV 400
    // stopaj 4.000, net 16.000, tahsilat 16.000 + 400 = 16.400
    const r = hesaplaMakbuz(kalem(20000), { stopajOrani: 20, tevkifatPayi: 9, alici: 'kamu', tevkifatSiniri: 12000 });
    expect(r.uygulananTevkifat).toBe(9);
    expect(r.tevkifEdilenKdv).toBe(3600);
    expect(r.tahsilEdilecekKdv).toBe(400);
    expect(r.tahsilat).toBe(16400);
    expect(r.musteriVergiOdemesi).toBe(7600); // 4.000 stopaj + 3.600 tevkif edilen KDV
  });

  it('KDV mükellefi (belirlenmiş alıcı olmayan) şirket 9/10 kesmez', () => {
    const r = hesaplaMakbuz(kalem(20000), { stopajOrani: 20, tevkifatPayi: 9, alici: 'mukellef', tevkifatSiniri: 12000 });
    expect(r.uygulananTevkifat).toBe(0);
    expect(r.tevkifatDurumu).toMatchObject({ uygulanir: false, neden: 'alici-turu' });
    expect(r.tahsilat).toBe(20000);
  });

  it('KDV mükellefi olmayan müşteri tevkifat yapmaz', () => {
    const d = tevkifatDurumu(9, 'tuketici', 50000, 12000);
    expect(d).toMatchObject({ uygulanir: false, neden: 'tuketici' });
  });

  it('kısmi tevkifat tutar sınırı: tam 12.000 TL (KDV dahil) uygulanmaz, 12.000,01 TL uygulanır', () => {
    const esit = tevkifatDurumu(9, 'kamu', 12000, 12000);
    expect(esit).toMatchObject({ uygulanir: false, neden: 'tutar-siniri' });
    const asan = tevkifatDurumu(9, 'kamu', 12000.01, 12000);
    expect(asan).toEqual({ uygulanir: true, pay: 9 });
  });

  it('sınır kapatılınca küçük tutarda da tevkifat uygulanır', () => {
    const r = hesaplaMakbuz(kalem(1000), { stopajOrani: 20, tevkifatPayi: 9, alici: 'kamu', tevkifatSiniri: null });
    expect(r.tevkifEdilenKdv).toBe(180);
    expect(r.tahsilat).toBe(820); // net 800 + KDV 200 − 180
  });

  it('5/10 “diğer hizmetler” yalnızca kamu grubunda; borsa şirketi gibi diğer belirlenmiş alıcıda yok', () => {
    expect(tevkifatDurumu(5, 'kamu', 30000, 12000)).toEqual({ uygulanir: true, pay: 5 });
    expect(tevkifatDurumu(5, 'belirlenmis', 30000, 12000)).toMatchObject({ uygulanir: false, neden: 'alici-turu' });
  });

  it('3/10 ticari reklam KDV mükellefi alıcıda da uygulanır', () => {
    expect(tevkifatDurumu(3, 'mukellef', 15000, 12000)).toEqual({ uygulanir: true, pay: 3 });
    expect(tevkifatDurumu(3, 'tuketici', 15000, 12000)).toMatchObject({ uygulanir: false, neden: 'tuketici' });
  });

  it('4/10: belirlenmiş alıcıda her tutarda, KDV mükellefinde yalnızca KDV dahil 5 milyon TL ve üzerinde', () => {
    expect(tevkifatDurumu(4, 'belirlenmis', 20000, 12000)).toEqual({ uygulanir: true, pay: 4 });
    expect(tevkifatDurumu(4, 'mukellef', 4_999_999.99, 12000)).toMatchObject({ uygulanir: false, neden: 'yapim-siniri' });
    expect(tevkifatDurumu(4, 'mukellef', 5_000_000, 12000)).toEqual({ uygulanir: true, pay: 4 });
  });

  it('yalnızca tevkifatlı işaretli kalemlere tevkifat uygulanır, sınır da onlara bakar', () => {
    const r = hesaplaMakbuz(
      [
        { tutar: 20000, kdvOrani: 20, tevkifatli: true }, // KDV 4.000
        { tutar: 5000, kdvOrani: 20, tevkifatli: false }, // masraf, KDV 1.000
      ],
      { stopajOrani: 20, tevkifatPayi: 9, alici: 'kamu', tevkifatSiniri: 12000 },
    );
    expect(r.tevkifataTabiKdvDahil).toBe(24000);
    expect(r.kdv).toBe(5000);
    expect(r.tevkifEdilenKdv).toBe(3600);
    expect(r.tahsilEdilecekKdv).toBe(1400);
    // net 20.000, tahsilat 20.000 + 1.400 = 21.400
    expect(r.tahsilat).toBe(21400);
  });

  it('tevkifat seçilmediğinde durum "secilmedi"', () => {
    expect(tevkifatDurumu(0, 'kamu', 50000, 12000)).toMatchObject({ uygulanir: false, neden: 'secilmedi' });
  });
});

describe('doğrulama', () => {
  it('kalem doğrulaması', () => {
    expect(validateKalem(null, 20)).toHaveProperty('tutar');
    expect(validateKalem(-1, 20)).toHaveProperty('tutar');
    expect(validateKalem(100, 120)).toHaveProperty('kdvOrani');
    expect(validateKalem(100, 20)).toEqual({});
  });

  it('stopaj doğrulaması', () => {
    expect(validateStopaj(null)).toBeDefined();
    expect(validateStopaj(100)).toBeDefined();
    expect(validateStopaj(-5)).toBeDefined();
    expect(validateStopaj(0)).toBeUndefined();
    expect(validateStopaj(20)).toBeUndefined();
  });
});
