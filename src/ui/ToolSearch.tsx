import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildIndex, searchIndex, type SearchItem } from '../lib/search';

const MAX_RESULTS = 8;

interface Props {
  items: SearchItem[];
  autofocus?: boolean;
  /** Üst çubuktaki arama: "/" kısayolu ve dar ekranda simgeye dönüşme */
  bar?: boolean;
  id?: string;
}

export function RobotAvatar({ item, size = 'sm' }: { item: Pick<SearchItem, 'icon' | 'color' | 'image'>; size?: 'sm' | 'md' }) {
  return (
    <span class={`avatar avatar--${size}`} style={{ '--avatar-tint': item.color }} aria-hidden="true">
      {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span class="avatar__emoji">{item.icon}</span>}
    </span>
  );
}

export default function ToolSearch({ items, autofocus = false, bar = false, id = 'robot-ara' }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => buildIndex(items), [items]);
  const all = useMemo(() => searchIndex(index, q), [index, q]);
  const results = all.slice(0, MAX_RESULTS);
  const listId = `${id}-sonuclar`;
  const showList = open && q.trim().length > 0;

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpanded(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (!bar || e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      setExpanded(true);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [bar]);

  const go = (slug: string) => {
    window.location.href = `/${slug}/`;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (results[active]) {
        e.preventDefault();
        go(results[active].slug);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setExpanded(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div class={`search${bar ? ' search--bar' : ''}${expanded ? ' is-expanded' : ''}`} ref={rootRef}>
      {bar && (
        <button
          type="button"
          class="icon-btn search__toggle"
          aria-label="Robot ara"
          onClick={() => {
            setExpanded(true);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" stroke-linecap="round" />
          </svg>
        </button>
      )}
      <div class="search__field" role="search">
        <svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" stroke-linecap="round" />
        </svg>
        <label for={id} class="visually-hidden">
          Hesaplama robotu ara
        </label>
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          list={undefined}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${id}-${results[active].slug}` : undefined}
          placeholder="Robot ara… ör. kredi, gün, KDV"
          autoComplete="off"
          enterKeyHint="go"
          autofocus={autofocus}
          value={q}
          onInput={(e) => {
            setQ(e.currentTarget.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {bar && <kbd class="search__kbd">/</kbd>}
      </div>
      {showList && (
        <div class="search__panel">
          {results.length === 0 ? (
            <p class="search__empty">“{q}” için robot bulamadık. Başka bir kelime deneyin.</p>
          ) : (
            <ul class="search__list" id={listId} role="listbox" aria-label="Arama sonuçları">
              {results.map((t, i) => (
                <li
                  key={t.slug}
                  id={`${id}-${t.slug}`}
                  role="option"
                  aria-selected={i === active}
                  class={`search__option${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(t.slug);
                  }}
                >
                  <RobotAvatar item={t} />
                  <span class="search__text">
                    <span class="search__title">{t.title}</span>
                    <span class="search__cat">{t.categoryName}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {all.length > MAX_RESULTS && <p class="search__more">{all.length - MAX_RESULTS} sonuç daha var; aramayı daraltın.</p>}
        </div>
      )}
    </div>
  );
}
