import { round2 } from '../../lib/finance';
import { hesaplaBordro } from '../brut-net-maas-hesaplama/calc';

export type UcretTuru = 'aylik' | 'gunluk' | 'saatlik';

/** 4857 s. Kanun md. 41/8: fazla çalışma bir yılda 270 saati aşamaz. */
export const YILLIK_SINIR = 270;
/** Yargıtay uygulaması: aylık ücret ÷ 225 (30 gün × 7,5 saat). Sözleşmede farklıysa değiştirilebilir. */
export const VARSAYILAN_BOLEN = 225;
/** 4857 md. 63: haftalık 45 saat; 6 iş gününe bölündüğünde günlük 7,5 saat. */
export const GUNLUK_SAAT = 7.5;
export const AZAMI_HAFTALIK = 45;

/** 4857 md. 41/2 ve 41/4 zam oranları */
export const FAZLA_CALISMA_KATSAYI = 1.5;
export const FAZLA_SURELER_KATSAYI = 1.25;

export interface Ucret {
  tur: UcretTuru;
  /** Brüt tutar (aylık, günlük ya da saatlik) */
  tutar: number;
  /** Aylık ücreti saate çevirirken bölen (varsayılan 225) */
  bolen: number;
}

export function saatlikUcret(u: Ucret): number {
  if (u.tur === 'saatlik') return u.tutar;
  if (u.tur === 'gunluk') return u.tutar / GUNLUK_SAAT;
  return u.tutar / u.bolen;
}

export function gunlukUcret(u: Ucret): number {
  if (u.tur === 'gunluk') return u.tutar;
  if (u.tur === 'saatlik') return u.tutar * GUNLUK_SAAT;
  return u.tutar / 30;
}

/** Vergi hesabında kullanılan aylık brüt ücret karşılığı. */
export function aylikUcret(u: Ucret): number {
  if (u.tur === 'aylik') return u.tutar;
  if (u.tur === 'gunluk') return u.tutar * 30;
  return u.tutar * u.bolen;
}

export interface Donem {
  /** 1–12 */
  ay: number;
  /** Haftalık 45 saati aşan çalışma (saat) — %50 zamlı */
  fazlaCalisma: number;
  /** Sözleşme süresi ile 45 saat arasındaki çalışma (saat) — %25 zamlı */
  fazlaSureler: number;
  /** Hafta tatili gününde çalışılan saat — fazla çalışma olarak %50 zamlı */
  haftaTatili: number;
  /** Ulusal bayram / genel tatilde çalışılan gün (yarım gün için 0,5) */
  genelTatil: number;
}

export interface DonemSonuc extends Donem {
  fazlaCalismaUcreti: number;
  fazlaSurelerUcreti: number;
  haftaTatiliUcreti: number;
  genelTatilUcreti: number;
  brut: number;
  /** Aşağıdakiler, o ayın bordrosuna yansıyan fark (yaklaşık) */
  sgkIsci: number;
  issizlikIsci: number;
  gv: number;
  dv: number;
  net: number;
  /** Fazla mesaiyle birlikte o ayın sonunda bulunulan vergi dilimi (%) */
  dilim: number;
}

export interface FazlaMesaiGirdi {
  yil: number;
  ucret: Ucret;
  /** Sözleşmedeki haftalık çalışma süresi (saat) */
  haftalikSure: number;
  donemler: Donem[];
}

export interface FazlaMesaiToplam {
  fazlaCalisma: number;
  fazlaSureler: number;
  haftaTatili: number;
  genelTatil: number;
  fazlaCalismaUcreti: number;
  fazlaSurelerUcreti: number;
  haftaTatiliUcreti: number;
  genelTatilUcreti: number;
  brut: number;
  sgkIsci: number;
  issizlikIsci: number;
  gv: number;
  dv: number;
  net: number;
}

export interface FazlaMesaiSonuc {
  saatlik: number;
  gunluk: number;
  aylik: number;
  donemler: DonemSonuc[];
  toplam: FazlaMesaiToplam;
  /** 270 saatlik sınıra sayılan saat (fazla çalışma + hafta tatili çalışması) */
  sinirSaati: number;
  sinirAsildi: boolean;
  /** Fazla mesainin yıl boyunca nete toplam etkisi (sonraki aylardaki dilim etkisi dahil) */
  yillikNetEtki: number;
  /** Fazla mesai matrahı büyüttüğü için kalan aylarda normal maaştan kesilecek ek vergi (≤ 0) */
  dilimEtkisi: number;
}

function brutKalemleri(d: Donem, saatlik: number, gunluk: number) {
  // 4857 md. 41/2: fazla çalışmada saat ücreti %50 artırılır
  const fazlaCalismaUcreti = round2(d.fazlaCalisma * saatlik * FAZLA_CALISMA_KATSAYI);
  // 4857 md. 41/4: fazla sürelerle çalışmada %25 artırılır
  const fazlaSurelerUcreti = round2(d.fazlaSureler * saatlik * FAZLA_SURELER_KATSAYI);
  // Hafta tatili (md. 46) ücreti aylığa dahildir; tatilde yapılan çalışma Yargıtay uygulamasında
  // haftalık 45 saati aştığından fazla çalışma sayılır ve %50 zamlı ödenir.
  const haftaTatiliUcreti = round2(d.haftaTatili * saatlik * FAZLA_CALISMA_KATSAYI);
  // 4857 md. 47: genel tatilde çalışılan her gün için ayrıca bir günlük ücret
  const genelTatilUcreti = round2(d.genelTatil * gunluk);
  const brut = round2(fazlaCalismaUcreti + fazlaSurelerUcreti + haftaTatiliUcreti + genelTatilUcreti);
  return { fazlaCalismaUcreti, fazlaSurelerUcreti, haftaTatiliUcreti, genelTatilUcreti, brut };
}

/**
 * Brüt fazla mesai ücreti ve yaklaşık neti. Net, maaş motoruyla bulunur: yıl boyunca her ay aynı
 * maaşın ödendiği varsayılır; fazla mesainin girildiği ayın bordrosu, mesaili ve mesaisiz hâliyle
 * karşılaştırılır (SGK %14 + işsizlik %1 + kümülatif matraha göre gelir vergisi + damga vergisi).
 */
export function hesaplaFazlaMesai(g: FazlaMesaiGirdi): FazlaMesaiSonuc {
  const saatlik = saatlikUcret(g.ucret);
  const gunluk = gunlukUcret(g.ucret);
  const aylik = aylikUcret(g.ucret);
  const kalemler = g.donemler.map((d) => brutKalemleri(d, saatlik, gunluk));

  const ekler = Array(12).fill(0) as number[];
  g.donemler.forEach((d, i) => {
    ekler[d.ay - 1] = round2(ekler[d.ay - 1] + kalemler[i].brut);
  });
  const baz = Array(12).fill(aylik) as number[];
  const secenek = { yil: g.yil, sgkDevir: false };
  const tum = hesaplaBordro(
    baz.map((b, i) => b + ekler[i]),
    secenek,
  );
  const mesaisiz = hesaplaBordro(baz, secenek);

  const donemler: DonemSonuc[] = g.donemler.map((d, i) => {
    const k = kalemler[i];
    const m = d.ay - 1;
    // Bu dönemin mesaisi çıkarılınca o ayın bordrosu
    const haricEkler = ekler.map((e, j) => (j === m ? round2(e - k.brut) : e));
    const haric = hesaplaBordro(
      baz.map((b, j) => b + haricEkler[j]),
      secenek,
    ).aylar[m];
    const ile = tum.aylar[m];
    return {
      ...d,
      ...k,
      sgkIsci: round2(ile.sgkIsci - haric.sgkIsci),
      issizlikIsci: round2(ile.issizlikIsci - haric.issizlikIsci),
      gv: round2(ile.gvOdenecek - haric.gvOdenecek),
      dv: round2(ile.dvOdenecek - haric.dvOdenecek),
      net: round2(ile.net - haric.net),
      dilim: ile.dilim,
    };
  });

  const topla = (f: (x: DonemSonuc) => number) => round2(donemler.reduce((s, x) => s + f(x), 0));
  const toplam: FazlaMesaiToplam = {
    fazlaCalisma: topla((x) => x.fazlaCalisma),
    fazlaSureler: topla((x) => x.fazlaSureler),
    haftaTatili: topla((x) => x.haftaTatili),
    genelTatil: topla((x) => x.genelTatil),
    fazlaCalismaUcreti: topla((x) => x.fazlaCalismaUcreti),
    fazlaSurelerUcreti: topla((x) => x.fazlaSurelerUcreti),
    haftaTatiliUcreti: topla((x) => x.haftaTatiliUcreti),
    genelTatilUcreti: topla((x) => x.genelTatilUcreti),
    brut: topla((x) => x.brut),
    sgkIsci: topla((x) => x.sgkIsci),
    issizlikIsci: topla((x) => x.issizlikIsci),
    gv: topla((x) => x.gv),
    dv: topla((x) => x.dv),
    net: topla((x) => x.net),
  };

  const sinirSaati = round2(toplam.fazlaCalisma + toplam.haftaTatili);
  const yillikNetEtki = round2(tum.toplam.net - mesaisiz.toplam.net);
  return {
    saatlik,
    gunluk,
    aylik,
    donemler,
    toplam,
    sinirSaati,
    sinirAsildi: sinirSaati > YILLIK_SINIR,
    yillikNetEtki,
    dilimEtkisi: round2(yillikNetEtki - toplam.net),
  };
}

// ---------------------------------------------------------------------------
// Doğrulama
// ---------------------------------------------------------------------------

export function validateUcret(tutar: number | null): string | undefined {
  if (tutar === null || Number.isNaN(tutar)) return 'Ücretinizi girin.';
  if (tutar <= 0) return 'Ücret sıfırdan büyük olmalı.';
  if (tutar > 100_000_000) return 'Tutar çok büyük görünüyor.';
  return undefined;
}

export function validateHaftalik(h: number | null): string | undefined {
  if (h === null || Number.isNaN(h)) return 'Haftalık süreyi girin.';
  if (h <= 0) return 'Süre sıfırdan büyük olmalı.';
  if (h > AZAMI_HAFTALIK) return 'Haftalık normal çalışma süresi 45 saati aşamaz (4857 md. 63).';
  return undefined;
}

export function validateBolen(b: number | null): string | undefined {
  if (b === null || Number.isNaN(b)) return 'Bölen girin.';
  if (b < 100 || b > 400) return '100 ile 400 arasında olmalı (genelde 225).';
  return undefined;
}

export type DonemHatalari = Partial<Record<'ay' | 'fazlaCalisma' | 'fazlaSureler' | 'haftaTatili' | 'genelTatil', string>>;

export function validateDonem(
  d: { ay: number; fazlaCalisma: number | null; fazlaSureler: number | null; haftaTatili: number | null; genelTatil: number | null },
  haftalikSure: number | null,
): DonemHatalari {
  const e: DonemHatalari = {};
  const saat = (v: number | null, ust: number, ad: keyof DonemHatalari) => {
    if (v === null || Number.isNaN(v)) e[ad] = 'Sayı girin (yoksa 0).';
    else if (v < 0) e[ad] = 'Negatif olamaz.';
    else if (v > ust) e[ad] = `En fazla ${ust} olabilir.`;
  };
  saat(d.fazlaCalisma, 400, 'fazlaCalisma');
  saat(d.haftaTatili, 200, 'haftaTatili');
  saat(d.genelTatil, 10, 'genelTatil');
  saat(d.fazlaSureler, 200, 'fazlaSureler');
  if (!e.fazlaSureler && (d.fazlaSureler ?? 0) > 0 && (haftalikSure ?? AZAMI_HAFTALIK) >= AZAMI_HAFTALIK)
    e.fazlaSureler = 'Haftalık süreniz 45 saat olduğundan fazla sürelerle çalışma olmaz; bu saatleri fazla çalışmaya yazın.';
  if (!(d.ay >= 1 && d.ay <= 12)) e.ay = 'Ay seçin.';
  return e;
}

/** Aynı ay iki kez seçildiyse ikinci ve sonraki satırların indeksleri. */
export function tekrarlananAylar(aylar: number[]): Set<number> {
  const gorulen = new Set<number>();
  const tekrar = new Set<number>();
  aylar.forEach((a, i) => {
    if (gorulen.has(a)) tekrar.add(i);
    gorulen.add(a);
  });
  return tekrar;
}
