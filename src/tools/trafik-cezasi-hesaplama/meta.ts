import { trafikCezasiOdeme } from '../../data/params/trafik-cezasi';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'trafik-cezasi-hesaplama',
  title: 'Trafik Cezası İndirim ve Gecikme Hesaplama',
  question: 'Trafik cezamı hangi tarihe kadar indirimli öderim, geç ödersem ne kadar faiz eklenir?',
  seoTitle: 'Trafik Cezası İndirimi ve Gecikme Faizi Hesaplama 2026',
  description:
    'Trafik cezasının %25 indirimli son ödeme gününü, itiraz süresini ve geç ödemede eklenen aylık %5 faizi hesaplayın; e-Tebligatla gelen cezalar ve birden çok ceza için.',
  cardText: 'İndirimli son gün, itiraz süresi ve gecikme faizi.',
  category: 'arac-ulasim',
  icon: '🚓',
  keywords: ['trafik cezası indirim', 'trafik cezası erken ödeme', 'trafik cezası gecikme faizi', 'trafik cezası kaç günde ödenir', 'trafik cezası itiraz süresi', 'e-tebligat trafik cezası', 'yüzde 25 indirim'],
  maintenance: 'none',
  paramSets: [trafikCezasiOdeme],
  sources: [],
  lastReviewed: '2026-10-31',
  related: ['mtv-hesaplama', 'arac-km-maliyeti-hesaplama', 'kredi-karti-asgari-odeme'],
};
