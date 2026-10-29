import { evAlimMasraflari } from '../../data/params/ev-alim';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'ev-alim-masrafi-hesaplama',
  title: 'Ev Alım Masrafı Hesaplama',
  question: 'Ev alırken fiyatın üstüne ne kadar masraf çıkar? Tapu harcı, emlakçı, kredi masrafları toplam ne tutar?',
  seoTitle: 'Ev Alım Masrafı ve Tapu Harcı Hesaplama 2026',
  description:
    'Ev alırken ödeyeceğiniz tapu harcını, döner sermayeyi, emlakçı komisyonunu, kredi tahsis ve ekspertiz ücretlerini tek seferde hesaplayın; peşin ne gerektiğini görün.',
  cardText: 'Tapu harcı, emlakçı, kredi masrafları ve toplam maliyet.',
  category: 'ev-kira',
  icon: '🔑',
  keywords: ['tapu harcı hesaplama', 'ev alım masrafları', 'emlakçı komisyonu', 'döner sermaye', 'tapu masrafı', 'konut kredisi masrafları', 'dask'],
  maintenance: 'yearly',
  paramSets: [evAlimMasraflari],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['kredi-hesaplama', 'kira-artis-hesaplama', 'aidat-paylasim-hesaplama'],
};
