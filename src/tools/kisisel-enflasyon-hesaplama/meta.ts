import { tufeSeti } from '../../data/series';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'kisisel-enflasyon-hesaplama',
  title: 'Kişisel Enflasyon Hesaplama',
  question: 'Benim harcamalarıma göre enflasyon gerçekte yüzde kaç? Resmi rakamdan farkı ne?',
  seoTitle: 'Kişisel Enflasyon Hesaplama – Benim Enflasyonum Kaç?',
  description:
    'Kira, market, fatura, ulaşım gibi kendi harcamalarınızın bir yılda ne kadar arttığını girin; kişisel enflasyonunuzu hesaplayıp TÜİK’in resmi TÜFE rakamıyla karşılaştırın.',
  cardText: 'Kendi harcamalarınıza göre enflasyon ve resmi rakamla farkı.',
  category: 'birikim-enflasyon',
  icon: '🛒',
  keywords: ['kişisel enflasyon', 'benim enflasyonum', 'kişisel enflasyon hesaplama', 'gerçek enflasyon', 'enflasyon sepeti', 'tüfe karşılaştırma', 'maaşım enflasyona yetişti mi'],
  maintenance: 'monthly',
  paramSets: [tufeSeti],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['enflasyon-hesaplama', 'zam-hesaplama', 'kira-artis-hesaplama'],
};
