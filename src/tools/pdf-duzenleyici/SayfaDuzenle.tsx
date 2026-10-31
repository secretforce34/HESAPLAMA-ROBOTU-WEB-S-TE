// Tek sayfa düzenleme penceresi: yazı değiştirme (eski yazıyı örtüp yenisini yazma), yazı ekleme, örtme kutusu,
// vurgulama, imza ve resim ekleme. Konumlar sayfanın ekranda görünen hâline göre 0–1 oranlarıyla tutulur.
import { useEffect, useRef, useState } from 'preact/hooks';
import { pdfAc, pdfKapat } from '../../lib/pdf';
import { parcaOf } from '../pdf-donusturucu/calc';
import type { Donus } from './calc';

export type OgeTur = 'yazi' | 'kutu' | 'vurgu' | 'resim';

export interface Oge {
  id: number;
  tur: OgeTur;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** yazı */
  metin?: string;
  /** yazı boyutu (pt) */
  boyut?: number;
  renk?: string;
  kalin?: boolean;
  /** resim/imza (data URL) */
  src?: string;
}

export interface SayfaEkleri {
  ogeler: Oge[];
  /** Sayfanın ekranda görünen genişliği ve yüksekliği (pt, döndürme dahil) */
  pt: { w: number; h: number };
}

type Arac = 'sec' | 'degistir' | 'yazi' | 'kutu' | 'vurgu';

interface MetinKutusu {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  str: string;
  boyutPt: number;
}

const ARACLAR: { id: Arac; ad: string; ipucu: string }[] = [
  { id: 'degistir', ad: 'Yazıyı değiştir', ipucu: 'Sayfadaki bir yazıya tıklayın: üstü örtülür, yerine yazacağınız yazı gelir.' },
  { id: 'yazi', ad: 'Yazı ekle', ipucu: 'Yazının başlayacağı yere tıklayıp yazın.' },
  { id: 'kutu', ad: 'Örtme kutusu', ipucu: 'Gizlemek istediğiniz alanın üstünde sürükleyerek beyaz kutu çizin.' },
  { id: 'vurgu', ad: 'Vurgula', ipucu: 'İşaretlemek istediğiniz yazının üstünde sürükleyin.' },
  { id: 'sec', ad: 'Taşı / seç', ipucu: 'Eklediklerinizi sürükleyerek taşıyın; seçip silebilir ya da boyutunu değiştirebilirsiniz.' },
];

let sayac = 1;

export default function SayfaDuzenle({
  bytes,
  sayfaNo,
  donus,
  baslangic,
  onKaydet,
  onKapat,
}: {
  bytes: Uint8Array;
  /** Kaynak dosyadaki sayfa (1'den) */
  sayfaNo: number;
  donus: Donus;
  baslangic?: SayfaEkleri;
  onKaydet: (e: SayfaEkleri) => void;
  onKapat: () => void;
}) {
  const [resim, setResim] = useState<string | null>(null);
  const [pt, setPt] = useState<{ w: number; h: number } | null>(baslangic?.pt ?? null);
  const [metinler, setMetinler] = useState<MetinKutusu[]>([]);
  const [ogeler, setOgeler] = useState<Oge[]>(baslangic?.ogeler ?? []);
  const [arac, setArac] = useState<Arac>('degistir');
  const [secili, setSecili] = useState<number | null>(null);
  const [boyut, setBoyut] = useState(12);
  const [renk, setRenk] = useState('#000000');
  const [kalin, setKalin] = useState(false);
  const [imzaAcik, setImzaAcik] = useState(false);
  const [genislik, setGenislik] = useState(800);
  const alan = useRef<HTMLDivElement>(null);
  const cizim = useRef<{ id: number; u: number; v: number } | null>(null);
  const tasima = useRef<{ id: number; du: number; dv: number } | null>(null);
  const odak = useRef<number | null>(null);

  // Sayfayı çiz, yazıların konumlarını oku
  useEffect(() => {
    let iptal = false;
    (async () => {
      const doc = await pdfAc(bytes);
      const sayfa = await doc.getPage(sayfaNo);
      const aci = (sayfa.rotate + donus) % 360;
      const v1 = sayfa.getViewport({ scale: 1, rotation: aci });
      const hedef = Math.min(1400, Math.max(900, v1.width * 2));
      const viewport = sayfa.getViewport({ scale: hedef / v1.width, rotation: aci });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await sayfa.render({ canvas, viewport }).promise;
      const icerik = await sayfa.getTextContent();
      const kutular: MetinKutusu[] = [];
      for (const it of icerik.items) {
        if (!('str' in it) || !it.str.trim()) continue;
        const p = parcaOf(it);
        const a = viewport.convertToViewportPoint(p.x, p.y - p.h * 0.22);
        const b = viewport.convertToViewportPoint(p.x + p.w, p.y + p.h * 0.95);
        kutular.push({
          u0: Math.min(a[0], b[0]) / viewport.width,
          v0: Math.min(a[1], b[1]) / viewport.height,
          u1: Math.max(a[0], b[0]) / viewport.width,
          v1: Math.max(a[1], b[1]) / viewport.height,
          str: p.str,
          boyutPt: p.h,
        });
      }
      await pdfKapat(doc);
      if (iptal) return;
      setPt({ w: v1.width, h: v1.height });
      setMetinler(kutular);
      setResim(canvas.toDataURL('image/png'));
    })();
    return () => {
      iptal = true;
    };
  }, [bytes, sayfaNo, donus]);

  useEffect(() => {
    const olc = () => alan.current && setGenislik(alan.current.clientWidth);
    olc();
    window.addEventListener('resize', olc);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !imzaAcik && onKapat();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('resize', olc);
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [resim, imzaAcik]);

  useEffect(() => {
    if (odak.current === null) return;
    const input = alan.current?.querySelector<HTMLInputElement>(`[data-oge="${odak.current}"] input`);
    input?.focus();
    input?.select();
    odak.current = null;
  });

  /** Ekran pikseli / pt */
  const olcek = pt ? genislik / pt.w : 1;

  const konum = (e: PointerEvent) => {
    const r = alan.current!.getBoundingClientRect();
    return { u: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), v: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  const guncelle = (id: number, f: Partial<Oge>) => setOgeler((l) => l.map((o) => (o.id === id ? { ...o, ...f } : o)));
  const sil = (id: number) => {
    setOgeler((l) => l.filter((o) => o.id !== id));
    setSecili(null);
  };

  const yaziEkle = (u: number, v: number, metin = '', boyutPt = boyut) => {
    const id = sayac++;
    setOgeler((l) => [...l, { id, tur: 'yazi', u0: u, v0: v, u1: u, v1: v, metin, boyut: Math.round(boyutPt * 10) / 10, renk, kalin }]);
    setSecili(id);
    odak.current = id;
  };

  const asagi = (e: PointerEvent) => {
    if (!pt || (e.target as HTMLElement).closest('[data-oge]')) return;
    const { u, v } = konum(e);
    setSecili(null);
    if (arac === 'yazi') yaziEkle(u, v);
    else if (arac === 'degistir') {
      const m = metinler.find((k) => u >= k.u0 && u <= k.u1 && v >= k.v0 && v <= k.v1);
      if (!m) return;
      const pay = 0.002;
      setOgeler((l) => [...l, { id: sayac++, tur: 'kutu', u0: m.u0 - pay, v0: m.v0 - pay, u1: m.u1 + pay, v1: m.v1 + pay, renk: '#ffffff' }]);
      yaziEkle(m.u0, m.v0 + (m.v1 - m.v0) * 0.04, m.str, m.boyutPt);
    } else if (arac === 'kutu' || arac === 'vurgu') {
      const id = sayac++;
      cizim.current = { id, u, v };
      setOgeler((l) => [...l, { id, tur: arac, u0: u, v0: v, u1: u, v1: v, renk: arac === 'kutu' ? '#ffffff' : '#ffe234' }]);
      alan.current?.setPointerCapture(e.pointerId);
    }
  };

  const hareket = (e: PointerEvent) => {
    if (cizim.current) {
      const { u, v } = konum(e);
      const c = cizim.current;
      guncelle(c.id, { u0: Math.min(c.u, u), v0: Math.min(c.v, v), u1: Math.max(c.u, u), v1: Math.max(c.v, v) });
    } else if (tasima.current) {
      const { u, v } = konum(e);
      const t = tasima.current;
      setOgeler((l) =>
        l.map((o) => {
          if (o.id !== t.id) return o;
          const w = o.u1 - o.u0;
          const h = o.v1 - o.v0;
          const u0 = Math.min(1 - w, Math.max(0, u - t.du));
          const v0 = Math.min(1 - h, Math.max(0, v - t.dv));
          return { ...o, u0, v0, u1: u0 + w, v1: v0 + h };
        }),
      );
    }
  };

  const yukari = () => {
    if (cizim.current) {
      const id = cizim.current.id;
      // Yanlışlıkla tıklama: çok küçük kutu silinir
      setOgeler((l) => l.filter((o) => o.id !== id || o.u1 - o.u0 > 0.005 || o.v1 - o.v0 > 0.005));
      setSecili(id);
    }
    cizim.current = null;
    tasima.current = null;
  };

  const ogeAsagi = (e: PointerEvent, o: Oge) => {
    setSecili(o.id);
    if ((e.target as HTMLElement).tagName === 'INPUT' && arac !== 'sec') return;
    if ((e.target as HTMLElement).closest('.sd-oge__sil')) return;
    const { u, v } = konum(e);
    tasima.current = { id: o.id, du: u - o.u0, dv: v - o.v0 };
    alan.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const resimEkle = (src: string, oran: number) => {
    if (!pt) return;
    const id = sayac++;
    const w = 0.3;
    const h = (w * pt.w) / oran / pt.h;
    setOgeler((l) => [...l, { id, tur: 'resim', u0: 0.35, v0: 0.45, u1: 0.35 + w, v1: 0.45 + h, src }]);
    setSecili(id);
    setArac('sec');
  };

  const resimDosya = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => resimEkle(String(r.result), img.width / img.height);
      img.src = String(r.result);
    };
    r.readAsDataURL(f);
  };

  const seciliOge = ogeler.find((o) => o.id === secili) ?? null;
  const aracBilgi = ARACLAR.find((a) => a.id === arac)!;

  return (
    <div class="sd" role="dialog" aria-modal="true" aria-label="Sayfayı düzenle">
      <div class="sd__panel">
        <div class="sd__ust">
          <strong>Sayfayı düzenle</strong>
          <div class="sd__ust-sag">
            <button type="button" class="btn btn--small" onClick={onKapat}>
              Vazgeç
            </button>
            <button type="button" class="btn btn--small btn--primary" disabled={!pt} onClick={() => pt && onKaydet({ ogeler, pt })}>
              Kaydet
            </button>
          </div>
        </div>

        <div class="sd__araclar" role="toolbar" aria-label="Düzenleme araçları">
          {ARACLAR.map((a) => (
            <button type="button" key={a.id} class={`btn btn--small${arac === a.id ? ' btn--primary' : ''}`} onClick={() => setArac(a.id)}>
              {a.ad}
            </button>
          ))}
          <button type="button" class="btn btn--small" onClick={() => setImzaAcik(true)}>
            İmza çiz
          </button>
          <label class="btn btn--small">
            Resim ekle
            <input type="file" accept="image/png,image/jpeg,image/webp" class="visually-hidden" onChange={(e) => e.currentTarget.files?.[0] && resimDosya(e.currentTarget.files[0])} />
          </label>
        </div>

        <div class="sd__ayar">
          <span class="field__hint">{aracBilgi.ipucu}</span>
          <span class="sd__ayar-sag">
            {(seciliOge?.tur === 'yazi' || arac === 'yazi' || arac === 'degistir') && (
              <>
                <label>
                  Boyut{' '}
                  <input
                    type="number"
                    min={4}
                    max={96}
                    step={0.5}
                    value={seciliOge?.tur === 'yazi' ? seciliOge.boyut : boyut}
                    onInput={(e) => {
                      const n = Number(e.currentTarget.value) || 12;
                      setBoyut(n);
                      if (seciliOge?.tur === 'yazi') guncelle(seciliOge.id, { boyut: n });
                    }}
                  />
                </label>
                <label>
                  Renk{' '}
                  <input
                    type="color"
                    value={seciliOge?.tur === 'yazi' ? seciliOge.renk : renk}
                    onInput={(e) => {
                      setRenk(e.currentTarget.value);
                      if (seciliOge?.tur === 'yazi') guncelle(seciliOge.id, { renk: e.currentTarget.value });
                    }}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={seciliOge?.tur === 'yazi' ? !!seciliOge.kalin : kalin}
                    onChange={(e) => {
                      setKalin(e.currentTarget.checked);
                      if (seciliOge?.tur === 'yazi') guncelle(seciliOge.id, { kalin: e.currentTarget.checked });
                    }}
                  />{' '}
                  Kalın
                </label>
              </>
            )}
            {seciliOge?.tur === 'kutu' && (
              <label>
                Kutu rengi <input type="color" value={seciliOge.renk} onInput={(e) => guncelle(seciliOge.id, { renk: e.currentTarget.value })} />
              </label>
            )}
            {seciliOge?.tur === 'resim' && pt && (
              <label>
                Genişlik{' '}
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={Math.round((seciliOge.u1 - seciliOge.u0) * 100)}
                  onInput={(e) => {
                    const w = Number(e.currentTarget.value) / 100;
                    const oran = (seciliOge.u1 - seciliOge.u0) / (seciliOge.v1 - seciliOge.v0);
                    guncelle(seciliOge.id, { u1: seciliOge.u0 + w, v1: seciliOge.v0 + w / oran });
                  }}
                />
              </label>
            )}
            {seciliOge && (
              <button type="button" class="btn btn--small" onClick={() => sil(seciliOge.id)}>
                Seçileni sil
              </button>
            )}
          </span>
        </div>

        <div class="sd__sahne">
          {resim ? (
            <div
              ref={alan}
              class={`sd__sayfa sd__sayfa--${arac}`}
              onPointerDown={asagi}
              onPointerMove={hareket}
              onPointerUp={yukari}
              onPointerCancel={yukari}
            >
              <img src={resim} alt="Düzenlenen sayfa" draggable={false} />
              {arac === 'degistir' &&
                metinler.map((m, i) => (
                  <span
                    key={`m${i}`}
                    class="sd__metin"
                    style={{ left: `${m.u0 * 100}%`, top: `${m.v0 * 100}%`, width: `${(m.u1 - m.u0) * 100}%`, height: `${(m.v1 - m.v0) * 100}%` }}
                  />
                ))}
              {ogeler.map((o) => (
                <div
                  key={o.id}
                  data-oge={o.id}
                  class={`sd-oge sd-oge--${o.tur}${secili === o.id ? ' is-secili' : ''}`}
                  style={{
                    left: `${o.u0 * 100}%`,
                    top: `${o.v0 * 100}%`,
                    ...(o.tur === 'yazi' ? {} : { width: `${(o.u1 - o.u0) * 100}%`, height: `${(o.v1 - o.v0) * 100}%` }),
                    ...(o.tur === 'kutu' ? { background: o.renk } : {}),
                  }}
                  onPointerDown={(e) => ogeAsagi(e, o)}
                >
                  {o.tur === 'yazi' && (
                    <input
                      value={o.metin}
                      size={Math.max(2, (o.metin ?? '').length + 1)}
                      style={{ fontSize: `${(o.boyut ?? 12) * olcek}px`, color: o.renk, fontWeight: o.kalin ? 700 : 400 }}
                      onInput={(e) => guncelle(o.id, { metin: e.currentTarget.value })}
                      aria-label="Eklenen yazı"
                    />
                  )}
                  {o.tur === 'resim' && <img src={o.src} alt="" draggable={false} />}
                  {secili === o.id && (
                    <button type="button" class="sd-oge__sil" aria-label="Sil" onClick={() => sil(o.id)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p class="field__hint">Sayfa hazırlanıyor…</p>
          )}
        </div>
      </div>
      {imzaAcik && (
        <ImzaPad
          onIptal={() => setImzaAcik(false)}
          onEkle={(src, oran) => {
            setImzaAcik(false);
            resimEkle(src, oran);
          }}
        />
      )}
    </div>
  );
}

/** Fareyle ya da parmakla imza çizme alanı; saydam zeminli PNG üretir. */
function ImzaPad({ onEkle, onIptal }: { onEkle: (src: string, oran: number) => void; onIptal: () => void }) {
  const tuval = useRef<HTMLCanvasElement>(null);
  const ciziyor = useRef(false);
  const [bos, setBos] = useState(true);
  const [renk, setRenk] = useState('#0d3461');

  useEffect(() => {
    const c = tuval.current!;
    c.width = 600;
    c.height = 220;
  }, []);

  const nokta = (e: PointerEvent) => {
    const c = tuval.current!;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height] as const;
  };

  return (
    <div class="sd-imza" role="dialog" aria-label="İmza çiz">
      <div class="sd-imza__kutu">
        <strong>İmzanızı çizin</strong>
        <canvas
          ref={tuval}
          class="sd-imza__tuval"
          onPointerDown={(e) => {
            const ctx = tuval.current!.getContext('2d')!;
            const [x, y] = nokta(e);
            ctx.strokeStyle = renk;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ciziyor.current = true;
            tuval.current!.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!ciziyor.current) return;
            const ctx = tuval.current!.getContext('2d')!;
            const [x, y] = nokta(e);
            ctx.lineTo(x, y);
            ctx.stroke();
            setBos(false);
          }}
          onPointerUp={() => (ciziyor.current = false)}
        />
        <div class="share-bar">
          <label class="field__hint">
            Renk <input type="color" value={renk} onInput={(e) => setRenk(e.currentTarget.value)} />
          </label>
          <button
            type="button"
            class="btn btn--small"
            onClick={() => {
              const c = tuval.current!;
              c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
              setBos(true);
            }}
          >
            Temizle
          </button>
          <button type="button" class="btn btn--small" onClick={onIptal}>
            Vazgeç
          </button>
          <button type="button" class="btn btn--small btn--primary" disabled={bos} onClick={() => {
              const k = kirp(tuval.current!);
              onEkle(k.src, k.oran);
            }}>
            Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

/** İmzanın etrafındaki boşluğu kırpar; PNG ve en/boy oranını döndürür. */
function kirp(c: HTMLCanvasElement): { src: string; oran: number } {
  const ctx = c.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = c.width;
  let y0 = c.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  const pay = 6;
  x0 = Math.max(0, x0 - pay);
  y0 = Math.max(0, y0 - pay);
  x1 = Math.min(c.width, x1 + pay);
  y1 = Math.min(c.height, y1 + pay);
  const k = document.createElement('canvas');
  k.width = Math.max(1, x1 - x0);
  k.height = Math.max(1, y1 - y0);
  k.getContext('2d')!.drawImage(c, x0, y0, k.width, k.height, 0, 0, k.width, k.height);
  return { src: k.toDataURL('image/png'), oran: k.width / k.height };
}
