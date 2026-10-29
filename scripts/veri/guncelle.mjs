// Aylık veri serilerini resmî/açık kaynaklardan indirip src/data/series/*.json olarak yazar.
// Kullanım: node scripts/veri/guncelle.mjs        (yalnızca eksik ayları indirir)
//           node scripts/veri/guncelle.mjs --tam  (döviz arşivini baştan indirir)
// Bir kaynak başarısız olursa o seri eski haliyle kalır, diğerleri güncellenir; çıkış kodu 1 olur.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheet } from './xlsx.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'src', 'data', 'series');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const BASLANGIC = '2005-01';
const TROY_ONS_GRAM = 31.1034768;
const tam = process.argv.includes('--tam');

const bugun = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'tr-TR,tr;q=0.9' }, signal: AbortSignal.timeout(60000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      last = e;
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error(`${url}: ${last?.message ?? last}`);
}

async function getBuffer(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function oku(dosya) {
  try {
    return JSON.parse(await readFile(path.join(OUT, dosya), 'utf8'));
  } catch {
    return null;
  }
}

async function yaz(dosya, veri) {
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, dosya), `${JSON.stringify(veri, null, 1)}\n`, 'utf8');
}

const ayEkle = (ay, n) => {
  const [y, m] = ay.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

// ---------- TÜFE (TCMB "Tüketici Fiyatları" sayfası: TÜİK verisi, aylık ve yıllık % değişim) ----------

const TUFE_URL = 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Enflasyon+Verileri/Tuketici+Fiyatlari';

async function tufe() {
  const html = await getText(TUFE_URL);
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const satirlar = new Map();
  for (const m of text.matchAll(/\b(\d{2})-(\d{4}) (-?\d+[.,]\d+) (-?\d+[.,]\d+)/g)) {
    const ay = `${m[2]}-${m[1]}`;
    if (!satirlar.has(ay)) satirlar.set(ay, { yillik: Number(m[3].replace(',', '.')), aylik: Number(m[4].replace(',', '.')) });
  }
  const aylar = [...satirlar.keys()].filter((a) => a >= BASLANGIC).sort();
  if (aylar.length < 200) throw new Error(`TÜFE: beklenenden az satır (${aylar.length})`);
  for (let i = 1; i < aylar.length; i++) {
    if (aylar[i] !== ayEkle(aylar[i - 1], 1)) throw new Error(`TÜFE: eksik ay ${ayEkle(aylar[i - 1], 1)}`);
  }
  // Zincirleme endeks: ilk ayın önceki ayı = 100. Yalnızca oranlar anlamlıdır (iki ay arası değişim).
  let endeks = 100;
  const seri = aylar.map((ay) => {
    const { aylik, yillik } = satirlar.get(ay);
    if (Math.abs(aylik) > 30) throw new Error(`TÜFE: ${ay} aylık değişim olağandışı (${aylik})`);
    endeks *= 1 + aylik / 100;
    return { ay, aylik, yillik, endeks: Math.round(endeks * 1e6) / 1e6 };
  });
  await yaz('tufe.json', {
    kaynak: 'TÜİK verisi – TCMB “Tüketici Fiyatları” sayfası',
    kaynakUrl: TUFE_URL,
    birim: 'Aylık ve yıllık % değişim; endeks zincirlemedir (2004-12 = 100)',
    yontem:
      'Endeks, TÜİK’in açıkladığı aylık yüzde değişimlerin zincirlenmesiyle hesaplanır. TÜİK 2026’da baz yılını 2025=100 yaptı; aylık değişimler baz değişiminden etkilenmez.',
    ilkAy: seri[0].ay,
    sonAy: seri[seri.length - 1].ay,
    olusturma: bugun,
    aylar: seri,
  });
  return `TÜFE: ${seri[0].ay} – ${seri[seri.length - 1].ay} (${seri.length} ay)`;
}

// ---------- Döviz (TCMB gösterge niteliğindeki kurlar, ay sonundaki son iş günü, döviz alış) ----------

function tcmbXmlUrl(tarih) {
  const [y, m, d] = tarih.split('-');
  return `https://www.tcmb.gov.tr/kurlar/${y}${m}/${d}${m}${y}.xml`;
}

function kurOku(xml, kod) {
  const m = new RegExp(`<Currency[^>]*Kod="${kod}"[\\s\\S]*?<ForexBuying>([^<]*)</ForexBuying>`).exec(xml);
  const v = m ? Number(m[1]) : Number.NaN;
  return Number.isFinite(v) && v > 0 ? v : null;
}

async function aySonuKuru(ay) {
  const [y, m] = ay.split('-').map(Number);
  const sonGun = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = sonGun; d >= sonGun - 9; d--) {
    const tarih = `${ay}-${String(d).padStart(2, '0')}`;
    if (tarih > bugun) continue;
    const xml = await getText(tcmbXmlUrl(tarih));
    await sleep(120);
    if (!xml) continue;
    const usd = kurOku(xml, 'USD');
    const eur = kurOku(xml, 'EUR');
    if (usd && eur) return { ay, tarih, usd, eur };
  }
  return null;
}

async function doviz() {
  const eski = tam ? null : await oku('doviz.json');
  const mevcut = new Map((eski?.aylar ?? []).map((a) => [a.ay, a]));
  // Tamamlanmış son ay: bugünden önceki ay
  const sonTamAy = ayEkle(bugun.slice(0, 7), -1);
  const seri = [];
  for (let ay = BASLANGIC; ay <= sonTamAy; ay = ayEkle(ay, 1)) {
    let kayit = mevcut.get(ay);
    if (!kayit) {
      kayit = await aySonuKuru(ay);
      if (!kayit) throw new Error(`Döviz: ${ay} için kur bulunamadı`);
      process.stdout.write(`  döviz ${ay}: USD ${kayit.usd} EUR ${kayit.eur}\n`);
    }
    seri.push(kayit);
  }
  for (let i = 1; i < seri.length; i++) {
    const oran = seri[i].usd / seri[i - 1].usd;
    if (oran > 1.6 || oran < 0.6) throw new Error(`Döviz: ${seri[i].ay} olağandışı değişim`);
  }
  await yaz('doviz.json', {
    kaynak: 'TCMB gösterge niteliğindeki döviz kurları (döviz alış)',
    kaynakUrl: 'https://www.tcmb.gov.tr/kurlar/kurlar_tr.html',
    birim: 'TL / 1 birim döviz',
    yontem: 'Her ayın son iş gününde TCMB’nin ilan ettiği döviz alış kuru (ay sonu değeri).',
    ilkAy: seri[0].ay,
    sonAy: seri[seri.length - 1].ay,
    olusturma: bugun,
    aylar: seri,
  });
  return `Döviz: ${seri[0].ay} – ${seri[seri.length - 1].ay} (${seri.length} ay)`;
}

// ---------- Altın (Dünya Bankası “Pink Sheet” aylık ons fiyatı × ay sonu USD/TRY) ----------

const WB_SAYFA = 'https://www.worldbank.org/en/research/commodity-markets';

async function altin() {
  const sayfa = await getText(WB_SAYFA);
  const link = /href="([^"]*CMO-Historical-Data-Monthly\.xlsx)"/.exec(sayfa ?? '')?.[1];
  if (!link) throw new Error('Altın: Dünya Bankası aylık veri bağlantısı bulunamadı');
  const rows = readSheet(await getBuffer(link), 'Monthly Prices');
  const baslikSatiri = rows.findIndex((r) => r?.some((c) => typeof c === 'string' && /^Gold$/i.test(c.trim())));
  if (baslikSatiri < 0) throw new Error('Altın: "Gold" sütunu bulunamadı');
  const kol = rows[baslikSatiri].findIndex((c) => typeof c === 'string' && /^Gold$/i.test(c.trim()));
  const ons = new Map();
  for (const r of rows.slice(baslikSatiri + 1)) {
    const m = typeof r?.[0] === 'string' ? /^(\d{4})M(\d{2})$/.exec(r[0].trim()) : null;
    if (m && typeof r[kol] === 'number') ons.set(`${m[1]}-${m[2]}`, r[kol]);
  }
  const dvz = await oku('doviz.json');
  if (!dvz) throw new Error('Altın: önce döviz serisi gerekli');
  const seri = dvz.aylar
    .filter((d) => ons.has(d.ay))
    .map((d) => ({ ay: d.ay, onsUsd: ons.get(d.ay), gramTl: Math.round(((ons.get(d.ay) * d.usd) / TROY_ONS_GRAM) * 100) / 100 }));
  if (seri.length < 200) throw new Error(`Altın: beklenenden az ay (${seri.length})`);
  await yaz('altin.json', {
    kaynak: 'Dünya Bankası Commodity Price Data (Pink Sheet), aylık ortalama altın (USD/troy ons) ve TCMB ay sonu USD kuru',
    kaynakUrl: WB_SAYFA,
    birim: 'Gram has altın, TL (yaklaşık)',
    yontem: 'Gram altın = aylık ortalama ons fiyatı × ay sonu USD/TRY ÷ 31,1034768. Uluslararası fiyattan hesaplanır; kuyumcu/Kapalıçarşı fiyatı değildir.',
    ilkAy: seri[0].ay,
    sonAy: seri[seri.length - 1].ay,
    olusturma: bugun,
    aylar: seri,
  });
  return `Altın: ${seri[0].ay} – ${seri[seri.length - 1].ay} (${seri.length} ay)`;
}

let hata = false;
for (const [ad, fn] of [
  ['TÜFE', tufe],
  ['Döviz', doviz],
  ['Altın', altin],
]) {
  try {
    console.log(`✓ ${await fn()}`);
  } catch (e) {
    hata = true;
    console.error(`✗ ${ad}: ${e.message}`);
  }
}
process.exitCode = hata ? 1 : 0;
