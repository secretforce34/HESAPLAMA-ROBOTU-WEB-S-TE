import { kdvOranlari, kismiTevkifatSiniri } from '../../data/params/kdv';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'kdv-hesaplama',
  title: 'KDV Hesaplama',
  question: 'Faturanın KDV’si ne kadar, KDV hariç tutarı ne? Farklı oranlı satırlar ve tevkifat dahil.',
  seoTitle: 'KDV Hesaplama – Dahil, Hariç, Çok Oranlı ve Tevkifatlı Fatura',
  description:
    'KDV dahil ve hariç tutarı saniyede bulun. Aynı faturada %1, %10, %20 satırları, 2/10–10/10 tevkifat ve 12.000 TL tevkifat sınırı otomatik.',
  cardText: 'Çok oranlı fatura, KDV dahil ↔ hariç ve tevkifat sınırıyla.',
  category: 'vergi-isletme',
  icon: '🧾',
  keywords: ['katma değer vergisi', 'kdv dahil', 'kdv hariç', 'tevkifat', 'tevkifat sınırı', 'fatura', 'kdv çıkarma', 'matrah', 'kdv oranları'],
  maintenance: 'yearly',
  paramSets: [kdvOranlari, kismiTevkifatSiniri],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
};
