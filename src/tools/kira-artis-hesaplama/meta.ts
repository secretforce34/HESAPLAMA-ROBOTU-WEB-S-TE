import { tufeSeti } from '../../data/series';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'kira-artis-hesaplama',
  title: 'Kira Artış Hesaplama',
  question: 'Kiraya yasal olarak en fazla ne kadar zam yapılabilir? Bu ay hangi oran geçerli?',
  seoTitle: 'Kira Artış Oranı Hesaplama – Güncel TÜFE 12 Aylık Ortalama',
  description:
    'Kira yenileme tarihinize göre yasal azami kira artış oranını (TÜFE 12 aylık ortalama) ve yeni kiranızı hesaplayın. Konut, işyeri ve %25 sınırı dahil.',
  cardText: 'Yasal azami kira artışı ve yeni kira tutarı.',
  category: 'ev-kira',
  icon: '🏠',
  keywords: ['kira artış oranı', 'kira zammı', 'tüfe 12 aylık ortalama', 'kira artışı hesaplama', 'yasal kira artışı', 'kira artış oranı ekim', 'işyeri kira artışı'],
  maintenance: 'monthly',
  paramSets: [tufeSeti],
  sources: [
    { label: '6098 sayılı Türk Borçlar Kanunu, md. 344 (kira bedelinin belirlenmesi)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6098&MevzuatTur=1&MevzuatTertip=5' },
    { label: '2026 kira artış oranları listesi (TÜİK bültenlerinden derleme – alomaliye.com)', url: 'https://www.alomaliye.com/2026/10/05/enflasyon-rakamlari-tufe-eylul-2026/' },
  ],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['enflasyon-hesaplama', 'ya-o-gun-alsaydim'],
};
