import { describe, expect, it } from 'vitest';
import { grupBul, hesaplaEmeklilik, kalanSure, validateEmeklilik, yasHesapla } from './calc';

const temel = {
  statu: '4a' as const,
  cinsiyet: 'erkek' as const,
  dogum: '1975-01-01',
  ilkGiris: '1995-03-01',
  primGun: 6000,
  yillikGun: 360,
  bugun: '2026-10-29',
  borclanmaGun: 0,
  borclanmaGiristenOnce: false,
};

describe('grup', () => {
  it('başlangıç tarihine göre', () => {
    expect(grupBul('1999-09-08')).toBe('eyt');
    expect(grupBul('1999-09-09')).toBe('1999-2008');
    expect(grupBul('2008-04-30')).toBe('1999-2008');
    expect(grupBul('2008-05-01')).toBe('2008-sonrasi');
  });
});

describe('EYT (08.09.1999 ve öncesi)', () => {
  it('SSK erkek 01.03.1995: 25 yıl + 5750 gün, yaş şartı yok → zaten emekli olabilir', () => {
    const r = hesaplaEmeklilik(temel);
    expect(r.grup).toBe('eyt');
    expect(r.ana.sartlar.find((s) => s.ad === 'Prim günü')!.gereken).toContain('5.750');
    expect(r.ana.sartlar.find((s) => s.ad === 'Sigortalılık süresi')!.tarih).toBe('2020-03-01');
    expect(r.ana.tamam).toBe(true);
  });

  it('SSK kadın 15.01.1998: 20 yıl + 5975 gün; 5000 günü olan 975 gün daha çalışmalı', () => {
    const r = hesaplaEmeklilik({ ...temel, cinsiyet: 'kadin', dogum: '1978-06-01', ilkGiris: '1998-01-15', primGun: 5000 });
    expect(r.ana.sartlar.find((s) => s.ad === 'Prim günü')!.gereken).toContain('5.975');
    // 975 / 360 yıl ≈ 2,71 yıl sonra → 2029 ortası
    expect(r.ana.tarih.slice(0, 4)).toBe('2029');
    expect(r.ana.tamam).toBe(false);
  });

  it('Bağ-Kur erkek EYT: 9000 gün, yaş yok', () => {
    const r = hesaplaEmeklilik({ ...temel, statu: '4b', ilkGiris: '1997-01-01', primGun: 9000 });
    expect(r.ana.tamam).toBe(true);
  });
});

describe('09.09.1999 – 30.04.2008', () => {
  it('SSK erkek: 60 yaş + 7000 gün; yaş belirleyici', () => {
    const r = hesaplaEmeklilik({ ...temel, dogum: '1980-01-01', ilkGiris: '2005-06-01', primGun: 5000 });
    expect(r.grup).toBe('1999-2008');
    expect(r.ana.tarih).toBe('2040-01-01');
    expect(r.ana.yas).toBe(60);
  });

  it('SSK kadın: 58 yaş', () => {
    const r = hesaplaEmeklilik({ ...temel, cinsiyet: 'kadin', dogum: '1980-01-01', ilkGiris: '2001-01-01', primGun: 6900 });
    expect(r.ana.tarih).toBe('2038-01-01');
  });

  it('25 yıl + 4500 gün alternatifi listelenir', () => {
    const r = hesaplaEmeklilik({ ...temel, dogum: '1980-01-01', ilkGiris: '2005-06-01', primGun: 5000 });
    expect(r.alternatifler[0].ad).toContain('4.500');
  });
});

describe('01.05.2008 sonrası (kademeli yaş)', () => {
  it('kadın: 7200 gün 2038’de dolarsa yaş 60', () => {
    const r = hesaplaEmeklilik({ ...temel, cinsiyet: 'kadin', dogum: '1990-05-05', ilkGiris: '2010-01-01', primGun: 3000 });
    // 4200 eksik gün / 360 ≈ 11,67 yıl → 2038 → kadın 60
    expect(r.ana.sartlar.find((s) => s.ad === 'Yaş')!.gereken).toContain('60');
    expect(r.ana.tarih).toBe('2050-05-05');
  });

  it('erkek: 7200 gün 2035 öncesi dolarsa yaş 60', () => {
    const r = hesaplaEmeklilik({ ...temel, dogum: '1985-03-10', ilkGiris: '2009-01-01', primGun: 6000 });
    expect(r.ana.sartlar.find((s) => s.ad === 'Yaş')!.gereken).toContain('60');
    expect(r.ana.tarih).toBe('2045-03-10');
  });

  it('Bağ-Kur 9000 gün', () => {
    const r = hesaplaEmeklilik({ ...temel, statu: '4b', dogum: '1985-03-10', ilkGiris: '2009-01-01', primGun: 6000 });
    expect(r.ana.sartlar.find((s) => s.ad === 'Prim günü')!.gereken).toContain('9.000');
  });

  it('yaştan (kısmi) emeklilik: 2016 sonrası 5400 gün', () => {
    const r = hesaplaEmeklilik({ ...temel, cinsiyet: 'kadin', dogum: '1995-01-01', ilkGiris: '2017-01-01', primGun: 2000 });
    expect(r.alternatifler[0].ad).toContain('5.400');
  });
});

describe('borçlanma', () => {
  it('girişten önceki askerlik borçlanması başlangıcı geri çeker, EYT’ye taşıyabilir', () => {
    const r = hesaplaEmeklilik({ ...temel, ilkGiris: '2000-02-01', primGun: 7000, borclanmaGun: 540, borclanmaGiristenOnce: true });
    expect(r.baslangic < '1999-09-09').toBe(true);
    expect(r.grup).toBe('eyt');
    expect(r.toplamGun).toBe(7540);
  });

  it('girişten sonraki borçlanma yalnızca prim gününe eklenir', () => {
    const r = hesaplaEmeklilik({ ...temel, ilkGiris: '2000-02-01', primGun: 7000, borclanmaGun: 540, borclanmaGiristenOnce: false });
    expect(r.grup).toBe('1999-2008');
    expect(r.toplamGun).toBe(7540);
  });
});

describe('yardımcılar', () => {
  it('yaş ve kalan süre', () => {
    expect(yasHesapla('1980-01-01', '2040-01-01')).toBe(60);
    expect(kalanSure('2026-10-29', '2029-07-15')).toEqual({ yil: 2, ay: 8 });
  });
  it('doğrulama', () => {
    expect(validateEmeklilik({ dogum: '1990-01-01', giris: '2000-01-01', gun: 100, yillik: 360, bugun: '2026-10-29' })).toHaveProperty('giris');
    expect(validateEmeklilik({ dogum: '1980-01-01', giris: '2000-01-01', gun: 100, yillik: 400, bugun: '2026-10-29' })).toHaveProperty('yillik');
    expect(validateEmeklilik({ dogum: '1980-01-01', giris: '2000-01-01', gun: 100, yillik: 360, bugun: '2026-10-29' })).toEqual({});
  });
});

describe('4/c memur', () => {
  const memur = { ...temel, statu: '4c' as const };

  it('memurlarda 5434’ten 5510’a geçiş 01.10.2008', () => {
    expect(grupBul('2008-09-30', '4c')).toBe('1999-2008');
    expect(grupBul('2008-10-01', '4c')).toBe('2008-sonrasi');
    expect(grupBul('2008-09-30', '4a')).toBe('2008-sonrasi');
  });

  it('EYT: kadın 20, erkek 25 fiili hizmet yılı, yaş şartı yok', () => {
    const e = hesaplaEmeklilik({ ...memur, ilkGiris: '1996-09-01', primGun: 8000 });
    expect(e.grup).toBe('eyt');
    expect(e.ana.sartlar[0].ad).toBe('Hizmet süresi');
    expect(e.ana.sartlar[0].gereken).toContain('9.000 gün (25 tam yıl)');
    const k = hesaplaEmeklilik({ ...memur, cinsiyet: 'kadin', ilkGiris: '1996-09-01', primGun: 7200 });
    expect(k.ana.tamam).toBe(true);
  });

  it('1999–2008: 25 yıl (9000 gün) + kadın 58 / erkek 60; 15 yıl + 61 yaş seçeneği', () => {
    const r = hesaplaEmeklilik({ ...memur, dogum: '1978-04-10', ilkGiris: '2005-02-01', primGun: 7000, yillikGun: 360 });
    expect(r.grup).toBe('1999-2008');
    expect(r.grupAdi).toContain('30.09.2008');
    expect(r.ana.sartlar.find((s) => s.ad === 'Yaş')!.tarih).toBe('2038-04-10');
    expect(r.ana.sartlar.find((s) => s.ad === 'Hizmet süresi')!.gereken).toContain('9.000');
    expect(r.alternatifler[0].ad).toBe('15 yıl hizmet + 61 yaş');
    expect(r.alternatifler[0].tarih).toBe('2039-04-10');
  });

  it('Haziran 2008’de göreve başlayan memur hâlâ 5434’e tabi; SSK’lı 5510’a', () => {
    expect(hesaplaEmeklilik({ ...memur, ilkGiris: '2008-06-01' }).grup).toBe('1999-2008');
    expect(hesaplaEmeklilik({ ...temel, ilkGiris: '2008-06-01' }).grup).toBe('2008-sonrasi');
  });

  it('01.10.2008 sonrası: 9000 gün + kademeli yaş, yaştan emeklilik 5400 gün', () => {
    const r = hesaplaEmeklilik({ ...memur, dogum: '1985-01-01', ilkGiris: '2010-09-01', primGun: 5800, yillikGun: 360 });
    expect(r.grup).toBe('2008-sonrasi');
    expect(r.ana.sartlar[0].gereken).toBe('9.000 gün');
    expect(r.alternatifler[0].ad).toContain('5.400 gün');
  });
});
