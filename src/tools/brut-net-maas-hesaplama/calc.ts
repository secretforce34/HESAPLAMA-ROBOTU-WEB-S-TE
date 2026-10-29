// Ortak bordro motoru: brüt → net, net → brüt, aylık asgari ücret istisnaları ve ek ödemelerin vergisi.
// Kıdem/ihbar ve fazla mesai robotları da bu dosyayı kullanır.
import { asgariUcretOn } from '../../data/params/asgari-ucret';
import { hazineDestegiOn, maasYili, type GvDilimi, type MaasYili } from '../../data/params/maas';
import { pekSinirlariOn } from '../../data/params/sgk-sinirlar';
import { round2 } from '../../lib/finance';

export type Tesvik = 'yok' | 'genel' | 'imalat';
export type EngellilikDerecesi = 0 | 1 | 2 | 3;

export interface BordroSecenekleri {
  yil: number;
  /** Emekli olup sosyal güvenlik destek primine (SGDP) tabi çalışan */
  emekli?: boolean;
  /** GVK md. 31 engellilik derecesi (0 = yok) */
  engellilik?: EngellilikDerecesi;
  /** İşveren Hazine prim desteği: yok / genel (imalat dışı) / imalat */
  tesvik?: Tesvik;
  /**
   * 5510 md. 80/1-d: ücret dışı ödemelerin (ikramiye, prim) tavanı aşan kısmı izleyen en fazla
   * iki ayın prime esas kazancına eklenir. Ayların tutarı farklıysa anlamlıdır.
   */
  sgkDevir?: boolean;
}

type Secenek = Required<BordroSecenekleri>;

const varsayilan = (s: BordroSecenekleri): Secenek => ({
  yil: s.yil,
  emekli: s.emekli ?? false,
  engellilik: s.engellilik ?? 0,
  tesvik: s.tesvik ?? 'genel',
  sgkDevir: s.sgkDevir ?? true,
});

/** Ayın 15'i: oran setlerinden o ayın dönemini seçmek için. */
export const ayTarihi = (yil: number, ay: number) => `${yil}-${String(ay).padStart(2, '0')}-15`;

// ---------------------------------------------------------------------------
// Gelir vergisi tarifesi
// ---------------------------------------------------------------------------

/**
 * GVK md. 103: matraha (yıl içindeki kümülatif ücret matrahına) tarifeyi uygular.
 * Kuruşa yuvarlanmaz; aylık vergi iki kümülatif verginin farkı olarak bulunup yuvarlanır.
 */
export function tarifeVergisi(matrah: number, tarife: GvDilimi[]): number {
  if (!(matrah > 0)) return 0;
  let vergi = 0;
  let alt = 0;
  for (const d of tarife) {
    const ust = d.ust ?? Number.POSITIVE_INFINITY;
    if (matrah <= alt) break;
    vergi += ((Math.min(matrah, ust) - alt) * d.oran) / 100;
    alt = ust;
  }
  return vergi;
}

/** Kümülatif matrahın son lirasının girdiği dilimin oranı (%) — "vergi dilimim". */
export function marjinalOran(kumulatif: number, tarife: GvDilimi[]): number {
  for (const d of tarife) if (d.ust === null || kumulatif <= d.ust) return d.oran;
  return tarife[tarife.length - 1].oran;
}

/** Kümülatif matrah `onceki`den `onceki + matrah`a çıkarken doğan vergi (kuruşa yuvarlı). */
export function donemVergisi(onceki: number, matrah: number, tarife: GvDilimi[]): number {
  return round2(tarifeVergisi(onceki + matrah, tarife) - tarifeVergisi(onceki, tarife));
}

// ---------------------------------------------------------------------------
// Asgari ücret istisnası (GVK md. 23/18, DVK (2) sayılı tablo IV-34, GV Genel Tebliği 319)
// ---------------------------------------------------------------------------

export interface AsgariIstisna {
  ay: number;
  /** O ay geçerli brüt asgari ücret */
  brut: number;
  /** Asgari ücretin GV matrahı: brüt − %14 SGK − %1 işsizlik işçi payı */
  matrah: number;
  /** Asgari ücretin o aydaki vergisi = istisna üst sınırı (asgari ücretin kendi kümülatifiyle) */
  gv: number;
  /** Brüt asgari ücrete isabet eden damga vergisi = DV istisnası */
  dv: number;
}

/**
 * Her ay için GV ve DV istisnası. GV istisnası, asgari ücretin GV matrahına asgari ücretin kendi
 * kümülatif matrahıyla hesaplanan vergidir (2026: Ocak–Haziran 4.211,33; Temmuz 4.537,75;
 * Ağustos–Aralık 5.615,10 TL). Emekli (SGDP) çalışanlarda da aynı tutar uygulanır (Tebliğ 319 md. 5/3).
 */
export function asgariUcretIstisnalari(yil: number): AsgariIstisna[] {
  const p = maasYili(yil);
  const sonuc: AsgariIstisna[] = [];
  let kumulatif = 0;
  for (let ay = 1; ay <= 12; ay++) {
    const brut = asgariUcretOn(ayTarihi(yil, ay)).brut;
    const matrah = round2(
      brut - round2((brut * p.sgkIsciOrani) / 100) - round2((brut * p.issizlikIsciOrani) / 100),
    );
    const gv = donemVergisi(kumulatif, matrah, p.ucretTarifesi);
    kumulatif = round2(kumulatif + matrah);
    const dv = round2((brut * p.damgaVergisiBinde) / 1000);
    sonuc.push({ ay, brut, matrah, gv, dv });
  }
  return sonuc;
}

// ---------------------------------------------------------------------------
// Aylık bordro
// ---------------------------------------------------------------------------

export interface AyBordrosu {
  /** 1–12 */
  ay: number;
  brut: number;
  /** Prime esas kazanç (tavanla sınırlı, devreden tutar dahil) */
  sgkMatrahi: number;
  /** Önceki aylardan devredip bu ay prime tabi tutulan tutar (5510 md. 80/1-d) */
  devirKullanilan: number;
  /** Bu ay tavanı aştığı için prime tabi tutulamayan tutar */
  tavanAsimi: number;
  sgkIsci: number;
  issizlikIsci: number;
  engellilikIndirimi: number;
  gvMatrahi: number;
  /** Bu ay dahil yıl içi kümülatif GV matrahı */
  kumulatifMatrah: number;
  gvHesaplanan: number;
  /** Uygulanan asgari ücret GV istisnası (o ayın üst sınırını ve hesaplanan vergiyi aşmaz) */
  gvIstisna: number;
  gvOdenecek: number;
  dvHesaplanan: number;
  dvIstisna: number;
  dvOdenecek: number;
  net: number;
  /** Hazine desteği düşülmüş işveren SGK payı (SGDP'lilerde işveren SGDP payı) */
  sgkIsveren: number;
  /** Bu ay Hazinece karşılanan prim (indirim) tutarı */
  hazineIndirimi: number;
  issizlikIsveren: number;
  /** İşverene toplam maliyet = brüt + işveren SGK + işveren işsizlik */
  maliyet: number;
  /** Ayın sonunda kümülatif matrahın bulunduğu dilim (%) */
  dilim: number;
  /** Bu ay uygulanan işveren SGK oranı (%) */
  sgkIsverenOrani: number;
}

export interface BordroToplam {
  brut: number;
  sgkIsci: number;
  issizlikIsci: number;
  engellilikIndirimi: number;
  gvMatrahi: number;
  gvHesaplanan: number;
  gvIstisna: number;
  gvOdenecek: number;
  dvHesaplanan: number;
  dvIstisna: number;
  dvOdenecek: number;
  net: number;
  sgkIsveren: number;
  hazineIndirimi: number;
  issizlikIsveren: number;
  maliyet: number;
}

export interface YillikBordro {
  yil: number;
  aylar: AyBordrosu[];
  toplam: BordroToplam;
}

interface Devir {
  tutar: number;
  /** Bu tutarın daha kaç ay devredebileceği */
  kalanAy: number;
}

interface Durum {
  kumulatif: number;
  devirler: Devir[];
}

function ayHesapla(
  ay: number,
  brutGirdi: number,
  s: Secenek,
  p: MaasYili,
  ist: AsgariIstisna,
  durum: Durum,
): { satir: AyBordrosu; sonraki: Durum } {
  const brut = round2(Math.max(0, brutGirdi));
  const tarih = ayTarihi(s.yil, ay);
  // 5510 md. 82: prime esas kazanç üst sınırı (2026: 297.270 TL)
  const ust = pekSinirlariOn(tarih).aylikUst;

  const esas = Math.min(brut, ust);
  let bosluk = ust - esas;
  let devirKullanilan = 0;
  const yeniDevirler: Devir[] = [];
  // 5510 md. 80/1-d: önce eski devir kullanılır; iki ayda kullanılamayan kısım düşer
  for (const d of durum.devirler) {
    const kullan = Math.min(d.tutar, bosluk);
    devirKullanilan += kullan;
    bosluk -= kullan;
    const kalan = round2(d.tutar - kullan);
    if (kalan > 0 && d.kalanAy > 1) yeniDevirler.push({ tutar: kalan, kalanAy: d.kalanAy - 1 });
  }
  const tavanAsimi = round2(Math.max(0, brut - ust));
  if (s.sgkDevir && tavanAsimi > 0) yeniDevirler.push({ tutar: tavanAsimi, kalanAy: 2 });
  devirKullanilan = round2(devirKullanilan);
  const sgkMatrahi = round2(esas + devirKullanilan);

  // İşçi primleri: 5510 md. 81 (%14) ve 4447 md. 49 (%1); SGDP'de %7,5, işsizlik yok (geçici md. 14/a)
  const sgkIsciOrani = s.emekli ? p.sgdpIsciOrani : p.sgkIsciOrani;
  const issizlikIsciOrani = s.emekli ? 0 : p.issizlikIsciOrani;
  const sgkIsci = round2((sgkMatrahi * sgkIsciOrani) / 100);
  const issizlikIsci = round2((sgkMatrahi * issizlikIsciOrani) / 100);

  // GVK md. 63 ve 31: primler ve engellilik indirimi düşülerek GV matrahı bulunur (Tebliğ 319 md. 6/1)
  const primSonrasi = round2(brut - sgkIsci - issizlikIsci);
  const engelliTutar = s.engellilik > 0 ? p.engellilikIndirimi[s.engellilik - 1] : 0;
  const engellilikIndirimi = round2(Math.min(Math.max(0, primSonrasi), engelliTutar));
  const gvMatrahi = round2(Math.max(0, primSonrasi - engellilikIndirimi));
  const kumulatifMatrah = round2(durum.kumulatif + gvMatrahi);

  // GVK md. 103: kümülatif matrah üzerinden; md. 23/18: asgari ücretin o ayki vergisi kadar istisna
  const gvHesaplanan = donemVergisi(durum.kumulatif, gvMatrahi, p.ucretTarifesi);
  const gvIstisna = Math.min(gvHesaplanan, ist.gv);
  const gvOdenecek = round2(gvHesaplanan - gvIstisna);

  // DVK (1) sayılı tablo IV-1-b: binde 7,59; (2) sayılı tablo IV-34: brüt asgari ücrete isabet eden kısım istisna
  const dvHesaplanan = round2((brut * p.damgaVergisiBinde) / 1000);
  const dvIstisna = Math.min(dvHesaplanan, ist.dv);
  const dvOdenecek = round2(dvHesaplanan - dvIstisna);

  const net = round2(brut - sgkIsci - issizlikIsci - gvOdenecek - dvOdenecek);

  // İşveren: 5510 md. 81/1-ı ve geçici md. 108 (Hazine desteği SGDP'lilere uygulanmaz)
  const destekPuan = s.emekli || s.tesvik === 'yok' ? 0 : hazineDestegiOn(tarih)[s.tesvik];
  const sgkIsverenOrani = s.emekli ? p.sgdpIsverenOrani : p.sgkIsverenOrani - destekPuan;
  const sgkIsveren = round2((sgkMatrahi * sgkIsverenOrani) / 100);
  const hazineIndirimi = s.emekli ? 0 : round2(round2((sgkMatrahi * p.sgkIsverenOrani) / 100) - sgkIsveren);
  const issizlikIsveren = s.emekli ? 0 : round2((sgkMatrahi * p.issizlikIsverenOrani) / 100);
  const maliyet = round2(brut + sgkIsveren + issizlikIsveren);

  return {
    satir: {
      ay,
      brut,
      sgkMatrahi,
      devirKullanilan,
      tavanAsimi,
      sgkIsci,
      issizlikIsci,
      engellilikIndirimi,
      gvMatrahi,
      kumulatifMatrah,
      gvHesaplanan,
      gvIstisna,
      gvOdenecek,
      dvHesaplanan,
      dvIstisna,
      dvOdenecek,
      net,
      sgkIsveren,
      hazineIndirimi,
      issizlikIsveren,
      maliyet,
      dilim: marjinalOran(kumulatifMatrah, p.ucretTarifesi),
      sgkIsverenOrani,
    },
    sonraki: { kumulatif: kumulatifMatrah, devirler: yeniDevirler },
  };
}

const TOPLAM_ALANLARI: (keyof BordroToplam)[] = [
  'brut',
  'sgkIsci',
  'issizlikIsci',
  'engellilikIndirimi',
  'gvMatrahi',
  'gvHesaplanan',
  'gvIstisna',
  'gvOdenecek',
  'dvHesaplanan',
  'dvIstisna',
  'dvOdenecek',
  'net',
  'sgkIsveren',
  'hazineIndirimi',
  'issizlikIsveren',
  'maliyet',
];

function toplamla(aylar: AyBordrosu[]): BordroToplam {
  const t = {} as BordroToplam;
  for (const k of TOPLAM_ALANLARI) t[k] = round2(aylar.reduce((s, a) => s + a[k], 0));
  return t;
}

/** 12 aylık brüt listesinden (Ocak–Aralık) yıllık bordro. Eksik aylar 0 sayılır. */
export function hesaplaBordro(brutler: number[], secenek: BordroSecenekleri): YillikBordro {
  const s = varsayilan(secenek);
  const p = maasYili(s.yil);
  const istisnalar = asgariUcretIstisnalari(s.yil);
  let durum: Durum = { kumulatif: 0, devirler: [] };
  const aylar: AyBordrosu[] = [];
  for (let i = 0; i < 12; i++) {
    const { satir, sonraki } = ayHesapla(i + 1, brutler[i] ?? 0, s, p, istisnalar[i], durum);
    aylar.push(satir);
    durum = sonraki;
  }
  return { yil: s.yil, aylar, toplam: toplamla(aylar) };
}

/**
 * Net → brüt: her ay ayrı çözülür, çünkü kümülatif matrah (ve devreden SGK matrahı) aya göre değişir.
 * Her ay için neti hedefe eşit ya da hedefi en az aşan kuruşluk brüt bulunur (ikiye bölme yöntemi).
 */
export function nettenBrute(netler: number[], secenek: BordroSecenekleri): YillikBordro {
  const s = varsayilan(secenek);
  const p = maasYili(s.yil);
  const istisnalar = asgariUcretIstisnalari(s.yil);
  let durum: Durum = { kumulatif: 0, devirler: [] };
  const aylar: AyBordrosu[] = [];
  for (let i = 0; i < 12; i++) {
    const hedef = round2(Math.max(0, netler[i] ?? 0));
    const dene = (kurus: number) => ayHesapla(i + 1, kurus / 100, s, p, istisnalar[i], durum);
    let brutKurus = 0;
    if (hedef > 0) {
      let lo = 0;
      let hi = Math.ceil(Math.max(hedef * 2.5, hedef + 100_000) * 100);
      while (dene(hi).satir.net < hedef) hi *= 2;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (dene(mid).satir.net >= hedef) hi = mid;
        else lo = mid + 1;
      }
      brutKurus = lo;
    }
    const { satir, sonraki } = dene(brutKurus);
    aylar.push(satir);
    durum = sonraki;
  }
  return { yil: s.yil, aylar, toplam: toplamla(aylar) };
}

// ---------------------------------------------------------------------------
// Ek ödemenin (ör. ihbar tazminatı) vergisi
// ---------------------------------------------------------------------------

export interface EkOdemeVergisiGirdi {
  yil: number;
  /** Ödemenin yapıldığı ay (1–12) */
  ay: number;
  /** Bu aydan önceki aylara ait yıl içi kümülatif GV matrahı */
  oncekiKumulatif: number;
  /** Aynı ay ödenen ücretin brütü (ek ödeme hariç) */
  ayBrut: number;
  /** Aynı ay ödenen ücretin GV matrahı (ek ödeme hariç) */
  ayMatrah: number;
  /** SGK primine tabi olmayan ek ödemenin brütü (ihbar tazminatı gibi; 5510 md. 80/1-b) */
  ekBrut: number;
}

export interface EkOdemeVergisi {
  gv: number;
  dv: number;
  /** Ek ödemeden sonra kümülatif matrahın bulunduğu dilim (%) */
  dilim: number;
}

/**
 * Ek ödemeyi, aynı ayın ücretiyle birlikte vergilendirip yalnızca ücretin tek başına doğuracağı
 * vergiyi düşer. Asgari ücret istisnası o ayın toplam ödemelerine bir kez uygulandığından
 * (Tebliğ 319 md. 4/5), ücretin kullanmadığı istisna payı da kendiliğinden ek ödemeye yansır.
 */
export function ekOdemeVergisi(g: EkOdemeVergisiGirdi): EkOdemeVergisi {
  const p = maasYili(g.yil);
  const ist = asgariUcretIstisnalari(g.yil)[Math.min(12, Math.max(1, g.ay)) - 1];
  const gvNet = (matrah: number) =>
    Math.max(0, donemVergisi(g.oncekiKumulatif, matrah, p.ucretTarifesi) - ist.gv);
  const dvNet = (brut: number) => Math.max(0, round2((brut * p.damgaVergisiBinde) / 1000) - ist.dv);
  const ek = Math.max(0, g.ekBrut);
  return {
    gv: round2(gvNet(g.ayMatrah + ek) - gvNet(g.ayMatrah)),
    dv: round2(dvNet(g.ayBrut + ek) - dvNet(g.ayBrut)),
    dilim: marjinalOran(g.oncekiKumulatif + g.ayMatrah + ek, p.ucretTarifesi),
  };
}

// ---------------------------------------------------------------------------
// Doğrulama
// ---------------------------------------------------------------------------

export function validateTutar(v: number | null, ad = 'Tutar'): string | undefined {
  if (v === null || Number.isNaN(v)) return `${ad} girin.`;
  if (v < 0) return `${ad} negatif olamaz.`;
  if (v > 100_000_000) return `${ad} çok büyük görünüyor.`;
  return undefined;
}

/** Ay ay tutarlar: { [ay indeksi]: hata } — en az bir ay sıfırdan büyük olmalı. */
export function validateAylar(tutarlar: (number | null)[]): Record<number, string> {
  const e: Record<number, string> = {};
  tutarlar.forEach((t, i) => {
    const h = validateTutar(t);
    if (h) e[i] = h;
  });
  if (Object.keys(e).length === 0 && !tutarlar.some((t) => (t ?? 0) > 0)) e[0] = 'En az bir ay için tutar girin.';
  return e;
}
