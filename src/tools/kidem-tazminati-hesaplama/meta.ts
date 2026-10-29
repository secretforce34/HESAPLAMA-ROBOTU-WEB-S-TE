import { kidemTavani } from '../../data/params/kidem';
import { maasParametreleri } from '../../data/params/maas';
import { formatTL } from '../../lib/format';
import type { ToolMeta } from '../types';

const sonDonem = kidemTavani.values.donemler[kidemTavani.values.donemler.length - 1];
const yil = sonDonem.to.slice(0, 4);

export const meta: ToolMeta = {
  slug: 'kidem-tazminati-hesaplama',
  title: 'Kıdem ve İhbar Tazminatı Hesaplama',
  question: 'İşten ayrılınca ne kadar kıdem ve ihbar tazminatı alırım, elime net ne geçer?',
  seoTitle: `Kıdem Tazminatı Hesaplama ${yil} – İhbar, Tavan ve Net Tutar`,
  description: `Kıdem ve ihbar tazminatı: giydirilmiş ücret, çıkış tarihindeki tavan (${formatTL(sonDonem.tavan)}), hizmet süresi ve vergiler düşülmüş net tutar.`,
  cardText: 'Giydirilmiş ücret, tavan ve vergilerle net kıdem + ihbar.',
  category: 'maas-calisma',
  icon: '📋',
  keywords: [
    'kıdem tazminatı tavanı',
    'ihbar tazminatı',
    'giydirilmiş ücret',
    'işten çıkış tazminatı',
    'ihbar süresi',
    'tazminat vergisi',
    'istifa kıdem tazminatı',
    'emeklilik kıdem tazminatı',
    'kıdem tazminatı net',
  ],
  maintenance: 'yearly',
  paramSets: [kidemTavani, maasParametreleri],
  sources: [
    {
      label: '4857 sayılı İş Kanunu md. 17 (bildirim süreleri), md. 24–25 (haklı fesih), ek md. 3 (zamanaşımı)',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5',
    },
  ],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['brut-net-maas-hesaplama', 'fazla-mesai-hesaplama'],
};
