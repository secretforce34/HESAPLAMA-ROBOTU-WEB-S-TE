import { useRef, useState } from 'preact/hooks';
import { zipSync } from 'fflate';
import { downloadBlob } from '../../lib/indir';
import { dosyaOku, kucukResim, pdfAc, pdfKapat, sifreHatasiMi, uzantisiz } from '../../lib/pdf';
import { CheckboxField, TextField } from '../../ui/fields';
import { Callout } from '../../ui/results';
import { DosyaSec } from '../../ui/DosyaSec';
import { aralikCoz, dondur, kaynaklariAc, pdfOlustur, sayfalariOlustur, SifreliPdfHatasi, tasi, type Ek, type SayfaRef } from './calc';
import { ekleriHazirla } from './ciz';
import SayfaDuzenle, { type SayfaEkleri } from './SayfaDuzenle';

const RENKLER = ['#3b82f6', '#ef4444', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#22c55e', '#64748b'];

interface Dosya {
  ad: string;
  bytes: Uint8Array;
  renk: string;
  sayfaSayisi: number;
}

const ikon = {
  sol: <path d="m15 6-6 6 6 6" />,
  sag: <path d="m9 6 6 6-6 6" />,
  saatYonu: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  tersYon: <path d="M4 11a8 8 0 1 1 2.3 5.7M4 4v7h7" />,
  sil: <path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  kalem: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
};
const Ikon = ({ ad }: { ad: keyof typeof ikon }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {ikon[ad]}
  </svg>
);

export default function Calculator() {
  const [dosyalar, setDosyalar] = useState<Dosya[]>([]);
  const [sayfalar, setSayfalar] = useState<SayfaRef[]>([]);
  const [resimler, setResimler] = useState<Record<string, string>>({});
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [aralik, setAralik] = useState('');
  const [aralikHata, setAralikHata] = useState<string | null>(null);
  const [sayfaNo, setSayfaNo] = useState(false);
  const [ad, setAd] = useState('');
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const surukle = useRef<number | null>(null);
  const [ekler, setEkler] = useState<Record<string, SayfaEkleri>>({});
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const ekSayisi = (id: string) => ekler[id]?.ogeler.length ?? 0;

  /** Yazı ve imzaları PDF'e yazılacak biçime çevirir. */
  const hazirEkler = async (liste: SayfaRef[]) => {
    const sonuc: Record<string, Ek[]> = {};
    for (const p of liste) if (ekSayisi(p.id)) sonuc[p.id] = await ekleriHazirla(ekler[p.id]);
    return sonuc;
  };

  const ekle = async (yeni: File[]) => {
    setHata(null);
    setBilgi(null);
    const pdfler = yeni.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfler.length < yeni.length) setHata('Yalnızca PDF dosyaları eklenebilir; diğerleri atlandı. Resimleri PDF yapmak için PDF Dönüştürücü’yü kullanın.');
    let sira = dosyalar.length;
    for (const f of pdfler) {
      setMesgul(`“${f.name}” açılıyor…`);
      try {
        const bytes = await dosyaOku(f);
        const doc = await pdfAc(bytes);
        const dosyaNo = sira++;
        const d: Dosya = { ad: f.name, bytes, renk: RENKLER[dosyaNo % RENKLER.length], sayfaSayisi: doc.numPages };
        const yeniSayfalar = sayfalariOlustur(dosyaNo, doc.numPages);
        setDosyalar((l) => [...l, d]);
        setSayfalar((l) => [...l, ...yeniSayfalar]);
        setAd((a) => a || uzantisiz(f.name));
        // Önizlemeler sırayla hazırlanır; büyük dosyada sayfa açılışını bekletmez
        for (const p of yeniSayfalar) {
          const r = await kucukResim(doc, p.sayfa + 1, 150);
          setResimler((m) => ({ ...m, [p.id]: r }));
        }
        await pdfKapat(doc);
      } catch (e) {
        setHata(sifreHatasiMi(e) ? `“${f.name}” şifreli. Şifresini kaldırıp yeniden ekleyin.` : `“${f.name}” açılamadı; dosya bozuk ya da PDF değil.`);
      }
    }
    setMesgul(null);
  };

  const guncelle = (id: string, f: (p: SayfaRef) => SayfaRef) => setSayfalar((l) => l.map((p) => (p.id === id ? f(p) : p)));
  const secimDegistir = (id: string) =>
    setSecili((s) => {
      const y = new Set(s);
      if (y.has(id)) y.delete(id);
      else y.add(id);
      return y;
    });

  const aralikSec = () => {
    const r = aralikCoz(aralik, sayfalar.length);
    setAralikHata(r.hata);
    if (!r.hata) setSecili(new Set(r.sira.map((i) => sayfalar[i].id)));
  };

  const uret = async (liste: SayfaRef[], dosyaAdi: string) => {
    const kaynaklar = await kaynaklariAc(dosyalar.map((d) => ({ ad: d.ad, bytes: d.bytes })));
    return { bytes: await pdfOlustur(kaynaklar, liste, { sayfaNo, baslik: uzantisiz(dosyaAdi), ekler: await hazirEkler(liste) }), dosyaAdi };
  };

  const calistir = async (is: () => Promise<void>, metin: string) => {
    setHata(null);
    setBilgi(null);
    setMesgul(metin);
    try {
      await is();
    } catch (e) {
      setHata(e instanceof SifreliPdfHatasi ? e.message : 'PDF oluşturulamadı. Dosyalardan biri bozuk olabilir.');
    } finally {
      setMesgul(null);
    }
  };

  const temelAd = (ad.trim() || 'belge').replace(/[\\/:*?"<>|]+/g, '-');
  const seciliSayfalar = sayfalar.filter((p) => secili.has(p.id));

  const indirTumu = () =>
    calistir(async () => {
      const r = await uret(sayfalar, `${temelAd}.pdf`);
      downloadBlob(new Blob([r.bytes as BlobPart], { type: 'application/pdf' }), r.dosyaAdi);
      setBilgi(`${sayfalar.length} sayfalık “${r.dosyaAdi}” indirildi.`);
    }, 'PDF hazırlanıyor…');

  const indirSecili = () =>
    calistir(async () => {
      const r = await uret(seciliSayfalar, `${temelAd}-secilen.pdf`);
      downloadBlob(new Blob([r.bytes as BlobPart], { type: 'application/pdf' }), r.dosyaAdi);
      setBilgi(`Seçilen ${seciliSayfalar.length} sayfa “${r.dosyaAdi}” olarak indirildi.`);
    }, 'Seçilen sayfalar hazırlanıyor…');

  const indirAyriAyri = () =>
    calistir(async () => {
      const kaynaklar = await kaynaklariAc(dosyalar.map((d) => ({ ad: d.ad, bytes: d.bytes })));
      const tumEkler = await hazirEkler(sayfalar);
      const dosyaMap: Record<string, Uint8Array> = {};
      for (let i = 0; i < sayfalar.length; i++) {
        dosyaMap[`${temelAd}-sayfa-${String(i + 1).padStart(String(sayfalar.length).length, '0')}.pdf`] = await pdfOlustur(kaynaklar, [sayfalar[i]], { sayfaNo: false, ekler: tumEkler });
      }
      downloadBlob(new Blob([zipSync(dosyaMap, { level: 0 }) as BlobPart], { type: 'application/zip' }), `${temelAd}-sayfalar.zip`);
      setBilgi(`${sayfalar.length} sayfa ayrı PDF olarak ZIP dosyasında indirildi.`);
    }, 'Sayfalar ayrılıyor…');

  const temizle = () => {
    setDosyalar([]);
    setSayfalar([]);
    setResimler({});
    setSecili(new Set());
    setEkler({});
    setAd('');
    setHata(null);
    setBilgi(null);
  };

  if (dosyalar.length === 0) {
    return (
      <div class="pdf-arac">
        <DosyaSec id="pd-dosya" kabul="application/pdf,.pdf" baslik="PDF dosyalarını buraya bırakın ya da seçin" alt="Birleştirmek için birden çok PDF seçin. Sonra sayfaları silebilir, döndürebilir, sıralayabilir, yazı ve imza ekleyebilirsiniz. Dosyalar bilgisayarınızdan çıkmaz." onSec={ekle} />
        {mesgul && <p class="field__hint">{mesgul}</p>}
        {hata && <Callout kind="danger">{hata}</Callout>}
      </div>
    );
  }

  return (
    <div class="pdf-arac">
      <div class="pdf-dosyalar">
        {dosyalar.map((d, i) => (
          <span class="pdf-dosya" style={{ '--tint': d.renk }} key={i}>
            <i />
            {d.ad} · {d.sayfaSayisi} sayfa
          </span>
        ))}
        <DosyaSec id="pd-dosya-ek" kabul="application/pdf,.pdf" baslik="+ PDF ekle (birleştir)" kucuk onSec={ekle} />
      </div>

      <div class="pdf-arac-cubugu">
        <div class="pdf-arac-cubugu__grup">
          <button type="button" class="btn btn--small" onClick={() => setSecili(new Set(sayfalar.map((p) => p.id)))}>
            Tümünü seç
          </button>
          <button type="button" class="btn btn--small" onClick={() => setSecili(new Set())} disabled={secili.size === 0}>
            Seçimi kaldır
          </button>
          <span class="pdf-aralik">
            <input
              type="text"
              class="input"
              value={aralik}
              placeholder="ör. 1-3, 5"
              aria-label="Seçilecek sayfa aralığı"
              onInput={(e) => setAralik(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && aralikSec()}
            />
            <button type="button" class="btn btn--small" onClick={aralikSec}>
              Seç
            </button>
          </span>
        </div>
        <div class="pdf-arac-cubugu__grup">
          <button
            type="button"
            class="btn btn--small"
            disabled={secili.size === 0}
            onClick={() => setSayfalar((l) => l.map((p) => (secili.has(p.id) && !ekSayisi(p.id) ? { ...p, donus: dondur(p.donus, 1) } : p)))}
          >
            <Ikon ad="saatYonu" /> Seçilenleri döndür
          </button>
          <button
            type="button"
            class="btn btn--small"
            disabled={secili.size === 0}
            onClick={() => {
              setSayfalar((l) => l.filter((p) => !secili.has(p.id)));
              setSecili(new Set());
            }}
          >
            <Ikon ad="sil" /> Seçilenleri sil
          </button>
        </div>
      </div>
      {aralikHata && <p class="field__error">{aralikHata}</p>}

      <ol class="pdf-sayfalar">
        {sayfalar.map((p, i) => {
          const d = dosyalar[p.dosya];
          return (
            <li
              key={p.id}
              class={`pdf-sayfa${secili.has(p.id) ? ' is-secili' : ''}`}
              draggable
              onDragStart={() => (surukle.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (surukle.current !== null) setSayfalar((l) => tasi(l, surukle.current!, i));
                surukle.current = null;
              }}
            >
              <label class="pdf-sayfa__resim" title="Seçmek için tıklayın">
                <input type="checkbox" checked={secili.has(p.id)} onChange={() => secimDegistir(p.id)} aria-label={`${i + 1}. sayfayı seç`} />
                {resimler[p.id] ? (
                  <img src={resimler[p.id]} alt="" style={{ transform: `rotate(${p.donus}deg)` }} />
                ) : (
                  <span class="pdf-sayfa__yukleniyor">…</span>
                )}
              </label>
              <div class="pdf-sayfa__alt">
                <span class="pdf-sayfa__no" style={{ '--tint': d.renk }}>
                  <i />
                  {i + 1}
                </span>
                <span class="pdf-sayfa__kaynak" title={d.ad}>
                  {ekSayisi(p.id) ? `✎ ${ekSayisi(p.id)} ekleme · ` : ''}s. {p.sayfa + 1}
                </span>
              </div>
              <button type="button" class="btn btn--small pdf-sayfa__duzenle" onClick={() => setDuzenlenen(p.id)}>
                <Ikon ad="kalem" /> Yazı / imza
              </button>
              <div class="pdf-sayfa__dugmeler">
                <button
                  type="button"
                  aria-label="Sola döndür"
                  title={ekSayisi(p.id) ? 'Yazı/imza eklenmiş sayfa döndürülemez' : 'Sola döndür'}
                  disabled={!!ekSayisi(p.id)}
                  onClick={() => guncelle(p.id, (x) => ({ ...x, donus: dondur(x.donus, -1) }))}
                >
                  <Ikon ad="tersYon" />
                </button>
                <button
                  type="button"
                  aria-label="Sağa döndür"
                  title={ekSayisi(p.id) ? 'Yazı/imza eklenmiş sayfa döndürülemez' : 'Sağa döndür'}
                  disabled={!!ekSayisi(p.id)}
                  onClick={() => guncelle(p.id, (x) => ({ ...x, donus: dondur(x.donus, 1) }))}
                >
                  <Ikon ad="saatYonu" />
                </button>
                <button type="button" aria-label="Öne al" title="Öne al" disabled={i === 0} onClick={() => setSayfalar((l) => tasi(l, i, i - 1))}>
                  <Ikon ad="sol" />
                </button>
                <button type="button" aria-label="Arkaya al" title="Arkaya al" disabled={i === sayfalar.length - 1} onClick={() => setSayfalar((l) => tasi(l, i, i + 1))}>
                  <Ikon ad="sag" />
                </button>
                <button
                  type="button"
                  aria-label="Sayfayı sil"
                  title="Sayfayı sil"
                  class="is-tehlike"
                  onClick={() => {
                    setSayfalar((l) => l.filter((x) => x.id !== p.id));
                    setSecili((s) => {
                      const y = new Set(s);
                      y.delete(p.id);
                      return y;
                    });
                  }}
                >
                  <Ikon ad="sil" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {sayfalar.length === 0 && <p class="result-empty">Bütün sayfalar silindi. Yeni PDF ekleyin ya da baştan başlayın.</p>}

      <div class="pdf-cikti">
        <div class="row-2">
          <TextField id="pd-ad" label="Dosya adı" value={ad} onChange={setAd} placeholder="belge" />
          <CheckboxField id="pd-sayfano" label="Sayfa numarası ekle" checked={sayfaNo} onChange={setSayfaNo} hint="Her sayfanın altına “3 / 12” biçiminde." />
        </div>
        <div class="share-bar">
          <button type="button" class="btn btn--primary" disabled={sayfalar.length === 0 || !!mesgul} onClick={indirTumu}>
            PDF’i indir ({sayfalar.length} sayfa)
          </button>
          <button type="button" class="btn" disabled={seciliSayfalar.length === 0 || !!mesgul} onClick={indirSecili}>
            Seçilenleri ayrı PDF indir ({seciliSayfalar.length})
          </button>
          <button type="button" class="btn" disabled={sayfalar.length < 2 || !!mesgul} onClick={indirAyriAyri}>
            Her sayfayı ayrı PDF yap (ZIP)
          </button>
          <button type="button" class="btn" onClick={temizle}>
            Baştan başla
          </button>
        </div>
        {mesgul && <p class="field__hint">{mesgul}</p>}
        {hata && <Callout kind="danger">{hata}</Callout>}
        {bilgi && <Callout kind="success">{bilgi}</Callout>}
        <p class="field__hint">Sayfaları sürükleyerek de sıralayabilirsiniz. Dosyalarınız bilgisayarınızda işlenir, hiçbir yere yüklenmez.</p>
      </div>
      {duzenlenen &&
        (() => {
          const p = sayfalar.find((x) => x.id === duzenlenen);
          if (!p) return null;
          return (
            <SayfaDuzenle
              bytes={dosyalar[p.dosya].bytes}
              sayfaNo={p.sayfa + 1}
              donus={p.donus}
              baslangic={ekler[p.id]}
              onKapat={() => setDuzenlenen(null)}
              onKaydet={(e) => {
                setEkler((m) => ({ ...m, [p.id]: e }));
                setDuzenlenen(null);
                setBilgi(e.ogeler.length ? `${e.ogeler.length} ekleme kaydedildi; PDF’i indirdiğinizde sayfaya işlenir.` : null);
              }}
            />
          );
        })()}
    </div>
  );
}
