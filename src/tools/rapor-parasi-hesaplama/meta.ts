import { geciciIsGoremezlik } from '../../data/params/gecici-is-goremezlik';
import { sgkSinirlar } from '../../data/params/sgk-sinirlar';
import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'rapor-parasi-hesaplama',
  title: 'Rapor Parası Hesaplama',
  question: 'İstirahat raporunda ya da doğum izninde SGK’dan ne kadar ödenek alırım?',
  seoTitle: 'Rapor Parası Hesaplama – Geçici İş Göremezlik ve Doğum İzni',
  description:
    'Hastalık, iş kazası ve doğum izni (analık) için SGK’nın ödeyeceği geçici iş göremezlik ödeneğini güncel 12 aylık kazanç kuralıyla hesaplayın.',
  cardText: 'Hastalık, iş kazası ve doğum izni ödeneği.',
  category: 'maas-calisma',
  icon: '🩺',
  keywords: ['rapor parası', 'istirahat parası', 'geçici iş göremezlik', 'doğum izni parası', 'analık ödeneği', 'sgk rapor', 'iş kazası'],
  maintenance: 'yearly',
  paramSets: [geciciIsGoremezlik, sgkSinirlar],
  sources: [],
  lastReviewed: '2026-10-29',
  related: ['issizlik-maasi-hesaplama', 'brut-net-maas-hesaplama', 'yillik-izin-hesaplama'],
};
