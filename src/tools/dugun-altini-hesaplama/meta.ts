import { altinAyarlari, darphaneAltinlari } from '../../data/params/altin';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'dugun-altini-hesaplama',
  title: 'Düğün Altını Hesaplama',
  question: 'Takılan çeyrek, yarım, tam altınlar ve bilezikler toplam kaç gram has altın eder, bozdurursam ne kadar alırım?',
  seoTitle: 'Düğün Altını Hesaplama – Çeyrek, Yarım, Tam ve Bilezik',
  description:
    'Çeyrek, yarım, tam, ata, gremse ve bileziklerden oluşan düğün altınlarınızın toplam has gramını ve TL değerini, alış-satış farkıyla birlikte hesaplayın.',
  cardText: 'Takılan altınların has gramı, TL değeri ve bozdurma tutarı.',
  category: 'altin',
  icon: '💍',
  keywords: [
    'düğün altını',
    'takı altını',
    'çeyrek altın',
    'ziynet altını',
    'bilezik',
    'has altın',
    'altın bozdurma',
    'cumhuriyet altını',
    'gremse',
  ],
  maintenance: 'yearly',
  paramSets: [darphaneAltinlari, altinAyarlari],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['altin-ayar-iscilik-hesaplama', 'altin-gunu-hesaplama', 'zekat-hesaplama'],
  featured: true,
};
