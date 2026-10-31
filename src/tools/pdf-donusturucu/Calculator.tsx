import { useEffect, useRef, useState } from 'preact/hooks';
import { zipSync } from 'fflate';
import { downloadBlob } from '../../lib/indir';
import { canvasBlob, dosyaOku, pdfAc, pdfKapat, sayfaCiz, sifreHatasiMi, uzantisiz } from '../../lib/pdf';
import { formatNumber } from '../../lib/format';
import { CheckboxField, Segmented, TextField } from '../../ui/fields';
import { Callout } from '../../ui/results';
import { DosyaSec } from '../../ui/DosyaSec';
import { aralikCoz } from '../pdf-duzenleyici/calc';
import { ExceldenPdf, PdftenExcel, PdftenWord, WorddenPdf } from './OfisDonusum';
import { dpiOlcek, gorsellerdenPdf, metniBirlestir, resimDosyaAdi, type Gorsel, type SayfaBoyutu, type Yon } from './calc';

type Mod = 'word-pdf' | 'excel-pdf' | 'resim-pdf' | 'pdf-word' | 'pdf-excel' | 'pdf-resim' | 'pdf-metin';

interface ResimOge {
  id: number;
  dosya: File;
  url: string;
}

interface Cikti {
  ad: string;
  blob: Blob;
  url: string;
}

const boyutMetni = (b: number) => (b < 1024 * 1024 ? `${formatNumber(b / 1024, 0)} KB` : `${formatNumber(b / 1024 / 1024, 1)} MB`);

/** Resmi PDF'e konacak biçime getirir. Telefon fotoğraflarının yönü (EXIF) düzeltilir; istenirse küçültülür. */
async function hazirla(f: File, kucult: boolean): Promise<Gorsel> {
  const bmp = await createImageBitmap(f);
  if (f.type === 'image/png' && !kucult) {
    const g = { bytes: await dosyaOku(f), tur: 'png' as const, genislik: bmp.width, yukseklik: bmp.height };
    bmp.close();
    return g;
  }
  const enFazla = kucult ? 1600 : 4000;
  const o = Math.min(1, enFazla / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * o);
  canvas.height = Math.round(bmp.height * o);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await canvasBlob(canvas, 'image/jpeg', kucult ? 0.8 : 0.92);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), tur: 'jpg', genislik: canvas.width, yukseklik: canvas.height };
}

export default function Calculator() {
  const [mod, setMod] = useState<Mod>('word-pdf');
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  // Resim → PDF
  const [resimler, setResimler] = useState<ResimOge[]>([]);
  const sayac = useRef(1);
  const [boyut, setBoyut] = useState<SayfaBoyutu>('A4');
  const [yon, setYon] = useState<Yon>('otomatik');
  const [kenar, setKenar] = useState<'0' | '10' | '20'>('10');
  const [kucult, setKucult] = useState(false);
  const [ad, setAd] = useState('');

  // PDF → Resim / Metin
  const [pdf, setPdf] = useState<{ ad: string; bytes: Uint8Array; sayfa: number } | null>(null);
  const [bicim, setBicim] = useState<'png' | 'jpg'>('jpg');
  const [dpi, setDpi] = useState<'72' | '150' | '300'>('150');
  const [aralik, setAralik] = useState('');
  const [ciktilar, setCiktilar] = useState<Cikti[]>([]);
  const [metin, setMetin] = useState<string | null>(null);

  useEffect(
    () => () => {
      resimler.forEach((r) => URL.revokeObjectURL(r.url));
      ciktilar.forEach((c) => URL.revokeObjectURL(c.url));
    },
    [],
  );

  const sifirla = () => {
    setHata(null);
    setBilgi(null);
  };

  const modDegis = (m: Mod) => {
    sifirla();
    setMod(m);
    setCiktilar([]);
    setMetin(null);
  };

  const resimEkle = (dosyalar: File[]) => {
    sifirla();
    const uygun = dosyalar.filter((f) => f.type.startsWith('image/'));
    if (uygun.length < dosyalar.length) setHata('Yalnızca resim dosyaları (JPG, PNG, WebP…) eklenebilir; diğerleri atlandı.');
    setResimler((l) => [...l, ...uygun.map((f) => ({ id: sayac.current++, dosya: f, url: URL.createObjectURL(f) }))]);
    if (uygun[0]) setAd((a) => a || uzantisiz(uygun[0].name));
  };

  const resimTasi = (i: number, j: number) =>
    setResimler((l) => {
      if (j < 0 || j >= l.length) return l;
      const y = l.slice();
      const [x] = y.splice(i, 1);
      y.splice(j, 0, x);
      return y;
    });

  const pdfYap = async () => {
    sifirla();
    setMesgul('PDF hazırlanıyor…');
    try {
      const gorseller: Gorsel[] = [];
      for (const [i, r] of resimler.entries()) {
        setMesgul(`Resimler hazırlanıyor (${i + 1}/${resimler.length})…`);
        try {
          gorseller.push(await hazirla(r.dosya, kucult));
        } catch {
          throw new Error(`“${r.dosya.name}” açılamadı. HEIC gibi bir biçimse telefonda JPG olarak kaydedip yeniden deneyin.`);
        }
      }
      const temel = (ad.trim() || 'resimler').replace(/[\\/:*?"<>|]+/g, '-');
      const bytes = await gorsellerdenPdf(gorseller, { boyut, yon, kenarMm: Number(kenar), baslik: temel });
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      downloadBlob(blob, `${temel}.pdf`);
      setBilgi(`${resimler.length} sayfalık “${temel}.pdf” indirildi (${boyutMetni(blob.size)}).`);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'PDF oluşturulamadı.');
    } finally {
      setMesgul(null);
    }
  };

  const pdfSec = async (dosyalar: File[]) => {
    sifirla();
    setCiktilar([]);
    setMetin(null);
    const f = dosyalar.find((x) => x.type === 'application/pdf' || /\.pdf$/i.test(x.name));
    if (!f) {
      setHata('Lütfen bir PDF dosyası seçin.');
      return;
    }
    setMesgul('PDF açılıyor…');
    try {
      const bytes = await dosyaOku(f);
      const doc = await pdfAc(bytes);
      setPdf({ ad: f.name, bytes, sayfa: doc.numPages });
      if (mod === 'pdf-metin') await metinCikar(bytes, doc.numPages);
      await pdfKapat(doc);
    } catch (e) {
      setPdf(null);
      setHata(sifreHatasiMi(e) ? 'Bu PDF şifreli. Şifresini kaldırıp yeniden deneyin.' : 'PDF açılamadı; dosya bozuk ya da PDF değil.');
    } finally {
      setMesgul(null);
    }
  };

  const metinCikar = async (bytes: Uint8Array, toplam: number) => {
    const doc = await pdfAc(bytes);
    const sayfalar: string[] = [];
    for (let i = 1; i <= toplam; i++) {
      setMesgul(`Metin okunuyor (${i}/${toplam})…`);
      const s = await doc.getPage(i);
      const icerik = await s.getTextContent();
      sayfalar.push(metniBirlestir(icerik.items.filter((x): x is { str: string; hasEOL: boolean } & typeof x => 'str' in x)));
      s.cleanup();
    }
    await pdfKapat(doc);
    setMetin(sayfalar.map((t, i) => (toplam > 1 ? `— Sayfa ${i + 1} —\n${t}` : t)).join('\n\n'));
  };

  const resimleriYap = async () => {
    if (!pdf) return;
    sifirla();
    const r = aralik.trim() ? aralikCoz(aralik, pdf.sayfa) : { sira: Array.from({ length: pdf.sayfa }, (_, i) => i), hata: null };
    if (r.hata) {
      setHata(r.hata);
      return;
    }
    ciktilar.forEach((c) => URL.revokeObjectURL(c.url));
    setCiktilar([]);
    const temel = uzantisiz(pdf.ad);
    try {
      const doc = await pdfAc(pdf.bytes);
      const yeni: Cikti[] = [];
      for (const [k, i] of r.sira.entries()) {
        setMesgul(`Sayfalar resme çevriliyor (${k + 1}/${r.sira.length})…`);
        const canvas = await sayfaCiz(doc, i + 1, dpiOlcek(Number(dpi)));
        const blob = await canvasBlob(canvas, bicim === 'png' ? 'image/png' : 'image/jpeg', 0.9);
        yeni.push({ ad: resimDosyaAdi(temel, i + 1, pdf.sayfa, bicim), blob, url: URL.createObjectURL(blob) });
        setCiktilar([...yeni]);
      }
      await pdfKapat(doc);
      setBilgi(`${yeni.length} sayfa ${bicim.toUpperCase()} olarak hazır.`);
    } catch {
      setHata('Sayfalar resme çevrilemedi.');
    } finally {
      setMesgul(null);
    }
  };

  const zipIndir = async () => {
    if (!pdf || ciktilar.length === 0) return;
    const dosyalar: Record<string, Uint8Array> = {};
    for (const c of ciktilar) dosyalar[c.ad] = new Uint8Array(await c.blob.arrayBuffer());
    downloadBlob(new Blob([zipSync(dosyalar, { level: 0 }) as BlobPart], { type: 'application/zip' }), `${uzantisiz(pdf.ad)}-resimler.zip`);
  };

  const kopyala = async () => {
    if (!metin) return;
    try {
      await navigator.clipboard.writeText(metin);
      setBilgi('Metin panoya kopyalandı.');
    } catch {
      setHata('Kopyalanamadı; metni seçip elle kopyalayın.');
    }
  };

  return (
    <div class="pdf-arac">
      <Segmented
        name="pc-mod"
        label="Ne yapmak istiyorsunuz?"
        value={mod}
        onChange={modDegis}
        options={[
          { value: 'word-pdf', label: 'Word → PDF' },
          { value: 'excel-pdf', label: 'Excel → PDF' },
          { value: 'resim-pdf', label: 'Resim → PDF' },
          { value: 'pdf-word', label: 'PDF → Word' },
          { value: 'pdf-excel', label: 'PDF → Excel' },
          { value: 'pdf-resim', label: 'PDF → Resim' },
          { value: 'pdf-metin', label: 'PDF → Metin' },
        ]}
      />

      {mod === 'word-pdf' && <WorddenPdf />}
      {mod === 'excel-pdf' && <ExceldenPdf />}
      {mod === 'pdf-word' && <PdftenWord />}
      {mod === 'pdf-excel' && <PdftenExcel />}

      {mod === 'resim-pdf' && (
        <>
          <DosyaSec
            id="pc-resim"
            kabul="image/*"
            baslik={resimler.length ? '+ Resim ekle' : 'Resimleri buraya bırakın ya da seçin'}
            alt="JPG, PNG, WebP… Her resim bir sayfa olur; fiş, belge ya da fotoğraflardan tek PDF."
            kucuk={resimler.length > 0}
            onSec={resimEkle}
          />
          {resimler.length > 0 && (
            <>
              <ol class="pdf-sayfalar pdf-sayfalar--resim">
                {resimler.map((r, i) => (
                  <li class="pdf-sayfa" key={r.id}>
                    <div class="pdf-sayfa__resim">
                      <img src={r.url} alt="" />
                    </div>
                    <div class="pdf-sayfa__alt">
                      <span class="pdf-sayfa__no">{i + 1}</span>
                      <span class="pdf-sayfa__kaynak" title={r.dosya.name}>
                        {boyutMetni(r.dosya.size)}
                      </span>
                    </div>
                    <div class="pdf-sayfa__dugmeler">
                      <button type="button" aria-label="Öne al" title="Öne al" disabled={i === 0} onClick={() => resimTasi(i, i - 1)}>
                        ‹
                      </button>
                      <button type="button" aria-label="Arkaya al" title="Arkaya al" disabled={i === resimler.length - 1} onClick={() => resimTasi(i, i + 1)}>
                        ›
                      </button>
                      <button
                        type="button"
                        class="is-tehlike"
                        aria-label="Kaldır"
                        title="Kaldır"
                        onClick={() => {
                          URL.revokeObjectURL(r.url);
                          setResimler((l) => l.filter((x) => x.id !== r.id));
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              <div class="pdf-cikti">
                <div class="row-2">
                  <Segmented
                    name="pc-boyut"
                    label="Sayfa boyutu"
                    value={boyut}
                    onChange={setBoyut}
                    options={[
                      { value: 'A4', label: 'A4' },
                      { value: 'A5', label: 'A5' },
                      { value: 'Letter', label: 'Letter' },
                      { value: 'gorsel', label: 'Resim boyutu' },
                    ]}
                  />
                  <Segmented
                    name="pc-yon"
                    label="Sayfa yönü"
                    value={yon}
                    onChange={setYon}
                    options={[
                      { value: 'otomatik', label: 'Otomatik' },
                      { value: 'dikey', label: 'Dikey' },
                      { value: 'yatay', label: 'Yatay' },
                    ]}
                  />
                </div>
                <div class="row-2">
                  <Segmented
                    name="pc-kenar"
                    label="Kenar boşluğu"
                    value={kenar}
                    onChange={setKenar}
                    options={[
                      { value: '0', label: 'Yok' },
                      { value: '10', label: 'Dar (1 cm)' },
                      { value: '20', label: 'Normal (2 cm)' },
                    ]}
                  />
                  <TextField id="pc-ad" label="Dosya adı" value={ad} onChange={setAd} placeholder="resimler" />
                </div>
                <CheckboxField id="pc-kucult" label="Dosya boyutunu küçült" checked={kucult} onChange={setKucult} hint="E-postayla göndermek için: resimler sıkıştırılır, kalite biraz düşer." />
                <div class="share-bar">
                  <button type="button" class="btn btn--primary" disabled={!!mesgul} onClick={pdfYap}>
                    PDF oluştur ve indir ({resimler.length} sayfa)
                  </button>
                  <button
                    type="button"
                    class="btn"
                    onClick={() => {
                      resimler.forEach((r) => URL.revokeObjectURL(r.url));
                      setResimler([]);
                      setAd('');
                      sifirla();
                    }}
                  >
                    Baştan başla
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {(mod === 'pdf-resim' || mod === 'pdf-metin') && (
        <>
          <DosyaSec
            id={`pc-pdf-${mod}`}
            kabul="application/pdf,.pdf"
            coklu={false}
            baslik={pdf ? `Başka PDF seç (şu an: ${pdf.ad}, ${pdf.sayfa} sayfa)` : 'PDF dosyasını buraya bırakın ya da seçin'}
            alt={mod === 'pdf-resim' ? 'Her sayfa ayrı bir resim olur.' : 'PDF’teki yazılar düz metin olarak çıkarılır.'}
            kucuk={!!pdf}
            onSec={pdfSec}
          />

          {mod === 'pdf-resim' && pdf && (
            <div class="pdf-cikti">
              <div class="row-2">
                <Segmented
                  name="pc-bicim"
                  label="Resim biçimi"
                  value={bicim}
                  onChange={setBicim}
                  options={[
                    { value: 'jpg', label: 'JPG (küçük dosya)' },
                    { value: 'png', label: 'PNG (kayıpsız)' },
                  ]}
                />
                <Segmented
                  name="pc-dpi"
                  label="Çözünürlük"
                  value={dpi}
                  onChange={setDpi}
                  options={[
                    { value: '72', label: 'Ekran' },
                    { value: '150', label: 'Normal' },
                    { value: '300', label: 'Baskı' },
                  ]}
                />
              </div>
              <TextField id="pc-aralik" label="Sayfalar (boş = hepsi)" value={aralik} onChange={setAralik} placeholder="ör. 1-3, 5" />
              <div class="share-bar">
                <button type="button" class="btn btn--primary" disabled={!!mesgul} onClick={resimleriYap}>
                  Resimlere çevir
                </button>
                {ciktilar.length > 1 && (
                  <button type="button" class="btn" onClick={zipIndir}>
                    Tümünü ZIP indir
                  </button>
                )}
              </div>
              {ciktilar.length > 0 && (
                <ol class="pdf-sayfalar pdf-sayfalar--resim">
                  {ciktilar.map((c) => (
                    <li class="pdf-sayfa" key={c.ad}>
                      <a class="pdf-sayfa__resim" href={c.url} download={c.ad} title={`${c.ad} indir`}>
                        <img src={c.url} alt="" />
                      </a>
                      <div class="pdf-sayfa__alt">
                        <span class="pdf-sayfa__kaynak">{c.ad}</span>
                      </div>
                      <a class="btn btn--small" href={c.url} download={c.ad}>
                        İndir ({boyutMetni(c.blob.size)})
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {mod === 'pdf-metin' && metin !== null && (
            <div class="pdf-cikti">
              {metin.replace(/— Sayfa \d+ —/g, '').trim() === '' ? (
                <Callout kind="warning">
                  Bu PDF’te seçilebilir metin bulunamadı. Belge taranmış bir resim olabilir; resimdeki yazıyı okuma (OCR) bu araçta yoktur.
                </Callout>
              ) : (
                <>
                  <div class="field">
                    <label class="field__label" for="pc-metin">
                      Çıkarılan metin
                    </label>
                    <div class="input-wrap">
                      <textarea id="pc-metin" class="input pdf-metin" readOnly rows={14} value={metin} />
                    </div>
                  </div>
                  <div class="share-bar">
                    <button type="button" class="btn btn--primary" onClick={kopyala}>
                      Metni kopyala
                    </button>
                    <button
                      type="button"
                      class="btn"
                      onClick={() => pdf && downloadBlob(new Blob([metin], { type: 'text/plain;charset=utf-8' }), `${uzantisiz(pdf.ad)}.txt`)}
                    >
                      .txt olarak indir
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {mesgul && <p class="field__hint">{mesgul}</p>}
      {hata && <Callout kind="danger">{hata}</Callout>}
      {bilgi && <Callout kind="success">{bilgi}</Callout>}
      <p class="field__hint">Dosyalarınız bilgisayarınızda işlenir, hiçbir yere yüklenmez.</p>
    </div>
  );
}
