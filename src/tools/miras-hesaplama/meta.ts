import { verasetVergisi } from '../../data/params/veraset';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'miras-hesaplama',
  title: 'Miras Paylaşımı ve Veraset Vergisi Hesaplama',
  question: 'Miras kime ne kadar kalır, saklı paylar ne, mirasçılar ne kadar veraset vergisi öder?',
  seoTitle: 'Miras Paylaşımı ve Veraset Vergisi Hesaplama 2026',
  description:
    'Eş, çocuk, torun, anne-baba ve kardeşlerin yasal miras paylarını, saklı payları ve her mirasçının 2026 istisna ve tarifesine göre veraset vergisini hesaplayın.',
  cardText: 'Kime ne kadar miras kalır, saklı pay ve veraset vergisi.',
  category: 'vergi-isletme',
  icon: '📜',
  keywords: ['miras hesaplama', 'veraset vergisi hesaplama', 'miras paylaşımı', 'saklı pay hesaplama', 'veraset ve intikal vergisi 2026', 'bağış vergisi', 'yasal mirasçılar'],
  maintenance: 'yearly',
  paramSets: [verasetVergisi],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['ev-alim-masrafi-hesaplama', 'zekat-hesaplama', 'enflasyon-hesaplama'],
};
