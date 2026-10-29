import { memurEmekliZam } from '../../data/params/memur-emekli-zam';
import { tufeSeti } from '../../data/series';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'emekli-zammi-hesaplama',
  title: 'Emekli ve Memur Zammı Hesaplama',
  question: 'Ocak ve Temmuz’da emekli ve memur maaşına ne kadar zam gelecek? Yeni maaşım ne olacak?',
  seoTitle: 'Emekli ve Memur Zammı Hesaplama – Ocak 2027 Tahmini',
  description:
    'SSK, Bağ-Kur, memur ve memur emeklisi zammını 6 aylık enflasyon ve toplu sözleşme oranlarıyla hesaplayın; açıklanmamış aylar için kendi tahmininizi girin.',
  cardText: 'Ocak/Temmuz zammı ve yeni maaş (açıklanan + tahmini).',
  category: 'maas-calisma',
  icon: '👵',
  keywords: ['emekli zammı', 'memur zammı', 'ocak zammı', 'temmuz zammı', 'ssk bağkur zam', 'enflasyon farkı', 'toplu sözleşme', 'memur emeklisi'],
  maintenance: 'monthly',
  paramSets: [memurEmekliZam, tufeSeti],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['enflasyon-hesaplama', 'brut-net-maas-hesaplama', 'issizlik-maasi-hesaplama'],
};
