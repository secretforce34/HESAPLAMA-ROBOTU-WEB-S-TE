import { kidemTavani, kidemTavaniOn } from '../../data/params/kidem';
import { MAAS_YILLARI, maasYili } from '../../data/params/maas';
import { daysBetween, round2 } from '../../lib/finance';
import { ekOdemeVergisi, hesaplaBordro } from '../brut-net-maas-hesaplama/calc';

// ---------------------------------------------------------------------------
// Desteklenen çıkış tarihleri: hem kıdem tavanı hem gelir vergisi tarifesi bilinen dönem
// ---------------------------------------------------------------------------

const tavanlar = kidemTavani.values.donemler;
const ilkYil = `${MAAS_YILLARI[0]}-01-01`;
const sonYil = `${MAAS_YILLARI[MAAS_YILLARI.length - 1]}-12-31`;
export const EN_ERKEN_CIKIS = ilkYil > tavanlar[0].from ? ilkYil : tavanlar[0].from;
export const EN_GEC_CIKIS = sonYil < tavanlar[tavanlar.length - 1].to ? sonYil : tavanlar[tavanlar.length - 1].to;

// ---------------------------------------------------------------------------
// Tarih yardımcıları (saat dilimi etkilenmesin diye UTC ile)
// ---------------------------------------------------------------------------

const parca = (iso: string) => [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))] as const;
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const ayinGunSayisi = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function gunEkle(tarih: string, gun: number): string {
  const [y, m, d] = parca(tarih);
  const t = new Date(Date.UTC(y, m - 1, d + gun));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Ay ekler; gün o ayda yoksa ayın son gününe çekilir (31 Ocak + 1 ay = 28/29 Şubat). */
function ayEkle(tarih: string, k: number): string {
  const [y, m, d] = parca(tarih);
  const toplam = y * 12 + (m - 1) + k;
  const ny = Math.floor(toplam / 12);
  const nm = (toplam % 12) + 1;
  return iso(ny, nm, Math.min(d, ayinGunSayisi(ny, nm)));
}

export const gecerliTarih = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

// ---------------------------------------------------------------------------
// Hizmet süresi
// ---------------------------------------------------------------------------

export interface HizmetSuresi {
  yil: number;
  ay: number;
  gun: number;
  /** Giriş ve çıkış günü dahil toplam takvim günü */
  toplamGun: number;
}

/**
 * Giriş ve çıkış günü dahil hizmet süresi, takvim yöntemiyle yıl/ay/gün olarak.
 * Örn. 15.03.2019 – 29.10.2026 = 7 yıl 7 ay 15 gün.
 */
export function hizmetSuresi(giris: string, cikis: string): HizmetSuresi {
  const son = gunEkle(cikis, 1); // çıkış günü dahil
  const [gy, gm] = parca(giris);
  const [sy, sm] = parca(son);
  let k = (sy - gy) * 12 + (sm - gm);
  while (k > 0 && ayEkle(giris, k) > son) k--;
  while (ayEkle(giris, k + 1) <= son) k++;
  const gun = daysBetween(ayEkle(giris, k), son);
  return { yil: Math.floor(k / 12), ay: k % 12, gun, toplamGun: daysBetween(giris, son) };
}

// ---------------------------------------------------------------------------
// Giydirilmiş ücret
// ---------------------------------------------------------------------------

export type Periyot = 'aylik' | 'yillik' | 'gunluk';

export interface EkOdeme {
  tutar: number;
  periyot: Periyot;
  /** Günlük ödemede ayda kaç gün verildiği (ör. 22 iş günü) */
  gun?: number;
}

/** Düzenli ek ödemenin aylık karşılığı (1475 md. 14/11: para ve parayla ölçülebilen menfaatler). */
export function aylikKarsilik(e: EkOdeme): number {
  if (e.periyot === 'yillik') return e.tutar / 12;
  if (e.periyot === 'gunluk') return e.tutar * (e.gun ?? 0);
  return e.tutar;
}

// ---------------------------------------------------------------------------
// İhbar süresi (4857 s. Kanun md. 17)
// ---------------------------------------------------------------------------

/**
 * md. 17/2: 6 aydan az → 2 hafta; 6 ay – 1,5 yıl → 4 hafta; 1,5 – 3 yıl → 6 hafta; 3 yıldan fazla → 8 hafta.
 * "… kadar" ifadeleri sınır günü içine alacak şekilde uygulanır (tam 1,5 yıl → 4 hafta, tam 3 yıl → 6 hafta).
 */
export function ihbarHaftasi(s: HizmetSuresi): 2 | 4 | 6 | 8 {
  const ay = s.yil * 12 + s.ay;
  if (ay < 6) return 2;
  if (ay < 18 || (ay === 18 && s.gun === 0)) return 4;
  if (ay < 36 || (ay === 36 && s.gun === 0)) return 6;
  return 8;
}

// ---------------------------------------------------------------------------
// Ana hesap
// ---------------------------------------------------------------------------

export interface KidemGirdi {
  giris: string;
  cikis: string;
  /** Son aylık brüt ücret */
  sonBrut: number;
  ekOdemeler: EkOdeme[];
  ihbarHesapla: boolean;
  /** İhbar süresi kullandırıldı ya da peşin ödendi: ihbar tazminatı doğmaz */
  ihbarKullandirildi: boolean;
  /** Çıkış ayından önceki aylara ait yıl içi kümülatif GV matrahı; null ise tahmin edilir */
  oncekiKumulatif: number | null;
}

export interface KidemSonuc {
  sure: HizmetSuresi;
  ekToplam: number;
  /** Son brüt + düzenli ek ödemelerin aylık karşılığı */
  giydirilmis: number;
  tavan: number;
  tavanDonemi: { from: string; to: string };
  tavanUygulandi: boolean;
  /** Kıdeme esas aylık ücret = min(giydirilmiş, tavan) */
  kidemEsas: number;
  kidemHakki: boolean;
  /** Tam yıllar / artan aylar / artan günler için tutarlar */
  kidemYilTutari: number;
  kidemAyTutari: number;
  kidemGunTutari: number;
  kidemBrut: number;
  /** Tavan olmasaydı ödenecek brüt kıdem (bilgi için) */
  kidemBrutTavansiz: number;
  kidemDamga: number;
  kidemNet: number;
  ihbarHafta: number;
  ihbarGun: number;
  gunlukBrut: number;
  ihbarBrut: number;
  ihbarGv: number;
  ihbarDv: number;
  ihbarNet: number;
  /** İhbar sonrası kümülatif matrahın dilimi (%) */
  ihbarDilim: number;
  /** Hesapta kullanılan önceki kümülatif matrah */
  oncekiKumulatif: number;
  kumulatifTahmini: boolean;
  toplamBrut: number;
  toplamNet: number;
}

/** Çıkış yılında, işe başlangıç ile çıkış arasında her aya düşen ücret katsayısı (tam ay = 1, kıst ay = gün/30). */
function aylikKatsayilar(giris: string, cikis: string): number[] {
  const yil = Number(cikis.slice(0, 4));
  const bas = giris > `${yil}-01-01` ? giris : `${yil}-01-01`;
  const sonuc: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const ayBas = iso(yil, m, 1);
    const ayGun = ayinGunSayisi(yil, m);
    const aySon = iso(yil, m, ayGun);
    const ortBas = bas > ayBas ? bas : ayBas;
    const ortSon = cikis < aySon ? cikis : aySon;
    if (ortBas > ortSon) {
      sonuc.push(0);
      continue;
    }
    const gun = daysBetween(ortBas, ortSon) + 1;
    sonuc.push(gun >= ayGun ? 1 : Math.min(1, gun / 30));
  }
  return sonuc;
}

export function hesaplaKidem(g: KidemGirdi): KidemSonuc {
  const sure = hizmetSuresi(g.giris, g.cikis);
  const ekToplam = round2(g.ekOdemeler.reduce((t, e) => t + aylikKarsilik(e), 0));
  // 1475 md. 14/11: giydirilmiş ücret = ücret + parayla ölçülebilen düzenli menfaatler
  const giydirilmis = round2(g.sonBrut + ekToplam);

  // 1475 md. 14/13: yıllık tutar, çıkış tarihindeki kıdem tavanını aşamaz
  const donem = kidemTavaniOn(g.cikis) ?? tavanlar[tavanlar.length - 1];
  const tavan = donem.tavan;
  const kidemEsas = Math.min(giydirilmis, tavan);
  const tavanUygulandi = giydirilmis > tavan;

  // 1475 md. 14/1: her tam yıl için 30 günlük ücret; artan süreler aynı oranda (ay/12, gün/365)
  const kidemHakki = sure.yil >= 1;
  const katsayi = sure.yil + sure.ay / 12 + sure.gun / 365;
  const kidemYilTutari = kidemHakki ? round2(kidemEsas * sure.yil) : 0;
  const kidemAyTutari = kidemHakki ? round2((kidemEsas * sure.ay) / 12) : 0;
  const kidemGunTutari = kidemHakki ? round2((kidemEsas * sure.gun) / 365) : 0;
  const kidemBrut = kidemHakki ? round2(kidemEsas * katsayi) : 0;
  const kidemBrutTavansiz = kidemHakki ? round2(giydirilmis * katsayi) : 0;

  const yil = Number(g.cikis.slice(0, 4));
  const p = maasYili(yil);
  // GVK md. 25/7: kıdem tazminatı gelir vergisinden istisna; yalnızca damga vergisi (DVK (1) sayılı tablo IV-1-b)
  const kidemDamga = round2((kidemBrut * p.damgaVergisiBinde) / 1000);
  const kidemNet = round2(kidemBrut - kidemDamga);

  // 4857 md. 17: ihbar süresine ait ücret (giydirilmiş günlük brüt × gün); tavan yoktur
  const ihbarHafta = ihbarHaftasi(sure);
  const ihbarVar = g.ihbarHesapla && !g.ihbarKullandirildi;
  const ihbarGun = ihbarVar ? ihbarHafta * 7 : 0;
  const gunlukBrut = round2(giydirilmis / 30);
  const ihbarBrut = ihbarVar ? round2((giydirilmis * ihbarGun) / 30) : 0;

  // İhbar tazminatı ücret sayılır (GVK md. 61): GV + DV kesilir, SGK primi kesilmez (5510 md. 80/1-b).
  // Son ayın ücretiyle birlikte ödendiği varsayılır; kümülatif matrah bilinmiyorsa ücretten tahmin edilir.
  const ay = Number(g.cikis.slice(5, 7));
  const brutler = aylikKatsayilar(g.giris, g.cikis).map((k) => round2(giydirilmis * k));
  const bordro = hesaplaBordro(brutler, { yil, sgkDevir: false });
  const tahminKumulatif = ay > 1 ? bordro.aylar[ay - 2].kumulatifMatrah : 0;
  const kumulatifTahmini = g.oncekiKumulatif === null;
  const oncekiKumulatif = kumulatifTahmini ? tahminKumulatif : Math.max(0, g.oncekiKumulatif ?? 0);
  const vergi = ekOdemeVergisi({
    yil,
    ay,
    oncekiKumulatif,
    ayBrut: brutler[ay - 1],
    ayMatrah: bordro.aylar[ay - 1].gvMatrahi,
    ekBrut: ihbarBrut,
  });
  const ihbarGv = ihbarBrut > 0 ? vergi.gv : 0;
  const ihbarDv = ihbarBrut > 0 ? vergi.dv : 0;
  const ihbarNet = round2(ihbarBrut - ihbarGv - ihbarDv);

  return {
    sure,
    ekToplam,
    giydirilmis,
    tavan,
    tavanDonemi: { from: donem.from, to: donem.to },
    tavanUygulandi,
    kidemEsas,
    kidemHakki,
    kidemYilTutari,
    kidemAyTutari,
    kidemGunTutari,
    kidemBrut,
    kidemBrutTavansiz,
    kidemDamga,
    kidemNet,
    ihbarHafta,
    ihbarGun,
    gunlukBrut,
    ihbarBrut,
    ihbarGv,
    ihbarDv,
    ihbarNet,
    ihbarDilim: vergi.dilim,
    oncekiKumulatif,
    kumulatifTahmini,
    toplamBrut: round2(kidemBrut + ihbarBrut),
    toplamNet: round2(kidemNet + ihbarNet),
  };
}

// ---------------------------------------------------------------------------
// Doğrulama
// ---------------------------------------------------------------------------

export function validateKidem(g: {
  giris: string;
  cikis: string;
  sonBrut: number | null;
  oncekiKumulatif: number | null | undefined;
}): Record<string, string> {
  const e: Record<string, string> = {};
  if (!gecerliTarih(g.giris)) e.giris = 'İşe giriş tarihini seçin.';
  else if (g.giris < '1950-01-01') e.giris = 'Giriş tarihi 1950’den önce olamaz.';
  if (!gecerliTarih(g.cikis)) e.cikis = 'İşten çıkış tarihini seçin.';
  else if (g.cikis < EN_ERKEN_CIKIS || g.cikis > EN_GEC_CIKIS)
    e.cikis = `Robot, ${EN_ERKEN_CIKIS.slice(0, 4)}–${EN_GEC_CIKIS.slice(0, 4)} arası çıkışlar için resmî tavan ve vergi oranlarını içerir.`;
  else if (!e.giris && g.cikis < g.giris) e.cikis = 'Çıkış tarihi giriş tarihinden önce olamaz.';
  if (g.sonBrut === null || Number.isNaN(g.sonBrut)) e.sonBrut = 'Son brüt ücreti girin.';
  else if (g.sonBrut <= 0) e.sonBrut = 'Brüt ücret sıfırdan büyük olmalı.';
  else if (g.sonBrut > 100_000_000) e.sonBrut = 'Tutar çok büyük görünüyor.';
  if (g.oncekiKumulatif !== undefined && g.oncekiKumulatif !== null && g.oncekiKumulatif < 0)
    e.oncekiKumulatif = 'Matrah negatif olamaz.';
  return e;
}

export function validateEkOdeme(tutar: number | null, periyot: Periyot, gun: number | null): { tutar?: string; gun?: string } {
  const e: { tutar?: string; gun?: string } = {};
  if (tutar === null || Number.isNaN(tutar)) e.tutar = 'Tutar girin.';
  else if (tutar < 0) e.tutar = 'Tutar negatif olamaz.';
  if (periyot === 'gunluk') {
    if (gun === null || Number.isNaN(gun)) e.gun = 'Gün sayısı girin.';
    else if (gun < 0 || gun > 31) e.gun = '0–31 arası olmalı.';
  }
  return e;
}
