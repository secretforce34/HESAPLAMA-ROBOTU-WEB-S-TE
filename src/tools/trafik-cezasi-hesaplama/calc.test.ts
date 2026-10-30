import { describe, expect, it } from 'vitest';
import { ayEkle, gecikmeAyi, hesaplaCeza, tebligTarihi, validateCeza } from './calc';

describe('trafik cezası ödeme', () => {
  it('ay ekleme: ayın son günü taşmaz', () => {
    expect(ayEkle('2026-03-15', 1)).toBe('2026-04-15');
    expect(ayEkle('2026-01-31', 1)).toBe('2026-02-28');
    expect(ayEkle('2026-12-20', 1)).toBe('2027-01-20');
  });

  it('e-tebligat: ulaştığı günü izleyen 5. günün sonunda tebliğ', () => {
    expect(tebligTarihi('2026-12-01', 'etebligat')).toBe('2026-12-06');
    expect(tebligTarihi('2026-12-01', 'elden')).toBe('2026-12-01');
  });

  it('bir ay içinde ödenirse %25 indirim; itiraz süresi 15 gün', () => {
    const r = hesaplaCeza({ tutar: 5_000, tarih: '2026-10-10', sekil: 'elden', odemeTarihi: '2026-11-10' });
    expect(r.sonOdeme).toBe('2026-11-10');
    expect(r.indirimli).toBe(true);
    expect(r.odenecek).toBe(3_750);
    expect(r.indirim).toBe(1_250);
    expect(r.itirazSonGun).toBe('2026-10-25');
  });

  it('süre geçerse indirim yok, her ay %5; ay kesri tam ay', () => {
    expect(gecikmeAyi('2026-11-10', '2026-11-11')).toBe(1);
    expect(gecikmeAyi('2026-11-10', '2026-12-10')).toBe(1);
    expect(gecikmeAyi('2026-11-10', '2026-12-11')).toBe(2);
    const r = hesaplaCeza({ tutar: 5_000, tarih: '2026-10-10', sekil: 'elden', odemeTarihi: '2026-12-11' });
    expect(r.indirimli).toBe(false);
    expect(r.gecikmeAy).toBe(2);
    expect(r.faiz).toBe(500);
    expect(r.odenecek).toBe(5_500);
  });

  it('faizli tutar cezanın iki katını geçemez', () => {
    const r = hesaplaCeza({ tutar: 5_000, tarih: '2024-01-10', sekil: 'elden', odemeTarihi: '2026-10-31' });
    expect(r.gecikmeAy).toBeGreaterThan(20);
    expect(r.faiz).toBe(5_000);
    expect(r.sinirda).toBe(true);
    expect(r.odenecek).toBe(10_000);
  });

  it('e-tebligatla gelen ceza: süre 5 gün sonra başlar', () => {
    const r = hesaplaCeza({ tutar: 2_000, tarih: '2026-10-01', sekil: 'etebligat', odemeTarihi: '2026-11-05' });
    expect(r.teblig).toBe('2026-10-06');
    expect(r.sonOdeme).toBe('2026-11-06');
    expect(r.indirimli).toBe(true);
  });

  it('doğrulama', () => {
    expect(validateCeza({ tutar: 100, tarih: '2026-10-01' }, '2026-10-31')).toBeNull();
    expect(validateCeza({ tutar: null, tarih: '2026-10-01' }, '2026-10-31')).not.toBeNull();
    expect(validateCeza({ tutar: 100, tarih: '2026-11-01' }, '2026-10-31')).not.toBeNull();
  });
});
