// PDF düzenleme: birden çok PDF'in sayfaları tek listede toplanır; sayfalar döndürülür, silinir, sıralanır,
// istenen sayfalar yeni bir PDF'e yazılır. Yazma işi pdf-lib (MIT) ile tarayıcıda yapılır.
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export type Donus = 0 | 90 | 180 | 270;

export interface SayfaRef {
  /** Listede benzersiz kimlik */
  id: string;
  /** Kaynak dosyanın sırası (0'dan) */
  dosya: number;
  /** Kaynak dosyadaki sayfa (0'dan) */
  sayfa: number;
  /** Kullanıcının eklediği döndürme (saat yönünde) */
  donus: Donus;
}

export function sayfalariOlustur(dosya: number, sayfaSayisi: number): SayfaRef[] {
  return Array.from({ length: sayfaSayisi }, (_, i) => ({ id: `${dosya}-${i}`, dosya, sayfa: i, donus: 0 as Donus }));
}

/** Saat yönünde (+1) ya da tersine (−1) 90° döndürür. */
export function dondur(d: Donus, yon: 1 | -1): Donus {
  return (((d + yon * 90) % 360) + 360) % 360 as Donus;
}

/** Listede bir öğeyi `kimden` sırasından `kime` sırasına taşır. */
export function tasi<T>(liste: T[], kimden: number, kime: number): T[] {
  if (kimden === kime || kimden < 0 || kime < 0 || kimden >= liste.length || kime >= liste.length) return liste;
  const yeni = liste.slice();
  const [x] = yeni.splice(kimden, 1);
  yeni.splice(kime, 0, x);
  return yeni;
}

/**
 * "1-3, 5, 8-" gibi sayfa aralığını 0'dan başlayan sıra numaralarına çevirir.
 * "8-" sonuna kadar, "-3" baştan 3'e kadar demektir. Hatalı yazımda hata mesajı döner.
 */
export function aralikCoz(metin: string, toplam: number): { sira: number[]; hata: string | null } {
  const parcalar = metin.split(',').map((p) => p.trim()).filter(Boolean);
  if (parcalar.length === 0) return { sira: [], hata: 'Sayfa numarası yazın (ör. 1-3, 5).' };
  const set = new Set<number>();
  for (const p of parcalar) {
    const m = /^(\d*)\s*-\s*(\d*)$/.exec(p);
    let bas: number;
    let son: number;
    if (m && (m[1] || m[2])) {
      bas = m[1] ? Number(m[1]) : 1;
      son = m[2] ? Number(m[2]) : toplam;
    } else if (/^\d+$/.test(p)) {
      bas = son = Number(p);
    } else {
      return { sira: [], hata: `“${p}” anlaşılamadı. Örnek: 1-3, 5, 8-` };
    }
    if (bas < 1 || son > toplam || bas > son) return { sira: [], hata: `“${p}” geçersiz: belgede ${toplam} sayfa var.` };
    for (let i = bas; i <= son; i++) set.add(i - 1);
  }
  return { sira: [...set].sort((a, b) => a - b), hata: null };
}

export class SifreliPdfHatasi extends Error {
  constructor(public dosyaAdi: string) {
    super(`“${dosyaAdi}” şifreli olduğu için düzenlenemiyor. Şifresini kaldırıp yeniden deneyin.`);
  }
}

/** Kaynak PDF'leri pdf-lib ile açar (şifreliyse açıklayıcı hata verir). */
export async function kaynaklariAc(dosyalar: { ad: string; bytes: Uint8Array }[]): Promise<PDFDocument[]> {
  return Promise.all(
    dosyalar.map(async (d) => {
      try {
        return await PDFDocument.load(d.bytes, { updateMetadata: false });
      } catch (e) {
        if (e instanceof Error && /encrypt/i.test(e.message)) throw new SifreliPdfHatasi(d.ad);
        throw e;
      }
    }),
  );
}

export interface OlusturSecenek {
  /** Her sayfanın altına "3 / 12" biçiminde numara */
  sayfaNo?: boolean;
  baslik?: string;
  /** Sayfa kimliğine göre sayfa üzerine eklenenler */
  ekler?: Record<string, Ek[]>;
}

/** Seçilen sayfalardan yeni PDF üretir (sıra ve döndürme korunur). */
export async function pdfOlustur(kaynaklar: PDFDocument[], sayfalar: SayfaRef[], s: OlusturSecenek = {}): Promise<Uint8Array> {
  const yeni = await PDFDocument.create();
  if (s.baslik) yeni.setTitle(s.baslik);
  yeni.setProducer('Hesap Robotu – PDF Düzenleyici');
  // Her kaynaktan sayfalar listedeki görünme sırasıyla tek seferde kopyalanır, sonra sırayla eklenir
  const kaynakBazinda = new Map<number, number[]>();
  for (const p of sayfalar) kaynakBazinda.set(p.dosya, [...(kaynakBazinda.get(p.dosya) ?? []), p.sayfa]);
  const kuyruk = new Map<number, Sayfa[]>();
  for (const [dosya, liste] of kaynakBazinda) kuyruk.set(dosya, await yeni.copyPages(kaynaklar[dosya], liste));
  const font = s.sayfaNo ? await yeni.embedFont(StandardFonts.Helvetica) : null;
  const toplam = sayfalar.length;
  for (const [i, p] of sayfalar.entries()) {
    const hedef = yeni.addPage(kuyruk.get(p.dosya)!.shift()!);
    const aci = ((((hedef.getRotation().angle + p.donus) % 360) + 360) % 360) as Donus;
    hedef.setRotation(degrees(aci));
    for (const ek of s.ekler?.[p.id] ?? []) await ekCiz(yeni, hedef, ek, aci);
    if (font) sayfaNumarasi(hedef, font, `${i + 1} / ${toplam}`, aci);
  }
  return yeni.save();
}

// ---------------------------------------------------------------------------
// Sayfa üzerine eklenenler (yazı, örtme kutusu, vurgu, imza/resim). Konumlar, sayfanın ekranda göründüğü
// hâline (döndürülmüş) göre 0–1 arası oranlardır: u soldan, v üstten. Yazılar tarayıcıda resme çevrilip
// eklenir; böylece Türkçe karakterler her yazı tipinde doğru görünür.

export type Ek =
  | { tur: 'kutu'; u0: number; v0: number; u1: number; v1: number; renk: [number, number, number]; opaklik: number }
  | { tur: 'resim'; u0: number; v0: number; u1: number; v1: number; png: Uint8Array };

/** Ekrandaki (döndürülmüş sayfa) oran → PDF noktası. W, H: sayfanın döndürülmemiş genişlik ve yüksekliği. */
export function ekrandanPdfe(u: number, v: number, aci: Donus, W: number, H: number): { x: number; y: number } {
  switch (aci) {
    case 90:
      return { x: v * W, y: u * H };
    case 180:
      return { x: (1 - u) * W, y: v * H };
    case 270:
      return { x: (1 - v) * W, y: (1 - u) * H };
    default:
      return { x: u * W, y: (1 - v) * H };
  }
}

/** Ekrandaki dikdörtgen → PDF'te eksenlere paralel dikdörtgen. */
export function kutuPdf(u0: number, v0: number, u1: number, v1: number, aci: Donus, W: number, H: number) {
  const a = ekrandanPdfe(u0, v0, aci, W, H);
  const b = ekrandanPdfe(u1, v1, aci, W, H);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/** Resim, ekranda dik görünecek biçimde: sol alt köşesi, genişliği, yüksekliği ve döndürme açısı. */
export function resimYerlesimi(u0: number, v0: number, u1: number, v1: number, aci: Donus, W: number, H: number) {
  const solAlt = ekrandanPdfe(u0, v1, aci, W, H);
  const [gW, gH] = aci === 90 || aci === 270 ? [H, W] : [W, H];
  return { x: solAlt.x, y: solAlt.y, w: (u1 - u0) * gW, h: (v1 - v0) * gH, aci };
}

async function ekCiz(doc: PDFDocument, sayfa: Sayfa, ek: Ek, aci: Donus) {
  const kutu = sayfa.getCropBox();
  const W = kutu.width;
  const H = kutu.height;
  if (ek.tur === 'kutu') {
    const k = kutuPdf(ek.u0, ek.v0, ek.u1, ek.v1, aci, W, H);
    sayfa.drawRectangle({ x: kutu.x + k.x, y: kutu.y + k.y, width: k.w, height: k.h, color: rgb(...ek.renk), opacity: ek.opaklik });
  } else {
    const resim = await doc.embedPng(ek.png);
    const r = resimYerlesimi(ek.u0, ek.v0, ek.u1, ek.v1, aci, W, H);
    sayfa.drawImage(resim, { x: kutu.x + r.x, y: kutu.y + r.y, width: r.w, height: r.h, rotate: degrees(r.aci) });
  }
}

type Sayfa = ReturnType<PDFDocument['getPages']>[number];
type Font = Awaited<ReturnType<PDFDocument['embedFont']>>;

/** Numarayı, sayfa nasıl döndürülmüş olursa olsun görünen alt kenarın ortasına yazar. */
function sayfaNumarasi(sayfa: Sayfa, font: Font, metin: string, aci: Donus) {
  const { width: w, height: h } = sayfa.getSize();
  const boyut = 9;
  const tw = font.widthOfTextAtSize(metin, boyut);
  const k = 18;
  const konum = {
    0: { x: w / 2 - tw / 2, y: k, r: 0 },
    90: { x: w - k, y: h / 2 - tw / 2, r: 90 },
    180: { x: w / 2 + tw / 2, y: h - k, r: 180 },
    270: { x: k, y: h / 2 + tw / 2, r: 270 },
  }[aci];
  sayfa.drawText(metin, { x: konum.x, y: konum.y, size: boyut, font, color: rgb(0.35, 0.4, 0.48), rotate: degrees(konum.r) });
}
