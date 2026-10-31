// Excel (.xlsx) dosyalarını okuma ve yazma. .xlsx bir ZIP içindeki XML dosyalarıdır; fflate ile açılıp
// yalnızca hücre değerleri okunur (biçim, birleştirme ve formüller değil, formüllerin son hesaplanan değeri).
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export type Hucre = string | number | null;

export interface Sayfa {
  ad: string;
  satirlar: Hucre[][];
}

const xmlKacir = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const xmlCoz = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

/** 0 → "A", 25 → "Z", 26 → "AA" */
export function sutunHarfi(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** "AB12" → { sutun: 27, satir: 11 } (0'dan) */
export function hucreKonumu(ref: string): { sutun: number; satir: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return { sutun: 0, satir: 0 };
  let s = 0;
  for (const ch of m[1]) s = s * 26 + (ch.charCodeAt(0) - 64);
  return { sutun: s - 1, satir: Number(m[2]) - 1 };
}

/** Excel'in izin vermediği karakterleri temizler, 31 karakterle sınırlar, aynı adları numaralar. */
export function sayfaAdlari(adlar: string[]): string[] {
  const kullanilan = new Set<string>();
  return adlar.map((ad, i) => {
    const temel = (ad.replace(/[[\]:*?/\\]/g, ' ').trim() || `Sayfa${i + 1}`).slice(0, 31);
    let aday = temel;
    for (let k = 2; kullanilan.has(aday.toLocaleLowerCase('tr')); k++) aday = `${temel.slice(0, 28)} ${k}`;
    kullanilan.add(aday.toLocaleLowerCase('tr'));
    return aday;
  });
}

export function xlsxYaz(sayfalar: Sayfa[]): Uint8Array {
  const adlar = sayfaAdlari(sayfalar.map((s) => s.ad));
  const dosyalar: Record<string, Uint8Array> = {};
  const yaz = (yol: string, xml: string) => (dosyalar[yol] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`));

  yaz(
    '[Content_Types].xml',
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sayfalar
      .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join('')}</Types>`,
  );
  yaz(
    '_rels/.rels',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  );
  yaz(
    'xl/workbook.xml',
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${adlar
      .map((ad, i) => `<sheet name="${xmlKacir(ad)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`,
  );
  yaz(
    'xl/_rels/workbook.xml.rels',
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sayfalar
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join('')}<Relationship Id="rId${sayfalar.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  yaz(
    'xl/styles.xml',
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf/></cellXfs></styleSheet>',
  );
  sayfalar.forEach((s, i) => {
    const satirlar = s.satirlar
      .map((satir, r) => {
        const hucreler = satir
          .map((h, c) => {
            if (h === null || h === '') return '';
            const ref = `${sutunHarfi(c)}${r + 1}`;
            return typeof h === 'number' && Number.isFinite(h)
              ? `<c r="${ref}"><v>${h}</v></c>`
              : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlKacir(String(h))}</t></is></c>`;
          })
          .join('');
        return `<row r="${r + 1}">${hucreler}</row>`;
      })
      .join('');
    yaz(`xl/worksheets/sheet${i + 1}.xml`, `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${satirlar}</sheetData></worksheet>`);
  });
  return zipSync(dosyalar);
}

// Excel'in yerleşik tarih biçimleri (numFmtId)
const TARIH_BICIMLERI = new Set([14, 15, 16, 17, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

/** Excel tarih seri numarası → "31.10.2026" (1900 sistemi). */
export function excelTarihi(seri: number): string {
  const ms = Math.round((seri - 25569) * 86400 * 1000);
  const d = new Date(ms);
  const g = String(d.getUTCDate()).padStart(2, '0');
  const a = String(d.getUTCMonth() + 1).padStart(2, '0');
  const saat = d.getUTCHours() || d.getUTCMinutes() ? ` ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` : '';
  return `${g}.${a}.${d.getUTCFullYear()}${saat}`;
}

export function xlsxOku(bytes: Uint8Array): Sayfa[] {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(bytes);
  } catch {
    throw new Error('Bu dosya .xlsx biçiminde değil. Eski .xls dosyalarını Excel’de “Farklı Kaydet → .xlsx” ile kaydedip yeniden deneyin.');
  }
  const oku = (yol: string) => (zip[yol] ? strFromU8(zip[yol]) : '');
  const workbook = oku('xl/workbook.xml');
  if (!workbook) throw new Error('Excel dosyası okunamadı.');

  const paylasilan: string[] = [];
  for (const si of oku('xl/sharedStrings.xml').match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    paylasilan.push(xmlCoz((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<t[^>]*>|<\/t>/g, '')).join('')));
  }

  // Hücre stili → tarih mi?
  const stiller = oku('xl/styles.xml');
  const ozelTarih = new Set<number>();
  for (const m of stiller.matchAll(/<numFmt\s+numFmtId="(\d+)"\s+formatCode="([^"]*)"/g)) {
    const kod = xmlCoz(m[2]).replace(/"[^"]*"|\[[^\]]*\]/g, '');
    if (/[dmy]/i.test(kod) && !/^[#0.,%\s]*$/.test(kod)) ozelTarih.add(Number(m[1]));
  }
  const xfBlok = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stiller)?.[1] ?? '';
  const stilTarih = [...xfBlok.matchAll(/<xf\b[^>]*?(?:numFmtId="(\d+)")?[^>]*\/?>/g)].map((m) => {
    const id = Number(/numFmtId="(\d+)"/.exec(m[0])?.[1] ?? 0);
    return TARIH_BICIMLERI.has(id) || ozelTarih.has(id);
  });

  const iliskiler = new Map<string, string>();
  for (const m of oku('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const hedef = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && hedef) iliskiler.set(id, hedef.replace(/^\/?xl\//, '').replace(/^\//, ''));
  }

  const sayfalar: Sayfa[] = [];
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const ad = xmlCoz(/name="([^"]*)"/.exec(m[0])?.[1] ?? `Sayfa${sayfalar.length + 1}`);
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1] ?? '';
    const xml = oku(`xl/${iliskiler.get(rid) ?? `worksheets/sheet${sayfalar.length + 1}.xml`}`);
    const satirlar: Hucre[][] = [];
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attr = c[1];
      const ic = c[2] ?? '';
      const ref = /r="([A-Z]+\d+)"/.exec(attr)?.[1];
      if (!ref) continue;
      const tur = /t="([^"]+)"/.exec(attr)?.[1];
      const stil = Number(/s="(\d+)"/.exec(attr)?.[1] ?? 0);
      const v = /<v>([\s\S]*?)<\/v>/.exec(ic)?.[1];
      let deger: Hucre = null;
      if (tur === 's' && v !== undefined) deger = paylasilan[Number(v)] ?? '';
      else if (tur === 'inlineStr') deger = xmlCoz((ic.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<t[^>]*>|<\/t>/g, '')).join(''));
      else if (tur === 'b' && v !== undefined) deger = v === '1' ? 'DOĞRU' : 'YANLIŞ';
      else if ((tur === 'str' || tur === 'e') && v !== undefined) deger = xmlCoz(v);
      else if (v !== undefined) {
        const n = Number(v);
        deger = Number.isFinite(n) ? (stilTarih[stil] ? excelTarihi(n) : n) : xmlCoz(v);
      }
      if (deger === null || deger === '') continue;
      const k = hucreKonumu(ref);
      while (satirlar.length <= k.satir) satirlar.push([]);
      const satir = satirlar[k.satir];
      while (satir.length < k.sutun) satir.push(null);
      satir[k.sutun] = deger;
    }
    sayfalar.push({ ad, satirlar });
  }
  return sayfalar;
}

/** CSV/TSV okuma: ayraç (; , sekme) kendiliğinden bulunur, tırnaklı alanlar desteklenir. */
export function csvOku(metin: string): Hucre[][] {
  const ilk = metin.split(/\r?\n/, 1)[0] ?? '';
  const ayrac = [';', '\t', ','].map((a) => [a, ilk.split(a).length] as const).sort((x, y) => y[1] - x[1])[0][0];
  const satirlar: Hucre[][] = [];
  let satir: Hucre[] = [];
  let alan = '';
  let tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const ch = metin[i];
    if (tirnak) {
      if (ch === '"' && metin[i + 1] === '"') {
        alan += '"';
        i++;
      } else if (ch === '"') tirnak = false;
      else alan += ch;
    } else if (ch === '"') tirnak = true;
    else if (ch === ayrac) {
      satir.push(alan);
      alan = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && metin[i + 1] === '\n') i++;
      satir.push(alan);
      satirlar.push(satir);
      satir = [];
      alan = '';
    } else alan += ch;
  }
  if (alan !== '' || satir.length) {
    satir.push(alan);
    satirlar.push(satir);
  }
  return satirlar;
}

/** Tablo hücresinin ekranda/yazdırmada görünecek metni. */
export function hucreMetni(h: Hucre): string {
  if (h === null) return '';
  if (typeof h === 'number') return String(h).replace('.', ',');
  return h;
}
