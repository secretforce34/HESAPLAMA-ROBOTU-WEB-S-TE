import { altinSeti, dovizSeti, tufeSeti } from '../../data/series';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'ya-o-gun-alsaydim',
  title: 'Ya O Gün Alsaydım?',
  question: 'Geçmişte dolar, euro ya da altın alsaydım bugün kaç TL ederdi? Enflasyonu yenen hangisi oldu?',
  seoTitle: 'Ya O Gün Alsaydım? Dolar, Euro, Altın Geçmiş Getiri Hesaplama',
  description:
    'Geçmişteki bir tarihte TL’nizi dolar, euro ya da gram altına çevirseydiniz bugün ne ederdi? Enflasyona göre reel getiri ve aylık düzenli alım senaryosu.',
  cardText: 'Dolar, euro, altın ve TL’nin geçmişten bugüne getirisi.',
  category: 'birikim-enflasyon',
  icon: '⏳',
  keywords: ['ya o gün alsaydım', 'dolar mı altın mı', 'geçmiş getiri', 'altın getirisi', 'dolar getirisi', 'reel getiri', 'yatırım karşılaştırma'],
  maintenance: 'monthly',
  paramSets: [tufeSeti, dovizSeti, altinSeti],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['enflasyon-hesaplama', 'kira-artis-hesaplama', 'dugun-altini-hesaplama'],
};
