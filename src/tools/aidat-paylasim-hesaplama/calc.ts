// 634 sayılı Kat Mülkiyeti Kanunu md. 20: aralarında başka bir anlaşma (yönetim planı / kurul kararı) yoksa
// kat malikleri ortak yerlerin bakım, koruma, onarım giderleri ile ortak tesislerin işletme giderlerine ARSA PAYI
// oranında; kapıcı, kaloriferci, bahçıvan ve bekçi giderlerine EŞİT olarak katılır.

export type Yontem = 'arsa' | 'esit';

export interface Bolum {
  ad: string;
  /** Tapudaki arsa payının payı (ör. 24/480 için 24) */
  arsaPayi: number;
}

export interface Gider {
  ad: string;
  tutar: number;
  yontem: Yontem;
}

/** Kanundaki varsayılan yöntem: personel giderleri eşit, diğerleri arsa payı */
export function varsayilanYontem(giderAdi: string): Yontem {
  return /kapıcı|kapici|kalorifer|bahçıvan|bahcivan|bekçi|bekci|güvenlik|guvenlik/i.test(giderAdi) ? 'esit' : 'arsa';
}

/** Tutarı ağırlıklara göre kuruşa böler; en büyük kalan yöntemiyle toplam tam korunur. */
export function bol(tutar: number, agirliklar: number[]): number[] {
  const kurus = Math.round(tutar * 100);
  const toplamA = agirliklar.reduce((t, a) => t + a, 0);
  if (toplamA <= 0) return agirliklar.map(() => 0);
  const ham = agirliklar.map((a) => (kurus * a) / toplamA);
  const taban = ham.map((h) => Math.floor(h));
  let kalan = kurus - taban.reduce((t, x) => t + x, 0);
  const sira = ham.map((h, i) => ({ i, k: h - Math.floor(h) })).sort((a, b) => b.k - a.k || a.i - b.i);
  for (let j = 0; kalan > 0; j = (j + 1) % sira.length, kalan--) taban[sira[j].i] += 1;
  return taban.map((x) => x / 100);
}

export interface PaySatiri {
  ad: string;
  /** Arsa payı oranı (%) */
  oran: number;
  arsaPayli: number;
  esit: number;
  toplam: number;
  /** Gider bazında pay */
  kalemler: number[];
}

export interface PaylasimSonucu {
  satirlar: PaySatiri[];
  toplamGider: number;
  arsaPayliToplam: number;
  esitToplam: number;
  toplamArsaPayi: number;
}

export function paylastir(bolumler: Bolum[], giderler: Gider[]): PaylasimSonucu {
  const n = bolumler.length;
  const arsa = bolumler.map((b) => b.arsaPayi);
  const toplamArsaPayi = arsa.reduce((t, a) => t + a, 0);
  const kalemPaylari = giderler.map((g) => bol(g.tutar, g.yontem === 'esit' ? bolumler.map(() => 1) : arsa));

  const satirlar: PaySatiri[] = bolumler.map((b, i) => {
    let arsaPayli = 0;
    let esit = 0;
    const kalemler = giderler.map((g, j) => {
      const p = kalemPaylari[j][i];
      if (g.yontem === 'esit') esit += p;
      else arsaPayli += p;
      return p;
    });
    return {
      ad: b.ad || `Bölüm ${i + 1}`,
      oran: toplamArsaPayi > 0 ? (b.arsaPayi / toplamArsaPayi) * 100 : 0,
      arsaPayli: Math.round(arsaPayli * 100) / 100,
      esit: Math.round(esit * 100) / 100,
      toplam: Math.round((arsaPayli + esit) * 100) / 100,
      kalemler,
    };
  });

  const topla = (y: Yontem) => Math.round(giderler.filter((g) => g.yontem === y).reduce((t, g) => t + g.tutar, 0) * 100) / 100;
  return {
    satirlar: n > 0 ? satirlar : [],
    toplamGider: Math.round(giderler.reduce((t, g) => t + g.tutar, 0) * 100) / 100,
    arsaPayliToplam: topla('arsa'),
    esitToplam: topla('esit'),
    toplamArsaPayi,
  };
}

export function validateBolumler(b: { arsaPayi: number | null }[]): string | null {
  if (b.length < 2) return 'En az iki bağımsız bölüm ekleyin.';
  if (b.some((x) => x.arsaPayi === null || x.arsaPayi <= 0)) return 'Her bölümün arsa payını girin.';
  return null;
}
