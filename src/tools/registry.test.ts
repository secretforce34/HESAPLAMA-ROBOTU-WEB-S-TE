// Tüm robotların meta bilgisi için tutarlılık denetimi (SEO, kategori, sayfa dosyası, bağlantılar).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './categories';
import { TOOLS } from './registry';

const folders = Object.keys(import.meta.glob('./*/meta.ts')).map((p) => p.split('/')[1]);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const catIds = new Set<string>(CATEGORIES.map((c) => c.id));
const slugs = new Set(TOOLS.map((t) => t.slug));

describe('araç kaydı', () => {
  it('slug’lar benzersiz', () => {
    expect(slugs.size).toBe(TOOLS.length);
  });

  for (const t of TOOLS) {
    describe(t.slug, () => {
      it('slug biçimi ve klasör adı uyumlu', () => {
        expect(t.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(folders).toContain(t.slug);
      });

      it('sayfa dosyası var', () => {
        expect(existsSync(path.resolve(process.cwd(), 'src/pages', `${t.slug}.astro`))).toBe(true);
      });

      it('kategori geçerli ve menü sırasında yer alıyor', () => {
        expect(catIds.has(t.category)).toBe(true);
        const order: readonly string[] = CATEGORIES.find((c) => c.id === t.category)!.order;
        expect(order, `${t.slug} kategorinin order listesinde yok`).toContain(t.slug);
      });

      it('SEO metinleri uygun uzunlukta', () => {
        expect(t.title.length).toBeGreaterThan(3);
        expect(t.question.length).toBeGreaterThan(10);
        // Marka adı (" | Hesap Robotu") eklendiğinde Google'da makul kalsın
        expect(t.seoTitle.length).toBeLessThanOrEqual(72);
        expect(t.description.length).toBeGreaterThanOrEqual(70);
        expect(t.description.length).toBeLessThanOrEqual(170);
        expect(t.cardText.length).toBeLessThanOrEqual(90);
      });

      it('meta alanları dolu', () => {
        expect(t.icon.length).toBeGreaterThan(0);
        expect(t.keywords.length).toBeGreaterThanOrEqual(3);
        expect(t.lastReviewed).toMatch(ISO);
        expect(['none', 'yearly', 'monthly']).toContain(t.maintenance);
        for (const s of t.sources) expect(s.url).toMatch(/^https:\/\//);
        if (t.maintenance !== 'none') expect(t.paramSets.length).toBeGreaterThan(0);
      });

      it('ilgili araçlar gerçekten var', () => {
        for (const r of t.related ?? []) expect(slugs, `"${r}" bulunamadı`).toContain(r);
      });
    });
  }
});
