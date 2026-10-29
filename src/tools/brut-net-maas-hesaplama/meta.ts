import { asgariUcret } from '../../data/params/asgari-ucret';
import { MAAS_YILLARI, maasParametreleri } from '../../data/params/maas';
import { sgkSinirlar } from '../../data/params/sgk-sinirlar';
import type { ToolMeta } from '../types';

/** Oran setindeki en güncel yıl (başlıklarda elle yıl yazılmaz). */
const yil = MAAS_YILLARI[MAAS_YILLARI.length - 1];

export const meta: ToolMeta = {
  slug: 'brut-net-maas-hesaplama',
  title: 'Brüt Net Maaş Hesaplama',
  question: 'Brüt maaşım net kaç TL eder, istediğim net için brüt ne olmalı? Ay ay bordro ve işverene maliyetiyle.',
  seoTitle: `Brüt Net Maaş Hesaplama ${yil} – Aylık Tablo ve İşveren Maliyeti`,
  description: `${yil} brüt-net maaş: 12 aylık bordro tablosu, kümülatif vergi dilimi, asgari ücret istisnası, SGK tavanı, netten brüte ve işveren maliyeti.`,
  cardText: 'Brüt ↔ net, 12 aylık bordro tablosu ve işverene maliyet.',
  category: 'maas-calisma',
  icon: '💰',
  keywords: [
    'net maaş hesaplama',
    'brütten nete',
    'netten brüte',
    'bordro hesaplama',
    'gelir vergisi dilimi',
    'asgari ücret istisnası',
    'işveren maliyeti',
    'sgk primi',
    'damga vergisi',
    'emekli çalışan sgdp',
  ],
  maintenance: 'yearly',
  paramSets: [maasParametreleri, asgariUcret, sgkSinirlar],
  sources: [],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['kidem-tazminati-hesaplama', 'fazla-mesai-hesaplama'],
};
