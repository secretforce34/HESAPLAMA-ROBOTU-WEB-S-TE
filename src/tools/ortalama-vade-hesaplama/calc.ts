import { daysBetween, roundTo } from '../../lib/finance';

/** Vadesi baz tarihten önce olan (gecikmiş) satırlar nasıl ele alınsın? */
export type GecmisYontemi = 'negatif' | 'sifir' | 'disla';

export interface VadeSatiri {
  tutar: number;
  /** Vade tarihi (ISO: YYYY-AA-GG) */
  vade: string;
  ad?: string;
}

export interface OrtalamaVadeInput {
  /** Baz (hesap) tarihi, ISO */
  baz: string;
  satirlar: VadeSatiri[];
  gecmis: GecmisYontemi;
  /** İsteğe bağlı: yıllık faiz (%) – faizi dikkate alan denk vade için. 0 / null: hesaplanmaz. */
  faizOrani?: number | null;
  /** Faizde gün esası (365 ya da 360) */
  gunEsasi?: 365 | 360;
}

export interface VadeSatirSonucu {
  ad: string;
  tutar: number;
  vade: string;
  /** Baz tarihten vadeye gün (gecikmiş ise negatif) */
  gun: number;
  gecikmis: boolean;
  /** Ortalamaya katılan gün: yönteme göre gün, 0 ya da hariç */
  etkinGun: number | null;
  /** Ortalamaya dahil mi? */
  dahil: boolean;
  /** Dahil edilen satırlar içindeki tutar payı (0–1) */
  pay: number;
  /** tutar × etkin gün */
  tutarGun: number;
}

export interface OrtalamaVadeSonucu {
  satirlar: VadeSatirSonucu[];
  /** Listedeki tüm tutarların toplamı */
  toplamTutar: number;
  /** Ortalamaya giren tutarların toplamı */
  hesaplananTutar: number;
  /** Tutar ağırlıklı ortalama vade (gün, ondalıklı) */
  ortalamaGun: number;
  /** Tam güne yuvarlanmış ortalama vade */
  ortalamaGunYuvarlak: number;
  ortalamaVadeTarihi: string;
  /** Tutarları hesaba katmadan düz ortalama (gün) */
  basitOrtalamaGun: number;
  enErkenVade: string;
  enGecVade: string;
  gecikmisSayisi: number;
  gecikmisTutar: number;
  /** Faizi dikkate alan denk vade (faiz verildiyse) */
  faizli: { gun: number; tarih: string } | null;
}

// ---------- Tarih yardımcıları (saat dilimi etkilemesin diye UTC) ----------

/** "2026-10-29" + 50 gün → "2026-12-18" (negatif gün geriye gider) */
export function addDaysIso(iso: string, days: number): string {
  const t = Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) + days * 86_400_000;
  const d = new Date(t);
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const g = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
}

/** Gerçek bir takvim günü mü? (2026-02-30 geçersiz) */
export function isValidIsoDate(iso: string | null | undefined): iso is string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// ---------- Hesap ----------

/**
 * Tutar ağırlıklı ortalama vade:  Σ(tutar × gün) ÷ Σ tutar
 * Günler baz tarihten vadeye sayılır. Vadesi baz tarihten önce olan satır negatif gün alır
 * ("yöntem: negatif"); istenirse 0 gün sayılır ya da ortalamanın dışında bırakılır.
 * Ortalama vade tarihi = baz tarih + tam güne yuvarlanmış ortalama gün.
 */
export function hesaplaOrtalamaVade(input: OrtalamaVadeInput): OrtalamaVadeSonucu | null {
  const { baz, satirlar, gecmis } = input;

  const ham = satirlar.map((s) => {
    const gun = daysBetween(baz, s.vade);
    const gecikmis = gun < 0;
    let etkinGun: number | null = gun;
    if (gecikmis && gecmis === 'sifir') etkinGun = 0;
    if (gecikmis && gecmis === 'disla') etkinGun = null;
    return { s, gun, gecikmis, etkinGun };
  });

  const dahilToplam = ham.reduce((t, h) => (h.etkinGun === null ? t : t + h.s.tutar), 0);
  if (!(dahilToplam > 0)) return null;

  const agirlikliToplam = ham.reduce((t, h) => (h.etkinGun === null ? t : t + h.s.tutar * h.etkinGun), 0);
  const ortalamaGun = roundTo(agirlikliToplam / dahilToplam, 6);
  const ortalamaGunYuvarlak = Math.round(ortalamaGun);

  const dahilSatirlar = ham.filter((h) => h.etkinGun !== null);
  const basitOrtalamaGun = roundTo(dahilSatirlar.reduce((t, h) => t + (h.etkinGun as number), 0) / dahilSatirlar.length, 6);

  const sonuc: VadeSatirSonucu[] = ham.map((h) => ({
    ad: h.s.ad?.trim() ?? '',
    tutar: h.s.tutar,
    vade: h.s.vade,
    gun: h.gun,
    gecikmis: h.gecikmis,
    etkinGun: h.etkinGun,
    dahil: h.etkinGun !== null,
    pay: h.etkinGun === null ? 0 : h.s.tutar / dahilToplam,
    tutarGun: h.etkinGun === null ? 0 : h.s.tutar * h.etkinGun,
  }));

  const vadeler = satirlar.map((s) => s.vade).sort();
  const gecikmisler = ham.filter((h) => h.gecikmis);

  return {
    satirlar: sonuc,
    toplamTutar: satirlar.reduce((t, s) => t + s.tutar, 0),
    hesaplananTutar: dahilToplam,
    ortalamaGun,
    ortalamaGunYuvarlak,
    ortalamaVadeTarihi: addDaysIso(baz, ortalamaGunYuvarlak),
    basitOrtalamaGun,
    enErkenVade: vadeler[0],
    enGecVade: vadeler[vadeler.length - 1],
    gecikmisSayisi: gecikmisler.length,
    gecikmisTutar: gecikmisler.reduce((t, h) => t + h.s.tutar, 0),
    faizli: faizliDenkVade(input, ham.map((h) => ({ tutar: h.s.tutar, gun: h.etkinGun }))),
  };
}

/**
 * Faizi dikkate alan denk (eşdeğer) vade: bugünkü değerleri toplamı, toplam tutarın T günde ödenmesinin
 * bugünkü değerine eşit olan T günü. Basit faiz: PV = N ÷ (1 + r × gün ÷ esas).
 *   T = (Σ N ÷ Σ PV − 1) × esas ÷ r
 * Faiz yoksa ya da bir satırın çarpanı sıfır/negatif olursa (çok uzun gecikme) null döner.
 */
function faizliDenkVade(input: OrtalamaVadeInput, dahil: { tutar: number; gun: number | null }[]): { gun: number; tarih: string } | null {
  const faiz = input.faizOrani ?? 0;
  if (!(faiz > 0)) return null;
  const r = faiz / 100;
  const esas = input.gunEsasi ?? 365;

  let toplam = 0;
  let bugunku = 0;
  for (const d of dahil) {
    if (d.gun === null) continue;
    const carpan = 1 + (r * d.gun) / esas;
    if (!(carpan > 0)) return null;
    toplam += d.tutar;
    bugunku += d.tutar / carpan;
  }
  if (!(bugunku > 0)) return null;
  const gun = roundTo(((toplam / bugunku - 1) * esas) / r, 6);
  return { gun, tarih: addDaysIso(input.baz, Math.round(gun)) };
}

// ---------- Doğrulama ----------

export function validateBaz(baz: string): string | undefined {
  return isValidIsoDate(baz) ? undefined : 'Geçerli bir baz tarih seçin.';
}

export function validateSatir(tutar: number | null, vade: string | null): { tutar?: string; vade?: string } {
  const e: { tutar?: string; vade?: string } = {};
  if (tutar === null || Number.isNaN(tutar)) e.tutar = 'Bir tutar girin.';
  else if (tutar < 0) e.tutar = 'Tutar negatif olamaz.';
  if (!isValidIsoDate(vade)) e.vade = 'Geçerli bir vade tarihi seçin.';
  return e;
}
