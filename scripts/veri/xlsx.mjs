// Bağımlılıksız, salt okunur küçük bir XLSX okuyucu: ZIP içinden sayfa XML'ini çıkarıp hücreleri döndürür.
import { inflateRawSync } from 'node:zlib';

function readZip(buf) {
  // End of central directory kaydını sondan geriye doğru ara
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Geçerli bir ZIP/XLSX dosyası değil');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Bozuk ZIP dizini');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    files.set(name, { method, compSize, localOff });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    names: [...files.keys()],
    read(name) {
      const f = files.get(name);
      if (!f) return null;
      const lh = f.localOff;
      const start = lh + 30 + buf.readUInt16LE(lh + 26) + buf.readUInt16LE(lh + 28);
      const data = buf.subarray(start, start + f.compSize);
      return (f.method === 8 ? inflateRawSync(data) : data).toString('utf8');
    },
  };
}

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

function colIndex(ref) {
  const letters = /^[A-Z]+/.exec(ref)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Adı verilen sayfayı satır dizisi olarak döndürür (her satır: hücre değerleri dizisi; metin ya da sayı). */
export function readSheet(buffer, sheetName) {
  const zip = readZip(buffer);
  const wb = zip.read('xl/workbook.xml');
  const rels = zip.read('xl/_rels/workbook.xml.rels');
  const sheet = [...wb.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].find((m) => decode(m[1]) === sheetName);
  if (!sheet) throw new Error(`Sayfa bulunamadı: ${sheetName}`);
  const rel = [...rels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].find((m) => m[1] === sheet[2]);
  const target = rel[2].replace(/^\/?xl\//, '').replace(/^\//, '');
  const xml = zip.read(`xl/${target}`);

  const ssXml = zip.read('xl/sharedStrings.xml') ?? '';
  const shared = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
  );

  const rows = [];
  for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const v = cm[2] ? /<v>([\s\S]*?)<\/v>/.exec(cm[2])?.[1] : undefined;
      const inline = cm[2] ? /<t[^>]*>([\s\S]*?)<\/t>/.exec(cm[2])?.[1] : undefined;
      let val = null;
      if (type === 's' && v !== undefined) val = shared[Number(v)];
      else if (type === 'inlineStr' && inline !== undefined) val = decode(inline);
      else if (type === 'str' && v !== undefined) val = decode(v);
      else if (v !== undefined) val = Number(v);
      row[colIndex(ref)] = val;
    }
    rows.push(row);
  }
  return rows;
}
