// 4857 sayılı İş Kanunu md. 53–59: yıllık ücretli izin.
// md. 53: hizmet süresi 1–5 yıl (5 dahil) 14 gün; 5'ten fazla 15'ten az 20 gün; 15 yıl (dahil) ve fazlası 26 gün.
//         18 yaş ve altı ile 50 yaş ve üstü işçilere 20 günden az izin verilemez. Yeraltı işlerinde +4 gün.
// İzin hakkı her hizmet yılı dolduğunda doğar; süre o tarihteki kıdem ve yaşa göre belirlenir.

export interface IzinInput {
  /** İşe giriş tarihi (ISO) */
  giris: string;
  /** Doğum tarihi (ISO) */
  dogum: string;
  /** Hesap tarihi (ISO) — çıkış tarihi ya da bugün */
  hesapTarihi: string;
  yeraltı: boolean;
  /** Sözleşmeyle her yıl verilen ek gün */
  ekGun: number;
  /** Bugüne kadar kullanılan toplam izin günü */
  kullanilan: number;
}

export interface HakEdis {
  /** Kaçıncı hizmet yılı */
  yil: number;
  tarih: string;
  yas: number;
  gun: number;
}

export interface IzinSonucu {
  hakEdisler: HakEdis[];
  toplamHak: number;
  kullanilan: number;
  kalan: number;
  sonraki: HakEdis | null;
  /** Hesap tarihindeki hizmet süresi */
  hizmet: { yil: number; ay: number; gun: number };
}

function parse(iso: string) {
  return { y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)), d: Number(iso.slice(8, 10)) };
}

function iso(y: number, m: number, d: number) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** n yıl sonraki yıldönümü; 29 Şubat artık olmayan yıllarda 28 Şubat'a çekilir. */
export function yilEkle(baslangic: string, n: number): string {
  const { y, m, d } = parse(baslangic);
  const hedefYil = y + n;
  const sonGun = new Date(Date.UTC(hedefYil, m, 0)).getUTCDate();
  return iso(hedefYil, m, Math.min(d, sonGun));
}

/** Tam yaş (ya da tam yıl) farkı */
export function tamYil(baslangic: string, bitis: string): number {
  const a = parse(baslangic);
  const b = parse(bitis);
  let yil = b.y - a.y;
  if (b.m < a.m || (b.m === a.m && b.d < a.d)) yil -= 1;
  return yil;
}

/** md. 53'e göre bir hizmet yılı için izin günü */
export function izinGunu(kidemYil: number, yas: number, yeraltı: boolean, ekGun = 0): number {
  let gun = kidemYil <= 5 ? 14 : kidemYil < 15 ? 20 : 26;
  if (yas <= 18 || yas >= 50) gun = Math.max(gun, 20);
  if (yeraltı) gun += 4;
  return gun + ekGun;
}

function hizmetSuresi(giris: string, bitis: string) {
  const yil = tamYil(giris, bitis);
  const yilSonrasi = yilEkle(giris, yil);
  const a = parse(yilSonrasi);
  const b = parse(bitis);
  let ay = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) ay -= 1;
  const aySonrasi = (() => {
    const toplamAy = a.m - 1 + ay;
    const yy = a.y + Math.floor(toplamAy / 12);
    const mm = (toplamAy % 12) + 1;
    const sonGun = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    return iso(yy, mm, Math.min(a.d, sonGun));
  })();
  const gun = Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(parse(aySonrasi).y, parse(aySonrasi).m - 1, parse(aySonrasi).d)) / 86_400_000);
  return { yil, ay, gun };
}

export function hesaplaIzin(i: IzinInput): IzinSonucu {
  const hakEdisler: HakEdis[] = [];
  const tamYilSayisi = Math.max(0, tamYil(i.giris, i.hesapTarihi));
  for (let n = 1; n <= tamYilSayisi; n++) {
    const tarih = yilEkle(i.giris, n);
    const yas = tamYil(i.dogum, tarih);
    hakEdisler.push({ yil: n, tarih, yas, gun: izinGunu(n, yas, i.yeraltı, i.ekGun) });
  }
  const sonrakiTarih = yilEkle(i.giris, tamYilSayisi + 1);
  const sonrakiYas = tamYil(i.dogum, sonrakiTarih);
  const toplamHak = hakEdisler.reduce((t, h) => t + h.gun, 0);
  return {
    hakEdisler,
    toplamHak,
    kullanilan: i.kullanilan,
    kalan: toplamHak - i.kullanilan,
    sonraki: {
      yil: tamYilSayisi + 1,
      tarih: sonrakiTarih,
      yas: sonrakiYas,
      gun: izinGunu(tamYilSayisi + 1, sonrakiYas, i.yeraltı, i.ekGun),
    },
    hizmet: hizmetSuresi(i.giris, i.hesapTarihi),
  };
}

/** md. 59: sözleşme sona erince kullanılmayan izin ücreti (brüt) = kalan gün × günlük brüt ücret */
export function kullanilmayanIzinUcreti(kalanGun: number, aylikBrut: number): number {
  return Math.round(Math.max(0, kalanGun) * (aylikBrut / 30) * 100) / 100;
}

export function validateIzin(i: { giris: string; dogum: string; hesap: string; kullanilan: number | null; ek: number | null }) {
  const e: Record<string, string> = {};
  const ok = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!ok(i.giris)) e.giris = 'İşe giriş tarihini seçin.';
  if (!ok(i.dogum)) e.dogum = 'Doğum tarihini seçin.';
  if (!ok(i.hesap)) e.hesap = 'Hesap tarihini seçin.';
  if (ok(i.giris) && ok(i.hesap) && i.hesap < i.giris) e.hesap = 'Hesap tarihi işe girişten önce olamaz.';
  if (ok(i.giris) && ok(i.dogum) && tamYil(i.dogum, i.giris) < 14) e.dogum = 'İşe girişte en az 14 yaşında olmalısınız.';
  if (i.kullanilan === null || i.kullanilan < 0) e.kullanilan = '0 veya daha büyük olmalı.';
  if (i.ek === null || i.ek < 0) e.ek = '0 veya daha büyük olmalı.';
  return e;
}
