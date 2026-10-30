import { mtvTarifesi } from '../../data/params/mtv';
import type { ToolMeta } from '../types';

const yil = mtvTarifesi.values.yil;

export const meta: ToolMeta = {
  slug: 'mtv-hesaplama',
  title: 'MTV Hesaplama (Motorlu Taşıtlar Vergisi)',
  question: 'Aracımın bu yılki motorlu taşıtlar vergisi ne kadar, taksitler kaç lira?',
  seoTitle: `MTV Hesaplama ${yil} – Motorlu Taşıtlar Vergisi Ne Kadar?`,
  description: `Otomobil, elektrikli araç ve motosikletin ${yil} MTV tutarını motor hacmi veya gücü, model yılı ve taşıt değerine göre hesaplayın; Ocak ve Temmuz taksitlerini görün.`,
  cardText: 'Motor hacmi, yaş ve değere göre yıllık MTV ve taksitler.',
  category: 'arac-ulasim',
  icon: '🧾',
  keywords: ['mtv hesaplama', 'motorlu taşıtlar vergisi', `mtv ${yil}`, 'elektrikli araç mtv', 'motosiklet mtv', 'mtv ne kadar', 'mtv taksit'],
  maintenance: 'yearly',
  paramSets: [mtvTarifesi],
  sources: [],
  lastReviewed: '2026-10-31',
  featured: true,
  related: ['arac-km-maliyeti-hesaplama', 'kredi-hesaplama', 'enflasyon-hesaplama'],
};
