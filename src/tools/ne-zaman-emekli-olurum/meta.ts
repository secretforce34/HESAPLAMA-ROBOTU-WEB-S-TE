import { emeklilikKurallari } from '../../data/params/emeklilik';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'ne-zaman-emekli-olurum',
  title: 'Ne Zaman Emekli Olurum?',
  question: 'İşe giriş tarihime ve prim günüme göre hangi tarihte, kaç yaşında emekli olabilirim?',
  seoTitle: 'Ne Zaman Emekli Olurum? Emeklilik Hesaplama (SSK, Bağ-Kur, Memur)',
  description:
    'SSK, Bağ-Kur ve memurlar için ilk giriş, prim günü ve doğum tarihinizle EYT, 1999–2008 ve 2008 sonrası kurallarına göre emeklilik tarihinizi hesaplayın.',
  cardText: 'EYT, kademeli yaş ve prim gününe göre emeklilik tarihi.',
  category: 'maas-calisma',
  icon: '🎉',
  keywords: ['ne zaman emekli olurum', 'emeklilik hesaplama', 'eyt', 'emeklilik yaşı', 'prim günü', 'kademeli emeklilik', 'bağkur emeklilik', 'memur emeklilik şartları', '4c emeklilik', 'askerlik borçlanması'],
  maintenance: 'none',
  paramSets: [emeklilikKurallari],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['emekli-zammi-hesaplama', 'kidem-tazminati-hesaplama', 'brut-net-maas-hesaplama'],
};
