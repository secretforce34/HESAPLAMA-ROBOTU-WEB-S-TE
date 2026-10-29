import { kartTaksitSinirlari } from '../../data/params/kredi';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'taksit-mi-pesin-mi',
  title: 'Taksit mi Peşin mi? Hesaplama',
  question: 'Peşin indirimli fiyat mı, vade farklı ya da farksız taksit mi daha ucuza gelir? Enflasyon ve faiz getirisiyle bugünkü değer.',
  seoTitle: 'Taksit mi Peşin mi? Hesaplama – Bugünkü Değer ve Başa Baş Oranı',
  description:
    'Peşin indirimi ile vade farklı/farksız taksitleri bugünkü değerle karşılaştırın. Başa baş getiri oranı, kart ödeme günü etkisi ve BDDK taksit sınırları.',
  cardText: 'Peşin indirimi ile taksitleri enflasyon ve getiriyle karşılaştırın.',
  category: 'kredi-borc',
  icon: '🛒',
  keywords: [
    'taksit mi peşin mi',
    'peşin indirimi',
    'vade farkı hesaplama',
    'vade farksız taksit',
    'taksitli alışveriş',
    'bugünkü değer',
    'kredi kartı taksit',
    'taksit sınırı',
  ],
  maintenance: 'yearly',
  paramSets: [kartTaksitSinirlari],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['kredi-karti-asgari-odeme', 'kredi-hesaplama'],
  featured: true,
};
