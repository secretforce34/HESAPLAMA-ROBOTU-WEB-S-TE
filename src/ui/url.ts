// Paylaşılan bağlantılardaki (?tutar=1000&oran=20) değerleri okuma yardımcıları.
// Değerler adres çubuğuna yalnızca kullanıcı "Bağlantıyı kopyala"ya basınca yazılır.

export function readParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function numParam(p: URLSearchParams, key: string): number | null {
  const raw = p.get(key);
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function enumParam<T extends string>(p: URLSearchParams, key: string, allowed: readonly T[]): T | null {
  const raw = p.get(key);
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

export function boolParam(p: URLSearchParams, key: string): boolean | null {
  const raw = p.get(key);
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return null;
}

export function dateParam(p: URLSearchParams, key: string): string | null {
  const raw = p.get(key);
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export type ShareValue = string | number | boolean | null | undefined;

export function buildShareUrl(params: Record<string, ShareValue>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    q.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  const base = `${window.location.origin}${window.location.pathname}`;
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}
