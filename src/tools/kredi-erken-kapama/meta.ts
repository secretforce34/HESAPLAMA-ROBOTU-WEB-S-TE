import { krediUcretleri, krediVergileri } from '../../data/params/kredi';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'kredi-erken-kapama',
  title: 'Kredi Erken Kapatma Tutarı',
  question: 'Kredimi şimdi kapatırsam ne kadar öderim, ne kadar faiz kurtarırım? Ara ödeme yapsam taksitim ne olur?',
  seoTitle: 'Kredi Erken Kapama Hesaplama – Tazminat ve Faiz Tasarrufu',
  description:
    'Kredinizi erken kapatma tutarını, erken ödeme tazminatını ve faiz tasarrufunu hesaplayın; ara ödemede yeni taksiti ya da kısalan vadeyi görün.',
  cardText: 'Kapama tutarı, tazminat, tasarruf ve ara ödeme.',
  category: 'kredi-borc',
  icon: '✂️',
  keywords: ['kredi erken kapama', 'erken ödeme tazminatı', 'ara ödeme', 'kredi kapatma', 'konut kredisi erken kapama', 'kalan anapara', 'faiz indirimi'],
  maintenance: 'none',
  paramSets: [krediUcretleri, krediVergileri],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['kredi-hesaplama', 'taksit-mi-pesin-mi', 'kredi-karti-asgari-odeme'],
};
