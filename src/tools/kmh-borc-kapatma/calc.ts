// KMH borç kapatma planı, kart + KMH planıyla aynı hesap motorunu kullanır; borç türü yalnızca KMH'dir.
import { krediKartiFaizleri } from '../../data/params/kredi';
import { round2 } from '../../lib/finance';

export { asgariOdeme, borcFaizi, krediyleKapat, planla, validateBorclar } from '../borc-kapatma-plani/calc';
export type { Borc, PlanSonucu, Strateji } from '../borc-kapatma-plani/calc';

/**
 * Yalnızca faiz ödenirse her ay ödenen tutar: bakiye × aylık faiz × (1 + KKDF + BSMV).
 * Bu kadar ödenirse borç ne büyür ne küçülür.
 */
export function kmhAylikFaizYuku(bakiye: number, aylikFaiz: number): number {
  const v = krediKartiFaizleri.values.vergiler;
  return round2(((bakiye * aylikFaiz) / 100) * (1 + (v.kkdf + v.bsmv) / 100));
}
