// Kredi kartı borç kapatma planı, kart + KMH planıyla aynı hesap motorunu kullanır;
// bu robotta borç türleri yalnızca alışveriş ve nakit avanstır.
export { asgariOdeme, borcFaizi, krediyleKapat, planla, validateBorclar } from '../borc-kapatma-plani/calc';
export type { Borc, PlanSonucu, Strateji } from '../borc-kapatma-plani/calc';
