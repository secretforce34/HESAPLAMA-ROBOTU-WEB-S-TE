import { evAlimMasraflari } from '../../data/params/ev-alim';
import { krediSinirlari } from '../../data/params/kredi';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'kirada-mi-ev-mi',
  title: 'Kirada mı Kalsam, Ev mi Alsam?',
  question: 'Krediyle ev almak mı, kirada oturup parayı değerlendirmek mi daha kazançlı?',
  seoTitle: 'Kirada mı Oturmalı, Ev mi Almalı? Hesaplama 2026',
  description:
    'Ev fiyatı, peşinat, konut kredisi, kira artışı ve paranızın getirisine göre yıllar sonra hangi seçeneğin daha çok servet bıraktığını ve başabaş kirayı hesaplayın.',
  cardText: 'Krediyle ev mi, kira + yatırım mı? Yıllar sonraki servet.',
  category: 'ev-kira',
  icon: '🏠',
  keywords: ['kirada mı oturmalı ev mi almalı', 'ev almak mı kira mı', 'konut kredisi mi kira mı', 'ev amorti süresi', 'kira mı kredi mi', 'ev almak mantıklı mı'],
  maintenance: 'yearly',
  paramSets: [evAlimMasraflari, krediSinirlari],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['kredi-hesaplama', 'ev-alim-masrafi-hesaplama', 'kira-artis-hesaplama'],
};
