import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'yillik-izin-hesaplama',
  title: 'Yıllık İzin Hesaplama',
  question: 'Kaç gün yıllık izin hakkım var, ne kadarı kaldı, bir sonraki iznim ne zaman doğar?',
  seoTitle: 'Yıllık İzin Hesaplama – Kaç Gün İzin Hakkım Var?',
  description:
    'İşe giriş ve doğum tarihinize göre İş Kanunu’na uygun yıllık izin hakkınızı, kalan izninizi ve kullanılmayan izin ücretini hesaplayın.',
  cardText: 'Kıdem ve yaşa göre izin hakkı, kalan gün ve izin ücreti.',
  category: 'maas-calisma',
  icon: '🏖️',
  keywords: ['yıllık izin', 'izin hakkı', 'kaç gün izin', 'ücretli izin', 'kullanılmayan izin ücreti', 'izin hesaplama', 'iş kanunu 53'],
  maintenance: 'none',
  paramSets: [],
  sources: [
    { label: '4857 sayılı İş Kanunu, md. 53–59 (yıllık ücretli izin)', url: 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5' },
  ],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['kidem-tazminati-hesaplama', 'fazla-mesai-hesaplama', 'brut-net-maas-hesaplama'],
};
