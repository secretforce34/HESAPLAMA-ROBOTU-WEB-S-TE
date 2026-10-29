import type { ToolMeta } from '../types';

export const meta: ToolMeta = {
  slug: 'halka-arz-lot-hesaplama',
  title: 'Halka Arz Lot Hesaplama',
  question: 'Halka arzdan kaç lot düşer? Katılımcı sayısına göre payınız ve iade edilecek tutar.',
  seoTitle: 'Halka Arz Kaç Lot Düşer? Lot Hesaplama (Eşit ve Oransal Dağıtım)',
  description:
    'Halka arzda kişi başı kaç lot düşeceğini SPK’nın eşit dağıtım kuralıyla hesaplayın: katılımcı senaryoları, küsurat payı, iade edilecek bloke tutar.',
  cardText: 'Eşit/oransal dağıtımla kişi başı lot ve iade tutarı.',
  category: 'borsa',
  icon: '🎯',
  keywords: ['halka arz', 'kaç lot düşer', 'eşit dağıtım', 'oransal dağıtım', 'lot hesaplama', 'katılımcı sayısı', 'bireysel yatırımcı', 'kap'],
  maintenance: 'none',
  paramSets: [],
  sources: [
    {
      label: 'SPK Sermaye Piyasası Araçlarının Satışı Tebliği (II-5.2), md. 18–22',
      url: 'https://www.mevzuat.gov.tr/File/GeneratePdf?mevzuatNo=18527&mevzuatTur=Teblig&mevzuatTertip=5',
    },
    {
      label: 'SPK 30.03.2023 tarihli ilke kararı: ilk halka arzlarda bireysel yatırımcılara eşit dağıtım (özet: Garanti BBVA Yatırım)',
      url: 'https://www.garantibbvayatirim.com.tr/duyurular/paylarin-ilk-halka-arzinda-uygulanacak-satis-yontemleri-ve-dagitim-esaslarina-iliskin-30032023-tarihli-ve-20412-sayili-spk-ilke-karari',
    },
  ],
  lastReviewed: '2026-10-29',
  featured: true,
  related: ['bedelli-bedelsiz-hesaplama', 'hisse-maliyet-hesaplama'],
};
