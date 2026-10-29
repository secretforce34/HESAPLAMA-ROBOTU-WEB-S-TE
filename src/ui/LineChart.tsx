// Bağımlılıksız, erişilebilir küçük SVG çizgi grafik. Renkler CSS değişkenlerinden gelir (koyu temada da okunur).

export interface LineSeries {
  label: string;
  /** y değerleri; x ekseni ortak `xLabels` dizisidir */
  values: number[];
  color?: string;
}

const PALETTE = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];

export function LineChart({
  xLabels,
  series,
  label,
  formatY,
  height = 220,
}: {
  xLabels: string[];
  series: LineSeries[];
  /** Ekran okuyucu için grafik açıklaması */
  label: string;
  formatY: (n: number) => string;
  height?: number;
}) {
  const W = 640;
  const H = height;
  const pad = { l: 8, r: 8, t: 12, b: 26 };
  const n = xLabels.length;
  const all = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  if (n < 2 || all.length === 0) return null;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const ticks = [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} style={{ display: 'block', overflow: 'visible' }}>
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={pad.l}
            x2={W - pad.r}
            y1={pad.t + f * (H - pad.t - pad.b)}
            y2={pad.t + f * (H - pad.t - pad.b)}
            stroke="var(--border)"
            stroke-width="1"
          />
        ))}
        {series.map((s, si) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color ?? PALETTE[si % PALETTE.length]}
            stroke-width="2.5"
            stroke-linejoin="round"
            stroke-linecap="round"
            points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
          />
        ))}
        {ticks.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            font-size="12"
            fill="var(--text-3)"
            text-anchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          >
            {xLabels[i]}
          </text>
        ))}
        <text x={pad.l + 2} y={pad.t + 12} font-size="12" fill="var(--text-3)">
          {formatY(max)}
        </text>
        <text x={pad.l + 2} y={H - pad.b - 4} font-size="12" fill="var(--text-3)">
          {formatY(min)}
        </text>
      </svg>
      {series.length > 1 && (
        <ul class="legend">
          {series.map((s, si) => (
            <li key={s.label}>
              <i style={{ background: s.color ?? PALETTE[si % PALETTE.length] }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
