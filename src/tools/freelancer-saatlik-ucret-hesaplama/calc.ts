import { round2 } from '../../lib/finance';

export interface FreelancerInput {
  /** Elinize geçmesini istediğiniz aylık net gelir (TL) */
  hedefAylikNet: number;
  /** Aylık işletme giderleri toplamı (TL) */
  aylikGider: number;
  /** Kâr üzerinden vergi + sigorta yükü tahmini (%) */
  vergiYuku: number;
  /** Haftada çalışılan gün */
  haftalikGun: number;
  /** Günlük çalışma saati */
  gunlukSaat: number;
  /** Yıllık izin + resmî tatil + hastalık için çalışılmayan gün */
  calisilmayanGun: number;
  /** Çalışılan saatin müşteriye faturalanabilen kısmı (%) */
  faturalanabilir: number;
}

export interface FreelancerSonucu {
  yillikIsGunu: number;
  yillikFaturaSaati: number;
  /** Vergi öncesi, giderler dahil yıllık ciro hedefi (KDV hariç) */
  yillikCiro: number;
  aylikCiro: number;
  saatlik: number;
  gunluk: number;
  /** Yıllık vergi + sigorta tahmini */
  yillikVergi: number;
}

/**
 * Net = (Ciro − Gider) × (1 − vergi yükü)  →  Ciro = Net ÷ (1 − vergi) + Gider
 * Saatlik ücret = Yıllık ciro ÷ Yıllık faturalanabilir saat
 */
export function hesaplaUcret(i: FreelancerInput): FreelancerSonucu {
  const yillikIsGunu = Math.max(0, 52 * i.haftalikGun - i.calisilmayanGun);
  const yillikFaturaSaati = yillikIsGunu * i.gunlukSaat * (i.faturalanabilir / 100);
  const yillikNet = i.hedefAylikNet * 12;
  const yillikGider = i.aylikGider * 12;
  const vergiOncesiKar = yillikNet / (1 - i.vergiYuku / 100);
  const yillikCiro = vergiOncesiKar + yillikGider;
  const saatlik = yillikFaturaSaati > 0 ? yillikCiro / yillikFaturaSaati : Number.NaN;
  return {
    yillikIsGunu,
    yillikFaturaSaati: round2(yillikFaturaSaati),
    yillikCiro: round2(yillikCiro),
    aylikCiro: round2(yillikCiro / 12),
    saatlik: round2(saatlik),
    gunluk: round2(saatlik * i.gunlukSaat),
    yillikVergi: round2(vergiOncesiKar - yillikNet),
  };
}

/** Faturalanabilir oran × hedef gelir çarpanı için saatlik ücret tablosu. */
export function duyarlilik(i: FreelancerInput, oranlar: number[], carpanlar: number[]) {
  return oranlar.map((o) => ({
    oran: o,
    ucretler: carpanlar.map((c) => hesaplaUcret({ ...i, faturalanabilir: o, hedefAylikNet: i.hedefAylikNet * c }).saatlik),
  }));
}

export function validateFreelancer(i: {
  net: number | null;
  vergi: number | null;
  gun: number | null;
  saat: number | null;
  tatil: number | null;
  oran: number | null;
}) {
  const e: Record<string, string> = {};
  if (i.net === null || i.net <= 0) e.net = 'Hedef aylık net gelirinizi girin.';
  if (i.vergi === null || i.vergi < 0 || i.vergi >= 100) e.vergi = '%0 ile %99 arasında olmalı.';
  if (i.gun === null || i.gun <= 0 || i.gun > 7) e.gun = '1 ile 7 arasında olmalı.';
  if (i.saat === null || i.saat <= 0 || i.saat > 24) e.saat = '1 ile 24 arasında olmalı.';
  if (i.tatil === null || i.tatil < 0) e.tatil = '0 veya daha büyük olmalı.';
  else if (i.gun !== null && i.tatil >= 52 * i.gun) e.tatil = 'Çalışılmayan gün, yıllık iş gününden az olmalı.';
  if (i.oran === null || i.oran <= 0 || i.oran > 100) e.oran = '%1 ile %100 arasında olmalı.';
  return e;
}
