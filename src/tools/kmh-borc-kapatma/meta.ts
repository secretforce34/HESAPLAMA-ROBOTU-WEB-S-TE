import { krediKartiFaizleri, krediSinirlari } from '../../data/params/kredi';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'kmh-borc-kapatma',
  title: 'KMH Borç Kapatma Planı',
  question: 'Kredili mevduat hesabındaki (eksi hesap) borcum kaç ayda biter, yalnızca faizini ödersem ne olur?',
  seoTitle: 'KMH Borcu Kapatma Planı – Eksi Hesap Borcu Kaç Ayda Biter?',
  description:
    'Kredili mevduat hesabı (eksi hesap) borcunuzu ve aylık bütçenizi girin; faiz ve vergiyle borcun kaç ayda biteceğini, yalnızca faiz ödenirse ne olacağını görün.',
  cardText: 'Eksi hesap borcunun kaç ayda biteceği.',
  category: 'kredi-borc',
  icon: '🏧',
  keywords: [
    'kmh borcu nasıl kapatılır',
    'kredili mevduat hesabı borcu',
    'eksi hesap borcu',
    'kmh faizi hesaplama',
    'artı hesap borcu',
    'kmh borcu kaç ayda biter',
    'kmh kredi ile kapatma',
  ],
  maintenance: 'monthly',
  paramSets: [krediKartiFaizleri, krediSinirlari],
  sources: [],
  lastReviewed: '2026-10-31',
  related: ['kredi-karti-borc-kapatma', 'borc-kapatma-plani', 'kredi-hesaplama'],
  yeni: true,
};
