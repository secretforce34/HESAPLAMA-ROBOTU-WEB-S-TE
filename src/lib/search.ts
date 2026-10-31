// Robot arama: Türkçe harf ve büyük-küçük farkını yok sayar, kelimenin başını yazmak yeterlidir
// ("gün" → "Altın Günü Hesaplama"). Başlıkta geçen eşleşmeler anahtar kelimelerdekilerden önce gelir.

export interface SearchItem {
  slug: string;
  title: string;
  cardText: string;
  icon: string;
  keywords: string[];
  categoryName: string;
  color: string;
  image?: string;
}

/** "Kıdem Tazminatı" → "kidem tazminati" */
export function normalizeTR(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .replace(/[^a-z0-9%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Indexed<T> {
  item: T;
  title: string;
  titleWords: string[];
  keywordWords: string[];
  hay: string;
}

export function buildIndex<T extends SearchItem>(items: T[]): Indexed<T>[] {
  return items.map((item) => {
    const title = normalizeTR(item.title);
    const keywords = normalizeTR(item.keywords.join(' '));
    return {
      item,
      title,
      titleWords: title.split(' '),
      keywordWords: keywords.split(' '),
      hay: normalizeTR([item.title, item.cardText, item.categoryName, ...item.keywords].join(' ')),
    };
  });
}

/** Her kelime bir yerde geçmeli; puan: başlıktaki kelime başı > başlıkta herhangi yer > anahtar kelime başı > diğer. */
export function searchIndex<T extends SearchItem>(index: Indexed<T>[], query: string): T[] {
  const tokens = normalizeTR(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];
  const scored: { item: T; score: number; title: string }[] = [];
  for (const x of index) {
    if (!tokens.every((t) => x.hay.includes(t))) continue;
    let score = 0;
    for (const t of tokens) {
      if (x.titleWords.some((w) => w.startsWith(t))) score += 10;
      else if (x.title.includes(t)) score += 6;
      else if (x.keywordWords.some((w) => w.startsWith(t))) score += 4;
      else score += 1;
    }
    if (x.title.startsWith(tokens.join(' '))) score += 5;
    scored.push({ item: x.item, score, title: x.title });
  }
  return scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).map((s) => s.item);
}
