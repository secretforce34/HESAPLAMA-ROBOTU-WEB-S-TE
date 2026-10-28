// Araçların ortak kullandığı finans matematiği. Hepsi saf fonksiyon.

/**
 * Ondalık basamağa "yarımı sıfırdan uzağa" yuvarlar. toPrecision(15), ikili kayan nokta
 * artıklarını temizler (1,005 × 100 = 100,4999… → 100,5). -0 döndürmez.
 */
export function roundTo(n: number, decimals: number): number {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** decimals;
  const scaled = Number((Math.abs(n) * f).toPrecision(15));
  const r = (Math.sign(n) * Math.round(scaled)) / f;
  return r === 0 ? 0 : r;
}

/** Kuruşa yuvarlar (0,005 yukarı). */
export function round2(n: number): number {
  return roundTo(n, 2);
}

/** Eşit taksit (annüite): anapara, dönem faizi (0,03 = %3), dönem sayısı. */
export function annuityPayment(principal: number, rate: number, periods: number): number {
  if (periods <= 0) return Number.NaN;
  if (rate === 0) return principal / periods;
  return (principal * rate) / (1 - Math.pow(1 + rate, -periods));
}

/** Net bugünkü değer: cashflows[0] bugün, cashflows[k] k. dönem sonunda. */
export function npv(rate: number, cashflows: number[]): number {
  let total = 0;
  for (let k = 0; k < cashflows.length; k++) total += cashflows[k] / Math.pow(1 + rate, k);
  return total;
}

/**
 * Dönemsel iç verim oranı. cashflows[0] genelde pozitif (alınan kredi),
 * sonrakiler negatif (ödenen taksitler) ya da tersi. Bulunamazsa null.
 */
export function irr(cashflows: number[], lo = -0.9999, hi = 10): number | null {
  let fLo = npv(lo, cashflows);
  let fHi = npv(hi, cashflows);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, cashflows);
    if (Math.abs(fMid) < 1e-10 || hi - lo < 1e-14) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/** Aylık orandan yıllık bileşik orana: 0,03 → 0,4258 */
export function annualFromMonthly(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 12) - 1;
}

/** Yıllık bileşik orandan aylığa: 0,4258 → 0,03 */
export function monthlyFromAnnual(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

/** Bir tutarın, dönemsel enflasyon/faiz ile `periods` dönem sonraki karşılığı. */
export function futureValue(amount: number, rate: number, periods: number): number {
  return amount * Math.pow(1 + rate, periods);
}

/** Gelecekteki bir tutarın bugünkü değeri. */
export function presentValue(amount: number, rate: number, periods: number): number {
  return amount / Math.pow(1 + rate, periods);
}

/** İki ISO tarih (YYYY-AA-GG) arasındaki gün farkı (b - a). Saat dilimi etkilenmez. */
export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.UTC(Number(aIso.slice(0, 4)), Number(aIso.slice(5, 7)) - 1, Number(aIso.slice(8, 10)));
  const b = Date.UTC(Number(bIso.slice(0, 4)), Number(bIso.slice(5, 7)) - 1, Number(bIso.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

/** Bugünün tarihi, Türkiye saatine göre ISO (YYYY-AA-GG). */
export function todayIsoTR(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
