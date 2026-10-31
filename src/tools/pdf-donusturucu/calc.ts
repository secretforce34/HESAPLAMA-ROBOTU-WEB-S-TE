// PDF dönüştürme: resimlerden PDF (pdf-lib), PDF'ten resim ve metin (pdf.js, arayüzde).
// Ölçüler PDF noktası (pt) cinsindendir: 1 pt = 1/72 inç, 1 mm ≈ 2,835 pt.
import { PDFDocument } from 'pdf-lib';

export type SayfaBoyutu = 'A4' | 'A5' | 'Letter' | 'gorsel';
export type Yon = 'otomatik' | 'dikey' | 'yatay';

export const MM = 72 / 25.4;
export const BOYUTLAR: Record<Exclude<SayfaBoyutu, 'gorsel'>, [number, number]> = {
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
};
/** Ekran pikseli → nokta (96 dpi varsayımı) */
const PX = 0.75;

/** Sayfa genişliği ve yüksekliği (pt). "gorsel": sayfa resmin kendi boyutunda olur. */
export function sayfaOlcusu(boyut: SayfaBoyutu, yon: Yon, gw: number, gh: number): [number, number] {
  if (boyut === 'gorsel') return [gw * PX, gh * PX];
  const [w, h] = BOYUTLAR[boyut];
  const yatay = yon === 'yatay' || (yon === 'otomatik' && gw > gh);
  return yatay ? [h, w] : [w, h];
}

/** Resmi oranını bozmadan kenar boşluğu içinde ortalayarak sığdırır. */
export function sigdir(gw: number, gh: number, sw: number, sh: number, kenar: number): { x: number; y: number; w: number; h: number } {
  const aw = Math.max(1, sw - 2 * kenar);
  const ah = Math.max(1, sh - 2 * kenar);
  const o = Math.min(aw / gw, ah / gh);
  const w = gw * o;
  const h = gh * o;
  return { x: (sw - w) / 2, y: (sh - h) / 2, w, h };
}

export interface Gorsel {
  bytes: Uint8Array;
  tur: 'png' | 'jpg';
  genislik: number;
  yukseklik: number;
}

export interface PdfSecenek {
  boyut: SayfaBoyutu;
  yon: Yon;
  /** Kenar boşluğu (mm); "gorsel" boyutunda kullanılmaz */
  kenarMm: number;
  baslik?: string;
}

/** Her resim bir sayfa olur. */
export async function gorsellerdenPdf(gorseller: Gorsel[], s: PdfSecenek): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  if (s.baslik) doc.setTitle(s.baslik);
  doc.setProducer('Hesap Robotu – PDF Dönüştürücü');
  for (const g of gorseller) {
    const resim = g.tur === 'png' ? await doc.embedPng(g.bytes) : await doc.embedJpg(g.bytes);
    const [sw, sh] = sayfaOlcusu(s.boyut, s.yon, g.genislik, g.yukseklik);
    const kenar = s.boyut === 'gorsel' ? 0 : s.kenarMm * MM;
    const k = sigdir(g.genislik, g.yukseklik, sw, sh, kenar);
    doc.addPage([sw, sh]).drawImage(resim, { x: k.x, y: k.y, width: k.w, height: k.h });
  }
  return doc.save();
}

/** "rapor" + 3. sayfa / 12 → "rapor-sayfa-03.png" */
export function resimDosyaAdi(temel: string, sayfa: number, toplam: number, uzanti: 'png' | 'jpg'): string {
  return `${temel}-sayfa-${String(sayfa).padStart(String(toplam).length, '0')}.${uzanti}`;
}

/** Çözünürlük (dpi) → pdf.js ölçeği (1 = 72 dpi). */
export function dpiOlcek(dpi: number): number {
  return dpi / 72;
}

/** pdf.js metin parçalarını satırlara çevirir. */
export function metniBirlestir(parcalar: { str: string; hasEOL?: boolean }[]): string {
  let metin = '';
  for (const p of parcalar) {
    metin += p.str;
    if (p.hasEOL) metin += '\n';
  }
  return metin
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// PDF → Excel / Word: pdf.js'in verdiği metin parçaları (konum + boyut) satırlara, sütunlara ve paragraflara ayrılır.
// PDF'te "tablo" ya da "paragraf" bilgisi yoktur; düzen yazıların konumundan tahmin edilir.

export interface MetinParcasi {
  str: string;
  /** Sol kenar (pt) */
  x: number;
  /** Taban çizgisi, sayfanın altından (pt) */
  y: number;
  /** Genişlik (pt) */
  w: number;
  /** Yazı boyutu (pt) */
  h: number;
}

/** pdf.js metin öğesini sadeleştirir (transform: [a, b, c, d, e, f]). */
export function parcaOf(item: { str: string; transform: number[]; width: number; height: number }): MetinParcasi {
  const [, , c, d, e, f] = item.transform;
  return { str: item.str, x: e, y: f, w: item.width, h: item.height || Math.hypot(c, d) || 10 };
}

/** Aynı yükseklikteki parçaları satır yapar (yukarıdan aşağıya, soldan sağa). */
export function satirlaraAyir(parcalar: MetinParcasi[]): MetinParcasi[][] {
  const dolu = parcalar.filter((p) => p.str.trim() !== '').sort((a, b) => b.y - a.y || a.x - b.x);
  const satirlar: MetinParcasi[][] = [];
  for (const p of dolu) {
    const son = satirlar[satirlar.length - 1];
    if (son && Math.abs(son[0].y - p.y) <= Math.max(2, Math.min(son[0].h, p.h) * 0.4)) son.push(p);
    else satirlar.push([p]);
  }
  return satirlar.map((s) => s.sort((a, b) => a.x - b.x));
}

/** Bir satırdaki parçaları aralarındaki boşluğa göre hücrelere böler. */
function hucrelereBol(satir: MetinParcasi[]): { x: number; metin: string }[] {
  const hucreler: { x: number; son: number; metin: string; h: number }[] = [];
  for (const p of satir) {
    const h = hucreler[hucreler.length - 1];
    const bosluk = h ? p.x - h.son : Infinity;
    if (h && bosluk < Math.max(h.h, p.h) * 0.9) {
      h.metin += bosluk > Math.max(h.h, p.h) * 0.15 && !h.metin.endsWith(' ') && !p.str.startsWith(' ') ? ` ${p.str}` : p.str;
      h.son = p.x + p.w;
    } else hucreler.push({ x: p.x, son: p.x + p.w, metin: p.str, h: p.h });
  }
  return hucreler.map((h) => ({ x: h.x, metin: h.metin.trim() }));
}

/** "1.234,56", "-250", "12,5" gibi metinleri sayıya çevirir; para birimi ve yüzde işareti olanlar metin kalır. */
export function sayiyaCevir(s: string): number | string {
  const t = s.trim();
  if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) || /^[-+]?\d+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^[-+]?\d{1,3}(,\d{3})+\.\d+$/.test(t)) return Number(t.replace(/,/g, ''));
  return t;
}

/** Sayfadaki yazıları tabloya çevirir: sütunlar, satırlardaki hücre başlangıçlarının hizasından bulunur. */
export function tabloyaCevir(parcalar: MetinParcasi[], sayilariCevir = true): (string | number | null)[][] {
  const satirlar = satirlaraAyir(parcalar).map(hucrelereBol);
  const baslar = satirlar.flatMap((s) => s.map((h) => h.x)).sort((a, b) => a - b);
  const sutunlar: number[] = [];
  for (const x of baslar) if (sutunlar.length === 0 || x - sutunlar[sutunlar.length - 1] > 10) sutunlar.push(x);
  const sutunOf = (x: number) => {
    let en = 0;
    for (let i = 0; i < sutunlar.length; i++) if (Math.abs(sutunlar[i] - x) < Math.abs(sutunlar[en] - x)) en = i;
    return en;
  };
  return satirlar.map((s) => {
    const satir: (string | number | null)[] = Array(sutunlar.length).fill(null);
    for (const h of s) {
      let i = sutunOf(h.x);
      while (satir[i] !== null && i < satir.length - 1) i++;
      satir[i] = sayilariCevir ? sayiyaCevir(h.metin) : h.metin;
    }
    while (satir.length && satir[satir.length - 1] === null) satir.pop();
    return satir;
  });
}

export interface Paragraf {
  metin: string;
  /** Yazı boyutu (pt) */
  boyut: number;
  /** Sayfadaki diğer yazılardan belirgin büyükse başlık */
  baslik: boolean;
}

/** Satırları paragraflara birleştirir: satır arası açıksa ya da yazı boyutu değişirse yeni paragraf. */
export function paragraflaraAyir(parcalar: MetinParcasi[]): Paragraf[] {
  const satirlar = satirlaraAyir(parcalar).map((s) => ({
    metin: hucrelereBol(s)
      .map((h) => h.metin)
      .join('  '),
    y: s[0].y,
    h: Math.max(...s.map((p) => p.h)),
  }));
  if (satirlar.length === 0) return [];
  const boyutlar = satirlar.map((s) => s.h).sort((a, b) => a - b);
  const ortanca = boyutlar[Math.floor(boyutlar.length / 2)];
  const paragraflar: Paragraf[] = [];
  let onceki: (typeof satirlar)[number] | null = null;
  for (const s of satirlar) {
    const yeni = !onceki || onceki.y - s.y > Math.max(onceki.h, s.h) * 1.7 || Math.abs(onceki.h - s.h) > 1.5;
    const son = paragraflar[paragraflar.length - 1];
    if (yeni || !son) paragraflar.push({ metin: s.metin, boyut: Math.round(s.h * 2) / 2, baslik: s.h > ortanca * 1.25 });
    else son.metin = son.metin.endsWith('-') ? son.metin.slice(0, -1) + s.metin : `${son.metin} ${s.metin}`;
    onceki = s;
  }
  return paragraflar;
}
