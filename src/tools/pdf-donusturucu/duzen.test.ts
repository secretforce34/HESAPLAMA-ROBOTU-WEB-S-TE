import { describe, expect, it } from 'vitest';
import { paragraflaraAyir, parcaOf, sayiyaCevir, satirlaraAyir, tabloyaCevir, type MetinParcasi } from './calc';

const p = (str: string, x: number, y: number, h = 10): MetinParcasi => ({ str, x, y, w: str.length * h * 0.5, h });

describe('PDF → Excel', () => {
  it('pdf.js öğesinden konum ve boyut', () => {
    expect(parcaOf({ str: 'A', transform: [10, 0, 0, 10, 50, 700], width: 6, height: 10 })).toEqual({ str: 'A', x: 50, y: 700, w: 6, h: 10 });
  });

  it('aynı yükseklikteki parçalar bir satır, yukarıdan aşağıya', () => {
    const s = satirlaraAyir([p('ikinci', 50, 680), p('B', 200, 700.5), p('A', 50, 700)]);
    expect(s.map((x) => x.map((y) => y.str))).toEqual([['A', 'B'], ['ikinci']]);
  });

  it('Türkçe ve İngilizce sayı biçimleri', () => {
    expect(sayiyaCevir('1.234,56')).toBe(1234.56);
    expect(sayiyaCevir('-250')).toBe(-250);
    expect(sayiyaCevir('12,5')).toBe(12.5);
    expect(sayiyaCevir('1,234.50')).toBe(1234.5);
    expect(sayiyaCevir('%12,5')).toBe('%12,5');
    expect(sayiyaCevir('1.250,00 TL')).toBe('1.250,00 TL');
    expect(sayiyaCevir('01.10.2026')).toBe('01.10.2026');
  });

  it('banka ekstresi gibi tablo: sütunlar hizadan bulunur, boş hücre korunur', () => {
    const t = tabloyaCevir([
      p('Tarih', 50, 700),
      p('Açıklama', 150, 700),
      p('Tutar', 400, 700),
      p('01.10.2026', 50, 680),
      p('Market', 150, 680),
      p('-1.250,50', 400, 680),
      p('02.10.2026', 50, 660),
      p('3.000,00', 401, 660),
    ]);
    expect(t).toEqual([
      ['Tarih', 'Açıklama', 'Tutar'],
      ['01.10.2026', 'Market', -1250.5],
      ['02.10.2026', null, 3000],
    ]);
  });

  it('yan yana kelimeler aynı hücrede birleşir', () => {
    const t = tabloyaCevir([p('Kira', 50, 700), p('ödemesi', 72, 700), p('15.000', 300, 700)]);
    expect(t).toEqual([['Kira ödemesi', 15000]]);
  });

  it('sayılar istenirse metin olarak kalır', () => {
    expect(tabloyaCevir([p('15.000', 50, 700)], false)).toEqual([['15.000']]);
  });
});

describe('PDF → Word', () => {
  it('büyük yazı başlık, yakın satırlar aynı paragraf, açık satır arası yeni paragraf', () => {
    const pr = paragraflaraAyir([
      p('Kira Sözleşmesi', 50, 760, 18),
      p('Bu sözleşme kiraya veren ile', 50, 720),
      p('kiracı arasında yapılmıştır.', 50, 708),
      p('Madde 1', 50, 670),
    ]);
    expect(pr.map((x) => x.metin)).toEqual(['Kira Sözleşmesi', 'Bu sözleşme kiraya veren ile kiracı arasında yapılmıştır.', 'Madde 1']);
    expect(pr[0].baslik).toBe(true);
    expect(pr[1].baslik).toBe(false);
  });

  it('satır sonu tirelemesi birleşir; boş sayfa boş liste', () => {
    expect(paragraflaraAyir([p('hesap-', 50, 700), p('lama', 50, 688)])[0].metin).toBe('hesaplama');
    expect(paragraflaraAyir([])).toEqual([]);
  });
});
