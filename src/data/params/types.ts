export interface Source {
  /** Görünen ad, ör. "4857 sayılı İş Kanunu, md. 41" */
  label: string;
  /** Resmî kaynağın adresi (mevzuat.gov.tr, resmigazete.gov.tr, sgk.gov.tr, gib.gov.tr ...) */
  url: string;
}

/**
 * Yasaya/karara bağlı oranların tek yerde tutulduğu set.
 * validTo geçince sitede kendiliğinden "oranlar güncellenmeyi bekliyor" uyarısı çıkar.
 */
export interface ParamSet<T> {
  id: string;
  /** Kullanıcıya görünen ad, ör. "2026 asgari ücret" */
  title: string;
  /** ISO tarih (YYYY-AA-GG): oranların yürürlüğe girdiği gün */
  validFrom: string;
  /** ISO tarih: bu tarihten sonra yeni oran beklenir. Süresiz (yasa değişene kadar) ise null. */
  validTo: string | null;
  /** ISO tarih: değerlerin resmî kaynaktan en son kontrol edildiği gün */
  lastReviewed: string;
  values: T;
  sources: Source[];
  note?: string;
}
