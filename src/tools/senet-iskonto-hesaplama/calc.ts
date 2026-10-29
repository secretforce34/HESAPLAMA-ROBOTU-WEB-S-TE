import { round2 } from '../../lib/finance';

export type OranDonemi = 'yillik' | 'aylik';
export type IskontoYontemi = 'dis' | 'ic';

export interface IskontoAyar {
  /** İskonto oranı (%), dönem `oranDonemi` ile belirlenir */
  oran: number;
  oranDonemi: OranDonemi;
  /** Yıllık oranda gün esası. Aylık oranda 30 gün / 360 gün kullanılır. */
  gunEsasi: 365 | 360;
  /** Nominal tutar üzerinden komisyon (%) */
  komisyonYuzde: number;
  /** Senet başına sabit komisyon / masraf (TL) */
  sabitKomisyon: number;
  /** BSMV oranı (%). 0: uygulanmaz. Matrah: iskonto + komisyon. */
  bsmvOrani: number;
}

export interface SenetGirdisi {
  nominal: number;
  /** İskonto tarihinden vadeye kalan gün (≥ 0) */
  gun: number;
  ad?: string;
}

export interface YontemSonucu {
  iskonto: number;
  komisyon: number;
  bsmv: number;
  toplamKesinti: number;
  /** Ele geçen tutar = nominal − toplam kesinti */
  eleGecen: number;
  /** Basit yıllık gerçek maliyet (oran olarak: 0,45 = %45). Hesaplanamazsa null. */
  basitMaliyet: number | null;
  /** Bileşik yıllık gerçek maliyet. Hesaplanamazsa null. */
  bilesikMaliyet: number | null;
}

export interface SenetSonucu {
  ad: string;
  nominal: number;
  gun: number;
  dis: YontemSonucu;
  ic: YontemSonucu;
  /** Dış iskonto nominal değeri aşıyor (oran ya da vade gerçekçi değil) */
  disAsim: boolean;
}

export interface IskontoSonucu {
  satirlar: SenetSonucu[];
  toplamNominal: number;
  /** Nominal ağırlıklı ortalama vade (gün) */
  ortalamaGun: number;
  dis: YontemSonucu;
  ic: YontemSonucu;
}

/** Oranın günlük karşılığı (kesir). Yıllık: oran ÷ esas; aylık: oran ÷ 30. */
export function gunlukOran(a: Pick<IskontoAyar, 'oran' | 'oranDonemi' | 'gunEsasi'>): number {
  return a.oranDonemi === 'aylik' ? a.oran / 100 / 30 : a.oran / 100 / a.gunEsasi;
}

/** Maliyeti yıllığa çevirirken kullanılan gün sayısı: aylık oranda 12 × 30 = 360. */
export function yilGunu(a: Pick<IskontoAyar, 'oranDonemi' | 'gunEsasi'>): number {
  return a.oranDonemi === 'aylik' ? 360 : a.gunEsasi;
}

interface Parca {
  nominal: number;
  gun: number;
  eleGecen: number;
  kesinti: number;
}

type Temel = Omit<YontemSonucu, 'basitMaliyet' | 'bilesikMaliyet'>;

function yontemSonucu(iskonto: number, nominal: number, gun: number, ayar: IskontoAyar): { temel: Temel; parca: Parca } {
  const komisyon = round2(round2((nominal * ayar.komisyonYuzde) / 100) + ayar.sabitKomisyon);
  // BSMV (6802 s. Gider Vergileri Kanunu md. 28): bankanın iskonto ve komisyon gelirinden alınır.
  const bsmv = ayar.bsmvOrani > 0 ? round2(((iskonto + komisyon) * ayar.bsmvOrani) / 100) : 0;
  const toplamKesinti = round2(iskonto + komisyon + bsmv);
  const eleGecen = round2(nominal - toplamKesinti);
  return { temel: { iskonto, komisyon, bsmv, toplamKesinti, eleGecen }, parca: { nominal, gun, eleGecen, kesinti: toplamKesinti } };
}

/**
 * Basit yıllık maliyet = toplam kesinti ÷ Σ(ele geçen × gün ÷ yıl günü): "kullandığınız para-gün" başına maliyet.
 * Tek senette kesinti ÷ ele geçen × yıl günü ÷ gün ile aynıdır.
 */
function basitMaliyet(parcalar: Parca[], yilGun: number): number | null {
  const kesinti = parcalar.reduce((t, p) => t + p.kesinti, 0);
  const paraGun = parcalar.reduce((t, p) => t + (p.eleGecen * p.gun) / yilGun, 0);
  return paraGun > 0 ? kesinti / paraGun : null;
}

/** Bileşik yıllık maliyet x: Σ nominal ÷ (1 + x)^(gün ÷ yıl günü) = Σ ele geçen (ikiye bölme ile). */
function bilesikMaliyet(parcalar: Parca[], yilGun: number): number | null {
  const aktif = parcalar.filter((p) => p.gun > 0);
  if (aktif.length === 0) return null;
  const hedef = parcalar.reduce((t, p) => t + p.eleGecen, 0);
  const f = (x: number) => parcalar.reduce((t, p) => t + p.nominal / Math.pow(1 + x, p.gun / yilGun), 0) - hedef;
  if (hedef <= 0) return null;
  let lo = 0;
  let hi = 1;
  if (f(lo) <= 0) return 0;
  while (f(hi) > 0 && hi < 1e7) hi *= 2;
  if (f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function sonuclandir(parcalar: Parca[], temel: Temel, yilGun: number): YontemSonucu {
  return { ...temel, basitMaliyet: basitMaliyet(parcalar, yilGun), bilesikMaliyet: bilesikMaliyet(parcalar, yilGun) };
}

/**
 * İki yöntemi birlikte hesaplar:
 *  - Dış (ticari/banka) iskontosu: iskonto = nominal × günlük oran × gün;  ele geçen = nominal − iskonto
 *  - İç (matematiksel) iskonto:    peşin değer = nominal ÷ (1 + günlük oran × gün);  iskonto = nominal − peşin değer
 * Ardından komisyon ve BSMV eklenir, ele geçen tutar ile gerçek (efektif) maliyet bulunur.
 */
export function hesaplaIskonto(senetler: SenetGirdisi[], ayar: IskontoAyar): IskontoSonucu {
  const g = gunlukOran(ayar);
  const yil = yilGunu(ayar);

  const hesaplanan = senetler.map((s) => {
    const nominal = round2(s.nominal);
    const disIskonto = round2(nominal * g * s.gun);
    const pesin = round2(nominal / (1 + g * s.gun));
    const icIskonto = round2(nominal - pesin);
    return {
      ad: s.ad?.trim() ?? '',
      nominal,
      gun: s.gun,
      dis: yontemSonucu(disIskonto, nominal, s.gun, ayar),
      ic: yontemSonucu(icIskonto, nominal, s.gun, ayar),
      disAsim: disIskonto >= nominal,
    };
  });

  const topla = (yontem: 'dis' | 'ic'): YontemSonucu => {
    const parcalar = hesaplanan.map((x) => x[yontem].parca);
    const sum = (k: keyof Temel) => round2(hesaplanan.reduce((t, x) => t + x[yontem].temel[k], 0));
    return sonuclandir(
      parcalar,
      { iskonto: sum('iskonto'), komisyon: sum('komisyon'), bsmv: sum('bsmv'), toplamKesinti: sum('toplamKesinti'), eleGecen: sum('eleGecen') },
      yil,
    );
  };

  const toplamNominal = round2(hesaplanan.reduce((t, x) => t + x.nominal, 0));
  const ortalamaGun = toplamNominal > 0 ? hesaplanan.reduce((t, x) => t + x.nominal * x.gun, 0) / toplamNominal : 0;

  const satirlar: SenetSonucu[] = hesaplanan.map((x) => ({
    ad: x.ad,
    nominal: x.nominal,
    gun: x.gun,
    dis: sonuclandir([x.dis.parca], x.dis.temel, yil),
    ic: sonuclandir([x.ic.parca], x.ic.temel, yil),
    disAsim: x.disAsim,
  }));

  return { satirlar, toplamNominal, ortalamaGun, dis: topla('dis'), ic: topla('ic') };
}

// ---------- Doğrulama ----------

export function validateSenet(nominal: number | null, gun: number | null): { nominal?: string; gun?: string } {
  const e: { nominal?: string; gun?: string } = {};
  if (nominal === null || Number.isNaN(nominal)) e.nominal = 'Bir nominal tutar girin.';
  else if (nominal <= 0) e.nominal = 'Nominal tutar sıfırdan büyük olmalı.';
  if (gun === null || Number.isNaN(gun)) e.gun = 'Geçerli bir vade girin.';
  else if (gun < 0) e.gun = 'Vade, iskonto tarihinden önce olamaz.';
  else if (gun > 3650) e.gun = 'Vade en fazla 3.650 gün (10 yıl) olabilir.';
  return e;
}

export function validateAyar(a: {
  oran: number | null;
  komisyonYuzde: number | null;
  sabitKomisyon: number | null;
  bsmvOrani: number | null;
}): Record<string, string> {
  const e: Record<string, string> = {};
  if (a.oran === null || Number.isNaN(a.oran)) e.oran = 'Bir iskonto oranı girin.';
  else if (a.oran <= 0) e.oran = 'İskonto oranı sıfırdan büyük olmalı.';
  else if (a.oran > 1000) e.oran = 'İskonto oranı %1.000’i aşamaz.';
  if (a.komisyonYuzde === null || a.komisyonYuzde < 0 || a.komisyonYuzde > 100) e.komisyonYuzde = 'Komisyon %0 ile %100 arasında olmalı.';
  if (a.sabitKomisyon === null || a.sabitKomisyon < 0) e.sabitKomisyon = 'Sabit komisyon negatif olamaz.';
  if (a.bsmvOrani === null || a.bsmvOrani < 0 || a.bsmvOrani > 100) e.bsmvOrani = 'BSMV oranı %0 ile %100 arasında olmalı.';
  return e;
}
