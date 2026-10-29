import {
  genelAzamiVade,
  konutKdo,
  krediSinirlari,
  krediUcretleri,
  tasitDilimi,
  type EnerjiSinifi,
  type KrediTuru,
} from '../../data/params/kredi';
import { annualFromMonthly, irr, round2 } from '../../lib/finance';
import { formatNumber, formatTL } from '../../lib/format';

// ---------------------------------------------------------------------------
// Faiz oranı girişi
// ---------------------------------------------------------------------------

export type FaizGirisi = 'aylik' | 'yillik';

/**
 * Bankalar sözleşmede yıllık akdi faizi "aylık oran × 12" olarak yazar (ör. aylık %2,49 → yıllık %29,88).
 * Yıllık girilen oran bu kurala göre aylığa çevrilir.
 */
export function aylikFaizOrani(oran: number, giris: FaizGirisi): number {
  return giris === 'yillik' ? oran / 12 : oran;
}

// ---------------------------------------------------------------------------
// Ödeme planı (eşit taksitli, KKDF ve BSMV dahil)
// ---------------------------------------------------------------------------

export interface AraOdeme {
  /** Kaçıncı taksitle birlikte ödenecek (1 = ilk taksit) */
  ay: number;
  tutar: number;
}

export interface PlanInput {
  anapara: number;
  /** Taksit sayısı (ödemesiz dönem hariç) */
  vade: number;
  /** Aylık akdi faiz (%) */
  aylikFaiz: number;
  /** Faiz üzerinden KKDF (%) */
  kkdf: number;
  /** Faiz üzerinden BSMV (%) */
  bsmv: number;
  /** İlk taksitten önceki ödemesiz ay sayısı */
  odemesizAy?: number;
  /** Plana önceden yazılan ara (balon) ödemeler */
  araOdemeler?: AraOdeme[];
}

export interface PlanSatiri {
  /** Ay sırası: 1 = kredinin ilk ayı */
  no: number;
  /** Taksit sırası; ödemesiz aylarda null */
  taksitNo: number | null;
  /** Bu ay yapılan toplam ödeme (taksit + varsa ara ödeme) */
  odeme: number;
  araOdeme: number;
  /** Anaparadan düşen tutar (ödemesiz ayda negatif: borca eklenen) */
  anapara: number;
  faiz: number;
  kkdf: number;
  bsmv: number;
  /** Ay sonundaki kalan anapara */
  kalan: number;
}

export interface PlanSonucu {
  satirlar: PlanSatiri[];
  /** Düzenli aylık taksit (son taksit kuruş farkıyla değişebilir) */
  taksit: number;
  sonTaksit: number;
  toplamOdeme: number;
  toplamFaiz: number;
  toplamKkdf: number;
  toplamBsmv: number;
  /** Ödemesiz dönemde borca eklenen faiz + vergi */
  odemesizdeEklenen: number;
  /** Vergiler dahil aylık efektif oran (kesir): faiz × (1 + KKDF + BSMV) */
  vergiDahilAylikOran: number;
}

/**
 * Bankaların yöntemi: taksit, vergiler dahil oranla [r × (1 + KKDF + BSMV)] annüite olarak bulunur.
 * Her ay: faiz = kalan anapara × r; KKDF ve BSMV faiz tutarı üzerinden; anapara = taksit − faiz − KKDF − BSMV.
 * Yuvarlama: taksit ve her kalem kuruşa yuvarlanır; son taksit kalan anaparayı tam kapatacak şekilde düzeltilir.
 * Ödemesiz dönemde işleyen faiz ve vergisi ödenmez, borca eklenir (bankaların yöntemi farklı olabilir).
 */
export function odemePlani(input: PlanInput): PlanSonucu {
  const r = input.aylikFaiz / 100;
  const k = input.kkdf / 100;
  const b = input.bsmv / 100;
  const re = r * (1 + k + b);
  const n = input.vade;
  const g = input.odemesizAy ?? 0;

  const satirlar: PlanSatiri[] = [];
  let kalan = round2(input.anapara);
  let odemesizdeEklenen = 0;

  for (let i = 1; i <= g; i++) {
    const faiz = round2(kalan * r);
    const kkdf = round2(faiz * k);
    const bsmv = round2(faiz * b);
    const ek = round2(faiz + kkdf + bsmv);
    kalan = round2(kalan + ek);
    odemesizdeEklenen = round2(odemesizdeEklenen + ek);
    satirlar.push({ no: i, taksitNo: null, odeme: 0, araOdeme: 0, anapara: -ek, faiz, kkdf, bsmv, kalan });
  }

  const ara = new Map<number, number>();
  for (const a of input.araOdemeler ?? []) ara.set(a.ay, round2((ara.get(a.ay) ?? 0) + a.tutar));

  // Ara ödemelerin bugünkü değeri düşülür; kalan kısım eşit taksitlere bölünür.
  let pvAra = 0;
  for (const [ay, tutar] of ara) pvAra += tutar / Math.pow(1 + re, ay);
  const taban = kalan - pvAra;
  const taksit = round2(re === 0 ? taban / n : (taban * re) / (1 - Math.pow(1 + re, -n)));

  for (let j = 1; j <= n; j++) {
    const faiz = round2(kalan * r);
    const kkdf = round2(faiz * k);
    const bsmv = round2(faiz * b);
    const araOdeme = ara.get(j) ?? 0;
    let anapara: number;
    let odeme: number;
    if (j === n) {
      anapara = kalan;
      odeme = round2(anapara + faiz + kkdf + bsmv);
    } else {
      odeme = round2(taksit + araOdeme);
      anapara = round2(odeme - faiz - kkdf - bsmv);
      if (anapara > kalan) {
        anapara = kalan;
        odeme = round2(anapara + faiz + kkdf + bsmv);
      }
    }
    kalan = round2(kalan - anapara);
    satirlar.push({ no: g + j, taksitNo: j, odeme, araOdeme, anapara, faiz, kkdf, bsmv, kalan });
  }

  const topla = (f: (s: PlanSatiri) => number) => round2(satirlar.reduce((t, s) => t + f(s), 0));
  const son = satirlar[satirlar.length - 1];
  return {
    satirlar,
    taksit,
    sonTaksit: round2(son.odeme - son.araOdeme),
    toplamOdeme: topla((s) => s.odeme),
    toplamFaiz: topla((s) => s.faiz),
    toplamKkdf: topla((s) => s.kkdf),
    toplamBsmv: topla((s) => s.bsmv),
    odemesizdeEklenen,
    vergiDahilAylikOran: re,
  };
}

// ---------------------------------------------------------------------------
// Masraflar ve yıllık maliyet oranı
// ---------------------------------------------------------------------------

export type MasrafTuru = 'tahsis' | 'sigorta' | 'ekspertiz' | 'ipotek' | 'noter' | 'diger';
export type MasrafZamani = 'pesin' | 'aylik' | 'yillik';

export interface Masraf {
  tur: MasrafTuru;
  tutar: number;
  zaman: MasrafZamani;
}

export interface MasrafAkisi {
  /** Ay ay ödenen masraf (indeks 0 = kredi açılışı) */
  aylar: number[];
  /** Yıllık maliyet oranına giren kısım (noter masrafı hariç) */
  ymoAylar: number[];
  toplam: number;
  /** Yıllık maliyet oranına dahil edilmeyen masraf (noter) */
  ymoDisi: number;
}

/** Masrafları aylara dağıtır: peşin → açılışta; aylık → her ay; yıllık → açılışta ve her 12 ayda bir. */
export function masrafAkisi(masraflar: Masraf[], toplamAy: number): MasrafAkisi {
  const aylar = new Array<number>(toplamAy + 1).fill(0);
  const ymoAylar = new Array<number>(toplamAy + 1).fill(0);
  let ymoDisi = 0;
  for (const m of masraflar) {
    if (!(m.tutar > 0)) continue;
    const ekle = (i: number) => {
      aylar[i] += m.tutar;
      // Tüketici Kredisi Sözleşmeleri Yönetmeliği md. 4/1-i: noter masrafları toplam maliyete dahil edilmez.
      if (m.tur === 'noter') ymoDisi += m.tutar;
      else ymoAylar[i] += m.tutar;
    };
    if (m.zaman === 'pesin') ekle(0);
    else if (m.zaman === 'aylik') for (let i = 1; i <= toplamAy; i++) ekle(i);
    else for (let i = 0; i < toplamAy; i += 12) ekle(i);
  }
  const toplam = round2(aylar.reduce((t, x) => t + x, 0));
  return { aylar: aylar.map(round2), ymoAylar: ymoAylar.map(round2), toplam, ymoDisi: round2(ymoDisi) };
}

/**
 * Yıllık maliyet oranı (yönetmelikteki adıyla efektif yıllık faiz oranı): krediyle eline geçen net tutarı,
 * ödediğiniz tüm taksit, vergi ve masraflara eşitleyen aylık iç verim oranı bulunur ve yıl 12 eşit ay
 * kabul edilerek bileşik yıllığa çevrilir (Tüketici Kredisi Sözleşmeleri Yönetmeliği md. 14 ve Ek-1).
 */
export function yillikMaliyetOrani(anapara: number, plan: PlanSonucu, masraf: MasrafAkisi): { aylik: number | null; yillik: number | null } {
  const flows = [anapara - (masraf.ymoAylar[0] ?? 0)];
  plan.satirlar.forEach((s, i) => flows.push(-(s.odeme + (masraf.ymoAylar[i + 1] ?? 0))));
  if (flows[0] <= 0) return { aylik: null, yillik: null };
  const aylik = irr(flows);
  return { aylik, yillik: aylik === null ? null : annualFromMonthly(aylik) };
}

export interface KrediInput extends PlanInput {
  masraflar: Masraf[];
}

export interface KrediSonucu {
  plan: PlanSonucu;
  masraf: MasrafAkisi;
  /** Faiz + KKDF + BSMV + masraflar */
  toplamMaliyet: number;
  /** Taksitler + ara ödemeler + masraflar */
  masrafDahilToplamOdeme: number;
  ymoAylik: number | null;
  ymoYillik: number | null;
  /** Sözleşmedeki yıllık akdi faiz (aylık × 12), yüzde */
  yillikNominal: number;
  /** Aylık faizin bileşik yıllık karşılığı (vergisiz), yüzde */
  yillikBilesik: number;
}

export function hesaplaKredi(input: KrediInput): KrediSonucu {
  const plan = odemePlani(input);
  const masraf = masrafAkisi(input.masraflar, plan.satirlar.length);
  const { aylik, yillik } = yillikMaliyetOrani(input.anapara, plan, masraf);
  return {
    plan,
    masraf,
    toplamMaliyet: round2(plan.toplamFaiz + plan.toplamKkdf + plan.toplamBsmv + masraf.toplam),
    masrafDahilToplamOdeme: round2(plan.toplamOdeme + masraf.toplam),
    ymoAylik: aylik,
    ymoYillik: yillik,
    yillikNominal: input.aylikFaiz * 12,
    yillikBilesik: annualFromMonthly(input.aylikFaiz / 100) * 100,
  };
}

// ---------------------------------------------------------------------------
// BDDK sınırları (vade, kredi/değer oranı) — otomatik uygulanır
// ---------------------------------------------------------------------------

export interface SinirGirdi {
  tur: KrediTuru;
  tutar: number;
  vade: number;
  /** Taşıt değeri (sıfırda fatura, ikinci elde kasko), konut değeri (ekspertiz) ya da telefon fiyatı */
  deger?: number | null;
  yerliElektrikli?: boolean;
  enerjiSinifi?: EnerjiSinifi;
  baskaKonut?: boolean;
  yenilenmisTelefon?: boolean;
}

export interface SinirSonucu {
  /** Sınırlar uygulandıktan sonraki tutar ve vade */
  tutar: number;
  vade: number;
  azamiTutar: number | null;
  azamiVade: number | null;
  /** Uygulanan kredi/değer oranı (%) */
  kdo: number | null;
  tutarKisildi: boolean;
  vadeKisildi: boolean;
  /** Bu değerdeki taşıta kredi kullandırılamaz */
  krediYok: boolean;
  /** Sonuçta gösterilecek "neden" açıklamaları */
  aciklamalar: string[];
}

const ENERJI_ADI: Record<EnerjiSinifi, string> = { ab: 'A–B', c: 'C', diger: 'D ve altı / belgesiz' };

/** Tüketici kredisine ilişkin BDDK sınırlarını uygular; ticari kredide sınır yoktur. */
export function yasalSinirUygula(g: SinirGirdi): SinirSonucu {
  let tutar = g.tutar;
  let vade = g.vade;
  let azamiTutar: number | null = null;
  let azamiVade: number | null = null;
  let kdo: number | null = null;
  let krediYok = false;
  const aciklamalar: string[] = [];
  const deger = g.deger && g.deger > 0 ? g.deger : null;

  const tutarSiniri = (ust: number, neden: string) => {
    azamiTutar = round2(ust);
    if (tutar > azamiTutar) {
      aciklamalar.push(`Kredi tutarı ${formatTL(g.tutar)} yerine ${formatTL(azamiTutar)} alındı: ${neden}`);
      tutar = azamiTutar;
    }
  };
  const vadeSiniri = (ust: number, neden: string) => {
    azamiVade = ust;
    if (vade > ust) {
      aciklamalar.push(`Vade ${g.vade} yerine ${ust} ay alındı: ${neden}`);
      vade = ust;
    }
  };

  if (g.tur === 'tasit') {
    if (deger !== null) {
      const d = tasitDilimi(deger, g.yerliElektrikli);
      kdo = d.kdo;
      if (d.vade === 0) {
        krediYok = true;
        azamiTutar = 0;
        azamiVade = 0;
        aciklamalar.push(
          `Değeri ${formatTL(deger, 0)} olan ${g.yerliElektrikli ? 'yerli elektrikli ' : ''}binek araç için taşıt kredisi kullandırılamaz (BDDK ${g.yerliElektrikli ? '06.03.2025/11158' : '21.02.2022/10099'}).`,
        );
      } else {
        const karar = g.yerliElektrikli ? 'BDDK 06.03.2025/11158' : 'BDDK 21.02.2022/10099';
        tutarSiniri((deger * d.kdo) / 100, `${formatTL(deger, 0)} değerindeki araçta kredi/değer oranı en fazla %${d.kdo} olabilir (${karar}).`);
        vadeSiniri(d.vade, `bu değerdeki araçta azami vade ${d.vade} ay (${karar}).`);
      }
    }
  } else if (g.tur === 'konut' || g.tur === 'konut-teminatli') {
    if (deger !== null) {
      const sinif = g.enerjiSinifi ?? 'diger';
      kdo = konutKdo(deger, sinif, g.baskaKonut);
      const ek = g.baskaKonut ? `; sizin, eşinizin veya 18 yaş altı çocuğunuzun konutu olduğu için oran %${krediSinirlari.values.konutSahibiIndirimi} azaltıldı (BDDK 24.08.2023/10656)` : '';
      tutarSiniri(
        (deger * kdo) / 100,
        `${formatTL(deger, 0)} değerindeki, enerji sınıfı ${ENERJI_ADI[sinif]} konutta kredi/değer oranı en fazla %${formatNumber(kdo, 2)} olabilir (BDDK 29.01.2026/11364)${ek}.`,
      );
    }
    if (g.tur === 'konut-teminatli') {
      vadeSiniri(genelAzamiVade(tutar), `${formatTL(tutar, 0)} tutarındaki tüketici kredisinde azami vade ${genelAzamiVade(tutar)} ay (BDDK 13.02.2025/11152).`);
    }
  } else if (g.tur === 'telefon') {
    const fiyat = deger ?? tutar;
    const t = krediSinirlari.values.telefon;
    const sinir = g.yenilenmisTelefon ? t.yenilenmisSinir : t.sinir;
    const ust = fiyat <= sinir ? t.altVade : t.ustVade;
    vadeSiniri(
      ust,
      `fiyatı ${formatTL(sinir, 0)} ${fiyat <= sinir ? 've altında' : 'üzerinde'} olan ${g.yenilenmisTelefon ? 'yenilenmiş ' : ''}cep telefonunda azami vade ${ust} ay (BDDK 01.10.2026/11582).`,
    );
  } else if (g.tur === 'ihtiyac') {
    vadeSiniri(genelAzamiVade(tutar), `${formatTL(tutar, 0)} tutarındaki tüketici kredisinde azami vade ${genelAzamiVade(tutar)} ay (BDDK 13.02.2025/11152).`);
  }

  return {
    tutar,
    vade,
    azamiTutar,
    azamiVade,
    kdo,
    tutarKisildi: tutar < g.tutar,
    vadeKisildi: vade < g.vade,
    krediYok,
    aciklamalar,
  };
}

// ---------------------------------------------------------------------------
// Ters hesap: bu taksitle ne kadar kredi çekilebilir?
// ---------------------------------------------------------------------------

export interface TersInput {
  taksit: number;
  vade: number;
  aylikFaiz: number;
  kkdf: number;
  bsmv: number;
  sinir: Omit<SinirGirdi, 'tutar' | 'vade'> | null;
}

export interface TersSonuc {
  /** Sınırlar dahil çekilebilecek azami kredi */
  tutar: number;
  /** Bu tutar için kullanılan vade */
  vade: number;
  /** Sınır olmasaydı aynı taksit ve vadeyle çekilebilecek tutar */
  sinirsizTutar: number;
  /** Hangi sınırın belirleyici olduğu (yoksa null) */
  neden: string | null;
  /** Tüketici kredisi vade dilimlerine göre seçenekler (yalnızca ihtiyaç / konut teminatlı) */
  secenekler?: { vade: number; tutar: number; tutarSiniri: number | null }[];
}

/** Vergiler dahil oranla n ay için annüite çarpanı: taksit × çarpan = anapara. */
function annuiteCarpani(re: number, n: number): number {
  if (n <= 0) return 0;
  return re === 0 ? n : (1 - Math.pow(1 + re, -n)) / re;
}

const asagiKurus = (x: number) => Math.floor(x * 100 + 1e-7) / 100;

export function tersHesap(input: TersInput): TersSonuc {
  const re = (input.aylikFaiz / 100) * (1 + input.kkdf / 100 + input.bsmv / 100);
  const taban = (n: number) => asagiKurus(input.taksit * annuiteCarpani(re, n));
  const sinirsizTutar = taban(input.vade);
  const s = input.sinir;
  if (!s || s.tur === 'ticari') return { tutar: sinirsizTutar, vade: input.vade, sinirsizTutar, neden: null };

  const deger = s.deger && s.deger > 0 ? s.deger : null;

  if (s.tur === 'ihtiyac' || s.tur === 'konut-teminatli') {
    // Her vade dilimi için: o dilimin vadesiyle çekilebilecek tutar, dilimin üst sınırıyla kırpılır; en büyüğü seçilir.
    let enIyi = { tutar: 0, vade: 0 };
    const secenekler: { vade: number; tutar: number; tutarSiniri: number | null }[] = [];
    for (const d of krediSinirlari.values.genelVade) {
      const n = Math.min(input.vade, d.vade);
      let p = taban(n);
      if (d.ust !== null) p = Math.min(p, d.ust);
      if (!secenekler.some((x) => x.vade === n)) secenekler.push({ vade: n, tutar: p, tutarSiniri: d.ust });
      if (p > enIyi.tutar) enIyi = { tutar: p, vade: n };
    }
    let neden: string | null = null;
    if (enIyi.tutar < sinirsizTutar || enIyi.vade < input.vade) {
      neden = `Tüketici kredisi vade sınırı: ${formatTL(enIyi.tutar, 0)} için en fazla ${genelAzamiVade(enIyi.tutar)} ay vade verilebilir (BDDK 13.02.2025/11152).`;
    }
    if (s.tur === 'konut-teminatli' && deger !== null) {
      const ust = asagiKurus((deger * konutKdo(deger, s.enerjiSinifi ?? 'diger', s.baskaKonut)) / 100);
      if (ust < enIyi.tutar) {
        enIyi = { tutar: ust, vade: Math.min(input.vade, genelAzamiVade(ust)) };
        neden = 'Konut değerine göre kredi/değer sınırı (BDDK 29.01.2026/11364).';
      }
    }
    return { tutar: enIyi.tutar, vade: enIyi.vade, sinirsizTutar, neden, secenekler };
  }

  if (s.tur === 'tasit') {
    if (deger === null) return { tutar: sinirsizTutar, vade: input.vade, sinirsizTutar, neden: null };
    const d = tasitDilimi(deger, s.yerliElektrikli);
    if (d.vade === 0) return { tutar: 0, vade: 0, sinirsizTutar, neden: 'Bu değerdeki araca taşıt kredisi kullandırılamaz.' };
    const n = Math.min(input.vade, d.vade);
    const p = taban(n);
    const ust = asagiKurus((deger * d.kdo) / 100);
    const tutar = Math.min(p, ust);
    const neden =
      tutar < sinirsizTutar
        ? ust <= p
          ? `Bu değerdeki araçta kredi/değer oranı en fazla %${d.kdo} olabilir.`
          : `Bu değerdeki araçta azami vade ${d.vade} ay.`
        : null;
    return { tutar, vade: n, sinirsizTutar, neden };
  }

  if (s.tur === 'telefon') {
    const fiyat = deger ?? sinirsizTutar;
    const t = krediSinirlari.values.telefon;
    const ustVade = fiyat <= (s.yenilenmisTelefon ? t.yenilenmisSinir : t.sinir) ? t.altVade : t.ustVade;
    const n = Math.min(input.vade, ustVade);
    return { tutar: taban(n), vade: n, sinirsizTutar, neden: n < input.vade ? `Cep telefonu kredisinde azami vade ${ustVade} ay.` : null };
  }

  // konut
  if (deger === null) return { tutar: sinirsizTutar, vade: input.vade, sinirsizTutar, neden: null };
  const ust = asagiKurus((deger * konutKdo(deger, s.enerjiSinifi ?? 'diger', s.baskaKonut)) / 100);
  return ust < sinirsizTutar
    ? { tutar: ust, vade: input.vade, sinirsizTutar, neden: 'Konut değerine göre kredi/değer sınırı (BDDK 29.01.2026/11364).' }
    : { tutar: sinirsizTutar, vade: input.vade, sinirsizTutar, neden: null };
}

// ---------------------------------------------------------------------------
// Teklif karşılaştırma
// ---------------------------------------------------------------------------

export interface Teklif {
  aylikFaiz: number;
  vade: number;
  /** Açılışta ödenen masraflar (tahsis ücreti, ekspertiz, peşin sigorta…) */
  pesinMasraf: number;
  /** Her ay ödenen masraf (ör. aylık sigorta primi) */
  aylikMasraf: number;
}

export interface TeklifSonucu {
  taksit: number;
  toplamOdeme: number;
  faizVergi: number;
  masraf: number;
  toplamMaliyet: number;
  ymoYillik: number | null;
}

export function teklifleriKarsilastir(anapara: number, kkdf: number, bsmv: number, teklifler: Teklif[]): TeklifSonucu[] {
  return teklifler.map((t) => {
    const s = hesaplaKredi({
      anapara,
      vade: t.vade,
      aylikFaiz: t.aylikFaiz,
      kkdf,
      bsmv,
      masraflar: [
        { tur: 'diger', tutar: t.pesinMasraf, zaman: 'pesin' },
        { tur: 'sigorta', tutar: t.aylikMasraf, zaman: 'aylik' },
      ],
    });
    return {
      taksit: s.plan.taksit,
      toplamOdeme: s.masrafDahilToplamOdeme,
      faizVergi: round2(s.plan.toplamFaiz + s.plan.toplamKkdf + s.plan.toplamBsmv),
      masraf: s.masraf.toplam,
      toplamMaliyet: s.toplamMaliyet,
      ymoYillik: s.ymoYillik,
    };
  });
}

// ---------------------------------------------------------------------------
// Doğrulama
// ---------------------------------------------------------------------------

export interface KrediGirdisi {
  anapara: number | null;
  vade: number | null;
  /** Aylık faiz (%) — yıllık girildiyse önce aylığa çevrilmiş olmalı */
  aylikFaiz: number | null;
  kkdf: number | null;
  bsmv: number | null;
  odemesizAy?: number | null;
}

export function validateKredi(i: KrediGirdisi): Record<string, string> {
  const e: Record<string, string> = {};
  if (i.anapara === null || Number.isNaN(i.anapara)) e.anapara = 'Kredi tutarını girin.';
  else if (i.anapara <= 0) e.anapara = 'Kredi tutarı sıfırdan büyük olmalı.';
  else if (i.anapara > 10_000_000_000) e.anapara = 'Tutar çok büyük.';

  if (i.vade === null || Number.isNaN(i.vade)) e.vade = 'Vadeyi ay olarak girin.';
  else if (!Number.isInteger(i.vade) || i.vade < 1) e.vade = 'Vade en az 1 ay ve tam sayı olmalı.';
  else if (i.vade > 360) e.vade = 'Vade en fazla 360 ay olabilir.';

  if (i.aylikFaiz === null || Number.isNaN(i.aylikFaiz)) e.faiz = 'Faiz oranını girin.';
  else if (i.aylikFaiz < 0) e.faiz = 'Faiz oranı negatif olamaz.';
  else if (i.aylikFaiz > 20) e.faiz = 'Aylık faiz %20’den büyük görünüyor; yıllık oranı “Yıllık” seçeneğiyle girin.';

  if (i.kkdf === null || Number.isNaN(i.kkdf) || i.kkdf < 0 || i.kkdf > 100) e.kkdf = 'KKDF %0–%100 arasında olmalı.';
  if (i.bsmv === null || Number.isNaN(i.bsmv) || i.bsmv < 0 || i.bsmv > 100) e.bsmv = 'BSMV %0–%100 arasında olmalı.';

  const g = i.odemesizAy ?? 0;
  if (g === null || Number.isNaN(g) || !Number.isInteger(g) || g < 0 || g > 24) e.odemesiz = 'Ödemesiz dönem 0–24 ay arasında tam sayı olmalı.';
  return e;
}

/** Ara ödemeler, bugünkü değerleri toplamı borcu aşmayacak şekilde girilmeli. */
export function validateAraOdemeler(araOdemeler: AraOdeme[], plan: Pick<PlanInput, 'anapara' | 'vade' | 'aylikFaiz' | 'kkdf' | 'bsmv' | 'odemesizAy'>): string | null {
  for (const a of araOdemeler) {
    if (!Number.isInteger(a.ay) || a.ay < 1 || a.ay > plan.vade) return `Ara ödeme ayı 1 ile ${plan.vade} arasında olmalı.`;
    if (!(a.tutar > 0)) return 'Ara ödeme tutarı sıfırdan büyük olmalı.';
  }
  const re = (plan.aylikFaiz / 100) * (1 + plan.kkdf / 100 + plan.bsmv / 100);
  const borc = plan.anapara * Math.pow(1 + re, plan.odemesizAy ?? 0);
  const pv = araOdemeler.reduce((t, a) => t + a.tutar / Math.pow(1 + re, a.ay), 0);
  if (pv >= borc) return 'Ara ödemeler borcun tamamını karşılıyor; tutarları azaltın.';
  return null;
}

/** Tahsis ücreti yasal üst sınırı (vergi hariç): anaparanın binde 5'i. */
export function tahsisUcretiSiniri(anapara: number): number {
  return round2((anapara * krediUcretleri.values.tahsisBinde) / 1000);
}
