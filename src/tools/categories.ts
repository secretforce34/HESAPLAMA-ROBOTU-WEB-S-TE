export const CATEGORIES = [
  {
    id: 'maas-calisma',
    name: 'Maaş & Çalışma',
    icon: '💼',
    description: 'Brüt-net maaş, tazminat, fazla mesai, izin ve çalışan hakları hesapları.',
  },
  {
    id: 'kredi-borc',
    name: 'Kredi & Borç',
    icon: '🏦',
    description: 'Kredi taksiti, gerçek maliyet, kredi kartı borcu ve taksit-peşin karşılaştırmaları.',
  },
  {
    id: 'ev-kira',
    name: 'Ev & Kira',
    icon: '🏠',
    description: 'Yasal kira artışı, ev alım masrafları ve aidat paylaşımı.',
  },
  {
    id: 'birikim-enflasyon',
    name: 'Birikim & Enflasyon',
    icon: '📈',
    description: 'Enflasyon, alım gücü, mevduat getirisi ve geçmişe dönük yatırım karşılaştırmaları.',
  },
  {
    id: 'borsa',
    name: 'Borsa',
    icon: '📊',
    description: 'Halka arz lot dağılımı, sermaye artırımı ve hisse maliyet hesapları.',
  },
  {
    id: 'altin',
    name: 'Altın & Gelenek',
    icon: '🪙',
    description: 'Düğün altını, işçilik, altın günü ve zekât hesapları.',
  },
  {
    id: 'vergi-isletme',
    name: 'Vergi & İşletme',
    icon: '🧾',
    description: 'KDV, serbest meslek makbuzu, vade, iskonto ve fiyatlama hesapları.',
  },
] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategoryId = Category['id'];

export function getCategory(id: CategoryId): Category {
  const cat = CATEGORIES.find((c) => c.id === id);
  if (!cat) throw new Error(`Bilinmeyen kategori: ${id}`);
  return cat;
}
