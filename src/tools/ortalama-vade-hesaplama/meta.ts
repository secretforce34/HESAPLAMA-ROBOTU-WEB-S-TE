import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'ortalama-vade-hesaplama',
  title: 'Ortalama Vade Hesaplama',
  question: 'Birden çok çek ve senedin tutar ağırlıklı ortalama vadesi kaç gün, hangi tarihe denk gelir?',
  seoTitle: 'Ortalama Vade Hesaplama – Çek ve Senet Listesi, Tutar Ağırlıklı',
  description:
    'Çek ve senetlerinizin tutar ağırlıklı ortalama vadesini gün ve tarih olarak bulun. Vadesi geçmiş satırlar, faizli denk vade ve satır dökümü dahil.',
  cardText: 'Çok satırlı çek/senet listesinden ortalama vade günü ve tarihi.',
  category: 'vergi-isletme',
  icon: '📅',
  keywords: [
    'ortalama vade',
    'ağırlıklı ortalama vade',
    'çek senet vadesi',
    'ortalama vade tarihi',
    'denk vade',
    'eşdeğer vade',
    'vade hesaplama',
    'tahsilat vadesi',
  ],
  maintenance: 'none',
  paramSets: [],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['senet-iskonto-hesaplama', 'kdv-hesaplama'],
};
