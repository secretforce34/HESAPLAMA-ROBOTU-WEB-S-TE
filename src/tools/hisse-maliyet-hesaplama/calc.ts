import { roundTo } from '../../lib/finance';

// Ağırlıklı ortalama maliyet yöntemi: alışlar maliyete eklenir; satışta satılan lotlar o anki ortalama
// maliyetle düşülür; bedelsiz/bölünmede lot artar, toplam maliyet değişmez.

export type IslemTuru = 'alis' | 'satis' | 'bedelsiz';

export interface Islem {
  tur: IslemTuru;
  /** Alış/satışta lot; bedelsizde kullanılmaz */
  lot: number;
  /** Alış/satışta birim fiyat; bedelsizde kullanılmaz */
  fiyat: number;
  /** Bedelsiz/bölünme oranı (%) — yalnızca tur = 'bedelsiz' */
  oran?: number;
}

export interface AdimSonucu {
  lot: number;
  ortalama: number;
  toplamMaliyet: number;
  /** Bu adımda gerçekleşen kâr/zarar (yalnızca satışta) */
  kz: number;
}

export interface MaliyetSonucu {
  adimlar: AdimSonucu[];
  lot: number;
  toplamMaliyet: number;
  ortalama: number;
  gerceklesenKz: number;
  toplamAlis: number;
  toplamSatis: number;
  toplamKomisyon: number;
  /** Elde olandan fazla satış gibi hata varsa: satır numarası (1'den) ve mesaj */
  hata: { satir: number; mesaj: string } | null;
}

/** komisyonYuzde: işlem tutarı üzerinden toplam komisyon oranı (%), ör. binde 2 için 0,2 */
export function hesaplaMaliyet(islemler: Islem[], komisyonYuzde: number): MaliyetSonucu {
  const k = komisyonYuzde / 100;
  let lot = 0;
  let maliyet = 0;
  let gerceklesen = 0;
  let toplamAlis = 0;
  let toplamSatis = 0;
  let toplamKomisyon = 0;
  const adimlar: AdimSonucu[] = [];
  let hata: MaliyetSonucu['hata'] = null;

  islemler.forEach((is, i) => {
    let kz = 0;
    if (hata) return;
    if (is.tur === 'alis') {
      const tutar = is.lot * is.fiyat;
      const kom = tutar * k;
      maliyet += tutar + kom;
      lot += is.lot;
      toplamAlis += tutar;
      toplamKomisyon += kom;
    } else if (is.tur === 'satis') {
      if (is.lot > lot + 1e-9) {
        hata = { satir: i + 1, mesaj: `${i + 1}. satırda elinizdekinden (${roundTo(lot, 4)} lot) fazla satış var.` };
        return;
      }
      const ortalama = lot > 0 ? maliyet / lot : 0;
      const tutar = is.lot * is.fiyat;
      const kom = tutar * k;
      const satilanMaliyet = is.lot * ortalama;
      kz = tutar - kom - satilanMaliyet;
      gerceklesen += kz;
      maliyet -= satilanMaliyet;
      lot -= is.lot;
      toplamSatis += tutar;
      toplamKomisyon += kom;
      if (lot < 1e-9) {
        lot = 0;
        maliyet = 0;
      }
    } else {
      // Bedelsiz / bölünme: lot (1 + oran) katına çıkar, maliyet aynı kalır.
      lot *= 1 + (is.oran ?? 0) / 100;
    }
    adimlar.push({ lot, ortalama: lot > 0 ? maliyet / lot : 0, toplamMaliyet: maliyet, kz });
  });

  return {
    adimlar,
    lot,
    toplamMaliyet: roundTo(maliyet, 2),
    ortalama: lot > 0 ? maliyet / lot : 0,
    gerceklesenKz: roundTo(gerceklesen, 2),
    toplamAlis: roundTo(toplamAlis, 2),
    toplamSatis: roundTo(toplamSatis, 2),
    toplamKomisyon: roundTo(toplamKomisyon, 2),
    hata,
  };
}

/** Güncel fiyata göre durum. Satış komisyonu düşülerek net değer bulunur. */
export function guncelDurum(s: MaliyetSonucu, guncelFiyat: number, komisyonYuzde: number) {
  const k = komisyonYuzde / 100;
  const piyasaDegeri = s.lot * guncelFiyat;
  const netSatisDegeri = piyasaDegeri * (1 - k);
  const kz = netSatisDegeri - s.toplamMaliyet;
  return {
    piyasaDegeri: roundTo(piyasaDegeri, 2),
    netSatisDegeri: roundTo(netSatisDegeri, 2),
    gerceklesmemisKz: roundTo(kz, 2),
    yuzde: s.toplamMaliyet > 0 ? (kz / s.toplamMaliyet) * 100 : 0,
    /** Satış komisyonu dahil zarar etmeden satılabilecek en düşük fiyat */
    basabas: s.lot > 0 ? s.ortalama / (1 - k) : 0,
  };
}

/**
 * Ortalamayı `hedef` fiyata indirmek için `alisFiyati`ndan kaç lot alınmalı?
 * (maliyet + x·p·(1+k)) / (lot + x) = hedef  →  x = (maliyet − hedef·lot) / (hedef − p·(1+k))
 * Mümkün değilse null (hedef, alış fiyatına komisyon eklenmiş halinden düşük ya da eşitse).
 */
export function hedefIcinLot(s: MaliyetSonucu, hedef: number, alisFiyati: number, komisyonYuzde: number): number | null {
  const birimMaliyet = alisFiyati * (1 + komisyonYuzde / 100);
  if (s.lot <= 0) return null;
  if (hedef >= s.ortalama) return 0;
  if (hedef <= birimMaliyet) return null;
  return Math.ceil((s.toplamMaliyet - hedef * s.lot) / (hedef - birimMaliyet) - 1e-9);
}

/** `lot` kadar `fiyat`tan alınırsa yeni ortalama. */
export function ekAlimSonrasi(s: MaliyetSonucu, lot: number, fiyat: number, komisyonYuzde: number) {
  const maliyet = s.toplamMaliyet + lot * fiyat * (1 + komisyonYuzde / 100);
  const yeniLot = s.lot + lot;
  return { yeniLot, yeniOrtalama: yeniLot > 0 ? maliyet / yeniLot : 0, ekTutar: roundTo(lot * fiyat * (1 + komisyonYuzde / 100), 2) };
}

export function validateIslem(is: { tur: IslemTuru; lot: number | null; fiyat: number | null; oran: number | null }) {
  const e: { lot?: string; fiyat?: string; oran?: string } = {};
  if (is.tur === 'bedelsiz') {
    if (is.oran === null || is.oran <= 0) e.oran = 'Bedelsiz/bölünme oranını girin.';
    return e;
  }
  if (is.lot === null || is.lot <= 0) e.lot = 'Lot girin.';
  if (is.fiyat === null || is.fiyat <= 0) e.fiyat = 'Fiyat girin.';
  return e;
}
