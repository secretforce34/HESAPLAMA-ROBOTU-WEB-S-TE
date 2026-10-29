// Halka arzda bireysel yatırımcı dağıtımı — SPK Sermaye Piyasası Araçlarının Satışı Tebliği (II-5.2).
// md. 20/2: eşit dağıtım; md. 20/3: oransal dağıtım; md. 22: mükerrer talepte yalnızca en yüksek talep sayılır.

/** Aynı miktarda lot talep eden katılımcı grubu (talep dağılımı varsayımı için). */
export interface TalepGrubu {
  /** Gruptaki katılımcı sayısı */
  kisi: number;
  /** Kişi başı talep edilen lot */
  talep: number;
}

export interface EsitDagitimSonucu {
  /** Talebi tamamen karşılanan katılımcıların aldığı lot (gruba göre) */
  gruplar: { kisi: number; talep: number; alinan: number; tamKarsilandi: boolean }[];
  /**
   * Talebi tamamen karşılanamayanlara düşen pay (küsuratlı). Herkes karşılandıysa null.
   * md. 20/2-ç: küsurat tama iblağ edilir; bir kısmı tabanı, bir kısmı tabanın 1 fazlasını alır.
   */
  esitPay: number | null;
  /** Karşılanamayanların alacağı en az lot (tam sayı) */
  taban: number | null;
  /** Küsuratlardan 1 lot fazla alacak katılımcı sayısı */
  fazlaAlanSayisi: number;
  /** Talebi tamamen karşılanamayan katılımcı sayısı */
  karsilanamayanSayisi: number;
  toplamTalep: number;
  toplamKisi: number;
  /** Dağıtılan toplam lot (≤ ayrılan) */
  dagitilan: number;
}

/**
 * md. 20/2 (a)–(b): toplam tutar talep eden sayısına bölünür; bu tutar ve altındaki talepler karşılanır;
 * kalan, talebi karşılanamayanlar arasında aynı şekilde dağıtılır ve bu, paylar bitene kadar sürer.
 */
export function esitDagitim(ayrilanLot: number, gruplar: TalepGrubu[]): EsitDagitimSonucu {
  const temiz = gruplar.filter((g) => g.kisi > 0 && g.talep > 0).map((g) => ({ ...g }));
  const toplamKisi = temiz.reduce((t, g) => t + g.kisi, 0);
  const toplamTalep = temiz.reduce((t, g) => t + g.kisi * g.talep, 0);

  // Talep arzdan azsa herkes talep ettiği kadar alır (md. 20/2 ilk cümle).
  if (toplamTalep <= ayrilanLot) {
    return {
      gruplar: temiz.map((g) => ({ ...g, alinan: g.talep, tamKarsilandi: true })),
      esitPay: null,
      taban: null,
      fazlaAlanSayisi: 0,
      karsilanamayanSayisi: 0,
      toplamTalep,
      toplamKisi,
      dagitilan: toplamTalep,
    };
  }

  const sirali = [...temiz].sort((a, b) => a.talep - b.talep);
  let kalan = ayrilanLot;
  let kalanKisi = toplamKisi;
  const karsilanan = new Set<TalepGrubu>();

  // Turlar: her turda eşit pay hesaplanır, payın altında talep edenler tamamen karşılanır.
  let degisti = true;
  while (degisti && kalanKisi > 0) {
    degisti = false;
    const pay = kalan / kalanKisi;
    for (const g of sirali) {
      if (karsilanan.has(g)) continue;
      if (g.talep <= pay) {
        karsilanan.add(g);
        kalan -= g.kisi * g.talep;
        kalanKisi -= g.kisi;
        degisti = true;
      }
    }
  }

  const esitPay = kalanKisi > 0 ? kalan / kalanKisi : null;
  const taban = esitPay === null ? null : Math.floor(esitPay + 1e-9);
  // Küsurat: tabanın üzerindeki toplam lot, karşılanamayanlar arasında birer birer dağıtılır.
  const fazlaAlanSayisi = esitPay === null || taban === null ? 0 : Math.round(kalan - taban * kalanKisi);

  return {
    gruplar: temiz.map((g) => ({
      ...g,
      alinan: karsilanan.has(g) ? g.talep : (taban ?? 0),
      tamKarsilandi: karsilanan.has(g),
    })),
    esitPay,
    taban,
    fazlaAlanSayisi,
    karsilanamayanSayisi: kalanKisi,
    toplamTalep,
    toplamKisi,
    dagitilan: ayrilanLot,
  };
}

export interface BenimSonucum {
  /** Kesin alınacak lot (en az) */
  enAz: number;
  /** Küsurat şansıyla alınabilecek en çok lot */
  enCok: number;
  /** Talebim tamamen karşılandı mı */
  tamKarsilandi: boolean;
}

/** Eşit dağıtımda belirli bir talep miktarına düşen lot. */
export function benimLotum(sonuc: EsitDagitimSonucu, talebim: number): BenimSonucum {
  if (sonuc.esitPay === null || sonuc.taban === null || talebim <= sonuc.esitPay + 1e-9) {
    return { enAz: talebim, enCok: talebim, tamKarsilandi: true };
  }
  const enCok = sonuc.fazlaAlanSayisi > 0 ? Math.min(talebim, sonuc.taban + 1) : sonuc.taban;
  return { enAz: sonuc.taban, enCok, tamKarsilandi: false };
}

/** md. 20/3: oransal dağıtım — ayrılan miktar / toplam talep oranında karşılanır. */
export function oransalDagitim(ayrilanLot: number, toplamTalepLot: number, talebim: number) {
  const oran = toplamTalepLot <= 0 ? 0 : Math.min(1, ayrilanLot / toplamTalepLot);
  const pay = talebim * oran;
  return { karsilamaOrani: oran, pay, enAz: Math.floor(pay + 1e-9), enCok: Math.ceil(pay - 1e-9) };
}

/**
 * Basit varsayım: katılımcıların bir kısmı küçük, kalanı yüksek miktar talep eder.
 * Kullanıcı ayrıntı girmezse "herkes eşit paydan fazla ister" kabul edilir.
 */
export function varsayilanGruplar(katilimci: number, talebim: number): TalepGrubu[] {
  const buyuk = Math.max(talebim, 1_000_000_000);
  return [{ kisi: Math.max(0, katilimci), talep: buyuk }];
}

export interface Senaryo {
  katilimci: number;
  enAz: number;
  enCok: number;
}

/** Farklı katılımcı sayıları için (herkes eşit paydan fazla isterse) kişi başı lot. */
export function senaryolar(ayrilanLot: number, katilimcilar: number[], talebim: number): Senaryo[] {
  return katilimcilar
    .filter((n) => n > 0)
    .map((n) => {
      const s = esitDagitim(ayrilanLot, [
        { kisi: n - 1, talep: Number.MAX_SAFE_INTEGER },
        { kisi: 1, talep: talebim },
      ]);
      const b = benimLotum(s, talebim);
      return { katilimci: n, enAz: b.enAz, enCok: b.enCok };
    });
}

export function validateHalkaArz(i: { lot: number | null; fiyat: number | null; katilimci: number | null; talep: number | null }) {
  const e: Record<string, string> = {};
  if (i.lot === null || i.lot <= 0) e.lot = 'Bireysel yatırımcılara ayrılan lot sayısını girin.';
  else if (!Number.isInteger(i.lot)) e.lot = 'Lot sayısı tam sayı olmalı.';
  if (i.fiyat === null || i.fiyat <= 0) e.fiyat = 'Halka arz fiyatını girin.';
  if (i.katilimci === null || i.katilimci < 1) e.katilimci = 'Tahmini katılımcı sayısını girin.';
  else if (!Number.isInteger(i.katilimci)) e.katilimci = 'Katılımcı sayısı tam sayı olmalı.';
  if (i.talep === null || i.talep < 1) e.talep = 'Talep ettiğiniz lotu girin.';
  else if (!Number.isInteger(i.talep)) e.talep = 'Lot tam sayı olmalı.';
  return e;
}
