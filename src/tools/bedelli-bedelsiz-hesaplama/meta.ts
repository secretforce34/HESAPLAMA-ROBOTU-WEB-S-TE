import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'bedelli-bedelsiz-hesaplama',
  title: 'Bedelli Bedelsiz Hesaplama',
  question: 'Sermaye artırımından sonra hisse fiyatı ne olur, kaç lotum olur, ne kadar ödeyeceğim?',
  seoTitle: 'Bedelli Bedelsiz Hesaplama – Sermaye Artırımı Sonrası Hisse Fiyatı',
  description:
    'Bedelli ve bedelsiz sermaye artırımı ile temettü sonrası teorik hisse fiyatını Borsa İstanbul formülüyle hesaplayın; yeni lot sayınız ve rüçhan ödemeniz.',
  cardText: 'Sermaye artırımı sonrası teorik fiyat, yeni lot ve rüçhan.',
  category: 'borsa',
  icon: '➗',
  keywords: ['bedelsiz', 'bedelli', 'sermaye artırımı', 'teorik fiyat', 'rüçhan hakkı', 'hisse bölünmesi', 'temettü', 'fiyat düzeltme'],
  maintenance: 'none',
  paramSets: [],
  sources: [
    {
      label: 'Borsa İstanbul – Özsermaye hallerinde payların teorik/referans fiyatlarının belirlenmesi (md. 4–5)',
      url: 'https://www.borsaistanbul.com/files/ozsermaye-hallerinde-paylarin-teorik-referans-fiyatlarinin-belirlenme-yontemi.pdf',
    },
  ],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['hisse-maliyet-hesaplama', 'halka-arz-lot-hesaplama'],
};
