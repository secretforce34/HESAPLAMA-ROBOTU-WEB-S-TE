import { kdvOranlari, kismiTevkifatSiniri } from '../../data/params/kdv';
import { serbestMeslekStopaji, smmKdvTevkifati } from '../../data/params/serbest-meslek';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'serbest-meslek-makbuzu-hesaplama',
  title: 'Serbest Meslek Makbuzu (SMM) Hesaplama',
  question: 'Makbuzu kaç TL kesmeliyim; stopaj, KDV ve tevkifattan sonra hesabıma ne kadar yatar?',
  seoTitle: 'Serbest Meslek Makbuzu Hesaplama – Stopaj, KDV, Tevkifat',
  description:
    'SMM’de brütten nete, netten brüte ve KDV dahil tutardan geriye hesap. %20 ve %17 stopaj, KDV, tevkifat ve 12.000 TL tevkifat sınırı otomatik.',
  cardText: 'Stopaj, KDV ve tevkifatlı serbest meslek makbuzu: brüt, net, tahsilat.',
  category: 'vergi-isletme',
  icon: '📝',
  keywords: [
    'smm',
    'serbest meslek makbuzu',
    'e-smm',
    'stopaj',
    'serbest meslek stopajı',
    'brütten nete',
    'netten brüte',
    'kdv tevkifatı',
    'freelancer fatura',
    'makbuz hesaplama',
  ],
  maintenance: 'yearly',
  paramSets: [serbestMeslekStopaji, smmKdvTevkifati, kismiTevkifatSiniri, kdvOranlari],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['kdv-hesaplama', 'freelancer-saatlik-ucret-hesaplama', 'kur-farki-hesaplama'],
};
