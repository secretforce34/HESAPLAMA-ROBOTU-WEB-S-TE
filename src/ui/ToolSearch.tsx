import { useMemo, useState } from 'preact/hooks';

export interface SearchItem {
  slug: string;
  title: string;
  cardText: string;
  icon: string;
  keywords: string[];
  categoryName: string;
}

/** "Kıdem Tazminatı" → "kidem tazminati": Türkçe harf ve büyük-küçük farkını yok sayar. */
export function normalizeTR(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ToolSearch({ items, autofocus = false }: { items: SearchItem[]; autofocus?: boolean }) {
  const [q, setQ] = useState('');

  const index = useMemo(
    () =>
      items.map((it) => ({
        it,
        hay: normalizeTR([it.title, it.cardText, it.categoryName, ...it.keywords].join(' ')),
        title: normalizeTR(it.title),
      })),
    [items],
  );

  const tokens = normalizeTR(q).split(' ').filter(Boolean);
  const results =
    tokens.length === 0
      ? []
      : index
          .filter((x) => tokens.every((t) => x.hay.includes(t)))
          .sort((a, b) => Number(b.title.includes(tokens[0])) - Number(a.title.includes(tokens[0])))
          .map((x) => x.it);

  return (
    <div>
      <div class="tool-search" role="search">
        <svg class="tool-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" stroke-linecap="round" />
        </svg>
        <label for="arac-ara" class="visually-hidden">
          Hesaplama ara
        </label>
        <input
          id="arac-ara"
          type="search"
          placeholder="Ne hesaplamak istiyorsunuz? ör. kıdem, KDV, halka arz"
          autoComplete="off"
          autofocus={autofocus}
          value={q}
          onInput={(e) => setQ(e.currentTarget.value)}
        />
      </div>
      {tokens.length > 0 && (
        <div class="search-results" aria-live="polite">
          {results.length === 0 ? (
            <p class="search-results__empty">“{q}” için bir hesaplama bulamadık. Başka bir kelimeyle deneyin.</p>
          ) : (
            <ul class="tool-grid">
              {results.map((t) => (
                <li key={t.slug}>
                  <a class="tool-card" href={`/${t.slug}/`}>
                    <span class="tool-card__icon" aria-hidden="true">
                      {t.icon}
                    </span>
                    <span>
                      <span class="tool-card__title">{t.title}</span>
                      <span class="tool-card__desc">{t.cardText}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
