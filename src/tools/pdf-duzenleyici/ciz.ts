// Düzenleme penceresinde eklenenleri PDF'e yazılacak biçime çevirir (tarayıcıda): yazılar yüksek çözünürlüklü
// saydam PNG'ye, yüklenen resimler PNG'ye dönüşür.
import type { Ek } from './calc';
import type { SayfaEkleri } from './SayfaDuzenle';

/** Pt başına piksel: yazı resimleri baskıda da keskin kalsın */
const K = 4;
export const YAZI_FONTU = '"Inter Variable", Inter, "Segoe UI", Arial, sans-serif';

const hexRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
};

function yaziPng(metin: string, boyut: number, renk: string, kalin: boolean): Promise<{ png: Uint8Array; wPt: number; hPt: number }> {
  const px = boyut * K;
  const font = `${kalin ? 700 : 400} ${px}px ${YAZI_FONTU}`;
  const olc = document.createElement('canvas').getContext('2d')!;
  olc.font = font;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(olc.measureText(metin).width + px * 0.1));
  c.height = Math.ceil(px * 1.25);
  const ctx = c.getContext('2d')!;
  ctx.font = font;
  ctx.fillStyle = renk;
  ctx.textBaseline = 'top';
  ctx.fillText(metin, 0, px * 0.1);
  return new Promise((resolve, reject) =>
    c.toBlob(async (b) => (b ? resolve({ png: new Uint8Array(await b.arrayBuffer()), wPt: c.width / K, hPt: c.height / K }) : reject(new Error('Yazı çizilemedi'))), 'image/png'),
  );
}

async function pngBaytlari(src: string): Promise<Uint8Array> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d')!.drawImage(img, 0, 0);
  const b = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  if (!b) throw new Error('Resim hazırlanamadı');
  return new Uint8Array(await b.arrayBuffer());
}

export async function ekleriHazirla(e: SayfaEkleri): Promise<Ek[]> {
  const sonuc: Ek[] = [];
  for (const o of e.ogeler) {
    const k = { u0: o.u0, v0: o.v0, u1: o.u1, v1: o.v1 };
    if (o.tur === 'kutu') sonuc.push({ tur: 'kutu', ...k, renk: hexRgb(o.renk ?? '#ffffff'), opaklik: 1 });
    else if (o.tur === 'vurgu') sonuc.push({ tur: 'kutu', ...k, renk: hexRgb(o.renk ?? '#ffe234'), opaklik: 0.4 });
    else if (o.tur === 'yazi' && o.metin?.trim()) {
      const y = await yaziPng(o.metin, o.boyut ?? 12, o.renk ?? '#000000', !!o.kalin);
      sonuc.push({ tur: 'resim', u0: o.u0, v0: o.v0, u1: o.u0 + y.wPt / e.pt.w, v1: o.v0 + y.hPt / e.pt.h, png: y.png });
    } else if (o.tur === 'resim' && o.src) sonuc.push({ tur: 'resim', ...k, png: await pngBaytlari(o.src) });
  }
  return sonuc;
}
