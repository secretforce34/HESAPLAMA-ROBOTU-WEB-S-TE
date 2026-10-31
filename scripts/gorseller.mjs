// Paylaşım görseli (public/og.png) ve uygulama simgelerini SVG'den üretir.
// Kullanım: node scripts/gorseller.mjs   (sharp, Astro ile birlikte kurulu gelir)
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (name) => path.join(root, 'public', name);

const robot = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <line x1="18" y1="3.5" x2="18" y2="9" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="18" cy="3.6" r="2.6" fill="#ffffff"/>
    <rect x="3" y="8.5" width="30" height="24" rx="8" fill="#f5a524"/>
    <rect x="7" y="13" width="22" height="11.5" rx="5.75" fill="#ffffff"/>
    <circle cx="13.2" cy="18.75" r="2.4" fill="#0d3461"/>
    <circle cx="22.8" cy="18.75" r="2.4" fill="#0d3461"/>
    <rect x="13" y="27.2" width="10" height="2.2" rx="1.1" fill="#ffffff"/>
  </g>`;

const font = `font-family="Segoe UI, Inter, Arial, sans-serif"`;
const chips = ['Kredi', 'Araç', 'Kira', 'Maaş', 'Borsa', 'Faiz', 'Altın', 'QR'];
let cx = 96;
const chipSvg = chips
  .map((c) => {
    const w = 26 + c.length * 15.5;
    const g = `<rect x="${cx}" y="430" width="${w}" height="48" rx="24" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.28"/>
      <text x="${cx + w / 2}" y="462" text-anchor="middle" ${font} font-size="24" font-weight="600" fill="#ffffff">${c}</text>`;
    cx += w + 12;
    return g;
  })
  .join('');

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d3461"/>
      <stop offset="1" stop-color="#1d5bb0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1080" cy="120" r="260" fill="#ffffff" fill-opacity="0.05"/>
  <circle cx="1130" cy="560" r="180" fill="#f5a524" fill-opacity="0.14"/>
  ${robot(96, 92, 3.2)}
  <text x="226" y="170" ${font} font-size="64" font-weight="800" fill="#ffffff">Hesap Robotu</text>
  <text x="96" y="290" ${font} font-size="54" font-weight="800" fill="#ffffff">Paranla ilgili her hesap,</text>
  <text x="96" y="358" ${font} font-size="54" font-weight="800" fill="#f5a524">kuruşu kuruşuna.</text>
  ${chipSvg}
  <text x="96" y="560" ${font} font-size="26" font-weight="500" fill="#ffffff" fill-opacity="0.9">Ücretsiz · Resmî kaynaklı · Bilgileriniz cihazınızda kalır</text>
</svg>`;

const icon = (size, pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#0d3461"/>
  ${robot(pad, pad * 0.9, (size - pad * 2) / 36)}
</svg>`;

await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(out('og.png'));
await sharp(Buffer.from(icon(180, 26))).png().toFile(out('apple-touch-icon.png'));
await sharp(Buffer.from(icon(512, 74))).png().toFile(out('icon-512.png'));
console.log('og.png, apple-touch-icon.png, icon-512.png üretildi.');
