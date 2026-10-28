import { getCategory } from '../tools/categories';
import { TOOLS } from '../tools/registry';
import type { SearchItem } from '../ui/ToolSearch';

/** Arama kutusuna gönderilecek hafif araç listesi (sayfaya gömülür). */
export function searchItems(): SearchItem[] {
  return TOOLS.map((t) => ({
    slug: t.slug,
    title: t.title,
    cardText: t.cardText,
    icon: t.icon,
    keywords: t.keywords,
    categoryName: getCategory(t.category).name,
  }));
}
