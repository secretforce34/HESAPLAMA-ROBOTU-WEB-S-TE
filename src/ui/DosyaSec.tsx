import { useRef, useState } from 'preact/hooks';

/** Sürükle-bırak ya da tıklayarak dosya seçme alanı (PDF ve resim araçları). */
export function DosyaSec({
  id,
  kabul,
  coklu = true,
  baslik,
  alt,
  onSec,
  kucuk = false,
}: {
  id: string;
  /** input accept değeri, ör. "application/pdf" */
  kabul: string;
  coklu?: boolean;
  baslik: string;
  alt?: string;
  onSec: (dosyalar: File[]) => void;
  /** Dosya eklendikten sonra küçük düğme görünümü */
  kucuk?: boolean;
}) {
  const [ustunde, setUstunde] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const al = (liste: FileList | null) => {
    if (!liste || liste.length === 0) return;
    onSec(Array.from(liste));
    if (input.current) input.current.value = '';
  };

  return (
    <div
      class={`dosya-sec${ustunde ? ' is-over' : ''}${kucuk ? ' dosya-sec--kucuk' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setUstunde(true);
      }}
      onDragLeave={() => setUstunde(false)}
      onDrop={(e) => {
        e.preventDefault();
        setUstunde(false);
        al(e.dataTransfer?.files ?? null);
      }}
    >
      <input ref={input} id={id} type="file" accept={kabul} multiple={coklu} class="visually-hidden" onChange={(e) => al(e.currentTarget.files)} />
      <label for={id} class="dosya-sec__alan">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 16V4m0 0-4 4m4-4 4 4" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <span class="dosya-sec__baslik">{baslik}</span>
        {alt && !kucuk && <span class="dosya-sec__alt">{alt}</span>}
      </label>
    </div>
  );
}
