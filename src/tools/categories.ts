// Sol menüdeki başlıklar. Sıra ve her başlığın altındaki robotların sırası site sahibinin isteğidir:
// başlıklar bu dizideki sırayla, robotlar da `order` listesindeki sırayla gösterilir.
export const CATEGORIES = [
  {
    id: 'kredi-borc',
    name: 'Kredi & Borç',
    icon: '🏦',
    color: '#3b82f6',
    description: 'Kredi taksiti ve erken kapatma, kredi kartı asgari ödemesi, kart ve KMH borcu kapatma planları, taksit-peşin karşılaştırması.',
    order: [
      'kredi-hesaplama',
      'kredi-erken-kapama',
      'kredi-karti-asgari-odeme',
      'taksit-mi-pesin-mi',
      'kredi-karti-borc-kapatma',
      'kmh-borc-kapatma',
      'borc-kapatma-plani',
    ],
  },
  {
    id: 'arac-ulasim',
    name: 'Araç & Ulaşım',
    icon: '🚗',
    color: '#14b8a6',
    description: 'Yakıt ve kilometre başına araç maliyeti, motorlu taşıtlar vergisi (MTV), trafik cezası indirimi ve gecikme zammı.',
    order: ['arac-km-maliyeti-hesaplama', 'mtv-hesaplama', 'trafik-cezasi-hesaplama'],
  },
  {
    id: 'ev-kira',
    name: 'Ev & Kira',
    icon: '🏠',
    color: '#f97316',
    description: 'Yasal kira artışı, ev alım masrafları, kirada mı ev mi karşılaştırması ve aidat paylaşımı.',
    order: ['kira-artis-hesaplama', 'ev-alim-masrafi-hesaplama', 'kirada-mi-ev-mi', 'aidat-paylasim-hesaplama'],
  },
  {
    id: 'maas-calisma',
    name: 'Maaş & Çalışma',
    icon: '💼',
    color: '#8b5cf6',
    description: 'Brüt-net maaş, emeklilik, emekli ve memur zammı, kıdem tazminatı, rapor parası, işsizlik maaşı, izin ve fazla mesai.',
    order: [
      'brut-net-maas-hesaplama',
      'ne-zaman-emekli-olurum',
      'emekli-zammi-hesaplama',
      'kidem-tazminati-hesaplama',
      'rapor-parasi-hesaplama',
      'issizlik-maasi-hesaplama',
      'yillik-izin-hesaplama',
      'fazla-mesai-hesaplama',
    ],
  },
  {
    id: 'borsa',
    name: 'Borsa',
    icon: '📊',
    color: '#22c55e',
    description: 'Hisse maliyeti, halka arz lot dağılımı ve bedelli-bedelsiz sermaye artırımı hesapları.',
    order: ['hisse-maliyet-hesaplama', 'halka-arz-lot-hesaplama', 'bedelli-bedelsiz-hesaplama'],
  },
  {
    id: 'vergi-isletme',
    name: 'Vergi & İşletme & Veraset & Faiz',
    icon: '🧾',
    color: '#ec4899',
    description: 'Faiz getirisi, KDV, serbest meslek makbuzu, miras ve veraset vergisi, kur farkı, vade, iskonto ve fiyatlama hesapları.',
    order: [
      'faiz-getiri-hesaplama',
      'kdv-hesaplama',
      'serbest-meslek-makbuzu-hesaplama',
      'freelancer-saatlik-ucret-hesaplama',
      'miras-hesaplama',
      'kur-farki-hesaplama',
      'ortalama-vade-hesaplama',
      'zam-hesaplama',
      'senet-iskonto-hesaplama',
    ],
  },
  {
    id: 'birikim-enflasyon',
    name: 'Birikim & Enflasyon',
    icon: '📈',
    color: '#06b6d4',
    description: 'Enflasyon, kişisel enflasyon, finansal özgürlük, geçmişe dönük yatırım karşılaştırması ve BES.',
    order: [
      'enflasyon-hesaplama',
      'kisisel-enflasyon-hesaplama',
      'finansal-ozgurluk-hesaplama',
      'ya-o-gun-alsaydim',
      'bes-hesaplama',
    ],
  },
  {
    id: 'altin',
    name: 'Altın & Zekât & Düğün',
    icon: '🪙',
    color: '#f59e0b',
    description: 'Düğün altını, altın ayarı ve işçilik, altın günü ve zekât hesapları.',
    order: ['dugun-altini-hesaplama', 'altin-ayar-iscilik-hesaplama', 'altin-gunu-hesaplama', 'zekat-hesaplama'],
  },
  {
    id: 'pratik',
    name: 'Pratik Araçlar',
    icon: '🛠️',
    color: '#64748b',
    description: 'Bağlantı, Wi-Fi, kartvizit ve IBAN için QR kod oluşturucu gibi günlük işe yarayan araçlar.',
    order: ['qr-kod-olusturucu'],
  },
] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategoryId = Category['id'];

export function getCategory(id: CategoryId): Category {
  const cat = CATEGORIES.find((c) => c.id === id);
  if (!cat) throw new Error(`Bilinmeyen kategori: ${id}`);
  return cat;
}
