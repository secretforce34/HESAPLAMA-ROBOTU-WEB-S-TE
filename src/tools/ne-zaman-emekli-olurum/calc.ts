import { emeklilikKurallari, type YasKademesi } from '../../data/params/emeklilik';

export type Statu = '4a' | '4b';
export type Cinsiyet = 'kadin' | 'erkek';
export type Grup = 'eyt' | '1999-2008' | '2008-sonrasi';

export interface EmeklilikInput {
  statu: Statu;
  cinsiyet: Cinsiyet;
  dogum: string;
  /** İlk sigortalı olunan tarih (ilk işe giriş) */
  ilkGiris: string;
  /** Bugüne kadar ödenmiş prim günü */
  primGun: number;
  /** Bundan sonra yılda ödenecek ortalama prim günü (tam çalışmada 360) */
  yillikGun: number;
  /** Hesap tarihi (bugün) */
  bugun: string;
  /** Borçlanılacak gün (askerlik, doğum vb.) */
  borclanmaGun: number;
  /** Borçlanılan süre ilk işe girişten ÖNCEYE mi ait (ör. işe girmeden yapılan askerlik) */
  borclanmaGiristenOnce: boolean;
}

export interface Sart {
  ad: string;
  gereken: string;
  /** Şartın tamamlandığı / tamamlanacağı tarih; şart yoksa null */
  tarih: string | null;
  tamam: boolean;
}

export interface Yol {
  ad: string;
  sartlar: Sart[];
  /** Tüm şartların sağlandığı tarih */
  tarih: string;
  /** O tarihteki yaş */
  yas: number;
  tamam: boolean;
}

export interface EmeklilikSonucu {
  grup: Grup;
  grupAdi: string;
  /** Borçlanma dahil sigortalılık başlangıcı */
  baslangic: string;
  toplamGun: number;
  ana: Yol;
  alternatifler: Yol[];
  enErken: Yol;
}

// ---------- tarih yardımcıları ----------

function parse(iso: string) {
  return { y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)), d: Number(iso.slice(8, 10)) };
}
function iso(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}
function utc(isoStr: string): number {
  const p = parse(isoStr);
  return Date.UTC(p.y, p.m - 1, p.d);
}
export function yilEkle(isoStr: string, n: number): string {
  const p = parse(isoStr);
  const y = p.y + n;
  const son = new Date(Date.UTC(y, p.m, 0)).getUTCDate();
  return `${y}-${String(p.m).padStart(2, '0')}-${String(Math.min(p.d, son)).padStart(2, '0')}`;
}
export function gunEkle(isoStr: string, gun: number): string {
  return iso(utc(isoStr) + Math.round(gun) * 86_400_000);
}
export function yasHesapla(dogum: string, tarih: string): number {
  const a = parse(dogum);
  const b = parse(tarih);
  let y = b.y - a.y;
  if (b.m < a.m || (b.m === a.m && b.d < a.d)) y -= 1;
  return y;
}
const enGec = (tarihler: string[]) => tarihler.reduce((a, b) => (a > b ? a : b));

// ---------- kurallar ----------

export function grupBul(baslangic: string): Grup {
  if (baslangic <= '1999-09-08') return 'eyt';
  if (baslangic <= '2008-04-30') return '1999-2008';
  return '2008-sonrasi';
}

const GRUP_ADI: Record<Grup, string> = {
  eyt: '08.09.1999 ve öncesi sigortalı (EYT – yaş şartı yok)',
  '1999-2008': '09.09.1999 – 30.04.2008 arası sigortalı',
  '2008-sonrasi': '01.05.2008 ve sonrası sigortalı (5510 sayılı Kanun)',
};

function kademe(tablo: YasKademesi[], tarih: string, c: Cinsiyet): number {
  const k = tablo.find((t) => tarih >= t.from && tarih <= t.to) ?? tablo[tablo.length - 1];
  return c === 'kadin' ? k.kadin : k.erkek;
}

/** Prim gününün `hedef`e ulaşacağı tarih (bugünden sonra yılda `yillikGun` ödenirse) */
function gunTarihi(i: EmeklilikInput, toplamGun: number, hedef: number): string | null {
  if (toplamGun >= hedef) return i.bugun;
  if (i.yillikGun <= 0) return null;
  const eksik = hedef - toplamGun;
  return gunEkle(i.bugun, (eksik / i.yillikGun) * 365.25);
}

function yolKur(i: EmeklilikInput, ad: string, sartlar: Sart[]): Yol | null {
  if (sartlar.some((s) => s.tarih === null)) return null;
  const tarih = enGec(sartlar.map((s) => s.tarih as string));
  return { ad, sartlar, tarih, yas: yasHesapla(i.dogum, tarih), tamam: tarih <= i.bugun };
}

const sart = (i: EmeklilikInput, ad: string, gereken: string, tarih: string | null): Sart => ({
  ad,
  gereken,
  tarih,
  tamam: tarih !== null && tarih <= i.bugun,
});

/**
 * Yaşlılık aylığı (tam emeklilik) ve varsa yaştan (kısmi) emeklilik tarihini hesaplar.
 * Borçlanma günleri prim gününe eklenir; ilk girişten önceki bir süreye aitse sigortalılık başlangıcı
 * o kadar gün geriye çekilir (5510 md. 41).
 */
export function hesaplaEmeklilik(i: EmeklilikInput): EmeklilikSonucu {
  const k = emeklilikKurallari.values;
  const baslangic = i.borclanmaGiristenOnce && i.borclanmaGun > 0 ? gunEkle(i.ilkGiris, -i.borclanmaGun) : i.ilkGiris;
  const toplamGun = i.primGun + Math.max(0, i.borclanmaGun);
  const grup = grupBul(baslangic);
  const kadin = i.cinsiyet === 'kadin';
  const alternatifler: Yol[] = [];
  let ana: Yol | null = null;

  if (grup === 'eyt') {
    if (i.statu === '4a') {
      const tablo = kadin ? k.eytKadin : k.eytErkek;
      const satir = tablo.find((t) => baslangic >= t.from && baslangic <= t.to) ?? tablo[tablo.length - 1];
      ana = yolKur(i, 'Tam emeklilik (EYT)', [
        sart(i, 'Sigortalılık süresi', `${satir.sure} yıl`, yilEkle(baslangic, satir.sure)),
        sart(i, 'Prim günü', `${satir.gun.toLocaleString('tr-TR')} gün`, gunTarihi(i, toplamGun, satir.gun)),
        sart(i, 'Yaş', 'Yaş şartı yok', baslangic),
      ]);
    } else {
      const gun = kadin ? k.eytBagkur.kadin : k.eytBagkur.erkek;
      ana = yolKur(i, 'Tam emeklilik (EYT)', [
        sart(i, 'Prim günü', `${gun.toLocaleString('tr-TR')} gün (${kadin ? 20 : 25} tam yıl)`, gunTarihi(i, toplamGun, gun)),
        sart(i, 'Yaş', 'Yaş şartı yok', baslangic),
      ]);
    }
  } else if (grup === '1999-2008') {
    const yas = kadin ? k.donem2.kadinYas : k.donem2.erkekYas;
    const gun = i.statu === '4a' ? k.donem2.ssk : k.donem2.bagkur;
    const yasTarihi = yilEkle(i.dogum, yas);
    ana = yolKur(i, 'Tam emeklilik', [
      sart(i, 'Yaş', `${yas}`, yasTarihi),
      sart(i, 'Prim günü', `${gun.toLocaleString('tr-TR')} gün`, gunTarihi(i, toplamGun, gun)),
    ]);
    if (i.statu === '4a') {
      const alt = yolKur(i, `${k.donem2.sskKismiSure} yıl sigortalılık + ${k.donem2.sskKismiGun.toLocaleString('tr-TR')} gün`, [
        sart(i, 'Yaş', `${yas}`, yasTarihi),
        sart(i, 'Sigortalılık süresi', `${k.donem2.sskKismiSure} yıl`, yilEkle(baslangic, k.donem2.sskKismiSure)),
        sart(i, 'Prim günü', `${k.donem2.sskKismiGun.toLocaleString('tr-TR')} gün`, gunTarihi(i, toplamGun, k.donem2.sskKismiGun)),
      ]);
      if (alt) alternatifler.push(alt);
    }
  } else {
    const gun = i.statu === '4a' ? k.donem3.ssk : k.donem3.bagkur;
    const gunT = gunTarihi(i, toplamGun, gun);
    if (gunT) {
      // Gerekli yaş, gün şartının tamamlandığı tarihe göre belirlenir (5510 md. 28).
      const yas = kademe(k.yasTablosu, gunT, i.cinsiyet);
      ana = yolKur(i, 'Tam emeklilik', [
        sart(i, 'Prim günü', `${gun.toLocaleString('tr-TR')} gün`, gunT),
        sart(i, 'Yaş', `${yas} (günün tamamlandığı yıla göre)`, yilEkle(i.dogum, yas)),
      ]);
    }
    const kGun = (k.kismiGunKademesi.find((g) => baslangic >= g.from && baslangic <= g.to) ?? k.kismiGunKademesi[k.kismiGunKademesi.length - 1]).gun;
    const kGunT = gunTarihi(i, toplamGun, kGun);
    if (kGunT) {
      const kYas = kademe(k.kismiYasTablosu, kGunT, i.cinsiyet);
      const alt = yolKur(i, `Yaştan (kısmi) emeklilik – ${kGun.toLocaleString('tr-TR')} gün`, [
        sart(i, 'Prim günü', `${kGun.toLocaleString('tr-TR')} gün`, kGunT),
        sart(i, 'Yaş', `${kYas}`, yilEkle(i.dogum, kYas)),
      ]);
      if (alt) alternatifler.push(alt);
    }
  }

  if (!ana) {
    // Yılda prim ödenmeyecekse gün şartı hiç dolmaz: geçici yol olarak gösterilecek tarih yok.
    ana = { ad: 'Tam emeklilik', sartlar: [], tarih: '9999-12-31', yas: 0, tamam: false };
  }
  const enErken = [ana, ...alternatifler].reduce((a, b) => (b.tarih < a.tarih ? b : a));
  return { grup, grupAdi: GRUP_ADI[grup], baslangic, toplamGun, ana, alternatifler, enErken };
}

export function kalanSure(bugun: string, hedef: string): { yil: number; ay: number } {
  if (hedef <= bugun) return { yil: 0, ay: 0 };
  const a = parse(bugun);
  const b = parse(hedef);
  let ay = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) ay -= 1;
  return { yil: Math.floor(ay / 12), ay: ay % 12 };
}

export function validateEmeklilik(i: { dogum: string; giris: string; gun: number | null; yillik: number | null; bugun: string }) {
  const e: Record<string, string> = {};
  const ok = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!ok(i.dogum)) e.dogum = 'Doğum tarihinizi seçin.';
  if (!ok(i.giris)) e.giris = 'İlk sigorta başlangıç tarihinizi seçin.';
  if (ok(i.dogum) && ok(i.giris) && yasHesapla(i.dogum, i.giris) < 14) e.giris = 'İlk giriş tarihi doğum tarihine göre çok erken.';
  if (ok(i.giris) && i.giris > i.bugun) e.giris = 'İlk giriş tarihi bugünden sonra olamaz.';
  if (i.gun === null || i.gun < 0) e.gun = 'Prim gün sayınızı girin.';
  if (i.yillik === null || i.yillik < 0 || i.yillik > 360) e.yillik = '0 ile 360 arasında olmalı.';
  return e;
}
