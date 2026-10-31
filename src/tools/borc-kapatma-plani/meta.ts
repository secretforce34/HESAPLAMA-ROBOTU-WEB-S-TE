import { asgariOdemeOranlari, krediKartiFaizleri, krediSinirlari } from '../../data/params/kredi';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'borc-kapatma-plani',
  title: 'Kredi Kartı ve KMH Birlikte Borç Kapatma Planı',
  question: 'Birden çok kart ve eksi hesap borcumu en kısa sürede, en az faizle nasıl kapatırım?',
  seoTitle: 'Kredi Kartı Borcu Kapatma Planı – Çığ ve Kartopu Yöntemi',
  description:
    'Kart ve KMH borçlarınızı ve aylık bütçenizi girin; çığ ve kartopu yöntemiyle borcun kaç ayda biteceğini, faiz ve vergiyi, ihtiyaç kredisiyle kapatmayı karşılaştırın.',
  cardText: 'Birden çok kart borcunu en az faizle kapatma sırası.',
  category: 'kredi-borc',
  icon: '🧯',
  keywords: ['kredi kartı borcu nasıl kapatılır', 'borç kapatma planı', 'kart borcu ödeme planı', 'kmh borcu', 'çığ yöntemi', 'kartopu yöntemi', 'borç transferi', 'kredi ile kart borcu kapatma'],
  maintenance: 'monthly',
  paramSets: [krediKartiFaizleri, asgariOdemeOranlari, krediSinirlari],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['kredi-karti-asgari-odeme', 'kredi-hesaplama', 'kredi-erken-kapama'],
};
