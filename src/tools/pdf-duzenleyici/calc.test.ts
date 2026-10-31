import { describe, expect, it } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';
import { aralikCoz, dondur, kaynaklariAc, pdfOlustur, sayfalariOlustur, tasi, type SayfaRef } from './calc';

/** Sayfa genişlikleri farklı (100, 200, 300…) örnek PDF: hangi sayfanın nereye gittiği genişlikten anlaşılır. */
async function ornekPdf(sayfaSayisi: number, taban = 100, ilkDonus = 0): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  for (let i = 0; i < sayfaSayisi; i++) {
    const p = d.addPage([taban + i * 100, 500]);
    if (i === 0 && ilkDonus) p.setRotation(degrees(ilkDonus));
  }
  return d.save();
}

async function sayfaBilgisi(bytes: Uint8Array) {
  const d = await PDFDocument.load(bytes);
  return d.getPages().map((p) => ({ w: p.getWidth(), aci: p.getRotation().angle }));
}

describe('sayfa listesi işlemleri', () => {
  it('her sayfa için benzersiz kayıt üretir', () => {
    const s = sayfalariOlustur(1, 3);
    expect(s.map((x) => x.id)).toEqual(['1-0', '1-1', '1-2']);
    expect(s.every((x) => x.dosya === 1 && x.donus === 0)).toBe(true);
  });

  it('döndürme 90° adımlarla ve 0–270 arasında kalır', () => {
    expect(dondur(0, 1)).toBe(90);
    expect(dondur(270, 1)).toBe(0);
    expect(dondur(0, -1)).toBe(270);
    expect(dondur(180, -1)).toBe(90);
  });

  it('taşıma sırayı değiştirir, geçersiz sıra listeyi bozmaz', () => {
    expect(tasi(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(tasi(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(tasi(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
});

describe('sayfa aralığı', () => {
  it('tek sayfa, aralık ve açık uçlu aralık', () => {
    expect(aralikCoz('1-3, 5, 8-', 10).sira).toEqual([0, 1, 2, 4, 7, 8, 9]);
    expect(aralikCoz('-2', 5).sira).toEqual([0, 1]);
    expect(aralikCoz('3,3,1', 5).sira).toEqual([0, 2]);
  });

  it('hatalı yazım ve belge dışı sayfa uyarı verir', () => {
    expect(aralikCoz('', 5).hata).toBeTruthy();
    expect(aralikCoz('a-b', 5).hata).toMatch(/anlaşılamadı/);
    expect(aralikCoz('4-9', 5).hata).toMatch(/5 sayfa/);
    expect(aralikCoz('3-1', 5).hata).toBeTruthy();
  });
});

describe('PDF oluşturma', () => {
  it('iki PDF birleşir: sayfa sayısı ve sıra korunur', async () => {
    const k = await kaynaklariAc([
      { ad: 'a.pdf', bytes: await ornekPdf(2, 100) },
      { ad: 'b.pdf', bytes: await ornekPdf(3, 1000) },
    ]);
    const sayfalar = [...sayfalariOlustur(0, 2), ...sayfalariOlustur(1, 3)];
    const b = await sayfaBilgisi(await pdfOlustur(k, sayfalar));
    expect(b.map((x) => x.w)).toEqual([100, 200, 1000, 1100, 1200]);
  });

  it('sıralama, silme ve döndürme uygulanır', async () => {
    const k = await kaynaklariAc([{ ad: 'a.pdf', bytes: await ornekPdf(4) }]);
    let s: SayfaRef[] = sayfalariOlustur(0, 4);
    s = s.filter((x) => x.sayfa !== 1); // 2. sayfa silindi
    s = tasi(s, 2, 0); // son sayfa başa
    s[1] = { ...s[1], donus: 90 };
    const b = await sayfaBilgisi(await pdfOlustur(k, s));
    expect(b.map((x) => x.w)).toEqual([400, 100, 300]);
    expect(b.map((x) => x.aci)).toEqual([0, 90, 0]);
  });

  it('sayfanın kendi döndürmesine eklenir', async () => {
    const k = await kaynaklariAc([{ ad: 'a.pdf', bytes: await ornekPdf(1, 100, 270) }]);
    const s = sayfalariOlustur(0, 1).map((x) => ({ ...x, donus: 180 as const }));
    expect((await sayfaBilgisi(await pdfOlustur(k, s)))[0].aci).toBe(90);
  });

  it('yalnızca seçilen sayfalar ayrı PDF olur (bölme)', async () => {
    const k = await kaynaklariAc([{ ad: 'a.pdf', bytes: await ornekPdf(5) }]);
    const tum = sayfalariOlustur(0, 5);
    const secilen = aralikCoz('2-3', 5).sira.map((i) => tum[i]);
    expect((await sayfaBilgisi(await pdfOlustur(k, secilen))).map((x) => x.w)).toEqual([200, 300]);
  });

  it('sayfa numarası eklenince sayfa sayısı değişmez (dönük sayfalarda da)', async () => {
    const k = await kaynaklariAc([{ ad: 'a.pdf', bytes: await ornekPdf(4) }]);
    const s = sayfalariOlustur(0, 4).map((x, i) => ({ ...x, donus: ([0, 90, 180, 270] as const)[i] }));
    const out = await pdfOlustur(k, s, { sayfaNo: true, baslik: 'Deneme' });
    const d = await PDFDocument.load(out);
    expect(d.getPageCount()).toBe(4);
    expect(d.getTitle()).toBe('Deneme');
  });

  it('PDF olmayan dosya hata verir', async () => {
    await expect(kaynaklariAc([{ ad: 'x.pdf', bytes: new TextEncoder().encode('merhaba') }])).rejects.toThrow();
  });
});
