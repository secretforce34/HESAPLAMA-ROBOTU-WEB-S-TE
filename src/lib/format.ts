// Türkçe sayı/para/tarih biçimlendirme ve kullanıcı girdisini sayıya çevirme.
import { roundTo } from './finance';

const cache = new Map<string, Intl.NumberFormat>();

function nf(min: number, max: number): Intl.NumberFormat {
  const key = `${min}-${max}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: min, maximumFractionDigits: max });
    cache.set(key, f);
  }
  return f;
}

/** -0 ve kayan nokta artıklarını (ör. -0.0000001) temizler. */
function clean(n: number, decimals: number): number {
  return roundTo(n, decimals);
}

/** 1234.5 → "1.234,50 TL" */
export function formatTL(n: number, decimals: 0 | 2 = 2): string {
  if (!Number.isFinite(n)) return '–';
  return `${nf(decimals, decimals).format(clean(n, decimals))} TL`;
}

/** 1234.5 → "1.234,5" (en fazla `max` ondalık) */
export function formatNumber(n: number, max = 2, min = 0): string {
  if (!Number.isFinite(n)) return '–';
  return nf(min, max).format(clean(n, max));
}

/** 20 → "%20", 12.5 → "%12,5" (Türkçede yüzde işareti başa yazılır) */
export function formatPercent(n: number, max = 2): string {
  if (!Number.isFinite(n)) return '–';
  return `%${formatNumber(n, max)}`;
}

/** Input içinde gösterim: 50000 → "50.000", 1234.5 → "1.234,5" */
export function formatInputNumber(n: number | null | undefined, maxDecimals = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return nf(0, maxDecimals).format(clean(n, maxDecimals));
}

/**
 * Kullanıcının yazdığı sayıyı çözer. Türkçe biçim esas alınır:
 *  "1.234.567,89" → 1234567.89   "50.000" → 50000   "12,5" → 12.5
 *  "12.5" → 12.5 (tek nokta + binlik deseni değilse ondalık sayılır)
 *  "₺ 1.000" / "%20" / "1 000" → işaretler ve boşluklar yok sayılır
 * Geçersizse null döner.
 */
export function parseTR(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim().replace(/[\s ]/g, '').replace(/tl|₺|%/gi, '');
  if (s === '' || s === '-' || s === '+') return null;
  let negative = false;
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;

  if (s.includes(',')) {
    const last = s.lastIndexOf(',');
    const intPart = s.slice(0, last);
    const decPart = s.slice(last + 1);
    if (intPart.includes(',') || decPart.includes('.')) return null;
    if (intPart.includes('.') && !/^\d{1,3}(\.\d{3})+$/.test(intPart)) return null;
    s = `${intPart.replace(/\./g, '') || '0'}.${decPart}`;
  } else if (s.includes('.')) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    } else if ((s.match(/\./g) ?? []).length > 1) {
      return null;
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function monthName(monthIndex0: number): string {
  return MONTHS[monthIndex0] ?? '';
}

/** "2026-10-29" → "29 Ekim 2026" (saat dilimi kaymasını önlemek için elle çözülür) */
export function formatDateTR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${monthName(Number(m[2]) - 1)} ${m[1]}`;
}

/** "2026-10" → "Ekim 2026" */
export function formatMonthTR(isoMonth: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(isoMonth);
  if (!m) return isoMonth;
  return `${monthName(Number(m[2]) - 1)} ${m[1]}`;
}
