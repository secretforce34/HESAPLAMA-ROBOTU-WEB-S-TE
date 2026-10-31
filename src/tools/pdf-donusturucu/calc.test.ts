import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { BOYUTLAR, dpiOlcek, gorsellerdenPdf, metniBirlestir, MM, resimDosyaAdi, sayfaOlcusu, sigdir, type Gorsel } from './calc';

async function resim(w: number, h: number, tur: 'png' | 'jpg'): Promise<Gorsel> {
  const s = sharp({ create: { width: w, height: h, channels: 3, background: '#1d5bb0' } });
  const bytes = new Uint8Array(await (tur === 'png' ? s.png() : s.jpeg()).toBuffer());
  return { bytes, tur, genislik: w, yukseklik: h };
}

describe('sayfa ölçüsü', () => {
  it('A4 dikey 595 × 842 pt; yatay resimde otomatik yön yatay olur', () => {
    expect(sayfaOlcusu('A4', 'dikey', 400, 300)).toEqual(BOYUTLAR.A4);
    expect(sayfaOlcusu('A4', 'otomatik', 400, 300)).toEqual([841.89, 595.28]);
    expect(sayfaOlcusu('A4', 'otomatik', 300, 400)).toEqual([595.28, 841.89]);
    expect(sayfaOlcusu('Letter', 'yatay', 100, 900)).toEqual([792, 612]);
  });

  it('resim boyutunda sayfa: 96 dpi varsayımıyla piksel × 0,75', () => {
    expect(sayfaOlcusu('gorsel', 'otomatik', 800, 600)).toEqual([600, 450]);
  });
});

describe('sığdırma', () => {
  it('geniş resim kenar boşluğu içinde ortalanır, oran korunur', () => {
    const [sw, sh] = BOYUTLAR.A4;
    const k = sigdir(2000, 1000, sw, sh, 10 * MM);
    expect(k.w).toBeCloseTo(sw - 20 * MM, 6);
    expect(k.w / k.h).toBeCloseTo(2, 6);
    expect(k.y).toBeCloseTo((sh - k.h) / 2, 6);
  });

  it('kenar boşluğu sıfırsa uzun kenar sayfaya tam oturur', () => {
    const k = sigdir(300, 900, 600, 900, 0);
    expect(k.h).toBeCloseTo(900, 6);
    expect(k.x).toBeCloseTo(150, 6);
  });
});

describe('resimlerden PDF', () => {
  it('her resim bir sayfa; PNG ve JPG birlikte', async () => {
    const out = await gorsellerdenPdf([await resim(400, 300, 'png'), await resim(300, 400, 'jpg')], { boyut: 'A4', yon: 'otomatik', kenarMm: 10, baslik: 'Fişler' });
    const d = await PDFDocument.load(out);
    expect(d.getPageCount()).toBe(2);
    expect(d.getPage(0).getWidth()).toBeCloseTo(841.89, 1);
    expect(d.getPage(1).getWidth()).toBeCloseTo(595.28, 1);
    expect(d.getTitle()).toBe('Fişler');
  });

  it('resim boyutunda sayfa seçilince kenar boşluğu yok sayılır', async () => {
    const out = await gorsellerdenPdf([await resim(800, 600, 'png')], { boyut: 'gorsel', yon: 'otomatik', kenarMm: 20 });
    const p = (await PDFDocument.load(out)).getPage(0);
    expect(p.getWidth()).toBeCloseTo(600, 3);
    expect(p.getHeight()).toBeCloseTo(450, 3);
  });
});

describe('yardımcılar', () => {
  it('sayfa resim adları sıfırla doldurulur', () => {
    expect(resimDosyaAdi('rapor', 3, 12, 'png')).toBe('rapor-sayfa-03.png');
    expect(resimDosyaAdi('rapor', 7, 9, 'jpg')).toBe('rapor-sayfa-7.jpg');
  });

  it('150 dpi ölçeği', () => {
    expect(dpiOlcek(150)).toBeCloseTo(2.0833, 3);
    expect(dpiOlcek(72)).toBe(1);
  });

  it('metin parçaları satırlara bölünür, fazla boşluklar temizlenir', () => {
    expect(
      metniBirlestir([
        { str: 'Fatura No: 12', hasEOL: true },
        { str: 'Tutar: ' },
        { str: '1.250 TL  ', hasEOL: true },
        { str: '', hasEOL: true },
        { str: '', hasEOL: true },
        { str: '', hasEOL: true },
        { str: 'Teşekkürler' },
      ]),
    ).toBe('Fatura No: 12\nTutar: 1.250 TL\n\nTeşekkürler');
  });
});
