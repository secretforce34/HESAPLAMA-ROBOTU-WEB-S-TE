import { describe, expect, it } from 'vitest';
import { loadQr, makeMatrix, matrixToSvg } from '../../lib/qr';
import {
  baglantiMetni,
  epostaMetni,
  ibanGecerli,
  ibanGrupla,
  ibanMetni,
  kontrastOrani,
  onPlanKoyuMu,
  smsMetni,
  telefonMetni,
  telefonNormalize,
  vcardMetni,
  wifiMetni,
} from './calc';

describe('QR içerikleri', () => {
  it('bağlantıya https:// eklenir, şeması olan bağlantı değişmez', () => {
    expect(baglantiMetni('hesaprobotu.com')).toBe('https://hesaprobotu.com');
    expect(baglantiMetni(' http://ornek.com/a ')).toBe('http://ornek.com/a');
    expect(baglantiMetni('')).toBe('');
  });

  it('Wi-Fi: özel karakterler kaçırılır, şifresiz ağda P alanı olmaz', () => {
    expect(wifiMetni({ ssid: 'Ev;Ağı', sifre: 'a:b,c', guvenlik: 'WPA', gizli: false })).toBe('WIFI:T:WPA;S:Ev\\;Ağı;P:a\\:b\\,c;;');
    expect(wifiMetni({ ssid: 'Misafir', sifre: 'x', guvenlik: 'nopass', gizli: true })).toBe('WIFI:T:nopass;S:Misafir;H:true;;');
    expect(wifiMetni({ ssid: ' ', sifre: '', guvenlik: 'WPA', gizli: false })).toBe('');
  });

  it('kartvizit vCard 3.0 biçiminde', () => {
    const v = vcardMetni({ ad: 'Ayşe', soyad: 'Yılmaz', telefon: '0532 123 45 67', eposta: 'ayse@ornek.com', sirket: 'Örnek, A.Ş.', unvan: '', web: 'ornek.com', adres: '' });
    expect(v.startsWith('BEGIN:VCARD\nVERSION:3.0\nN:Yılmaz;Ayşe;;;\nFN:Ayşe Yılmaz')).toBe(true);
    expect(v).toContain('ORG:Örnek\\, A.Ş.');
    expect(v).toContain('TEL;TYPE=CELL:+905321234567');
    expect(v).toContain('URL:https://ornek.com');
    expect(v.endsWith('END:VCARD')).toBe(true);
  });

  it('telefon numaraları uluslararası biçime çevrilir', () => {
    expect(telefonNormalize('0532 123 45 67')).toBe('+905321234567');
    expect(telefonNormalize('532 123 45 67')).toBe('+905321234567');
    expect(telefonNormalize('+90 (212) 555 00 00')).toBe('+902125550000');
    expect(telefonMetni('05321234567')).toBe('tel:+905321234567');
    expect(smsMetni('05321234567', 'Merhaba')).toBe('SMSTO:+905321234567:Merhaba');
  });

  it('e-posta konusu ve metni bağlantıya kodlanır', () => {
    expect(epostaMetni('a@b.com', 'Fatura sorusu', 'Merhaba, nasılsınız?')).toBe('mailto:a@b.com?subject=Fatura%20sorusu&body=Merhaba%2C%20nas%C4%B1ls%C4%B1n%C4%B1z%3F');
    expect(epostaMetni('a@b.com', '', '')).toBe('mailto:a@b.com');
  });

  it('IBAN: mod 97 kontrolü ve gruplama', () => {
    // Türkiye için örnek IBAN (ISO 13616 kayıt örneği)
    expect(ibanGecerli('TR33 0006 1005 1978 6457 8413 26')).toBe(true);
    expect(ibanGecerli('TR34 0006 1005 1978 6457 8413 26')).toBe(false);
    expect(ibanGecerli('TR33000610051978645784132')).toBe(false);
    expect(ibanGrupla('tr330006100519786457841326')).toBe('TR33 0006 1005 1978 6457 8413 26');
  });

  it('IBAN metni alıcı, IBAN, tutar ve açıklamayı satır satır yazar', () => {
    expect(ibanMetni({ alici: 'Ali Veli', iban: 'TR330006100519786457841326', aciklama: 'Kira', tutar: '15.000 TL' })).toBe(
      'Alıcı: Ali Veli\nIBAN: TR33 0006 1005 1978 6457 8413 26\nTutar: 15.000 TL\nAçıklama: Kira',
    );
  });

  it('renk kontrastı: siyah-beyaz 21, açık ön plan uyarısı', () => {
    expect(kontrastOrani('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(kontrastOrani('#cccccc', '#ffffff')).toBeLessThan(3);
    expect(onPlanKoyuMu('#0d3461', '#ffffff')).toBe(true);
    expect(onPlanKoyuMu('#ffffff', '#000000')).toBe(false);
  });
});

describe('QR çizimi', () => {
  it('Türkçe metin kodlanır; yüksek hata düzeltme daha büyük kod üretir', async () => {
    const f = await loadQr();
    const m = makeMatrix(f, 'Çiğdem Şükrü İğdır', 'L');
    const h = makeMatrix(f, 'Çiğdem Şükrü İğdır', 'H');
    expect(m.size).toBeGreaterThanOrEqual(21);
    expect(h.size).toBeGreaterThan(m.size);
    expect(m.dark).toHaveLength(m.size);
  });

  it('SVG kenar boşluğu ve renkleri içerir', async () => {
    const f = await loadQr();
    const m = makeMatrix(f, 'https://hesaprobotu.com', 'M');
    const svg = matrixToSvg(m, { margin: 4, fg: '#0d3461', bg: '#ffffff' });
    expect(svg).toContain(`viewBox="0 0 ${m.size + 8} ${m.size + 8}"`);
    expect(svg).toContain('fill="#0d3461"');
  });

  it('QR’a sığmayan uzun metin hata verir', async () => {
    const f = await loadQr();
    expect(() => makeMatrix(f, 'x'.repeat(4000), 'H')).toThrow();
  });
});
