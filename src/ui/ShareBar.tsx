import { useState } from 'preact/hooks';
import { buildShareUrl, type ShareValue } from './url';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Sonucu paylaşma düğmeleri. `params` hesaplayıcının girdileridir; bağlantıya
 * yalnızca kullanıcı bastığında eklenir. `summary` panoya kopyalanacak düz metindir.
 */
export function ShareBar({ params, summary }: { params: Record<string, ShareValue>; summary: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2200);
  };

  const onLink = async () => {
    const url = buildShareUrl(params);
    if (typeof navigator !== 'undefined' && 'share' in navigator && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: document.title, text: summary, url });
        return;
      } catch {
        /* kullanıcı vazgeçti ya da desteklenmiyor: panoya kopyala */
      }
    }
    flash((await copyText(url)) ? 'Bağlantı kopyalandı' : 'Kopyalanamadı');
  };

  const onCopy = async () => {
    flash((await copyText(summary)) ? 'Sonuç kopyalandı' : 'Kopyalanamadı');
  };

  return (
    <div class="share-bar">
      <button type="button" class="btn btn--small" onClick={onLink}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" stroke-linecap="round" />
        </svg>
        Bağlantıyı paylaş
      </button>
      <button type="button" class="btn btn--small" onClick={onCopy}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <rect x="7" y="7" width="10" height="10" rx="2" />
          <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        </svg>
        Sonucu kopyala
      </button>
      <span role="status" aria-live="polite" class="field__hint" style={{ alignSelf: 'center' }}>
        {msg}
      </span>
    </div>
  );
}
