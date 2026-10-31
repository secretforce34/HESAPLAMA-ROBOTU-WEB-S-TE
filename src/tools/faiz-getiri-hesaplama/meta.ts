import { mevduatStopaji } from '../../data/params/mevduat';
import { tufeSeti } from '../../data/series';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'faiz-getiri-hesaplama',
  title: 'Faiz Getiri Hesaplama',
  question: 'Paramı vadeli mevduata yatırırsam stopaj düştükten sonra ne kadar net faiz alırım?',
  // Yıl, stopaj oranlarının geçerli olduğu son yıldan gelir
  seoTitle: `Faiz Getiri Hesaplama ${(mevduatStopaji.validTo ?? mevduatStopaji.validFrom).slice(0, 4)} – Mevduat Net Faiz ve Stopaj`,
  description:
    'Tutarı, yıllık faiz oranını ve vade gününü girin; stopaj düşülmüş net faizi, faiziyle yenilenen (bileşik) birikimi ve enflasyona göre reel getiriyi görün.',
  cardText: 'Mevduatın stopaj sonrası net faiz getirisi.',
  category: 'vergi-isletme',
  icon: '💹',
  keywords: [
    'mevduat faizi hesaplama',
    'faiz getirisi hesaplama',
    'net faiz hesaplama',
    'stopaj hesaplama',
    'bileşik faiz hesaplama',
    'vadeli mevduat getirisi',
    '32 gün faiz',
    'aylık faiz geliri',
  ],
  maintenance: 'monthly',
  paramSets: [mevduatStopaji, tufeSeti],
  sources: [],
  lastReviewed: '2026-10-31',
  related: ['enflasyon-hesaplama', 'finansal-ozgurluk-hesaplama', 'kredi-hesaplama'],
  yeni: true,
};
