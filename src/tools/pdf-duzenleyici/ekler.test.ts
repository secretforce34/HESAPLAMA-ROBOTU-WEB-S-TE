import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { PDFDocument, degrees } from 'pdf-lib';
import { ekrandanPdfe, kaynaklariAc, kutuPdf, pdfOlustur, resimYerlesimi, sayfalariOlustur } from './calc';

// Sayfa 200 × 400 pt (dikey). Ekranda: 0° → 200×400, 90°/270° → 400×200 görünür.
const W = 200;
const H = 400;

describe('ekran → PDF koordinatı', () => {
  it('döndürülmemiş sayfada sol üst köşe PDF’in sol üstü', () => {
    expect(ekrandanPdfe(0, 0, 0, W, H)).toEqual({ x: 0, y: 400 });
    expect(ekrandanPdfe(1, 1, 0, W, H)).toEqual({ x: 200, y: 0 });
  });

  it('90° döndürülmüş sayfada ekranın sol üstü PDF’in sol altı', () => {
    expect(ekrandanPdfe(0, 0, 90, W, H)).toEqual({ x: 0, y: 0 });
    // Ekranın sağ üstü (u=1, v=0) → PDF’te sol üst
    expect(ekrandanPdfe(1, 0, 90, W, H)).toEqual({ x: 0, y: 400 });
  });

  it('180° ve 270°', () => {
    expect(ekrandanPdfe(0, 0, 180, W, H)).toEqual({ x: 200, y: 0 });
    expect(ekrandanPdfe(0, 0, 270, W, H)).toEqual({ x: 200, y: 400 });
  });

  it('kutu eksenlere paralel kalır, alanı korunur', () => {
    for (const aci of [0, 90, 180, 270] as const) {
      const k = kutuPdf(0.1, 0.2, 0.5, 0.4, aci, W, H);
      const [gW, gH] = aci % 180 === 0 ? [W, H] : [H, W];
      expect(k.w * k.h).toBeCloseTo(0.4 * gW * 0.2 * gH, 6);
    }
  });

  it('resim yerleşimi: döndürülmüş sayfada genişlik ekrandaki genişlikten', () => {
    const r = resimYerlesimi(0.25, 0.5, 0.75, 0.6, 90, W, H);
    // Ekran 400 × 200: genişlik 0,5 × 400 = 200, yükseklik 0,1 × 200 = 20
    expect(r.w).toBeCloseTo(200, 6);
    expect(r.h).toBeCloseTo(20, 6);
    expect(r.aci).toBe(90);
  });
});

describe('sayfaya ekleme', () => {
  async function tekSayfa(aci = 0) {
    const d = await PDFDocument.create();
    const p = d.addPage([W, H]);
    if (aci) p.setRotation(degrees(aci));
    return d.save();
  }

  it('örtme kutusu ve vurgu çizilir, sayfa sayısı ve boyutu değişmez', async () => {
    const k = await kaynaklariAc([{ ad: 'a.pdf', bytes: await tekSayfa() }]);
    const s = sayfalariOlustur(0, 1);
    const out = await pdfOlustur(k, s, {
      ekler: {
        [s[0].id]: [
          { tur: 'kutu', u0: 0.1, v0: 0.1, u1: 0.5, v1: 0.15, renk: [1, 1, 1], opaklik: 1 },
          { tur: 'kutu', u0: 0.1, v0: 0.3, u1: 0.9, v1: 0.33, renk: [1, 0.9, 0.2], opaklik: 0.35 },
        ],
      },
    });
    const d = await PDFDocument.load(out);
    expect(d.getPageCount()).toBe(1);
    expect(d.getPage(0).getWidth()).toBe(W);
    expect(out.length).toBeGreaterThan((await tekSayfa()).length);
  });

  it('yazı/imza resmi döndürülmüş sayfaya da eklenir', async () => {
    const png = new Uint8Array(await sharp({ create: { width: 40, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer());
    const k = await kaynaklariAc([{ ad: 'a.pdf', bytes: await tekSayfa(90) }]);
    const s = sayfalariOlustur(0, 1);
    const out = await pdfOlustur(k, s, { ekler: { [s[0].id]: [{ tur: 'resim', u0: 0.1, v0: 0.1, u1: 0.4, v1: 0.2, png }] } });
    const d = await PDFDocument.load(out);
    expect(d.getPage(0).getRotation().angle).toBe(90);
  });
});
