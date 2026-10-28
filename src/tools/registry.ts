import { CATEGORIES, type CategoryId } from './categories';
import type { ToolMeta } from './types';

// Her araç kendi klasöründe meta.ts dosyası taşır; burada otomatik toplanır.
const modules = import.meta.glob<{ meta: ToolMeta }>('./*/meta.ts', { eager: true });

export const TOOLS: ToolMeta[] = Object.values(modules)
  .map((m) => m.meta)
  .sort((a, b) => a.title.localeCompare(b.title, 'tr'));

export function getTool(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolsInCategory(id: CategoryId): ToolMeta[] {
  return TOOLS.filter((t) => t.category === id);
}

export function categoriesWithTools() {
  return CATEGORIES.map((c) => ({ ...c, tools: toolsInCategory(c.id) })).filter((c) => c.tools.length > 0);
}

export function relatedTools(meta: ToolMeta, limit = 5): ToolMeta[] {
  const picked = new Map<string, ToolMeta>();
  for (const slug of meta.related ?? []) {
    const t = getTool(slug);
    if (t && t.slug !== meta.slug) picked.set(t.slug, t);
  }
  for (const t of toolsInCategory(meta.category)) {
    if (picked.size >= limit) break;
    if (t.slug !== meta.slug) picked.set(t.slug, t);
  }
  return [...picked.values()].slice(0, limit);
}
