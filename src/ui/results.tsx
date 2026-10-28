import type { ComponentChildren } from 'preact';

export function ResultHero({ label, value, sub }: { label: string; value: string; sub?: ComponentChildren }) {
  return (
    <div class="result-hero" aria-live="polite">
      <div class="result-hero__label">{label}</div>
      <div class="result-hero__value">{value}</div>
      {sub && <div class="result-hero__sub">{sub}</div>}
    </div>
  );
}

/** Girdiler eksik/geçersizken sonuç yerine gösterilir. */
export function ResultEmpty({ children }: { children: ComponentChildren }) {
  return <div class="result-empty">{children}</div>;
}

export interface Stat {
  label: string;
  value: string;
}

export function StatGrid({ items }: { items: Stat[] }) {
  return (
    <div class="stat-grid">
      {items.map((s) => (
        <div class="stat" key={s.label}>
          <div class="stat__label">{s.label}</div>
          <div class="stat__value">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export interface BreakdownRow {
  label: ComponentChildren;
  value: string;
  /** minus: kesinti (kırmızı), plus: ekleme (yeşil), total: toplam satırı, sub: girintili alt kalem */
  kind?: 'normal' | 'minus' | 'plus' | 'total' | 'sub';
  hint?: ComponentChildren;
}

export function Breakdown({ rows, title }: { rows: BreakdownRow[]; title?: string }) {
  return (
    <div class="breakdown">
      {title && <h3 class="breakdown__title">{title}</h3>}
      {rows.map((r, i) => (
        <div class={`breakdown__row${r.kind && r.kind !== 'normal' ? ` breakdown__row--${r.kind}` : ''}`} key={i}>
          <span class="breakdown__label">
            {r.label}
            {r.hint && <span class="breakdown__hint">{r.hint}</span>}
          </span>
          <span class="breakdown__value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export interface Column {
  key: string;
  label: string;
}

/** Yatay kaydırılabilen tablo. Değerler önceden biçimlenmiş metin olmalı. */
export function DataTable({
  columns,
  rows,
  foot,
  caption,
  scroll = false,
}: {
  columns: Column[];
  rows: Record<string, ComponentChildren>[];
  foot?: Record<string, ComponentChildren>;
  caption?: string;
  /** Çok satırlı tablolarda dikey kaydırma (en fazla ~420px) */
  scroll?: boolean;
}) {
  return (
    <div class={`table-wrap${scroll ? ' table-wrap--scroll' : ''}`} tabIndex={0}>
      <table class="data">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c.key}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key}>{r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr>
              {columns.map((c) => (
                <td key={c.key}>{foot[c.key]}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function Callout({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'warning' | 'danger' | 'success';
  children: ComponentChildren;
}) {
  return (
    <div class={`callout callout--${kind}`} role={kind === 'danger' || kind === 'warning' ? 'note' : undefined}>
      {children}
    </div>
  );
}

export interface BarPart {
  label: string;
  value: number;
  /** CSS rengi; varsayılan sırayla var(--c1)…var(--c5) */
  color?: string;
  /** Lejantta gösterilecek biçimli değer */
  display?: string;
}

const PALETTE = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];

/** Bir bütünün parçalarını gösteren yatay yığılmış çubuk (ör. anapara / faiz / vergi). */
export function StackedBar({ parts, label }: { parts: BarPart[]; label: string }) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  if (total <= 0) return null;
  return (
    <figure style={{ margin: 0 }}>
      <div class="stack-bar" role="img" aria-label={label}>
        {parts.map((p, i) => (
          <span
            key={p.label}
            style={{ width: `${(Math.max(0, p.value) / total) * 100}%`, background: p.color ?? PALETTE[i % PALETTE.length] }}
          />
        ))}
      </div>
      <ul class="legend">
        {parts.map((p, i) => (
          <li key={p.label}>
            <i style={{ background: p.color ?? PALETTE[i % PALETTE.length] }} />
            {p.label}
            {p.display ? `: ${p.display}` : ''} (%{Math.round((Math.max(0, p.value) / total) * 100)})
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Açılır-kapanır bölüm (ör. ödeme planı tablosu). */
export function Details({ summary, children, open = false }: { summary: string; children: ComponentChildren; open?: boolean }) {
  return (
    <details class="details" open={open}>
      <summary>{summary}</summary>
      <div class="details__body">{children}</div>
    </details>
  );
}
