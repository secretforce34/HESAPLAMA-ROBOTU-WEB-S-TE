import type { ParamSet, Source } from '../data/params/types';
import type { CategoryId } from './categories';

export interface ToolMeta {
  /** Sayfa adresi: /<slug>/ — küçük harf, Türkçe karakter yok, ör. "kdv-hesaplama" */
  slug: string;
  /** H1 ve kart başlığı, ör. "KDV Hesaplama" */
  title: string;
  /** H1 altındaki soru cümlesi: kullanıcının aklındaki soru */
  question: string;
  /** <title> etiketi (marka adı otomatik eklenir) */
  seoTitle: string;
  /** Meta açıklama, en fazla ~155 karakter */
  description: string;
  /** Kartlarda görünen kısa açıklama (bir cümle) */
  cardText: string;
  category: CategoryId;
  /** Tek bir emoji */
  icon: string;
  /** Arama kutusu için eş anlamlılar, ör. ["katma değer vergisi", "tevkifat"] */
  keywords: string[];
  /**
   * none: oranlardan bağımsız saf matematik
   * yearly: yasal oranlar yılda 1-2 kez güncellenir
   * monthly: aylık veri (TÜFE, kur) kullanır
   */
  maintenance: 'none' | 'yearly' | 'monthly';
  /** Hesapta kullanılan oran setleri (bayatlık uyarısı ve kaynak listesi için) */
  paramSets: ParamSet<unknown>[];
  /** Oran setleri dışındaki kaynaklar (kanun maddeleri vb.) */
  sources: Source[];
  /** İçeriğin ve hesap mantığının en son kontrol edildiği gün (ISO) */
  lastReviewed: string;
  /** Ana sayfada "öne çıkanlar"da gösterilsin mi */
  featured?: boolean;
  /** İlgili araçların slug'ları */
  related?: string[];
}

export interface FaqItem {
  q: string;
  /** Basit HTML kullanılabilir (<strong>, <a>, <br>) */
  a: string;
}
