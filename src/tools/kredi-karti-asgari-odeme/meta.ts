import { asgariOdemeOranlari, krediKartiFaizleri } from '../../data/params/kredi';
import type { ToolMeta } from '../types';

const yil = krediKartiFaizleri.lastReviewed.slice(0, 4);

export const meta: ToolMeta = {
  slug: 'kredi-karti-asgari-odeme',
  title: 'Kredi Kartı Asgari Ödeme Hesaplama',
  question: 'Asgari ödeme tutarım ne kadar? Yalnızca asgari öderseniz kart borcu kaç ayda biter, ne kadar faiz ve vergi ödersiniz?',
  seoTitle: `Kredi Kartı Asgari Ödeme Hesaplama ${yil} – Faiz ve Kapanma Süresi`,
  description:
    'Asgari ödeme tutarı, TCMB azami kart faizi, KKDF ve BSMV ile borcun kaç ayda biteceği. Asgari, sabit ve tam ödemeyi karşılaştırın; gecikme faizi uyarısı.',
  cardText: 'Asgari ödeme tutarı ve yalnızca asgari ödersen borcun gerçek maliyeti.',
  category: 'kredi-borc',
  icon: '💳',
  keywords: [
    'asgari ödeme tutarı',
    'kredi kartı faizi',
    'kredi kartı borcu',
    'akdi faiz',
    'gecikme faizi',
    'asgari ödeme oranı',
    'kart borcu ne zaman biter',
    'nakit avans faizi',
  ],
  maintenance: 'monthly',
  paramSets: [krediKartiFaizleri, asgariOdemeOranlari],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['kredi-hesaplama', 'taksit-mi-pesin-mi'],
};
