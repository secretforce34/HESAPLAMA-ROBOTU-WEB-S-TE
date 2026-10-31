// Hesap sonucunu PDF'ye kaydetme: sonuç, girdiler ve hesabı yeniden açan QR kod tek sayfalık temiz bir
// düzene konur ve tarayıcının yazdırma penceresi açılır ("PDF olarak kaydet"). Dış servis kullanılmaz.
import { loadQr, makeMatrix, matrixToSvg } from './qr';

export interface PdfGirdisi {
  /** Robotun adı (sayfa başlığı) */
  baslik: string;
  /** Girdilerin ve sonucun düz metin özeti */
  ozet: string;
  /** Hesabı aynı değerlerle yeniden açan bağlantı */
  url: string;
  /** Sonuç alanları (kopyaları belgeye konur) */
  icerik: Element[];
}

const el = (etiket: string, sinif?: string, metin?: string) => {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
};

/**
 * Hazır bir belgeyi (Word önizlemesi, Excel tablosu) yazdırma penceresiyle PDF'e kaydettirir.
 * `sayfaCss`: @page kuralı, ör. "size: 595pt 842pt; margin: 0".
 */
export function belgeyiYazdir(icerik: Node, baslik: string, sayfaCss: string): void {
  document.getElementById('yazdir-alani')?.remove();
  const alan = el('div', 'yz-belge');
  alan.id = 'yazdir-alani';
  alan.append(icerik);
  const stil = el('style');
  stil.textContent = `@page { ${sayfaCss} }`;
  document.head.append(stil);
  document.body.append(alan);
  const root = document.documentElement;
  const eskiBaslik = document.title;
  document.title = baslik;
  root.classList.add('yazdiriliyor');
  const bitir = () => {
    root.classList.remove('yazdiriliyor');
    document.title = eskiBaslik;
    alan.remove();
    stil.remove();
    window.removeEventListener('afterprint', bitir);
  };
  window.addEventListener('afterprint', bitir);
  window.print();
}

export async function pdfeKaydet(g: PdfGirdisi): Promise<void> {
  document.getElementById('yazdir-alani')?.remove();
  const alan = el('div');
  alan.id = 'yazdir-alani';

  const tarih = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  const ust = el('header', 'yz-ust');
  const sol = el('div');
  sol.append(el('div', 'yz-marka', 'Hesap Robotu'), el('h1', 'yz-baslik', g.baslik), el('div', 'yz-tarih', `Hesaplama tarihi: ${tarih}`));
  ust.append(sol);
  try {
    const f = await loadQr();
    const qr = el('figure', 'yz-qr');
    const kod = el('div');
    // QR SVG'si kendi kodumuzla üretilir (kullanıcı metni içermez)
    kod.innerHTML = matrixToSvg(makeMatrix(f, g.url, 'M'), { margin: 2 });
    qr.append(kod, el('figcaption', undefined, 'Hesabı yeniden açmak için okutun'));
    ust.append(qr);
  } catch {
    /* QR üretilemezse belge QR'sız hazırlanır */
  }
  alan.append(ust);

  if (g.ozet.trim()) {
    const ozet = el('section', 'yz-ozet');
    ozet.append(el('h2', undefined, 'Özet'), el('pre', undefined, g.ozet));
    alan.append(ozet);
  }

  for (const kaynak of g.icerik) {
    const klon = kaynak.cloneNode(true) as HTMLElement;
    klon.querySelectorAll('.share-bar, .qr-pop, button').forEach((x) => x.remove());
    klon.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
    const sonuc = el('section', 'yz-sonuc');
    sonuc.append(klon);
    alan.append(sonuc);
  }

  const alt = el('footer', 'yz-alt');
  alt.append(
    el('p', undefined, 'Sonuçlar bilgilendirme amaçlıdır; hukuki, mali veya yatırım tavsiyesi değildir. Kesin tutarlar için ilgili kurumla teyit edin.'),
    el('p', 'yz-link', g.url),
  );
  alan.append(alt);
  document.body.append(alan);

  const root = document.documentElement;
  const eskiBaslik = document.title;
  // PDF dosyasının adı sayfa başlığından gelir
  document.title = `${g.baslik} – Hesap Robotu`;
  root.classList.add('yazdiriliyor');
  const bitir = () => {
    root.classList.remove('yazdiriliyor');
    document.title = eskiBaslik;
    alan.remove();
    window.removeEventListener('afterprint', bitir);
  };
  window.addEventListener('afterprint', bitir);
  window.print();
}
