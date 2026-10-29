import { asgariUcret } from '../../data/params/asgari-ucret';
import { issizlikKurallari } from '../../data/params/issizlik';
import { sgkSinirlar } from '../../data/params/sgk-sinirlar';
import type { ToolMeta } from '../types';

const yil = asgariUcret.values.donemler[asgariUcret.values.donemler.length - 1].from.slice(0, 4);

export const meta: ToolMeta = {
  slug: 'issizlik-maasi-hesaplama',
  title: 'İşsizlik Maaşı Hesaplama',
  question: 'İşsizlik maaşı alabilir miyim, ayda ne kadar ve kaç ay alırım?',
  seoTitle: `İşsizlik Maaşı Hesaplama ${yil} – Ne Kadar, Kaç Ay?`,
  description:
    'Son 4 aylık kazancınız ve prim gününüzle işsizlik maaşınızı, ödeme süresini ve hak kazanma şartlarını hesaplayın. Güncel tavan ve damga vergisi dahil.',
  cardText: 'Aylık net ödenek, süre (6–10 ay) ve hak şartları.',
  category: 'maas-calisma',
  icon: '🧾',
  keywords: ['işsizlik maaşı', 'işsizlik ödeneği', 'işkur', 'kaç ay işsizlik maaşı', 'işsizlik maaşı şartları', '4447', 'tazminat sonrası'],
  maintenance: 'yearly',
  paramSets: [issizlikKurallari, asgariUcret, sgkSinirlar],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['kidem-tazminati-hesaplama', 'brut-net-maas-hesaplama', 'yillik-izin-hesaplama'],
};
