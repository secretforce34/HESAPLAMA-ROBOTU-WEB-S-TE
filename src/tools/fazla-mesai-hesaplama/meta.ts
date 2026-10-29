import { asgariUcret } from '../../data/params/asgari-ucret';
import { MAAS_YILLARI, maasParametreleri } from '../../data/params/maas';
import { sgkSinirlar } from '../../data/params/sgk-sinirlar';
import type { ToolMeta } from '../types';

const yil = MAAS_YILLARI[MAAS_YILLARI.length - 1];

export const meta: ToolMeta = {
  slug: 'fazla-mesai-hesaplama',
  title: 'Fazla Mesai Hesaplama',
  question: 'Fazla mesai ücretim ne kadar olmalı, net ele ne geçer? Hafta tatili ve bayram çalışması dahil.',
  seoTitle: `Fazla Mesai Hesaplama ${yil} – %50 Zamlı Ücret, Bayram ve Net`,
  description:
    'Fazla mesai ücreti: saat ücreti (aylık ÷ 225), %50 ve %25 zam, hafta tatili ve bayram çalışması, 270 saat sınırı ve kümülatif vergiyle yaklaşık net.',
  cardText: '%50 zamlı saat, hafta tatili, bayram mesaisi ve yaklaşık net.',
  category: 'maas-calisma',
  icon: '⏱️',
  keywords: [
    'fazla çalışma ücreti',
    'mesai ücreti hesaplama',
    'saatlik ücret hesaplama',
    'bayram mesaisi',
    'resmi tatil mesaisi',
    'pazar mesaisi',
    'hafta tatili çalışması',
    '270 saat sınırı',
    'fazla sürelerle çalışma',
    'net mesai ücreti',
  ],
  maintenance: 'yearly',
  paramSets: [maasParametreleri, asgariUcret, sgkSinirlar],
  sources: [
    {
      label: '4857 sayılı İş Kanunu md. 41 (fazla çalışma), 46 (hafta tatili), 47 (genel tatil), 63 (çalışma süresi)',
      url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5',
    },
  ],
  lastReviewed: '2026-10-29',
  related: ['brut-net-maas-hesaplama', 'kidem-tazminati-hesaplama'],
};
