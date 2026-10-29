import { fitreFidye, zekatNisap } from '../../data/params/diyanet';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'zekat-hesaplama',
  title: 'Zekât Hesaplama',
  question: 'Nakit, altın, döviz ve ticari malım için zekâtım ne kadar? Nisaba ulaştım mı, fitre ve fidye ne kadar?',
  seoTitle: 'Zekât Hesaplama – Nisap, Altın, Nakit; Fitre ve Fidye 2026',
  description:
    'Altın, nakit, döviz, ticari mal ve alacaklarınız için Diyanet ölçülerine göre nisabı ve zekâtı hesaplayın; Diyanet’in 2026 fitre ve fidye tutarı dahil.',
  cardText: 'Diyanet ölçülerine göre nisap, zekât, fitre ve fidye.',
  category: 'altin',
  icon: '🌙',
  keywords: [
    'zekat',
    'zekât hesaplama',
    'nisap',
    'altın zekatı',
    'fitre',
    'fidye',
    '2026 fitre',
    'ticaret malı zekatı',
    'borç zekât',
  ],
  maintenance: 'yearly',
  paramSets: [zekatNisap, fitreFidye],
  sources: [
    {
      label: 'Diyanet – 190 Fetva Hattı ve Dini Bilgilendirme Platformu (iletişim)',
      url: 'https://goruntulufetva.diyanet.gov.tr/iletisim',
    },
  ],
  lastReviewed: '2026-10-29',
  related: ['dugun-altini-hesaplama', 'altin-ayar-iscilik-hesaplama', 'altin-gunu-hesaplama'],
};
