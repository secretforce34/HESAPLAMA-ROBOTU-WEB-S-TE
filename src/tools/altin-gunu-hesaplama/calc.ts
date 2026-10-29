import { annualFromMonthly, round2, roundTo } from '../../lib/finance';

/** Katkının birimi: 'tl' = TL günü; 'gram' ve 'ceyrek' = altın günü */
export type KatkiBirimi = 'tl' | 'gram' | 'ceyrek';

export interface AltinGunuInput {
  /** Katılımcı sayısı = gün süresi (ay) */
  katilimci: number;
  birim: KatkiBirimi;
  /** Aylık katkı: TL, gram ya da çeyrek adedi (birime göre) */
  katki: number;
  /**
   * Altın fiyatı (TL). birim 'gram' → gram fiyatı, 'ceyrek' → çeyrek fiyatı.
   * birim 'tl' iken gram fiyatıdır ve yalnızca altın günüyle karşılaştırma içindir (boş bırakılabilir).
   */
  altinFiyati: number | null;
  /** Aylık enflasyon ya da alternatif getiri varsayımı (%): paranın zaman değeri */
  aylikOran: number;
  /** Altın fiyatının aylık artış varsayımı (%) */
  altinArtisi: number;
  /** Sırası gelen kişi o ay da katkı öder mi? Hayırsa kasa (N − 1) katkıdan oluşur. */
  alanOder: boolean;
}

export interface SiraSonucu {
  sira: number;
  /** Ödenen toplam; her katkı, ödendiği ayın TL değeriyle */
  odenenNominal: number;
  /** Alınan tutar; sırası gelen ayın TL değeriyle */
  alinanNominal: number;
  /** Ödenenlerin bugünkü değeri (aylık orana göre iskonto) */
  odenenBugun: number;
  /** Alınanın bugünkü değeri */
  alinanBugun: number;
  /** Alınan − ödenen (bugünkü değerle); artı = kazanç, eksi = kayıp */
  net: number;
  /** Net, ödenenlerin bugünkü değerinin yüzde kaçı */
  netOran: number | null;
}

export type SenaryoTuru = 'tl' | 'altin';

export interface AltinGunuSonucu {
  /** Girdiğiniz senaryo */
  tur: SenaryoTuru;
  siralar: SiraSonucu[];
  /** Aynı başlangıç değeriyle diğer senaryo (altın fiyatı girildiyse) */
  karsiTur: SenaryoTuru | null;
  karsi: SiraSonucu[] | null;
  /** İlk ayın katkı değeri (TL) */
  ilkAyKatkiTL: number;
  /** Kişi başına yapılan ödeme sayısı */
  odemeSayisi: number;
  /** Altın günü: sırası gelenin alacağı altın (gram ya da çeyrek adedi); TL günü: null */
  alinacakAltin: number | null;
  /** Altın fiyatı artışının enflasyona (aylık orana) oranı: (1+g)/(1+r). >1: altın enflasyonun önünde */
  rho: number;
  /** Ana senaryoda net > 0 olan sıralar */
  kazancliSiralar: number[];
}

/**
 * Bir senaryonun tüm sıraları. Ay m = 1…N; katkı ayın başında ödenir ve o ayın kasasını sırası gelen alır,
 * yani m. ayın nakit akışı (m − 1) ay sonrasındadır (1. ay: bugün). Bir katkının TL değeri
 * miktar × P0 × (1 + g)^(m−1); bugünkü değeri bunun (1 + r)^−(m−1) ile çarpımıdır.
 * Her katılımcı aynı ödemeleri yapar; fark yalnızca kasayı hangi ay aldığından doğar. Kazançlar toplamı sıfırdır.
 */
function sirala(n: number, miktar: number, p0: number, g: number, r: number, alanOder: boolean): SiraSonucu[] {
  const deger: number[] = []; // m. ayın bir katkısının TL değeri
  const iskonto: number[] = [];
  for (let m = 1; m <= n; m++) {
    deger.push(miktar * p0 * Math.pow(1 + g, m - 1));
    iskonto.push(Math.pow(1 + r, -(m - 1)));
  }
  const kasaKatki = alanOder ? n : n - 1; // kasadaki katkı sayısı
  const toplamNominal = deger.reduce((t, v) => t + v, 0);
  const toplamBugun = deger.reduce((t, v, i) => t + v * iskonto[i], 0);

  const out: SiraSonucu[] = [];
  for (let k = 1; k <= n; k++) {
    // Sırası gelen kişi, kendi ayında katkı ödemiyorsa o ayın katkısı eksilir
    const odenenNominal = alanOder ? toplamNominal : toplamNominal - deger[k - 1];
    const odenenBugun = alanOder ? toplamBugun : toplamBugun - deger[k - 1] * iskonto[k - 1];
    const alinanNominal = kasaKatki * deger[k - 1];
    const alinanBugun = kasaKatki * deger[k - 1] * iskonto[k - 1];
    const net = alinanBugun - odenenBugun;
    out.push({
      sira: k,
      odenenNominal: round2(odenenNominal),
      alinanNominal: round2(alinanNominal),
      odenenBugun: round2(odenenBugun),
      alinanBugun: round2(alinanBugun),
      net: round2(net),
      netOran: odenenBugun > 0 ? roundTo((net / odenenBugun) * 100, 2) : null,
    });
  }
  return out;
}

export function hesaplaAltinGunu(input: AltinGunuInput): AltinGunuSonucu {
  const n = input.katilimci;
  const r = input.aylikOran / 100;
  const g = input.altinArtisi / 100;
  const fiyatVar = input.altinFiyati !== null && input.altinFiyati > 0;

  let tur: SenaryoTuru;
  let siralar: SiraSonucu[];
  let karsi: SiraSonucu[] | null = null;
  let karsiTur: SenaryoTuru | null = null;
  let ilkAyKatkiTL: number;
  let alinacakAltin: number | null = null;

  if (input.birim === 'tl') {
    tur = 'tl';
    ilkAyKatkiTL = input.katki;
    siralar = sirala(n, input.katki, 1, 0, r, input.alanOder); // TL: fiyat sabit, değer = nominal
    if (fiyatVar) {
      // Aynı ilk ay değerini ödeyen altın günü: katkı = TL ÷ gram fiyatı
      karsiTur = 'altin';
      karsi = sirala(n, input.katki / (input.altinFiyati as number), input.altinFiyati as number, g, r, input.alanOder);
    }
  } else {
    tur = 'altin';
    const fiyat = fiyatVar ? (input.altinFiyati as number) : 0;
    ilkAyKatkiTL = round2(input.katki * fiyat);
    siralar = sirala(n, input.katki, fiyat, g, r, input.alanOder);
    alinacakAltin = roundTo(input.katki * (input.alanOder ? n : n - 1), 4);
    karsiTur = 'tl';
    karsi = sirala(n, input.katki * fiyat, 1, 0, r, input.alanOder);
  }

  return {
    tur,
    siralar,
    karsiTur,
    karsi,
    ilkAyKatkiTL: round2(ilkAyKatkiTL),
    odemeSayisi: input.alanOder ? n : n - 1,
    alinacakAltin,
    rho: (1 + g) / (1 + r),
    kazancliSiralar: siralar.filter((s) => s.net > 0).map((s) => s.sira),
  };
}

/** [1,2,3,4] → "1–4"; [1,2,5] → "1, 2, 5"; [] → "yok" */
export function siraAraligi(siralar: number[]): string {
  if (siralar.length === 0) return 'yok';
  const ardisik = siralar.every((s, i) => i === 0 || s === siralar[i - 1] + 1);
  if (ardisik && siralar.length > 1) return `${siralar[0]}–${siralar[siralar.length - 1]}`;
  return siralar.join(', ');
}

/** Aylık yüzdenin yıllık bileşik karşılığı (%) */
export function yillikKarsilik(aylikYuzde: number): number {
  return roundTo(annualFromMonthly(aylikYuzde / 100) * 100, 2);
}

export interface AltinGunuHatalari {
  katilimci?: string;
  katki?: string;
  altinFiyati?: string;
  aylikOran?: string;
  altinArtisi?: string;
  sira?: string;
}

export function validateAltinGunu(
  v: {
    katilimci: number | null;
    birim: KatkiBirimi;
    katki: number | null;
    altinFiyati: number | null;
    aylikOran: number | null;
    altinArtisi: number | null;
    sira: number | null;
  },
): AltinGunuHatalari {
  const e: AltinGunuHatalari = {};
  if (v.katilimci === null || Number.isNaN(v.katilimci)) e.katilimci = 'Katılımcı sayısını girin.';
  else if (!Number.isInteger(v.katilimci) || v.katilimci < 2) e.katilimci = 'Katılımcı sayısı 2 veya daha fazla tam sayı olmalı.';
  else if (v.katilimci > 120) e.katilimci = 'En fazla 120 katılımcı hesaplanır.';

  if (v.katki === null || Number.isNaN(v.katki)) e.katki = 'Aylık katkıyı girin.';
  else if (v.katki <= 0) e.katki = 'Katkı sıfırdan büyük olmalı.';

  if (v.birim !== 'tl') {
    if (v.altinFiyati === null || Number.isNaN(v.altinFiyati)) e.altinFiyati = 'Altın fiyatını girin.';
    else if (v.altinFiyati <= 0) e.altinFiyati = 'Fiyat sıfırdan büyük olmalı.';
  } else if (v.altinFiyati !== null && (Number.isNaN(v.altinFiyati) || v.altinFiyati <= 0)) {
    e.altinFiyati = 'Fiyat sıfırdan büyük olmalı.';
  }

  if (v.aylikOran === null || Number.isNaN(v.aylikOran)) e.aylikOran = 'Aylık oranı girin (0 yazabilirsiniz).';
  else if (v.aylikOran <= -50 || v.aylikOran > 100) e.aylikOran = 'Aylık oran %-50 ile %100 arasında olmalı.';

  if (v.altinArtisi === null || Number.isNaN(v.altinArtisi)) e.altinArtisi = 'Aylık artışı girin (0 yazabilirsiniz).';
  else if (v.altinArtisi <= -50 || v.altinArtisi > 100) e.altinArtisi = 'Aylık artış %-50 ile %100 arasında olmalı.';

  if (v.sira !== null) {
    if (Number.isNaN(v.sira) || !Number.isInteger(v.sira) || v.sira < 1) e.sira = 'Sıra 1 veya daha büyük bir tam sayı olmalı.';
    else if (v.katilimci !== null && !Number.isNaN(v.katilimci) && v.sira > v.katilimci) e.sira = 'Sıra, katılımcı sayısından büyük olamaz.';
  }
  return e;
}
