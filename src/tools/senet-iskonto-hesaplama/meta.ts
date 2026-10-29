import { bsmvOranlari } from '../../data/params/serbest-meslek';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'senet-iskonto-hesaplama',
  title: 'Senet ve Çek İskonto Hesaplama',
  question: 'Senedi ya da çeki vadesinden önce bozdurursam elime ne kadar geçer, gerçek maliyeti ne olur?',
  seoTitle: 'Senet ve Çek İskonto Hesaplama – İç, Dış İskonto ve BSMV',
  description:
    'Birden çok senet ve çek için iç ve dış iskonto, komisyon ve BSMV’yi hesaplayın; ele geçen tutarı ve yıllık gerçek (efektif) maliyeti görün.',
  cardText: 'İç/dış iskonto, BSMV ve efektif maliyetle senet ve çek iskonto hesabı.',
  category: 'vergi-isletme',
  icon: '💸',
  keywords: [
    'iskonto',
    'senet iskontosu',
    'çek iskontosu',
    'iç iskonto',
    'dış iskonto',
    'ticari iskonto',
    'bsmv',
    'senet bozdurma',
    'vadeli çek',
    'efektif maliyet',
  ],
  maintenance: 'yearly',
  paramSets: [bsmvOranlari],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['ortalama-vade-hesaplama', 'kdv-hesaplama'],
};
