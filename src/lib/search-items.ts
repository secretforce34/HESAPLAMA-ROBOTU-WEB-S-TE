import { getCategory } from '../tools/categories';
import { TOOLS } from '../tools/registry';
import { robotImage } from './robot-image';
import type { SearchItem } from './search';

/** Arama kutusuna gönderilecek hafif araç listesi (sayfaya gömülür). */
export function searchItems(): SearchItem[] {
  return TOOLS.map((t) => {
    const cat = getCategory(t.category);
    return {
      slug: t.slug,
      title: t.title,
      cardText: t.cardText,
      icon: t.icon,
      keywords: t.keywords,
      categoryName: cat.name,
      color: cat.color,
      image: robotImage(t.slug),
    };
  });
}
