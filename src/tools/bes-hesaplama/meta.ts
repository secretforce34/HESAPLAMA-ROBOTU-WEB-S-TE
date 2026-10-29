import { besKurallari } from '../../data/params/bes';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'bes-hesaplama',
  title: 'BES Hesaplama (Bireysel Emeklilik)',
  question: 'BES’e her ay ödersem yıllar sonra ne birikir, devlet katkısı ve kesintilerden sonra elime ne geçer?',
  seoTitle: 'BES Hesaplama 2026 – Devlet Katkısı %20, Stopaj, Birikim',
  description:
    'Bireysel emeklilikte aylık katkınızla yıllar sonraki birikimi, %20 devlet katkısını, hak kazanma oranını ve stopajı hesaplayın; erken çıkarsanız ne alacağınızı görün.',
  cardText: 'Birikim, %20 devlet katkısı, stopaj ve erken çıkış.',
  category: 'birikim-enflasyon',
  icon: '🧓',
  keywords: ['bes hesaplama', 'bireysel emeklilik hesaplama', 'bes devlet katkısı', 'bes stopaj', 'bes erken çıkış', 'bes ne kadar birikir', 'devlet katkısı hak kazanma'],
  maintenance: 'yearly',
  paramSets: [besKurallari],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['finansal-ozgurluk-hesaplama', 'ne-zaman-emekli-olurum', 'enflasyon-hesaplama'],
};
