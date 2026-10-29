import { krediSinirlari, krediUcretleri, krediVergileri } from '../../data/params/kredi';
import type { ToolMeta } from '../types';

const yil = krediSinirlari.lastReviewed.slice(0, 4);

export const meta: ToolMeta = {
  slug: 'kredi-hesaplama',
  title: 'Kredi Hesaplama',
  question: 'Aylık taksit ne kadar, faiz, KKDF ve BSMV dahil krediye toplam ne ödersiniz? Masraflarla gerçek maliyet ve yıllık maliyet oranı.',
  seoTitle: `Kredi Hesaplama ${yil} – Taksit, KKDF/BSMV ve Gerçek Maliyet`,
  description:
    'İhtiyaç, taşıt, konut ve ticari kredide aylık taksit, KKDF, BSMV, masraflar ve yıllık maliyet oranı. BDDK vade sınırları otomatik, teklif karşılaştırma var.',
  cardText: 'Taksit, vergi, masraf ve yıllık maliyet oranı; teklifleri yan yana koyun.',
  category: 'kredi-borc',
  icon: '🏦',
  keywords: [
    'kredi taksit hesaplama',
    'ihtiyaç kredisi',
    'taşıt kredisi',
    'konut kredisi',
    'ticari kredi',
    'kkdf bsmv',
    'yıllık maliyet oranı',
    'ödeme planı',
    'kredi karşılaştırma',
    'ne kadar kredi çekebilirim',
  ],
  maintenance: 'yearly',
  paramSets: [krediVergileri, krediSinirlari, krediUcretleri],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['taksit-mi-pesin-mi', 'kredi-karti-asgari-odeme'],
  featured: true,
};
