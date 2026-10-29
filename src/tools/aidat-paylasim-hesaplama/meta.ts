import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'aidat-paylasim-hesaplama',
  title: 'Aidat Paylaşımı Hesaplama',
  question: 'Apartman giderleri dairelere nasıl bölünür? Arsa payına göre kim ne kadar aidat öder?',
  seoTitle: 'Aidat Hesaplama – Arsa Payına Göre Apartman Gider Paylaşımı',
  description:
    'Apartman ve site giderlerini Kat Mülkiyeti Kanunu’na göre arsa payı oranında ve eşit olarak dairelere paylaştırın; her bağımsız bölümün aylık aidatını görün.',
  cardText: 'Arsa payı ve eşit paylaşımla daire daire aidat.',
  category: 'ev-kira',
  icon: '🏢',
  keywords: ['aidat hesaplama', 'arsa payı', 'apartman gideri', 'ortak gider paylaşımı', 'kat mülkiyeti kanunu 20', 'kapıcı gideri', 'site aidatı'],
  maintenance: 'none',
  paramSets: [],
  sources: [
    { label: '634 sayılı Kat Mülkiyeti Kanunu, md. 20 (giderlere katılma)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=634&MevzuatTur=1&MevzuatTertip=5' },
  ],
  lastReviewed: '2026-10-29',
  related: ['ev-alim-masrafi-hesaplama', 'kira-artis-hesaplama'],
};
