// Kaynak dosyalarındaki tüm dış bağlantıları (resmî kaynak linkleri) kontrol eder.
// Kullanım: node scripts/link-kontrol.mjs
// Çıktı: erişilemeyen ya da hata dönen bağlantıların listesi; hata varsa çıkış kodu 1.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['src'];
const EXT = /\.(ts|tsx|astro|md|mjs)$/;
const URL_RE = /https?:\/\/[^\s'"`<>)\]}]+/g;
const SKIP = [/^https?:\/\/(www\.)?hesaprobotu\.com/, /schema\.org/, /localhost/, /example\./, /w3\.org/];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (EXT.test(e.name) && !e.name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

const found = new Map(); // url -> Set<dosya>
for (const d of SCAN_DIRS) {
  for (const file of await walk(path.join(root, d))) {
    const text = await readFile(file, 'utf8');
    for (const m of text.matchAll(URL_RE)) {
      const url = m[0].replace(/[.,;:]+$/, '');
      if (SKIP.some((r) => r.test(url))) continue;
      if (!found.has(url)) found.set(url, new Set());
      found.get(url).add(path.relative(root, file));
    }
  }
}

// Bazı kamu siteleri HEAD isteğine ve tanımadığı tarayıcı kimliğine yanıt vermiyor; bu yüzden
// tarayıcı kimliğiyle GET yapılır ve yavaş sunucular için bir kez daha denenir.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

async function check(url) {
  let last = '?';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/pdf,*/*', 'accept-language': 'tr-TR,tr;q=0.9' },
        signal: AbortSignal.timeout(45000),
      });
      await res.body?.cancel();
      if (res.ok) return { ok: true, status: res.status };
      last = res.status;
      if (res.status === 404 || res.status === 410) break;
    } catch (err) {
      last = String(err?.cause?.code ?? err?.name ?? err);
    }
  }
  return { ok: false, status: last };
}

const urls = [...found.keys()].sort();
console.log(`${urls.length} benzersiz dış bağlantı kontrol ediliyor…\n`);
const bad = [];
const queue = [...urls];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      const r = await check(url);
      if (!r.ok) bad.push({ url, status: r.status, files: [...found.get(url)] });
    }
  }),
);

if (bad.length === 0) {
  console.log('Tüm bağlantılar çalışıyor.');
} else {
  console.log(`${bad.length} sorunlu bağlantı:\n`);
  for (const b of bad) console.log(`✗ [${b.status}] ${b.url}\n    ${b.files.join(', ')}`);
  process.exitCode = 1;
}
