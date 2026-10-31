// Word ve Excel dönüştürmeleri (tarayıcıda). Word → PDF ve Excel → PDF, belgeyi önizleyip tarayıcının
// "PDF olarak kaydet" özelliğiyle vektörel PDF üretir; PDF → Word/Excel yazıların konumundan düzen çıkarır.
import { useRef, useState } from 'preact/hooks';
import { downloadBlob } from '../../lib/indir';
import { dosyaOku, pdfAc, pdfKapat, sayfaCiz, sifreHatasiMi, uzantisiz, canvasBlob } from '../../lib/pdf';
import { csvOku, hucreMetni, xlsxOku, xlsxYaz, type Hucre, type Sayfa } from '../../lib/xlsx';
import { belgeyiYazdir } from '../../lib/yazdir';
import { CheckboxField, Segmented } from '../../ui/fields';
import { Callout } from '../../ui/results';
import { DosyaSec } from '../../ui/DosyaSec';
import { paragraflaraAyir, parcaOf, tabloyaCevir, type MetinParcasi } from './calc';

function Durum({ mesgul, hata, bilgi }: { mesgul: string | null; hata: string | null; bilgi: string | null }) {
  return (
    <>
      {mesgul && <p class="field__hint">{mesgul}</p>}
      {hata && <Callout kind="danger">{hata}</Callout>}
      {bilgi && <Callout kind="success">{bilgi}</Callout>}
    </>
  );
}

const YAZDIR_NOTU = 'Açılan pencerede yazıcı olarak “PDF olarak kaydet”i seçin.';

/** PDF'in her sayfasındaki metin parçaları (konumlarıyla). */
async function pdfParcalari(bytes: Uint8Array, ilerleme: (m: string) => void): Promise<MetinParcasi[][]> {
  const doc = await pdfAc(bytes);
  const sayfalar: MetinParcasi[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    ilerleme(`Sayfa okunuyor (${i}/${doc.numPages})…`);
    const s = await doc.getPage(i);
    const icerik = await s.getTextContent();
    sayfalar.push(
      icerik.items.filter((x): x is typeof x & { str: string; transform: number[]; width: number; height: number } => 'str' in x).map(parcaOf),
    );
    s.cleanup();
  }
  await pdfKapat(doc);
  return sayfalar;
}

const pdfMi = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
const pdfHatasi = (e: unknown) => (sifreHatasiMi(e) ? 'Bu PDF şifreli. Şifresini kaldırıp yeniden deneyin.' : e instanceof Error && e.message ? e.message : 'PDF açılamadı.');

// ---------------------------------------------------------------------------

export function WorddenPdf() {
  const [ad, setAd] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const kap = useRef<HTMLDivElement>(null);
  const stilKap = useRef<HTMLDivElement>(null);
  const sayfaCss = useRef('size: A4; margin: 0');

  const sec = async (dosyalar: File[]) => {
    const f = dosyalar[0];
    setHata(null);
    if (!/\.docx$/i.test(f.name)) {
      setHata(/\.doc$/i.test(f.name) ? 'Eski .doc biçimi desteklenmiyor. Word’de “Farklı Kaydet → .docx” ile kaydedip yeniden deneyin.' : 'Lütfen bir Word (.docx) dosyası seçin.');
      return;
    }
    setMesgul('Belge açılıyor…');
    try {
      const { renderAsync } = await import('docx-preview');
      if (!kap.current || !stilKap.current) return;
      kap.current.innerHTML = '';
      await renderAsync(await f.arrayBuffer(), kap.current, stilKap.current, {
        className: 'docx',
        inWrapper: true,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        useBase64URL: true,
        experimental: true,
      });
      // Yazdırma sayfası, belgenin ilk sayfasının ölçüsünde olur (yatay belgeler de doğru basılır)
      const ilk = kap.current.querySelector<HTMLElement>('section.docx');
      if (ilk?.style.width && ilk.style.minHeight) sayfaCss.current = `size: ${ilk.style.width} ${ilk.style.minHeight}; margin: 0`;
      setAd(f.name);
    } catch {
      setHata('Belge açılamadı; dosya bozuk ya da şifreli olabilir.');
      setAd(null);
    } finally {
      setMesgul(null);
    }
  };

  const kaydet = () => {
    const wrap = kap.current?.querySelector('.docx-wrapper');
    if (!wrap || !ad) return;
    belgeyiYazdir(wrap.cloneNode(true), uzantisiz(ad), sayfaCss.current);
  };

  return (
    <>
      <DosyaSec id="pc-word" kabul=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" coklu={false} baslik={ad ? `Başka Word dosyası seç (şu an: ${ad})` : 'Word (.docx) dosyasını buraya bırakın ya da seçin'} alt="Belge önizlenir, sonra PDF olarak kaydedilir." kucuk={!!ad} onSec={sec} />
      {ad && (
        <div class="share-bar">
          <button type="button" class="btn btn--primary" onClick={kaydet}>
            PDF olarak kaydet
          </button>
          <span class="field__hint">{YAZDIR_NOTU}</span>
        </div>
      )}
      <Durum mesgul={mesgul} hata={hata} bilgi={null} />
      <div ref={stilKap} />
      <div ref={kap} class={`ofis-onizleme${ad ? '' : ' is-bos'}`} />
    </>
  );
}

// ---------------------------------------------------------------------------

export function ExceldenPdf() {
  const [ad, setAd] = useState<string | null>(null);
  const [sayfalar, setSayfalar] = useState<Sayfa[]>([]);
  const [secim, setSecim] = useState<string>('hepsi');
  const [yon, setYon] = useState<'dikey' | 'yatay'>('yatay');
  const [cizgi, setCizgi] = useState(true);
  const [baslikSatiri, setBaslikSatiri] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const tabloKap = useRef<HTMLDivElement>(null);

  const sec = async (dosyalar: File[]) => {
    const f = dosyalar[0];
    setHata(null);
    try {
      let s: Sayfa[];
      if (/\.(csv|tsv|txt)$/i.test(f.name)) s = [{ ad: uzantisiz(f.name), satirlar: csvOku(await f.text()) }];
      else if (/\.xlsx$/i.test(f.name)) s = xlsxOku(await dosyaOku(f));
      else throw new Error(/\.xls$/i.test(f.name) ? 'Eski .xls biçimi desteklenmiyor. Excel’de “Farklı Kaydet → .xlsx” ile kaydedip yeniden deneyin.' : 'Lütfen bir Excel (.xlsx) ya da CSV dosyası seçin.');
      s = s.filter((x) => x.satirlar.length > 0);
      if (s.length === 0) throw new Error('Dosyada dolu hücre bulunamadı.');
      setSayfalar(s);
      setSecim('hepsi');
      setAd(f.name);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Dosya okunamadı.');
      setAd(null);
      setSayfalar([]);
    }
  };

  const gosterilen = secim === 'hepsi' ? sayfalar : sayfalar.filter((s) => s.ad === secim);

  const kaydet = () => {
    if (!tabloKap.current || !ad) return;
    belgeyiYazdir(tabloKap.current.cloneNode(true), uzantisiz(ad), `size: A4 ${yon === 'yatay' ? 'landscape' : 'portrait'}; margin: 10mm`);
  };

  const sutunSayisi = (s: Sayfa) => Math.max(...s.satirlar.map((r) => r.length));

  return (
    <>
      <DosyaSec id="pc-excel" kabul=".xlsx,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" coklu={false} baslik={ad ? `Başka Excel dosyası seç (şu an: ${ad})` : 'Excel (.xlsx) ya da CSV dosyasını buraya bırakın ya da seçin'} alt="Tablolar önizlenir, sonra PDF olarak kaydedilir." kucuk={!!ad} onSec={sec} />
      {ad && (
        <div class="pdf-cikti">
          <div class="row-2">
            {sayfalar.length > 1 && (
              <Segmented
                name="pc-xls-sayfa"
                label="Çalışma sayfası"
                value={secim}
                onChange={setSecim}
                options={[{ value: 'hepsi', label: 'Hepsi' }, ...sayfalar.map((s) => ({ value: s.ad, label: s.ad }))]}
              />
            )}
            <Segmented
              name="pc-xls-yon"
              label="Kâğıt yönü"
              value={yon}
              onChange={setYon}
              options={[
                { value: 'yatay', label: 'Yatay' },
                { value: 'dikey', label: 'Dikey' },
              ]}
            />
          </div>
          <div class="row-2">
            <CheckboxField id="pc-xls-cizgi" label="Izgara çizgileri" checked={cizgi} onChange={setCizgi} />
            <CheckboxField id="pc-xls-baslik" label="İlk satır başlık (her sayfada tekrarlanır)" checked={baslikSatiri} onChange={setBaslikSatiri} />
          </div>
          <div class="share-bar">
            <button type="button" class="btn btn--primary" onClick={kaydet}>
              PDF olarak kaydet
            </button>
            <span class="field__hint">{YAZDIR_NOTU}</span>
          </div>
        </div>
      )}
      <Durum mesgul={null} hata={hata} bilgi={null} />
      {ad && (
        <div class="ofis-onizleme">
          <div ref={tabloKap} class={`xls-belge${cizgi ? ' xls-belge--cizgi' : ''}`}>
            {gosterilen.map((s) => {
              const n = sutunSayisi(s);
              const [ilk, ...geri] = s.satirlar;
              const satir = (r: Hucre[], i: number) => (
                <tr key={i}>
                  {Array.from({ length: n }, (_, c) => (
                    <td key={c} class={typeof r[c] === 'number' ? 'n' : undefined}>
                      {hucreMetni(r[c] ?? null)}
                    </td>
                  ))}
                </tr>
              );
              return (
                <section class="xls-sayfa" key={s.ad}>
                  {gosterilen.length > 1 && <h3>{s.ad}</h3>}
                  <table>
                    {baslikSatiri && (
                      <thead>
                        <tr>
                          {Array.from({ length: n }, (_, c) => (
                            <th key={c}>{hucreMetni(ilk[c] ?? null)}</th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>{(baslikSatiri ? geri : s.satirlar).map(satir)}</tbody>
                  </table>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

export function PdftenWord() {
  const [pdf, setPdf] = useState<{ ad: string; bytes: Uint8Array } | null>(null);
  const [bicim, setBicim] = useState<'metin' | 'gorunum'>('metin');
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const sec = async (dosyalar: File[]) => {
    const f = dosyalar.find(pdfMi);
    setHata(null);
    setBilgi(null);
    if (!f) {
      setHata('Lütfen bir PDF dosyası seçin.');
      return;
    }
    setPdf({ ad: f.name, bytes: await dosyaOku(f) });
  };

  const donustur = async () => {
    if (!pdf) return;
    setHata(null);
    setBilgi(null);
    try {
      const d = await import('docx');
      const icerik: InstanceType<typeof d.Paragraph>[] = [];
      let bosSayfa = 0;
      if (bicim === 'metin') {
        const sayfalar = await pdfParcalari(pdf.bytes, setMesgul);
        sayfalar.forEach((parcalar, i) => {
          if (i > 0) icerik.push(new d.Paragraph({ children: [new d.PageBreak()] }));
          const paragraflar = paragraflaraAyir(parcalar);
          if (paragraflar.length === 0) bosSayfa++;
          for (const p of paragraflar) {
            icerik.push(
              new d.Paragraph({
                heading: p.baslik ? d.HeadingLevel.HEADING_2 : undefined,
                spacing: { after: 120 },
                children: [new d.TextRun({ text: p.metin, size: Math.round(Math.min(Math.max(p.boyut, 8), 28) * 2), bold: p.baslik })],
              }),
            );
          }
        });
      } else {
        const doc = await pdfAc(pdf.bytes);
        // A4, 1,27 cm kenar: kullanılabilir alan 96 dpi'da yaklaşık 698 × 1026 piksel
        const [genis, yuksek] = [698, 1026];
        for (let i = 1; i <= doc.numPages; i++) {
          setMesgul(`Sayfa görüntüye çevriliyor (${i}/${doc.numPages})…`);
          const canvas = await sayfaCiz(doc, i, 150 / 72);
          const o = Math.min(genis / canvas.width, yuksek / canvas.height);
          const data = new Uint8Array(await (await canvasBlob(canvas, 'image/png')).arrayBuffer());
          if (i > 1) icerik.push(new d.Paragraph({ children: [new d.PageBreak()] }));
          icerik.push(new d.Paragraph({ children: [new d.ImageRun({ type: 'png', data, transformation: { width: Math.round(canvas.width * o), height: Math.round(canvas.height * o) } })] }));
        }
        await pdfKapat(doc);
      }
      setMesgul('Word dosyası yazılıyor…');
      const belge = new d.Document({
        creator: 'Hesap Robotu',
        title: uzantisiz(pdf.ad),
        sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: icerik }],
      });
      const blob = await d.Packer.toBlob(belge);
      downloadBlob(blob, `${uzantisiz(pdf.ad)}.docx`);
      setBilgi(
        bosSayfa > 0
          ? `“${uzantisiz(pdf.ad)}.docx” indirildi. ${bosSayfa} sayfada metin bulunamadı (taranmış olabilir); bu sayfalar için “Görünümü koru” seçeneğini deneyin.`
          : `“${uzantisiz(pdf.ad)}.docx” indirildi.`,
      );
    } catch (e) {
      setHata(pdfHatasi(e));
    } finally {
      setMesgul(null);
    }
  };

  return (
    <>
      <DosyaSec id="pc-pdf-word" kabul="application/pdf,.pdf" coklu={false} baslik={pdf ? `Başka PDF seç (şu an: ${pdf.ad})` : 'PDF dosyasını buraya bırakın ya da seçin'} alt="Yazılar düzenlenebilir Word belgesine aktarılır." kucuk={!!pdf} onSec={sec} />
      {pdf && (
        <div class="pdf-cikti">
          <Segmented
            name="pc-word-bicim"
            label="Nasıl aktarılsın?"
            value={bicim}
            onChange={setBicim}
            options={[
              { value: 'metin', label: 'Düzenlenebilir metin' },
              { value: 'gorunum', label: 'Görünümü koru (resim)' },
            ]}
            hint={bicim === 'metin' ? 'Yazılar paragraf ve başlık olarak aktarılır; tablo ve resimler aktarılmaz.' : 'Her sayfa aynen görünür ama yazılar düzenlenemez.'}
          />
          <div class="share-bar">
            <button type="button" class="btn btn--primary" disabled={!!mesgul} onClick={donustur}>
              Word’e çevir ve indir
            </button>
          </div>
        </div>
      )}
      <Durum mesgul={mesgul} hata={hata} bilgi={bilgi} />
    </>
  );
}

// ---------------------------------------------------------------------------

export function PdftenExcel() {
  const [pdf, setPdf] = useState<{ ad: string; bytes: Uint8Array } | null>(null);
  const [duzen, setDuzen] = useState<'ayri' | 'tek'>('ayri');
  const [sayi, setSayi] = useState(true);
  const [onizleme, setOnizleme] = useState<Hucre[][] | null>(null);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const sec = async (dosyalar: File[]) => {
    const f = dosyalar.find(pdfMi);
    setHata(null);
    setBilgi(null);
    setOnizleme(null);
    if (!f) {
      setHata('Lütfen bir PDF dosyası seçin.');
      return;
    }
    setPdf({ ad: f.name, bytes: await dosyaOku(f) });
  };

  const donustur = async () => {
    if (!pdf) return;
    setHata(null);
    setBilgi(null);
    try {
      const sayfalar = (await pdfParcalari(pdf.bytes, setMesgul)).map((p) => tabloyaCevir(p, sayi));
      if (sayfalar.every((s) => s.length === 0)) throw new Error('Bu PDF’te metin bulunamadı. Taranmış (resim) belgeler tabloya çevrilemez.');
      const excel: Sayfa[] =
        duzen === 'ayri'
          ? sayfalar.map((satirlar, i) => ({ ad: `Sayfa ${i + 1}`, satirlar }))
          : [{ ad: uzantisiz(pdf.ad), satirlar: sayfalar.flatMap((s, i) => (i > 0 ? [[] as Hucre[], ...s] : s)) }];
      downloadBlob(new Blob([xlsxYaz(excel) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${uzantisiz(pdf.ad)}.xlsx`);
      setOnizleme(excel[0].satirlar.slice(0, 15));
      setBilgi(`“${uzantisiz(pdf.ad)}.xlsx” indirildi (${sayfalar.reduce((t, s) => t + s.length, 0)} satır).`);
    } catch (e) {
      setHata(pdfHatasi(e));
    } finally {
      setMesgul(null);
    }
  };

  const n = onizleme ? Math.max(0, ...onizleme.map((r) => r.length)) : 0;

  return (
    <>
      <DosyaSec id="pc-pdf-excel" kabul="application/pdf,.pdf" coklu={false} baslik={pdf ? `Başka PDF seç (şu an: ${pdf.ad})` : 'PDF dosyasını buraya bırakın ya da seçin'} alt="Banka ekstresi, fatura, fiyat listesi gibi tablolar Excel’e aktarılır." kucuk={!!pdf} onSec={sec} />
      {pdf && (
        <div class="pdf-cikti">
          <div class="row-2">
            <Segmented
              name="pc-xls-duzen"
              label="Excel düzeni"
              value={duzen}
              onChange={setDuzen}
              options={[
                { value: 'ayri', label: 'Her PDF sayfası ayrı sekme' },
                { value: 'tek', label: 'Hepsi tek sekmede' },
              ]}
            />
            <CheckboxField id="pc-xls-sayi" label="Tutarları sayıya çevir" checked={sayi} onChange={setSayi} hint="“1.250,50” Excel’de hesaplanabilir sayı olur." />
          </div>
          <div class="share-bar">
            <button type="button" class="btn btn--primary" disabled={!!mesgul} onClick={donustur}>
              Excel’e çevir ve indir
            </button>
          </div>
        </div>
      )}
      <Durum mesgul={mesgul} hata={hata} bilgi={bilgi} />
      {onizleme && onizleme.length > 0 && (
        <div class="table-wrap">
          <table class="data">
            <caption>İlk satırlar (önizleme)</caption>
            <tbody>
              {onizleme.map((r, i) => (
                <tr key={i}>
                  {Array.from({ length: n }, (_, c) => (
                    <td key={c}>{hucreMetni(r[c] ?? null)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
