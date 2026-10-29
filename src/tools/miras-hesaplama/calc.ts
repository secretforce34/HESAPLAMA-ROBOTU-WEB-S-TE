import { dilimliVergi, verasetVergisi } from '../../data/params/veraset';
import { round2 } from '../../lib/finance';

// Yasal mirasçılık: 4721 sayılı TMK md. 495–499; saklı paylar md. 506.
// Vasiyetname veya miras sözleşmesi yoksa geçerlidir. Evlatlık, kan hısımı altsoy gibi mirasçı olur.

export interface Kesir {
  pay: number;
  payda: number;
}

const ebob = (a: number, b: number): number => (b === 0 ? Math.abs(a) : ebob(b, a % b));
export function kesir(pay: number, payda = 1): Kesir {
  if (pay === 0) return { pay: 0, payda: 1 };
  const g = ebob(pay, payda);
  return { pay: pay / g, payda: payda / g };
}
const carp = (a: Kesir, b: Kesir) => kesir(a.pay * b.pay, a.payda * b.payda);
const bol = (a: Kesir, n: number) => kesir(a.pay, a.payda * n);
const topla = (a: Kesir, b: Kesir) => kesir(a.pay * b.payda + b.pay * a.payda, a.payda * b.payda);
const fark = (a: Kesir, b: Kesir) => kesir(a.pay * b.payda - b.pay * a.payda, a.payda * b.payda);
export const deger = (k: Kesir) => k.pay / k.payda;

export interface Cocuk {
  /** Miras bırakandan önce vefat ettiyse false */
  sag: boolean;
  /** Vefat eden çocuğun çocukları (torunlar) — payını onlar alır */
  torunSayisi: number;
}

export interface Aile {
  es: boolean;
  cocuklar: Cocuk[];
  anne: boolean;
  baba: boolean;
  /** Ana-baba bir kardeş sayısı */
  kardes: number;
  /** Büyükanne-büyükbabalardan veya onların altsoyundan (amca, hala, dayı, teyze, kuzen) mirasçı var mı */
  zumre3: boolean;
}

export type MirasciTuru = 'es' | 'cocuk' | 'torun' | 'anne' | 'baba' | 'kardes' | 'zumre3' | 'hazine';

export interface Mirasci {
  ad: string;
  tur: MirasciTuru;
  yasal: Kesir;
  /** Saklı pay (vasiyetle bile azaltılamayan kısım); yoksa null */
  sakli: Kesir | null;
}

export interface Paylasim {
  /** Mirasçı olan zümre: 1 altsoy, 2 ana-baba ve kardeşler, 3 büyükanne-büyükbabalar, 0 yalnız eş veya hazine */
  zumre: 0 | 1 | 2 | 3;
  mirascilar: Mirasci[];
  /** Miras bırakanın vasiyetle serbestçe bırakabileceği kısım */
  tasarrufNisabi: Kesir;
}

export function yasalPaylar(a: Aile): Paylasim {
  const liste: Mirasci[] = [];
  const kollar = a.cocuklar.map((c, i) => ({ c, i })).filter(({ c }) => c.sag || c.torunSayisi > 0);
  let zumre: Paylasim['zumre'];

  if (kollar.length > 0) {
    // 1. zümre: eş 1/4, kalan çocuklara eşit; ölen çocuğun payı çocuklarına (halefiyet)
    zumre = 1;
    const kalan = a.es ? kesir(3, 4) : kesir(1);
    if (a.es) liste.push({ ad: 'Eş', tur: 'es', yasal: kesir(1, 4), sakli: null });
    const kolPayi = bol(kalan, kollar.length);
    for (const { c, i } of kollar) {
      if (c.sag) liste.push({ ad: `${i + 1}. çocuk`, tur: 'cocuk', yasal: kolPayi, sakli: null });
      else
        for (let t = 0; t < c.torunSayisi; t++)
          liste.push({ ad: `${i + 1}. çocuğun ${t + 1}. çocuğu (torun)`, tur: 'torun', yasal: bol(kolPayi, c.torunSayisi), sakli: null });
    }
  } else if (a.anne || a.baba || a.kardes > 0) {
    // 2. zümre: eş 1/2, kalan yarı yarıya anne ve baba tarafına; ölen ebeveynin payı kardeşlere, kardeş yoksa diğer tarafa
    zumre = 2;
    const kalan = a.es ? kesir(1, 2) : kesir(1);
    if (a.es) liste.push({ ad: 'Eş', tur: 'es', yasal: kesir(1, 2), sakli: null });
    const yarim = bol(kalan, 2);
    let anne = kesir(0);
    let baba = kesir(0);
    let kardes = kesir(0);
    for (const taraf of ['anne', 'baba'] as const) {
      const diger = taraf === 'anne' ? 'baba' : 'anne';
      if (a[taraf]) taraf === 'anne' ? (anne = topla(anne, yarim)) : (baba = topla(baba, yarim));
      else if (a.kardes > 0) kardes = topla(kardes, yarim);
      else if (a[diger]) diger === 'anne' ? (anne = topla(anne, yarim)) : (baba = topla(baba, yarim));
    }
    if (a.anne) liste.push({ ad: 'Anne', tur: 'anne', yasal: anne, sakli: null });
    if (a.baba) liste.push({ ad: 'Baba', tur: 'baba', yasal: baba, sakli: null });
    if (kardes.pay > 0) for (let k = 0; k < a.kardes; k++) liste.push({ ad: `${k + 1}. kardeş`, tur: 'kardes', yasal: bol(kardes, a.kardes), sakli: null });
  } else if (a.zumre3) {
    // 3. zümre: eş 3/4, kalan büyükanne-büyükbabalara ve onların altsoyuna
    zumre = 3;
    if (a.es) liste.push({ ad: 'Eş', tur: 'es', yasal: kesir(3, 4), sakli: null });
    liste.push({ ad: 'Büyükanne-büyükbabalar ve onların altsoyu', tur: 'zumre3', yasal: a.es ? kesir(1, 4) : kesir(1), sakli: null });
  } else {
    zumre = 0;
    if (a.es) liste.push({ ad: 'Eş', tur: 'es', yasal: kesir(1), sakli: null });
    else liste.push({ ad: 'Devlet (Hazine)', tur: 'hazine', yasal: kesir(1), sakli: null });
  }

  // Saklı paylar (TMK 506): altsoy 1/2, anne ve baba 1/4; eş altsoy veya 2. zümreyle birlikte tamamı, diğer hâllerde 3/4
  for (const m of liste) {
    if (m.tur === 'cocuk' || m.tur === 'torun') m.sakli = carp(m.yasal, kesir(1, 2));
    else if (m.tur === 'anne' || m.tur === 'baba') m.sakli = carp(m.yasal, kesir(1, 4));
    else if (m.tur === 'es') m.sakli = zumre === 1 || zumre === 2 ? m.yasal : carp(m.yasal, kesir(3, 4));
  }
  const sakliToplam = liste.reduce((t, m) => (m.sakli ? topla(t, m.sakli) : t), kesir(0));
  return { zumre, mirascilar: liste, tasarrufNisabi: fark(kesir(1), sakliToplam) };
}

export interface MirasciVergisi extends Mirasci {
  tutar: number;
  sakliTutar: number | null;
  istisna: number;
  matrah: number;
  vergi: number;
  /** Payın yüzde kaçı vergi */
  efektif: number;
}

/** Her mirasçının payı, istisnası ve veraset vergisi (VİVK md. 4, 16). */
export function verasetHesapla(netTereke: number, p: Paylasim): MirasciVergisi[] {
  const v = verasetVergisi.values;
  const altsoyVar = p.mirascilar.some((m) => m.tur === 'cocuk' || m.tur === 'torun');
  return p.mirascilar.map((m) => {
    const tutar = round2(netTereke * deger(m.yasal));
    let istisna = 0;
    if (m.tur === 'cocuk' || m.tur === 'torun') istisna = v.istisnaAltsoyVeEs;
    else if (m.tur === 'es') istisna = altsoyVar ? v.istisnaAltsoyVeEs : v.istisnaEsTek;
    const matrah = m.tur === 'hazine' ? 0 : Math.max(0, round2(tutar - istisna));
    const vergi = round2(dilimliVergi(matrah, 'veraset'));
    return {
      ...m,
      tutar,
      sakliTutar: m.sakli ? round2(netTereke * deger(m.sakli)) : null,
      istisna: m.tur === 'hazine' ? 0 : istisna,
      matrah,
      vergi,
      efektif: tutar > 0 ? (vergi / tutar) * 100 : 0,
    };
  });
}

export interface BagisVergisi {
  istisna: number;
  matrah: number;
  vergi: number;
  efektif: number;
}

/** Bağış, hibe gibi ivazsız intikallerde vergi. */
export function bagisVergisi(tutar: number): BagisVergisi {
  const istisna = verasetVergisi.values.istisnaIvazsiz;
  const matrah = Math.max(0, round2(tutar - istisna));
  const vergi = round2(dilimliVergi(matrah, 'ivazsiz'));
  return { istisna, matrah, vergi, efektif: tutar > 0 ? (vergi / tutar) * 100 : 0 };
}

export function kesirMetni(k: Kesir): string {
  return k.payda === 1 ? (k.pay === 1 ? 'Tamamı' : String(k.pay)) : `${k.pay}/${k.payda}`;
}
