import { round2 } from '../../lib/finance';

/** Girilen tutarlar KDV hariç mi (matrah) yoksa KDV dahil mi? */
export type KdvMode = 'haric' | 'dahil';

// ---------- Tek tutar ----------

export interface KdvInput {
  amount: number;
  /** KDV oranı, yüzde olarak (20 = %20) */
  rate: number;
  mode: KdvMode;
  /** Tevkifat payı: 0 = tevkifat yok, 2 = 2/10 … 10 = 10/10 (tam tevkifat) */
  tevkifat: number;
}

export interface KdvResult {
  matrah: number;
  kdv: number;
  toplam: number;
  tevkifEdilen: number;
  tahsilEdilecekKdv: number;
  odenecekToplam: number;
}

/**
 * Tek tutar için KDV. KDV dahil tutardan geriye hesapta matrah yuvarlanır, KDV farktan
 * bulunur; böylece matrah + KDV her zaman girilen tutara tam eşit olur.
 * (Tutar sınırı kontrolü yapmaz; fatura hesabı için hesaplaFatura kullanılır.)
 */
export function hesaplaKdv({ amount, rate, mode, tevkifat }: KdvInput): KdvResult {
  const satir = satirHesapla(amount, rate, mode);
  const tevkifEdilen = tevkifat > 0 ? round2((satir.kdv * tevkifat) / 10) : 0;
  const tahsilEdilecekKdv = round2(satir.kdv - tevkifEdilen);
  return {
    matrah: satir.matrah,
    kdv: satir.kdv,
    toplam: satir.toplam,
    tevkifEdilen,
    tahsilEdilecekKdv,
    odenecekToplam: round2(satir.matrah + tahsilEdilecekKdv),
  };
}

function satirHesapla(amount: number, rate: number, mode: KdvMode) {
  const r = rate / 100;
  let matrah: number;
  let kdv: number;
  if (mode === 'haric') {
    matrah = round2(amount);
    kdv = round2(matrah * r);
  } else {
    const dahil = round2(amount);
    matrah = round2(dahil / (1 + r));
    kdv = round2(dahil - matrah);
  }
  return { matrah, kdv, toplam: round2(matrah + kdv) };
}

// ---------- Çok satırlı fatura ----------

export interface FaturaSatiri {
  tutar: number;
  /** KDV oranı (%) */
  oran: number;
  /** Bu satır tevkifata tabi mi? (varsayılan: evet) */
  tevkifatli?: boolean;
}

export interface FaturaInput {
  satirlar: FaturaSatiri[];
  mode: KdvMode;
  /** 0 = tevkifat yok; 2…9 = kısmi; 10 = tam tevkifat */
  tevkifat: number;
  /**
   * Kısmi tevkifat sınırı (KDV dahil). Tevkifata tabi satırların KDV dahil toplamı bu tutarı
   * AŞMAZSA kısmi tevkifat uygulanmaz. null: sınır dikkate alınmaz.
   */
  tevkifatSiniri: number | null;
}

export interface SatirSonucu {
  oran: number;
  matrah: number;
  kdv: number;
  toplam: number;
  tevkifatli: boolean;
}

export interface OranOzeti {
  oran: number;
  matrah: number;
  kdv: number;
  toplam: number;
}

export interface FaturaSonucu {
  satirlar: SatirSonucu[];
  /** Oranlara göre gruplanmış toplamlar (küçükten büyüğe) */
  oranlar: OranOzeti[];
  matrah: number;
  kdv: number;
  toplam: number;
  /** Tevkifata tabi satırların KDV dahil toplamı */
  tevkifataTabiToplam: number;
  /** Fiilen uygulanan tevkifat payı (sınır altında kaldıysa 0) */
  uygulananTevkifat: number;
  /** Kısmi tevkifat seçildi ama tutar sınırı aşılmadığı için uygulanmadı */
  sinirAltinda: boolean;
  tevkifEdilen: number;
  tahsilEdilecekKdv: number;
  /** Alıcının satıcıya ödeyeceği: KDV dahil toplam − tevkif edilen KDV */
  odenecekToplam: number;
}

/**
 * Faturadaki her satırın KDV'si ayrı hesaplanıp kuruşa yuvarlanır ve toplanır
 * (e-Fatura uygulamasındaki gibi). Kısmi tevkifat (2/10–9/10), KDV GUT gereği yalnızca
 * tevkifata tabi işlemin KDV dahil bedeli sınırı aştığında uygulanır; tam tevkifatta sınır yoktur.
 */
export function hesaplaFatura({ satirlar, mode, tevkifat, tevkifatSiniri }: FaturaInput): FaturaSonucu {
  const sonuc: SatirSonucu[] = satirlar.map((s) => ({
    oran: s.oran,
    ...satirHesapla(s.tutar, s.oran, mode),
    tevkifatli: s.tevkifatli !== false,
  }));

  const gruplar = new Map<number, OranOzeti>();
  for (const s of sonuc) {
    const g = gruplar.get(s.oran) ?? { oran: s.oran, matrah: 0, kdv: 0, toplam: 0 };
    g.matrah = round2(g.matrah + s.matrah);
    g.kdv = round2(g.kdv + s.kdv);
    g.toplam = round2(g.toplam + s.toplam);
    gruplar.set(s.oran, g);
  }
  const oranlar = [...gruplar.values()].sort((a, b) => a.oran - b.oran);

  const matrah = round2(sonuc.reduce((t, s) => t + s.matrah, 0));
  const kdv = round2(sonuc.reduce((t, s) => t + s.kdv, 0));
  const toplam = round2(matrah + kdv);

  const tevkifatliSatirlar = sonuc.filter((s) => s.tevkifatli);
  const tevkifataTabiToplam = round2(tevkifatliSatirlar.reduce((t, s) => t + s.toplam, 0));
  const tevkifataTabiKdv = round2(tevkifatliSatirlar.reduce((t, s) => t + s.kdv, 0));

  const kismi = tevkifat > 0 && tevkifat < 10;
  const sinirAltinda = kismi && tevkifatSiniri !== null && tevkifataTabiToplam <= tevkifatSiniri;
  const uygulananTevkifat = tevkifat > 0 && !sinirAltinda ? tevkifat : 0;

  const tevkifEdilen = uygulananTevkifat > 0 ? round2((tevkifataTabiKdv * uygulananTevkifat) / 10) : 0;
  const tahsilEdilecekKdv = round2(kdv - tevkifEdilen);
  const odenecekToplam = round2(toplam - tevkifEdilen);

  return {
    satirlar: sonuc,
    oranlar,
    matrah,
    kdv,
    toplam,
    tevkifataTabiToplam,
    uygulananTevkifat,
    sinirAltinda,
    tevkifEdilen,
    tahsilEdilecekKdv,
    odenecekToplam,
  };
}

export function validateSatir(tutar: number | null, oran: number | null): { tutar?: string; oran?: string } {
  const e: { tutar?: string; oran?: string } = {};
  if (tutar === null || Number.isNaN(tutar)) e.tutar = 'Bir tutar girin.';
  else if (tutar < 0) e.tutar = 'Tutar negatif olamaz.';
  if (oran === null || Number.isNaN(oran)) e.oran = 'Bir oran girin.';
  else if (oran < 0 || oran > 100) e.oran = 'Oran %0 ile %100 arasında olmalı.';
  return e;
}

/** Eski tek-tutar doğrulaması (geriye uyumluluk). */
export function validateKdv(input: Partial<KdvInput>): Record<string, string> {
  const e = validateSatir(input.amount ?? null, input.rate ?? null);
  const out: Record<string, string> = {};
  if (e.tutar) out.amount = e.tutar;
  if (e.oran) out.rate = e.oran;
  return out;
}
