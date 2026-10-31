import { describe, expect, it } from 'vitest';
import { buildIndex, normalizeTR, searchIndex, type SearchItem } from './search';
import { searchItems } from './search-items';

const item = (slug: string, title: string, keywords: string[] = []): SearchItem => ({
  slug,
  title,
  cardText: '',
  icon: '🔹',
  keywords,
  categoryName: 'Kategori',
  color: '#000',
});

describe('normalizeTR', () => {
  it('Türkçe harfleri ve büyük harfleri sadeleştirir', () => {
    expect(normalizeTR('Kıdem TAZMİNATI')).toBe('kidem tazminati');
    expect(normalizeTR('Zekât, Düğün; Öğün')).toBe('zekat dugun ogun');
  });
});

describe('searchIndex', () => {
  const index = buildIndex([
    item('a', 'Yıllık İzin Hesaplama', ['izin günü', 'tatil']),
    item('b', 'Altın Günü Hesaplama', ['altın günü', 'gün sırası']),
    item('c', 'KDV Hesaplama', ['katma değer vergisi']),
  ]);

  it('boş sorguda sonuç yok', () => {
    expect(searchIndex(index, '   ')).toEqual([]);
  });

  it('"gün" yazınca başlığında geçen Altın Günü önce gelir', () => {
    const r = searchIndex(index, 'gün').map((x) => x.slug);
    expect(r[0]).toBe('b');
    expect(r).toContain('a');
  });

  it('Türkçe karakter yazmadan da bulur', () => {
    expect(searchIndex(index, 'altin gunu')[0].slug).toBe('b');
  });

  it('anahtar kelimeyle bulur', () => {
    expect(searchIndex(index, 'katma')[0].slug).toBe('c');
  });

  it('her kelime geçmeli', () => {
    expect(searchIndex(index, 'kdv altın')).toEqual([]);
  });
});

describe('sitedeki robotlar', () => {
  const index = buildIndex(searchItems());
  it('"gün" ilk sırada Altın Günü robotunu getirir', () => {
    expect(searchIndex(index, 'gün')[0].slug).toBe('altin-gunu-hesaplama');
  });
  it('"kredi" ilk sırada bir kredi robotu getirir', () => {
    expect(searchIndex(index, 'kredi')[0].title.startsWith('Kredi')).toBe(true);
  });
});
