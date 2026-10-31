// PDF okuma ve sayfa görüntüsü (pdf.js, Apache-2.0). Kütüphane yalnızca PDF araçlarında, ihtiyaç anında yüklenir.
// Dosyalar tarayıcıda işlenir; hiçbir sunucuya gönderilmez.
import type { PDFDocumentProxy } from 'pdfjs-dist';

type PdfJs = typeof import('pdfjs-dist');
let yukleniyor: Promise<PdfJs> | null = null;

export function loadPdfjs(): Promise<PdfJs> {
  yukleniyor ??= (async () => {
    const pdfjs = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    return pdfjs;
  })();
  return yukleniyor;
}

/** PDF'i açar. pdf.js aldığı veriyi devraldığı için kopyası verilir; asıl baytlar düzenleme için saklanır. */
export async function pdfAc(bytes: Uint8Array, sifre?: string): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument({ data: bytes.slice(), password: sifre }).promise;
}

/** Bir sayfayı tuvale çizer. `olcek` 1 = 72 dpi; 150 dpi için 150/72. */
export async function sayfaCiz(doc: PDFDocumentProxy, sayfaNo: number, olcek: number, donus = 0): Promise<HTMLCanvasElement> {
  const sayfa = await doc.getPage(sayfaNo);
  const viewport = sayfa.getViewport({ scale: olcek, rotation: (sayfa.rotate + donus) % 360 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Saydam sayfalar JPG'de siyah çıkmasın
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  await sayfa.render({ canvas, viewport }).promise;
  sayfa.cleanup();
  return canvas;
}

/** Küçük önizleme (genişlik piksel olarak). */
export async function kucukResim(doc: PDFDocumentProxy, sayfaNo: number, genislik = 160): Promise<string> {
  const sayfa = await doc.getPage(sayfaNo);
  const v = sayfa.getViewport({ scale: 1 });
  const canvas = await sayfaCiz(doc, sayfaNo, genislik / v.width);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export function canvasBlob(canvas: HTMLCanvasElement, tur: 'image/png' | 'image/jpeg', kalite = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Görüntü oluşturulamadı'))), tur, kalite));
}

/** pdf.js'in şifre hatasını tanır. */
export function sifreHatasiMi(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'PasswordException';
}

export function dosyaOku(dosya: File): Promise<Uint8Array> {
  return dosya.arrayBuffer().then((b) => new Uint8Array(b));
}

/** "rapor.pdf" → "rapor" */
export function uzantisiz(ad: string): string {
  return ad.replace(/\.[^.]+$/, '') || 'belge';
}

/** Belgeyi ve pdf.js'in onun için ayırdığı belleği bırakır. */
export function pdfKapat(doc: PDFDocumentProxy): Promise<void> {
  return doc.loadingTask.destroy();
}
