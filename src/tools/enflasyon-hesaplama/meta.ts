import { tufeSeti } from '../../data/series';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'enflasyon-hesaplama',
  title: 'Enflasyon Hesaplama',
  question: 'Geçmişteki param bugün kaç TL eder? İki tarih arasında fiyatlar ne kadar arttı?',
  seoTitle: 'Enflasyon Hesaplama – Paranın Bugünkü Değeri ve Alım Gücü',
  description:
    'TÜİK verileriyle geçmişteki bir tutarın bugünkü karşılığını, iki tarih arası enflasyonu ve alım gücü kaybını hesaplayın. 2005’ten bugüne aylık veri.',
  cardText: 'Geçmişteki paranın bugünkü değeri ve alım gücü.',
  category: 'birikim-enflasyon',
  icon: '📈',
  keywords: ['enflasyon hesaplama', 'paranın bugünkü değeri', 'alım gücü', 'tüfe', 'enflasyon farkı', 'eski para bugün kaç tl', 'maaş enflasyon'],
  maintenance: 'monthly',
  paramSets: [tufeSeti],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['kira-artis-hesaplama', 'ya-o-gun-alsaydim', 'brut-net-maas-hesaplama'],
};
