import { altinAyarlari } from '../../data/params/altin';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'altin-ayar-iscilik-hesaplama',
  title: 'Altın Ayar ve İşçilik Hesaplama',
  question: 'Bileziğim kaç gram has altın eder, kuyumcuya ne kadar işçilik ödedim, bozdurursam ne kadar alırım?',
  seoTitle: 'Altın Ayar ve İşçilik Hesaplama – Has Altın, Milyem, Bozdurma',
  description:
    'Gram ve ayardan has altın miktarını, ödediğiniz fiyattan işçilik farkını (TL ve %) ve bozdurunca alacağınız tutarı bulun; ayarlar arası gram dönüşümü dahil.',
  cardText: 'Ayardan has altın, işçilik farkı ve bozdurma tutarı.',
  category: 'altin',
  icon: '⚖️',
  keywords: [
    'altın ayar',
    'milyem hesaplama',
    'has altın',
    'işçilik hesaplama',
    'bilezik işçiliği',
    '22 ayar',
    '14 ayar',
    '18 ayar',
    'altın bozdurma',
  ],
  maintenance: 'yearly',
  paramSets: [altinAyarlari],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['dugun-altini-hesaplama', 'zekat-hesaplama', 'altin-gunu-hesaplama'],
};
