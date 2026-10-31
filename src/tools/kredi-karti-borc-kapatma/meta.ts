import { asgariOdemeOranlari, krediKartiFaizleri, krediSinirlari } from '../../data/params/kredi';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'kredi-karti-borc-kapatma',
  title: 'Kredi Kartı Borç Kapatma Planı',
  question: 'Kredi kartı borçlarım her ay ayırabildiğim parayla kaç ayda biter, ne kadar faiz öderim?',
  seoTitle: 'Kredi Kartı Borç Kapatma Planı – Kaç Ayda Biter, Ne Kadar Faiz?',
  description:
    'Kart borçlarınızı, limitlerinizi ve aylık bütçenizi girin; borcun kaç ayda biteceğini, faiz ve vergiyi, asgari ödemeyle farkı ve kapatma sırasını görün.',
  cardText: 'Kart borcunun kaç ayda biteceği ve faiz yükü.',
  category: 'kredi-borc',
  icon: '🧮',
  keywords: [
    'kredi kartı borcu nasıl kapatılır',
    'kart borcu kaç ayda biter',
    'kredi kartı borç ödeme planı',
    'kart borcu faiz hesaplama',
    'nakit avans borcu',
    'birden fazla kart borcu',
    'çığ yöntemi',
    'kartopu yöntemi',
  ],
  maintenance: 'monthly',
  paramSets: [krediKartiFaizleri, asgariOdemeOranlari, krediSinirlari],
  sources: [],
  lastReviewed: '2026-10-31',
  related: ['kmh-borc-kapatma', 'borc-kapatma-plani', 'kredi-karti-asgari-odeme'],
  yeni: true,
};
