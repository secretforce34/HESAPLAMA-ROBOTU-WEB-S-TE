// QR koda yazılacak metni üretir. Biçimler telefon kameralarının ve QR okuyucuların tanıdığı yaygın kalıplardır:
// Wi-Fi "WIFI:T:WPA;S:ağ;P:şifre;;", kartvizit vCard 3.0, e-posta "mailto:", SMS "SMSTO:", telefon "tel:".

export type QrTur = 'baglanti' | 'metin' | 'wifi' | 'kartvizit' | 'iban' | 'eposta' | 'sms' | 'telefon';

/** Alan adı yazılıp başına https:// unutulduysa ekler ("hesaprobotu.com" → "https://hesaprobotu.com"). */
export function baglantiMetni(url: string): string {
  const u = url.trim();
  if (!u) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
  return `https://${u}`;
}

// Wi-Fi metninde \ ; , : " karakterleri ters bölüyle kaçırılır.
const wifiKacir = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');

export type WifiGuvenlik = 'WPA' | 'WEP' | 'nopass';

export function wifiMetni(w: { ssid: string; sifre: string; guvenlik: WifiGuvenlik; gizli: boolean }): string {
  if (!w.ssid.trim()) return '';
  const parcalar = [`T:${w.guvenlik}`, `S:${wifiKacir(w.ssid)}`];
  if (w.guvenlik !== 'nopass') parcalar.push(`P:${wifiKacir(w.sifre)}`);
  if (w.gizli) parcalar.push('H:true');
  return `WIFI:${parcalar.join(';')};;`;
}

// vCard'da \ , ; ve satır sonu kaçırılır.
const vKacir = (s: string) => s.trim().replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');

export interface Kartvizit {
  ad: string;
  soyad: string;
  telefon: string;
  eposta: string;
  sirket: string;
  unvan: string;
  web: string;
  adres: string;
}

export function vcardMetni(k: Kartvizit): string {
  if (!k.ad.trim() && !k.soyad.trim() && !k.sirket.trim()) return '';
  const satirlar = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vKacir(k.soyad)};${vKacir(k.ad)};;;`, `FN:${vKacir(`${k.ad} ${k.soyad}`.trim() || k.sirket)}`];
  if (k.sirket.trim()) satirlar.push(`ORG:${vKacir(k.sirket)}`);
  if (k.unvan.trim()) satirlar.push(`TITLE:${vKacir(k.unvan)}`);
  if (k.telefon.trim()) satirlar.push(`TEL;TYPE=CELL:${telefonNormalize(k.telefon)}`);
  if (k.eposta.trim()) satirlar.push(`EMAIL:${k.eposta.trim()}`);
  if (k.web.trim()) satirlar.push(`URL:${baglantiMetni(k.web)}`);
  if (k.adres.trim()) satirlar.push(`ADR;TYPE=WORK:;;${vKacir(k.adres)};;;;`);
  satirlar.push('END:VCARD');
  return satirlar.join('\n');
}

/** Türkiye numaralarını uluslararası biçime çevirir: "0532 123 45 67" → "+905321234567". */
export function telefonNormalize(tel: string): string {
  const t = tel.trim();
  const rakam = t.replace(/\D/g, '');
  if (t.startsWith('+')) return `+${rakam}`;
  if (rakam.length === 11 && rakam.startsWith('0')) return `+90${rakam.slice(1)}`;
  if (rakam.length === 10 && rakam.startsWith('5')) return `+90${rakam}`;
  if (rakam.length === 12 && rakam.startsWith('90')) return `+${rakam}`;
  return rakam;
}

export function telefonMetni(tel: string): string {
  const n = telefonNormalize(tel);
  return n ? `tel:${n}` : '';
}

export function smsMetni(tel: string, mesaj: string): string {
  const n = telefonNormalize(tel);
  return n ? `SMSTO:${n}:${mesaj}` : '';
}

export function epostaMetni(adres: string, konu: string, govde: string): string {
  const a = adres.trim();
  if (!a) return '';
  const q = [konu.trim() && `subject=${encodeURIComponent(konu.trim())}`, govde.trim() && `body=${encodeURIComponent(govde.trim())}`].filter(Boolean);
  return `mailto:${a}${q.length ? `?${q.join('&')}` : ''}`;
}

/** Boşlukları silip büyük harfe çevirir. */
export function ibanSadele(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

/** 4'lü gruplar: "TR33 0006 1005 …" */
export function ibanGrupla(iban: string): string {
  return ibanSadele(iban).replace(/(.{4})/g, '$1 ').trim();
}

/** ISO 13616 kontrolü (mod 97 = 1). Türkiye IBAN'ı TR ile başlar ve 26 karakterdir. */
export function ibanGecerli(iban: string): boolean {
  const s = ibanSadele(iban);
  if (!/^TR\d{24}$/.test(s)) return false;
  const yeniden = s.slice(4) + s.slice(0, 4);
  let kalan = 0;
  for (const ch of yeniden) {
    const deger = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const r of deger) kalan = (kalan * 10 + Number(r)) % 97;
  }
  return kalan === 1;
}

export function ibanMetni(i: { alici: string; iban: string; aciklama: string; tutar: string }): string {
  if (!ibanSadele(i.iban)) return '';
  const satirlar = [];
  if (i.alici.trim()) satirlar.push(`Alıcı: ${i.alici.trim()}`);
  satirlar.push(`IBAN: ${ibanGrupla(i.iban)}`);
  if (i.tutar.trim()) satirlar.push(`Tutar: ${i.tutar.trim()}`);
  if (i.aciklama.trim()) satirlar.push(`Açıklama: ${i.aciklama.trim()}`);
  return satirlar.join('\n');
}

/** Ön plan ile arka plan arasındaki kontrast oranı (WCAG formülü); QR okunması için en az 3 olmalı ve ön plan koyu olmalı. */
export function kontrastOrani(on: string, arka: string): number {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const a = lum(on);
  const b = lum(arka);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function onPlanKoyuMu(on: string, arka: string): boolean {
  const toplam = (hex: string) => [0, 2, 4].reduce((t, i) => t + parseInt(hex.replace('#', '').slice(i, i + 2), 16), 0);
  return toplam(on) < toplam(arka);
}
