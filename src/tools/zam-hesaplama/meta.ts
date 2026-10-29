import { kdvOranlari } from '../../data/params/kdv';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'zam-hesaplama',
  title: 'Zam ve Kâr Marjı Hesaplama',
  question: 'Zamlı fiyat ne olur; maliyet artınca kârımı korumak için satış fiyatını kaç TL yapmalıyım?',
  seoTitle: 'Zam ve Kâr Marjı Hesaplama – Yüzde Zam, Fiyat, Satış Kaybı',
  description:
    'Yüzde zamı, ardışık zamları, maliyet artışında kâr marjını koruyan satış fiyatını ve zamda dayanabileceğiniz satış kaybını hesaplayın.',
  cardText: 'Yüzde zam, ardışık zam, marj/markup fiyatı ve zamda satış kaybı.',
  category: 'vergi-isletme',
  icon: '🏷️',
  keywords: [
    'zam hesaplama',
    'yüzde zam',
    'ardışık zam',
    'kâr marjı',
    'markup',
    'satış fiyatı hesaplama',
    'maliyet artışı',
    'indirim hesaplama',
    'fiyat artışı',
    'başa baş satış',
  ],
  maintenance: 'yearly',
  paramSets: [kdvOranlari],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['kdv-hesaplama', 'senet-iskonto-hesaplama', 'freelancer-saatlik-ucret-hesaplama'],
};
