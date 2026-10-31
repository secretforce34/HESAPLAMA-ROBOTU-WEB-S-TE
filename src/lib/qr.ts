// QR kod çizimi. Kodlama qrcode-generator (MIT) kütüphanesiyle tarayıcıda yapılır; dış servis yok.
// Kütüphane yalnızca QR istendiğinde yüklenir (sayfa açılışını yavaşlatmaz).
import type qrcodeFactory from 'qrcode-generator';

export type Ecc = 'L' | 'M' | 'Q' | 'H';
type Factory = typeof qrcodeFactory;

export interface QrMatrix {
  size: number;
  dark: boolean[][];
}

let factory: Promise<Factory> | null = null;

export function loadQr(): Promise<Factory> {
  factory ??= import('qrcode-generator').then((m) => {
    const f = ((m as unknown as { default?: Factory }).default ?? m) as Factory;
    // Türkçe karakterler (ç, ğ, ı, ö, ş, ü) için UTF-8 kodlama
    f.stringToBytes = f.stringToBytesFuncs['UTF-8'];
    return f;
  });
  return factory;
}

/** Metni QR matrisine çevirir; sürüm (boyut) otomatik seçilir. Metin sığmazsa hata fırlatır. */
export function makeMatrix(f: Factory, text: string, ecc: Ecc = 'M'): QrMatrix {
  const qr = f(0, ecc);
  qr.addData(text, 'Byte');
  qr.make();
  const size = qr.getModuleCount();
  const dark = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => qr.isDark(r, c)));
  return { size, dark };
}

export interface DrawOptions {
  /** Kenar boşluğu (modül sayısı); standart en az 4 */
  margin?: number;
  fg?: string;
  bg?: string;
}

export function matrixToSvg(m: QrMatrix, { margin = 4, fg = '#000000', bg = '#ffffff' }: DrawOptions = {}): string {
  const total = m.size + margin * 2;
  let d = '';
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (m.dark[r][c]) d += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }
  const bgRect = bg === 'transparent' ? '' : `<rect width="${total}" height="${total}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">${bgRect}<path d="${d}" fill="${fg}"/></svg>`;
}

/** Matrisi tuvale çizer; `px` toplam genişliktir (modül başına tam piksel kullanılır). */
export function matrixToCanvas(m: QrMatrix, canvas: HTMLCanvasElement, px: number, { margin = 4, fg = '#000000', bg = '#ffffff' }: DrawOptions = {}): void {
  const total = m.size + margin * 2;
  const cell = Math.max(1, Math.floor(px / total));
  canvas.width = canvas.height = cell * total;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (bg === 'transparent') ctx.clearRect(0, 0, canvas.width, canvas.height);
  else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = fg;
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (m.dark[r][c]) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
    }
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPng(m: QrMatrix, filename: string, px = 1024, opts: DrawOptions = {}): void {
  const canvas = document.createElement('canvas');
  matrixToCanvas(m, canvas, px, opts);
  canvas.toBlob((b) => b && downloadBlob(b, filename), 'image/png');
}

export function downloadSvg(m: QrMatrix, filename: string, opts: DrawOptions = {}): void {
  downloadBlob(new Blob([matrixToSvg(m, opts)], { type: 'image/svg+xml' }), filename);
}
