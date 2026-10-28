import { kdvOranlari } from '../../data/params/kdv';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'kdv-hesaplama',
  title: 'KDV Hesaplama',
  question: 'Bir fiyatın KDV’si ne kadar, KDV hariç tutarı ne? Tevkifatlı faturada kim ne öder?',
  seoTitle: 'KDV Hesaplama – KDV Dahil, Hariç ve Tevkifatlı (%1, %10, %20)',
  description:
    'KDV dahil fiyattan KDV hariç tutarı, KDV hariç tutardan toplamı saniyede bulun. %1, %10, %20 oranları ve 2/10–10/10 tevkifatlı fatura hesabı.',
  cardText: 'KDV dahil ↔ hariç tutar ve tevkifatlı fatura hesabı.',
  category: 'vergi-isletme',
  icon: '🧾',
  keywords: ['katma değer vergisi', 'kdv dahil', 'kdv hariç', 'tevkifat', 'fatura', 'kdv çıkarma', 'matrah'],
  maintenance: 'none',
  paramSets: [kdvOranlari],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
};
