import { useEffect, useRef, useState } from 'preact/hooks';
import { downloadPng, downloadSvg, loadQr, makeMatrix, matrixToSvg, type QrMatrix } from '../lib/qr';

/** Sayfanın kendi adresi (paylaşım parametreleri dahil, gömme parametresi ve # hariç). */
function pageUrl(): string {
  const u = new URL(window.location.href);
  u.hash = '';
  u.searchParams.delete('gomulu');
  return u.href;
}

/** QR kodu gösteren küçük pencere. Üst çubuktaki kısayol ve sonuç paylaşımı ortak kullanır. */
export function QrPopover({ text, title, onClose }: { text: string; title: string; onClose: () => void }) {
  const [matrix, setMatrix] = useState<QrMatrix | null>(null);
  const [error, setError] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadQr()
      .then((f) => alive && setMatrix(makeMatrix(f, text, 'M')))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (boxRef.current && !boxRef.current.contains(t) && !t.closest('[data-qr-trigger]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    boxRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [onClose]);

  return (
    <div class="qr-pop" role="dialog" aria-label={title} tabIndex={-1} ref={boxRef}>
      <div class="qr-pop__head">
        <strong>{title}</strong>
        <button type="button" class="qr-pop__close" aria-label="Kapat" onClick={onClose}>
          ×
        </button>
      </div>
      <div class="qr-pop__code">
        {error ? (
          <p class="field__error">QR kod oluşturulamadı.</p>
        ) : matrix ? (
          <div class="qr-pop__svg" dangerouslySetInnerHTML={{ __html: matrixToSvg(matrix) }} />
        ) : (
          <p class="field__hint">Hazırlanıyor…</p>
        )}
      </div>
      <p class="qr-pop__hint">Telefon kamerasıyla okutun, sayfa aynı bilgilerle açılır.</p>
      <div class="qr-pop__actions">
        <button type="button" class="btn btn--small" disabled={!matrix} onClick={() => matrix && downloadPng(matrix, 'hesap-robotu-qr.png')}>
          PNG indir
        </button>
        <button type="button" class="btn btn--small" disabled={!matrix} onClick={() => matrix && downloadSvg(matrix, 'hesap-robotu-qr.svg')}>
          SVG indir
        </button>
        <a class="btn btn--small" href="/qr-kod-olusturucu/">
          Kendi QR’ını yap
        </a>
      </div>
    </div>
  );
}

/** Üst çubuktaki QR düğmesi: bulunduğunuz sayfanın QR kodu. */
export default function PageQr() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  return (
    <div class="qr-anchor">
      <button
        type="button"
        class="icon-btn"
        data-qr-trigger
        aria-label="Bu sayfanın QR kodu"
        aria-expanded={open}
        title="QR kod"
        onClick={() => {
          setText(pageUrl());
          setOpen((o) => !o);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
          <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
          <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
          <path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 18v2.5" />
        </svg>
      </button>
      {open && <QrPopover text={text} title="Bu sayfanın QR kodu" onClose={() => setOpen(false)} />}
    </div>
  );
}
